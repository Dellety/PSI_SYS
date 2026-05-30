from datetime import datetime
from pydantic import BaseModel
from app.models.user import UserRole


class UserBase(BaseModel):
    username: str
    name: str
    phone: str | None = None
    email: str | None = None
    role: UserRole = UserRole.sales


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserMe(BaseModel):
    id: int
    username: str
    name: str
    role: UserRole
    phone: str | None = None
    email: str | None = None

    model_config = {"from_attributes": True}
