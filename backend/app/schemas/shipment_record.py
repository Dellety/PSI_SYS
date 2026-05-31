from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ShipmentRecordCreate(BaseModel):
    order_id: int
    express_company: str
    tracking_no: str
    receiver_name: str
    receiver_phone: str
    shipping_address: str
    remark: str | None = None


class ShipmentRecordUpdate(BaseModel):
    express_company: str | None = None
    tracking_no: str | None = None
    remark: str | None = None


class AddressConfirmRequest(BaseModel):
    pass  # 确认动作本身不需要额外字段


class ShipmentRecordResponse(BaseModel):
    id: int
    order_id: int
    shipment_no: str
    express_company: str
    tracking_no: str
    receiver_name: str
    receiver_phone: str
    shipping_address: str
    shipment_date: datetime
    shipped_by: int
    address_confirmed_by: int | None = None
    address_confirmed_at: datetime | None = None
    remark: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
