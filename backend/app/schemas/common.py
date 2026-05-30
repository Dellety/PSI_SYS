from pydantic import BaseModel
from typing import TypeVar, Generic, List

T = TypeVar("T")


class PaginationParams(BaseModel):
    page: int = 1
    page_size: int = 20
    keyword: str | None = None


class PaginatedResponse(BaseModel, Generic[T]):
    total: int
    items: List[T]


class APIResponse(BaseModel):
    code: int = 0
    message: str = "success"
