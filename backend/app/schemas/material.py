from datetime import datetime
from pydantic import BaseModel, ConfigDict


class MaterialBase(BaseModel):
    material_code: str
    name: str
    brand: str | None = None
    model: str | None = None
    specs: str | None = None
    unit: str
    category: str | None = None
    description: str | None = None


class MaterialCreate(MaterialBase):
    pass


class MaterialUpdate(BaseModel):
    name: str | None = None
    brand: str | None = None
    model: str | None = None
    specs: str | None = None
    unit: str | None = None
    category: str | None = None
    description: str | None = None
    status: int | None = None


class MaterialResponse(MaterialBase):
    id: int
    status: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
