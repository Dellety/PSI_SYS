from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.purchase_order import PurchaseOrder, PurchaseStatus
from app.models.contract_order import ContractOrder, ContractOrderItem, OrderStatus, DeliveryItemStatus
from app.models.employee import Employee, EmployeeRole
from app.models.supplier import Supplier
from app.core.deps import get_current_user, require_roles
from app.services.number_generator import generate_purchase_no
from app.services.order_state_machine import OrderStateMachine
from app.schemas.purchase_order import PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderResponse, PurchaseStatusChange

router = APIRouter()
sm = OrderStateMachine()


def _po_to_dict(po: PurchaseOrder) -> dict:
    return {
        "id": po.id,
        "purchase_no": po.purchase_no,
        "order_id": po.order_id,
        "order_item_id": po.order_item_id,
        "supplier_id": po.supplier_id,
        "material_id": po.material_id,
        "quantity": float(po.quantity) if po.quantity else 0,
        "unit_price": float(po.unit_price) if po.unit_price else 0,
        "total_amount": float(po.total_amount) if po.total_amount else 0,
        "purchaser_id": po.purchaser_id,
        "status": po.status.value if po.status else None,
        "expected_delivery_date": str(po.expected_delivery_date) if po.expected_delivery_date else None,
        "actual_delivery_date": str(po.actual_delivery_date) if po.actual_delivery_date else None,
        "remark": po.remark,
        "created_by": po.created_by,
        "created_at": str(po.created_at) if po.created_at else None,
        "updated_at": str(po.updated_at) if po.updated_at else None,
    }


