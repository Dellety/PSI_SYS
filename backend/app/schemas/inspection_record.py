from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class InspectionRecordCreate(BaseModel):
    purchase_order_id: int
    inspection_result: int  # 1-合格 2-不合格
    actual_quantity: Decimal
    remark: str | None = None


class InspectionRecordResponse(BaseModel):
    id: int
    purchase_order_id: int
    inspector_id: int
    inspection_date: datetime
    inspection_result: int
    actual_quantity: Decimal
    remark: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
