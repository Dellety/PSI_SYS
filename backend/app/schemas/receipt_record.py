from datetime import datetime, date
from pydantic import BaseModel, ConfigDict


class ReceiptRecordCreate(BaseModel):
    order_id: int
    shipment_id: int
    receipt_date: date
    receipt_status: int  # 1-已签收 2-有问题


class ReceiptArchiveRequest(BaseModel):
    receipt_attachment: str | None = None


class ReceiptRecordResponse(BaseModel):
    id: int
    order_id: int
    shipment_id: int
    receipt_date: date
    receipt_status: int
    receipt_attachment: str | None = None
    archived_by: int | None = None
    archived_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
