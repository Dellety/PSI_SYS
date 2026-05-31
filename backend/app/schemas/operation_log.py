from datetime import datetime
from pydantic import BaseModel, ConfigDict


class OperationLogResponse(BaseModel):
    id: int
    operator_id: int
    operator_name: str
    operator_role: int
    module: str
    action: str
    target_type: str
    target_id: int
    detail: str | None = None
    ip_address: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
