from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.inspection_record import InspectionRecord
from app.models.purchase_order import PurchaseOrder, PurchaseStatus
from app.models.contract_order import ContractOrder, ContractOrderItem, OrderStatus, DeliveryItemStatus
from app.models.employee import Employee, EmployeeRole
from app.core.deps import get_current_user, require_roles
from app.services.order_state_machine import OrderStateMachine
from app.schemas.inspection_record import InspectionRecordCreate, InspectionRecordResponse

router = APIRouter()
sm = OrderStateMachine()


def _inspection_to_dict(record: InspectionRecord) -> dict:
    return {
        "id": record.id,
        "purchase_order_id": record.purchase_order_id,
        "inspector_id": record.inspector_id,
        "inspection_date": str(record.inspection_date) if record.inspection_date else None,
        "inspection_result": record.inspection_result,
        "actual_quantity": float(record.actual_quantity) if record.actual_quantity else 0,
        "remark": record.remark,
        "created_at": str(record.created_at) if record.created_at else None,
    }


# ── 创建验收记录 ────────────────────────────────────────
@router.post("", status_code=status.HTTP_201_CREATED)
def create_inspection_record(
    data: InspectionRecordCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(EmployeeRole.project_manager, EmployeeRole.admin)),
):
    # 验证采购单存在
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == data.purchase_order_id).first()
    if not po:
        raise HTTPException(status_code=400, detail="采购单不存在")

    # 采购单必须是已到货状态才能验收
    if po.status != PurchaseStatus.arrived:
        raise HTTPException(status_code=400, detail="采购单未到货，无法验收")

    record = InspectionRecord(
        purchase_order_id=data.purchase_order_id,
        inspector_id=current_user.id,
        inspection_date=datetime.now(),
        inspection_result=data.inspection_result,
        actual_quantity=data.actual_quantity,
        remark=data.remark,
    )
    db.add(record)

    # 更新采购单状态为 inspected
    po.status = PurchaseStatus.inspected

    # 查找关联的订单明细
    order_item = db.query(ContractOrderItem).filter(
        ContractOrderItem.id == po.order_item_id,
    ).first()

    # 如果验收合格：更新订单明细 delivery_status 为 arrived
    if data.inspection_result == 1 and order_item:
        order_item.delivery_status = DeliveryItemStatus.arrived

    # 联动更新订单状态：如果当前是 pending_inspect 则转为 inspecting
    order = db.query(ContractOrder).filter(ContractOrder.id == po.order_id).first()
    if order and order.status == OrderStatus.pending_inspect:
        order.status = OrderStatus.inspecting

    db.commit()
    db.refresh(record)
    return _inspection_to_dict(record)


# ── 获取采购单的验收记录 ────────────────────────────────
@router.get("/purchase/{purchase_order_id}")
def get_purchase_inspection_records(
    purchase_order_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == purchase_order_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="采购单不存在")

    records = (
        db.query(InspectionRecord)
        .filter(InspectionRecord.purchase_order_id == purchase_order_id)
        .order_by(InspectionRecord.created_at.desc())
        .all()
    )
    return [_inspection_to_dict(r) for r in records]


# ── 获取订单的所有验收记录 ──────────────────────────────
@router.get("/order/{order_id}")
def get_order_inspection_records(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    order = db.query(ContractOrder).filter(ContractOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    # 查找该订单所有采购单
    po_ids = (
        db.query(PurchaseOrder.id)
        .filter(PurchaseOrder.order_id == order_id)
        .subquery()
    )
    records = (
        db.query(InspectionRecord)
        .filter(InspectionRecord.purchase_order_id.in_(po_ids))
        .order_by(InspectionRecord.created_at.desc())
        .all()
    )
    return [_inspection_to_dict(r) for r in records]


# ── 项目负责人确认验收完成 ──────────────────────────────
@router.put("/{order_id}/status")
def confirm_inspection_complete(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(EmployeeRole.project_manager, EmployeeRole.admin)),
):
    order = db.query(ContractOrder).filter(ContractOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    # 权限检查：项目负责人只能确认自己的订单
    if current_user.role == EmployeeRole.project_manager and order.project_manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作此订单")

    # 通过状态机验证：inspecting → pending_ship
    current_status = order.status.value
    target_status = OrderStatus.pending_ship.value

    if not sm.validate_transition(current_status, target_status):
        raise HTTPException(
            status_code=400,
            detail=f"不允许从 '{sm.get_status_label(current_status)}' 转换到 '{sm.get_status_label(target_status)}'",
        )

    role = current_user.role.value
    if not sm.check_role_permission(current_status, target_status, role):
        raise HTTPException(status_code=403, detail="您的角色无权执行此操作")

    order.status = OrderStatus(target_status)
    db.commit()
    db.refresh(order)

    return {
        "id": order.id,
        "order_no": order.order_no,
        "status": order.status.value,
        "message": "验收已完成，订单状态已更新为待发货",
    }
