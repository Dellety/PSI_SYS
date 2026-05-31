from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SystemConfigResponse(BaseModel):
    id: int
    config_key: str
    config_value: str
    config_type: str
    description: str | None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SystemConfigUpdate(BaseModel):
    config_value: str
    description: str | None = None


class SystemConfigCreate(BaseModel):
    config_key: str
    config_value: str
    config_type: str = "string"  # string/json/number
    description: str | None = None
