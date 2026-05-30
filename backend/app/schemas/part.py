from datetime import datetime
from pydantic import BaseModel


class PartBase(BaseModel):
    part_number: str
    name: str
    brand: str | None = None
    spec: str | None = None
    category: str | None = None
    unit: str | None = None
    description: str | None = None


class PartCreate(PartBase):
    pass


class PartUpdate(PartBase):
    pass


class PartResponse(PartBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
