from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.shipment_record import ShipmentRecord
from app.models.contract_order import ContractOrder, OrderStatus
from app.models.employee import Employee, EmployeeRole
from app.core.deps import get_current_user, require_roles
from app.services.number_generator import generate_shipment_no
from app.services.order_state_machine import OrderStateMachine
from app.schemas.shipment_record import ShipmentRecordCreate, ShipmentRecordUpdate, ShipmentRecordResponse

router = APIRouter()
sm = OrderStateMachine()


def _shipment_to_dict(record: ShipmentRecord) -> dict:
    return {
        "id": record.id,
        "order_id": record.order_id,
        "shipment_no": record.shipment_no,
        "express_company": record.express_company,
        "tracking_no": record.tracking_no,
        "receiver_name": record.receiver_name,
        "receiver_phone": record.receiver_phone,
        "shipping_address": record.shipping_address,
        "shipment_date": str(record.shipment_date) if record.shipment_date else None,
        "shipped_by": record.shipped_by,
        "address_confirmed_by": record.address_confirmed_by,
        "address_confirmed_at": str(record.address_confirmed_at) if record.address_confirmed_at else None,
        "remark": record.remark,
        "created_at": str(record.created_at) if record.created_at else None,
    }


# ── 发货记录列表 ────────────────────────────────────────
@router.get("")
def list_shipment_records(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    query = db.query(ShipmentRecord)

    # 非管理员只看自己相关订单的发货记录
    if current_user.role == EmployeeRole.sales:
        order_ids = (
            db.query(ContractOrder.id)
            .filter(ContractOrder.sales_id == current_user.id)
            .subquery()
        )
        query = query.filter(ShipmentRecord.order_id.in_(order_ids))
    elif current_user.role == EmployeeRole.project_manager:
        order_ids = (
            db.query(ContractOrder.id)
            .filter(ContractOrder.project_manager_id == current_user.id)
            .subquery()
        )
        query = query.filter(ShipmentRecord.order_id.in_(order_ids))

    total = query.count()
    records = (
        query.order_by(ShipmentRecord.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [_shipment_to_dict(r) for r in records]
    return {"total": total, "items": items}


# ── 创建发货单 ──────────────────────────────────────────
@router.post("", status_code=status.HTTP_201_CREATED)
def create_shipment_record(
    data: ShipmentRecordCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(EmployeeRole.project_manager, EmployeeRole.admin)),
):
    # 验证订单存在
    order = db.query(ContractOrder).filter(ContractOrder.id == data.order_id).first()
    if not order:
        raise HTTPException(status_code=400, detail="订单不存在")

    # 权限检查
    if current_user.role == EmployeeRole.project_manager and order.project_manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能为自己负责的订单发货")

    record = ShipmentRecord(
        order_id=data.order_id,
        shipment_no=generate_shipment_no(db),
        express_company=data.express_company,
        tracking_no=data.tracking_no,
        receiver_name=data.receiver_name,
        receiver_phone=data.receiver_phone,
        shipping_address=data.shipping_address,
        shipment_date=datetime.now(),
        shipped_by=current_user.id,
        remark=data.remark,
    )
    db.add(record)

    # 联动更新订单状态为 shipped
    if order.status == OrderStatus.pending_ship:
        order.status = OrderStatus.shipped

    db.commit()
    db.refresh(record)
    return _shipment_to_dict(record)


# ── 获取订单的发货记录 ──────────────────────────────────
@router.get("/order/{order_id}")
def get_order_shipment_records(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    order = db.query(ContractOrder).filter(ContractOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    records = (
        db.query(ShipmentRecord)
        .filter(ShipmentRecord.order_id == order_id)
        .order_by(ShipmentRecord.created_at.desc())
        .all()
    )
    return [_shipment_to_dict(r) for r in records]


# ── 销售确认发货地址 ────────────────────────────────────
@router.put("/{shipment_id}/address-confirm")
def confirm_shipment_address(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(EmployeeRole.sales, EmployeeRole.admin)),
):
    record = db.query(ShipmentRecord).filter(ShipmentRecord.id == shipment_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="发货记录不存在")

    # 销售只能确认自己负责订单的发货地址
    if current_user.role == EmployeeRole.sales:
        order = db.query(ContractOrder).filter(ContractOrder.id == record.order_id).first()
        if order and order.sales_id != current_user.id:
            raise HTTPException(status_code=403, detail="只能确认自己负责订单的发货地址")

    record.address_confirmed_by = current_user.id
    record.address_confirmed_at = datetime.now()

    db.commit()
    db.refresh(record)
    return _shipment_to_dict(record)


# ── 更新快递信息 ────────────────────────────────────────
@router.put("/{shipment_id}/tracking")
def update_tracking_info(
    shipment_id: int,
    data: ShipmentRecordUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(EmployeeRole.project_manager, EmployeeRole.admin)),
):
    record = db.query(ShipmentRecord).filter(ShipmentRecord.id == shipment_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="发货记录不存在")

    if data.express_company is not None:
        record.express_company = data.express_company
    if data.tracking_no is not None:
        record.tracking_no = data.tracking_no
    if data.remark is not None:
        record.remark = data.remark

    db.commit()
    db.refresh(record)
    return _shipment_to_dict(record)