# ── 采购单列表 ──────────────────────────────────────────
@router.get("")
def list_purchase_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    supplier_id: int | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    query = db.query(PurchaseOrder)

    # 采购员只看自己的采购单
    if current_user.role == EmployeeRole.purchaser:
        query = query.filter(PurchaseOrder.purchaser_id == current_user.id)
    elif current_user.role == EmployeeRole.project_manager:
        # 项目负责人看关联订单的采购单
        order_ids = (
            db.query(ContractOrder.id)
            .filter(ContractOrder.project_manager_id == current_user.id)
            .subquery()
        )
        query = query.filter(PurchaseOrder.order_id.in_(order_ids))
    # admin 看全部

    if status_filter:
        try:
            query = query.filter(PurchaseOrder.status == PurchaseStatus(status_filter))
        except ValueError:
            pass
    if supplier_id:
        query = query.filter(PurchaseOrder.supplier_id == supplier_id)
    if start_date:
        query = query.filter(PurchaseOrder.created_at >= start_date)
    if end_date:
        query = query.filter(PurchaseOrder.created_at <= end_date + " 23:59:59")

    total = query.count()
    orders = (
        query.order_by(PurchaseOrder.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [_po_to_dict(po) for po in orders]
    return {"total": total, "items": items}


# ── 创建采购单 ──────────────────────────────────────────
@router.post("", status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    data: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(EmployeeRole.purchaser, EmployeeRole.admin)),
):
    # 验证供应商存在
    supplier = db.query(Supplier).filter(Supplier.id == data.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=400, detail="供应商不存在")

    # 验证订单存在
    order = db.query(ContractOrder).filter(ContractOrder.id == data.order_id).first()
    if not order:
        raise HTTPException(status_code=400, detail="订单不存在")

    # 验证订单明细存在且属于该订单
    order_item = db.query(ContractOrderItem).filter(
        ContractOrderItem.id == data.order_item_id,
        ContractOrderItem.order_id == data.order_id,
    ).first()
    if not order_item:
        raise HTTPException(status_code=400, detail="订单明细不存在或不属于该订单")

    po = PurchaseOrder(
        purchase_no=generate_purchase_no(db),
        order_id=data.order_id,
        order_item_id=data.order_item_id,
        supplier_id=data.supplier_id,
        material_id=data.material_id,
        quantity=data.quantity,
        unit_price=data.unit_price,
        total_amount=data.total_amount,
        purchaser_id=current_user.id,
        status=PurchaseStatus.pending,
        expected_delivery_date=data.expected_delivery_date,
        remark=data.remark,
        created_by=current_user.id,
    )
    db.add(po)

    # 更新订单明细发货状态为 purchasing
    order_item.delivery_status = DeliveryItemStatus.purchasing

    # 联动更新订单状态为 purchasing（如果当前是 pending_purchase）
    if order.status == OrderStatus.pending_purchase:
        order.status = OrderStatus.purchasing

    db.commit()
    db.refresh(po)
    return _po_to_dict(po)


# ── 更新采购状态 ────────────────────────────────────────
@router.put("/{po_id}/status")
def update_purchase_status(
    po_id: int,
    data: PurchaseStatusChange,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(EmployeeRole.purchaser, EmployeeRole.admin)),
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="采购单不存在")

    # 采购员只能操作自己的采购单
    if current_user.role == EmployeeRole.purchaser and po.purchaser_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能操作自己的采购单")

    current_status = po.status
    target_status = data.target_status

    # 采购员允许的状态流转：pending→purchasing→ordered→arrived
    allowed_flows = {
        PurchaseStatus.pending: PurchaseStatus.purchasing,
        PurchaseStatus.purchasing: PurchaseStatus.ordered,
        PurchaseStatus.ordered: PurchaseStatus.arrived,
    }
    if allowed_flows.get(current_status) != target_status:
        raise HTTPException(
            status_code=400,
            detail=f"不允许从 '{current_status.value}' 转换到 '{target_status.value}'",
        )

    po.status = target_status

    # 到货时自动设置实际到货日期
    if target_status == PurchaseStatus.arrived:
        po.actual_delivery_date = date.today()

        # 检查该订单的所有采购单是否都已到货/已验收
        all_pos = db.query(PurchaseOrder).filter(PurchaseOrder.order_id == po.order_id).all()
        all_arrived = all(
            p.status in (PurchaseStatus.arrived, PurchaseStatus.inspected)
            for p in all_pos
        )
        if all_arrived:
            # 联动更新订单状态为 pending_inspect
            order = db.query(ContractOrder).filter(ContractOrder.id == po.order_id).first()
            if order and order.status == OrderStatus.purchasing:
                order.status = OrderStatus.pending_inspect

    db.commit()
    db.refresh(po)
    return _po_to_dict(po)


# ── 采购单详情 ──────────────────────────────────────────
@router.get("/{po_id}")
def get_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="采购单不存在")

    # 权限检查
    if current_user.role == EmployeeRole.purchaser and po.purchaser_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权查看此采购单")
    if current_user.role == EmployeeRole.project_manager:
        order = db.query(ContractOrder).filter(ContractOrder.id == po.order_id).first()
        if order and order.project_manager_id != current_user.id:
            raise HTTPException(status_code=403, detail="无权查看此采购单")

    return _po_to_dict(po)


# ── 获取某个订单的所有采购单 ────────────────────────────
@router.get("/order/{order_id}")
def get_order_purchase_orders(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    order = db.query(ContractOrder).filter(ContractOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    # 权限检查
    if current_user.role == EmployeeRole.purchaser:
        # 采购员只看自己在这个订单上的采购单
        pos = db.query(PurchaseOrder).filter(
            PurchaseOrder.order_id == order_id,
            PurchaseOrder.purchaser_id == current_user.id,
        ).all()
    elif current_user.role == EmployeeRole.project_manager:
        if order.project_manager_id != current_user.id:
            raise HTTPException(status_code=403, detail="无权查看此订单的采购单")
        pos = db.query(PurchaseOrder).filter(PurchaseOrder.order_id == order_id).all()
    else:
        pos = db.query(PurchaseOrder).filter(PurchaseOrder.order_id == order_id).all()

    return [_po_to_dict(po) for po in pos]
