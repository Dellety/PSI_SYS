from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.receipt_record import ReceiptRecord
from app.models.shipment_record import ShipmentRecord
from app.models.contract_order import ContractOrder, OrderStatus
from app.models.employee import Employee, EmployeeRole
from app.core.deps import get_current_user, require_roles
from app.schemas.receipt_record import ReceiptRecordCreate, ReceiptArchiveRequest, ReceiptRecordResponse

router = APIRouter()


def _receipt_to_dict(record: ReceiptRecord) -> dict:
    return {
        "id": record.id,
        "order_id": record.order_id,
        "shipment_id": record.shipment_id,
        "receipt_date": str(record.receipt_date) if record.receipt_date else None,
        "receipt_status": record.receipt_status,
        "receipt_attachment": record.receipt_attachment,
        "archived_by": record.archived_by,
        "archived_at": str(record.archived_at) if record.archived_at else None,
        "created_at": str(record.created_at) if record.created_at else None,
    }


# ── 创建签收记录 ────────────────────────────────────────
@router.post("", status_code=status.HTTP_201_CREATED)
def create_receipt_record(
    data: ReceiptRecordCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    # 验证订单存在
    order = db.query(ContractOrder).filter(ContractOrder.id == data.order_id).first()
    if not order:
        raise HTTPException(status_code=400, detail="订单不存在")

    # 验证发货记录存在且属于该订单
    shipment = db.query(ShipmentRecord).filter(
        ShipmentRecord.id == data.shipment_id,
        ShipmentRecord.order_id == data.order_id,
    ).first()
    if not shipment:
        raise HTTPException(status_code=400, detail="发货记录不存在或不属于该订单")

    record = ReceiptRecord(
        order_id=data.order_id,
        shipment_id=data.shipment_id,
        receipt_date=data.receipt_date,
        receipt_status=data.receipt_status,
    )
    db.add(record)

    # 联动更新订单状态为 received
    if data.receipt_status == 1 and order.status in (OrderStatus.shipped, OrderStatus.pending_receipt):
        order.status = OrderStatus.received

    db.commit()
    db.refresh(record)
    return _receipt_to_dict(record)


# ── 归档（项目负责人） ──────────────────────────────────
@router.put("/{receipt_id}/archive")
def archive_receipt_record(
    receipt_id: int,
    data: ReceiptArchiveRequest,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(EmployeeRole.project_manager, EmployeeRole.admin)),
):
    record = db.query(ReceiptRecord).filter(ReceiptRecord.id == receipt_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="签收记录不存在")

    # 权限检查
    if current_user.role == EmployeeRole.project_manager:
        order = db.query(ContractOrder).filter(ContractOrder.id == record.order_id).first()
        if order and order.project_manager_id != current_user.id:
            raise HTTPException(status_code=403, detail="只能归档自己负责订单的签收记录")

    record.archived_by = current_user.id
    record.archived_at = datetime.now()
    if data.receipt_attachment:
        record.receipt_attachment = data.receipt_attachment

    db.commit()
    db.refresh(record)
    return _receipt_to_dict(record)


# ── 获取订单的签收记录 ──────────────────────────────────
@router.get("/order/{order_id}")
def get_order_receipt_records(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    order = db.query(ContractOrder).filter(ContractOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    records = (
        db.query(ReceiptRecord)
        .filter(ReceiptRecord.order_id == order_id)
        .order_by(ReceiptRecord.created_at.desc())
        .all()
    )
    return [_receipt_to_dict(r) for r in records]
