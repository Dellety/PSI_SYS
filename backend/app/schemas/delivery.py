from datetime import datetime
from pydantic import BaseModel
from app.models.delivery import DeliveryStatus, ItemCondition


class DeliveryItemBase(BaseModel):
    part_id: int
    quantity: int
    condition: ItemCondition = ItemCondition.normal


class DeliveryItemCreate(DeliveryItemBase):
    pass


class DeliveryItemResponse(DeliveryItemBase):
    id: int
    delivery_id: int

    model_config = {"from_attributes": True}


class DeliveryCreate(BaseModel):
    shipment_id: int
    notes: str | None = None
    items: list[DeliveryItemCreate]


class DeliveryConfirm(BaseModel):
    receiver_name: str
    receiver_phone: str
    notes: str | None = None


class DeliveryResponse(BaseModel):
    id: int
    delivery_no: str
    shipment_id: int
    status: DeliveryStatus
    delivered_at: datetime | None = None
    receiver_name: str | None = None
    receiver_phone: str | None = None
    notes: str | None = None
    items: list[DeliveryItemResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
