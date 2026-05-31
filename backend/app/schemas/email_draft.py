from datetime import datetime
from pydantic import BaseModel, ConfigDict


class EmailDraftCreate(BaseModel):
    trigger_event: str
    order_id: int
    recipient: str
    cc: str | None = None
    subject: str
    body: str


class EmailDraftUpdate(BaseModel):
    recipient: str | None = None
    cc: str | None = None
    subject: str | None = None
    body: str | None = None


class EmailDraftResponse(BaseModel):
    id: int
    trigger_event: str
    order_id: int
    recipient: str
    cc: str | None = None
    subject: str
    body: str
    status: int
    sent_at: datetime | None = None
    sent_by: int | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
