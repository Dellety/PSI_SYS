from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.delivery import Delivery, DeliveryItem, DeliveryStatus
from app.models.order import Order, OrderStatus
from app.models.procurement import Procurement
from app.models.shipment import Shipment
from app.models.user import User
from app.core.deps import get_current_user
from app.schemas.delivery import DeliveryCreate, DeliveryConfirm, DeliveryResponse

router = APIRouter()


def generate_delivery_no(db: Session) -> str:
    today = date.today()
    prefix = f"DELI-{today.strftime('%Y%m%d')}-"
    last = (
        db.query(func.max(Delivery.delivery_no))
        .filter(Delivery.delivery_no.like(f"{prefix}%"))
        .scalar()
    )
    seq = int(last.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:04d}"


@router.get("")
def list_deliveries(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: DeliveryStatus | None = None,
    shipment_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Delivery)
    if status:
        query = query.filter(Delivery.status == status)
    if shipment_id:
        query = query.filter(Delivery.shipment_id == shipment_id)
    total = query.count()
    items = query.order_by(Delivery.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "items": [DeliveryResponse.model_validate(i) for i in items]}


@router.post("", response_model=DeliveryResponse, status_code=status.HTTP_201_CREATED)
def create_delivery(
    data: DeliveryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shipment = db.query(Shipment).filter(Shipment.id == data.shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="发货单不存在")

    delivery = Delivery(
        delivery_no=generate_delivery_no(db),
        shipment_id=data.shipment_id,
        status=DeliveryStatus.pending,
        notes=data.notes,
    )
    db.add(delivery)
    db.flush()

    for item_data in data.items:
        item = DeliveryItem(
            delivery_id=delivery.id,
            part_id=item_data.part_id,
            quantity=item_data.quantity,
            condition=item_data.condition,
        )
        db.add(item)

    db.commit()
    db.refresh(delivery)
    return delivery


@router.get("/{delivery_id}", response_model=DeliveryResponse)
def get_delivery(
    delivery_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="交货单不存在")
    return delivery


@router.post("/{delivery_id}/confirm", response_model=DeliveryResponse)
def confirm_delivery(
    delivery_id: int,
    data: DeliveryConfirm,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="交货单不存在")
    if delivery.status != DeliveryStatus.pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="仅待交货状态可确认")

    delivery.status = DeliveryStatus.delivered
    delivery.delivered_at = datetime.now()
    delivery.receiver_name = data.receiver_name
    delivery.receiver_phone = data.receiver_phone
    if data.notes:
        delivery.notes = data.notes
    db.commit()
    db.refresh(delivery)
    return delivery


@router.post("/{delivery_id}/accept", response_model=DeliveryResponse)
def accept_delivery(
    delivery_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="交货单不存在")
    if delivery.status != DeliveryStatus.delivered:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="仅已交货状态可签收")

    delivery.status = DeliveryStatus.accepted

    shipment = db.query(Shipment).filter(Shipment.id == delivery.shipment_id).first()
    if shipment:
        procurement = db.query(Procurement).filter(Procurement.id == shipment.procurement_id).first()
        if procurement and procurement.order_id:
            order = db.query(Order).filter(Order.id == procurement.order_id).first()
            if order:
                order.status = OrderStatus.delivered

    db.commit()
    db.refresh(delivery)
    return delivery
