from datetime import datetime
from pydantic import BaseModel


class CustomerBase(BaseModel):
    name: str
    company_name: str | None = None
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    notes: str | None = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(CustomerBase):
    pass


class CustomerResponse(CustomerBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
