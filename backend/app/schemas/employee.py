from datetime import datetime
from pydantic import BaseModel
from app.models.employee import EmployeeRole


class EmployeeBase(BaseModel):
    employee_no: str
    login_name: str
    name: str
    phone: str | None = None
    email: str | None = None
    role: EmployeeRole = EmployeeRole.sales


class EmployeeCreate(EmployeeBase):
    password: str


class EmployeeUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    role: EmployeeRole | None = None
    status: int | None = None


class EmployeeResponse(EmployeeBase):
    id: int
    status: int
    created_at: datetime

    model_config = {"from_attributes": True}


class EmployeeMe(BaseModel):
    id: int
    employee_no: str
    login_name: str
    name: str
    role: EmployeeRole
    phone: str | None = None
    email: str | None = None

    model_config = {"from_attributes": True}
