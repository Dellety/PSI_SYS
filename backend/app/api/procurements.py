from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.order import Order, OrderStatus
from app.models.procurement import Procurement, ProcurementItem, ProcurementStatus
from app.models.user import User
from app.core.deps import get_current_user
from app.schemas.procurement import ProcurementCreate, ProcurementResponse

router = APIRouter()


def generate_procurement_no(db: Session) -> str:
    today = date.today()
    prefix = f"PROC-{today.strftime('%Y%m%d')}-"
    last = (
        db.query(func.max(Procurement.procurement_no))
        .filter(Procurement.procurement_no.like(f"{prefix}%"))
        .scalar()
    )
    seq = int(last.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:04d}"


@router.get("")
def list_procurements(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: ProcurementStatus | None = None,
    supplier_id: int | None = None,
    order_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Procurement)
    if status:
        query = query.filter(Procurement.status == status)
    if supplier_id:
        query = query.filter(Procurement.supplier_id == supplier_id)
    if order_id:
        query = query.filter(Procurement.order_id == order_id)
    total = query.count()
    items = query.order_by(Procurement.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "items": [ProcurementResponse.model_validate(i) for i in items]}


@router.post("", response_model=ProcurementResponse, status_code=status.HTTP_201_CREATED)
def create_procurement(
    data: ProcurementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    procurement = Procurement(
        procurement_no=generate_procurement_no(db),
        order_id=data.order_id,
        supplier_id=data.supplier_id,
        purchaser_id=current_user.id,
        status=ProcurementStatus.pending,
        total_amount=Decimal("0"),
        notes=data.notes,
    )
    db.add(procurement)
    db.flush()

    total_amount = Decimal("0")
    for item_data in data.items:
        amount = item_data.quantity * item_data.unit_price
        total_amount += amount
        item = ProcurementItem(
            procurement_id=procurement.id,
            part_id=item_data.part_id,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            amount=amount,
            expected_date=item_data.expected_date,
            notes=item_data.notes,
        )
        db.add(item)

    procurement.total_amount = total_amount
    db.commit()
    db.refresh(procurement)
    return procurement


@router.post("/from-order/{order_id}", response_model=ProcurementResponse, status_code=status.HTTP_201_CREATED)
def create_procurement_from_order(
    order_id: int,
    supplier_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="订单不存在")
    if order.status not in (OrderStatus.confirmed, OrderStatus.in_procurement):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="订单状态不允许生成采购单")

    procurement = Procurement(
        procurement_no=generate_procurement_no(db),
        order_id=order_id,
        supplier_id=supplier_id,
        purchaser_id=current_user.id,
        status=ProcurementStatus.pending,
        total_amount=Decimal("0"),
    )
    db.add(procurement)
    db.flush()

    total_amount = Decimal("0")
    for order_item in order.items:
        amount = order_item.quantity * order_item.unit_price
        total_amount += amount
        item = ProcurementItem(
            procurement_id=procurement.id,
            part_id=order_item.part_id,
            quantity=order_item.quantity,
            unit_price=order_item.unit_price,
            amount=amount,
        )
        db.add(item)

    procurement.total_amount = total_amount
    order.status = OrderStatus.in_procurement
    db.commit()
    db.refresh(procurement)
    return procurement


@router.get("/{procurement_id}", response_model=ProcurementResponse)
def get_procurement(
    procurement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    procurement = db.query(Procurement).filter(Procurement.id == procurement_id).first()
    if not procurement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="采购单不存在")
    return procurement


@router.post("/{procurement_id}/confirm", response_model=ProcurementResponse)
def confirm_procurement(
    procurement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    procurement = db.query(Procurement).filter(Procurement.id == procurement_id).first()
    if not procurement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="采购单不存在")
    if procurement.status != ProcurementStatus.pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="仅待确认状态采购单可确认")
    procurement.status = ProcurementStatus.confirmed
    db.commit()
    db.refresh(procurement)
    return procurement
