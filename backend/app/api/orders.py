from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.order import Order, OrderItem, OrderStatus
from app.models.user import User
from app.core.deps import get_current_user
from app.schemas.order import OrderCreate, OrderUpdate, OrderResponse

router = APIRouter()


def generate_order_no(db: Session) -> str:
    today = date.today()
    prefix = f"ORD-{today.strftime('%Y%m%d')}-"
    last = (
        db.query(func.max(Order.order_no))
        .filter(Order.order_no.like(f"{prefix}%"))
        .scalar()
    )
    seq = int(last.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:04d}"


@router.get("")
def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: OrderStatus | None = None,
    customer_id: int | None = None,
    keyword: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Order)
    if status:
        query = query.filter(Order.status == status)
    if customer_id:
        query = query.filter(Order.customer_id == customer_id)
    if keyword:
        query = query.filter(
            (Order.order_no.contains(keyword)) | (Order.notes.contains(keyword))
        )
    total = query.count()
    items = query.order_by(Order.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "items": [OrderResponse.model_validate(i) for i in items]}


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    data: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = Order(
        order_no=generate_order_no(db),
        customer_id=data.customer_id,
        sales_id=current_user.id,
        status=OrderStatus.draft,
        total_amount=Decimal("0"),
        notes=data.notes,
    )
    db.add(order)
    db.flush()

    total_amount = Decimal("0")
    for item_data in data.items:
        amount = item_data.quantity * item_data.unit_price
        total_amount += amount
        item = OrderItem(
            order_id=order.id,
            part_id=item_data.part_id,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            amount=amount,
            notes=item_data.notes,
        )
        db.add(item)

    order.total_amount = total_amount
    db.commit()
    db.refresh(order)
    return order


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="订单不存在")
    return order


@router.put("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: int,
    data: OrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="订单不存在")
    if order.status != OrderStatus.draft:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="仅草稿状态订单可编辑")

    update_data = data.model_dump(exclude_unset=True)
    items_data = update_data.pop("items", None)

    for field, value in update_data.items():
        setattr(order, field, value)

    if items_data is not None:
        db.query(OrderItem).filter(OrderItem.order_id == order_id).delete()
        total_amount = Decimal("0")
        for item_data in items_data:
            amount = Decimal(item_data["quantity"]) * Decimal(str(item_data["unit_price"]))
            total_amount += amount
            item = OrderItem(
                order_id=order_id,
                part_id=item_data["part_id"],
                quantity=item_data["quantity"],
                unit_price=item_data["unit_price"],
                amount=amount,
                notes=item_data.get("notes"),
            )
            db.add(item)
        order.total_amount = total_amount

    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/confirm", response_model=OrderResponse)
def confirm_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="订单不存在")
    if order.status != OrderStatus.draft:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="仅草稿状态订单可确认")
    order.status = OrderStatus.confirmed
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="订单不存在")
    if order.status == OrderStatus.cancelled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="订单已取消")
    order.status = OrderStatus.cancelled
    db.commit()
    db.refresh(order)
    return order
