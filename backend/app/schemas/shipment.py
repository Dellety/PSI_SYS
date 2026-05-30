from datetime import datetime
from pydantic import BaseModel
from app.models.shipment import ShipmentStatus


class ShipmentItemBase(BaseModel):
    part_id: int
    quantity: int


class ShipmentItemCreate(ShipmentItemBase):
    pass


class ShipmentItemResponse(ShipmentItemBase):
    id: int
    shipment_id: int

    model_config = {"from_attributes": True}


class ShipmentCreate(BaseModel):
    procurement_id: int
    carrier: str | None = None
    tracking_no: str | None = None
    notes: str | None = None
    items: list[ShipmentItemCreate]


class ShipmentResponse(BaseModel):
    id: int
    shipment_no: str
    procurement_id: int
    shipper_id: int
    carrier: str | None = None
    tracking_no: str | None = None
    status: ShipmentStatus
    shipped_at: datetime | None = None
    notes: str | None = None
    items: list[ShipmentItemResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
