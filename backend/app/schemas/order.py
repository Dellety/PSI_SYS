from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel
from app.models.order import OrderStatus


class OrderItemBase(BaseModel):
    part_id: int
    quantity: int
    unit_price: Decimal
    notes: str | None = None


class OrderItemCreate(OrderItemBase):
    pass


class OrderItemResponse(OrderItemBase):
    id: int
    order_id: int
    amount: Decimal

    model_config = {"from_attributes": True}


class OrderBase(BaseModel):
    customer_id: int
    notes: str | None = None


class OrderCreate(OrderBase):
    items: list[OrderItemCreate]


class OrderUpdate(BaseModel):
    customer_id: int | None = None
    notes: str | None = None
    items: list[OrderItemCreate] | None = None


class OrderResponse(OrderBase):
    id: int
    order_no: str
    sales_id: int
    status: OrderStatus
    total_amount: Decimal
    items: list[OrderItemResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
