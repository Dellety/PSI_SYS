from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.return_exchange import ReturnStatus


class ReturnExchangeCreate(BaseModel):
    order_id: int
    order_item_id: int
    type: int  # 1-退货 2-换货
    reason: str
    purchase_order_id: int | None = None
    remark: str | None = None


class ReturnConfirmRequest(BaseModel):
    project_confirmed: int  # 1-确认 2-拒绝


class ReturnCompleteRequest(BaseModel):
    remark: str | None = None


class ReturnExchangeResponse(BaseModel):
    id: int
    return_no: str
    order_id: int
    order_item_id: int
    type: int
    reason: str
    initiator_id: int
    project_confirmed: int
    project_confirmed_by: int | None = None
    status: ReturnStatus
    purchase_order_id: int | None = None
    remark: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
