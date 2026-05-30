from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.order import Order, OrderStatus
from app.models.procurement import Procurement, ProcurementStatus
from app.models.shipment import Shipment, ShipmentItem, ShipmentStatus
from app.models.user import User
from app.core.deps import get_current_user
from app.schemas.shipment import ShipmentCreate, ShipmentResponse

router = APIRouter()


def generate_shipment_no(db: Session) -> str:
    today = date.today()
    prefix = f"SHIP-{today.strftime('%Y%m%d')}-"
    last = (
        db.query(func.max(Shipment.shipment_no))
        .filter(Shipment.shipment_no.like(f"{prefix}%"))
        .scalar()
    )
    seq = int(last.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:04d}"


@router.get("")
def list_shipments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: ShipmentStatus | None = None,
    procurement_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Shipment)
    if status:
        query = query.filter(Shipment.status == status)
    if procurement_id:
        query = query.filter(Shipment.procurement_id == procurement_id)
    total = query.count()
    items = query.order_by(Shipment.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "items": [ShipmentResponse.model_validate(i) for i in items]}


@router.post("", response_model=ShipmentResponse, status_code=status.HTTP_201_CREATED)
def create_shipment(
    data: ShipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shipment = Shipment(
        shipment_no=generate_shipment_no(db),
        procurement_id=data.procurement_id,
        shipper_id=current_user.id,
        carrier=data.carrier,
        tracking_no=data.tracking_no,
        status=ShipmentStatus.pending,
        notes=data.notes,
    )
    db.add(shipment)
    db.flush()

    for item_data in data.items:
        item = ShipmentItem(
            shipment_id=shipment.id,
            part_id=item_data.part_id,
            quantity=item_data.quantity,
        )
        db.add(item)

    db.commit()
    db.refresh(shipment)
    return shipment


@router.get("/{shipment_id}", response_model=ShipmentResponse)
def get_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="发货单不存在")
    return shipment


@router.post("/{shipment_id}/ship", response_model=ShipmentResponse)
def ship_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="发货单不存在")
    if shipment.status != ShipmentStatus.pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="仅待发货状态可发货")

    shipment.status = ShipmentStatus.shipped
    shipment.shipped_at = datetime.now()

    procurement = db.query(Procurement).filter(Procurement.id == shipment.procurement_id).first()
    if procurement:
        procurement.status = ProcurementStatus.ordered
        if procurement.order_id:
            order = db.query(Order).filter(Order.id == procurement.order_id).first()
            if order:
                order.status = OrderStatus.in_shipping

    db.commit()
    db.refresh(shipment)
    return shipment
