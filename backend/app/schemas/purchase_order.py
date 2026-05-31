from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from app.models.purchase_order import PurchaseStatus


class PurchaseOrderCreate(BaseModel):
    order_id: int
    order_item_id: int
    supplier_id: int
    material_id: int
    quantity: Decimal
    unit_price: Decimal
    total_amount: Decimal
    remark: str | None = None
    expected_delivery_date: date | None = None


class PurchaseOrderUpdate(BaseModel):
    status: PurchaseStatus | None = None
    actual_delivery_date: date | None = None
    remark: str | None = None


class PurchaseOrderResponse(BaseModel):
    id: int
    purchase_no: str
    order_id: int
    order_item_id: int
    supplier_id: int
    material_id: int
    quantity: Decimal
    unit_price: Decimal
    total_amount: Decimal
    purchaser_id: int
    status: PurchaseStatus
    expected_delivery_date: date | None = None
    actual_delivery_date: date | None = None
    remark: str | None = None
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PurchaseStatusChange(BaseModel):
    target_status: PurchaseStatus
