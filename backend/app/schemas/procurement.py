from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel
from app.models.procurement import ProcurementStatus


class ProcurementItemBase(BaseModel):
    part_id: int
    quantity: int
    unit_price: Decimal
    expected_date: date | None = None
    notes: str | None = None


class ProcurementItemCreate(ProcurementItemBase):
    pass


class ProcurementItemResponse(ProcurementItemBase):
    id: int
    procurement_id: int
    amount: Decimal

    model_config = {"from_attributes": True}


class ProcurementBase(BaseModel):
    supplier_id: int
    order_id: int | None = None
    notes: str | None = None


class ProcurementCreate(ProcurementBase):
    items: list[ProcurementItemCreate]


class ProcurementResponse(ProcurementBase):
    id: int
    procurement_no: str
    purchaser_id: int
    status: ProcurementStatus
    total_amount: Decimal
    items: list[ProcurementItemResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
