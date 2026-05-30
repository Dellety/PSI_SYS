from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class SupplierMaterialBase(BaseModel):
    material_id: int
    supply_price: Decimal | None = None
    supply_price_date: date | None = None
    is_primary: int = 0


class SupplierBase(BaseModel):
    name: str
    contact_person: str
    contact_phone: str
    contact_email: str | None = None
    company_address: str | None = None
    brands: str | None = None
    categories: str | None = None
    cooperation_status: int = 1
    first_cooperation_date: date | None = None
    avg_delivery_days: int | None = None
    quality_rating: int | None = None
    settlement_method: str | None = None
    tax_rate: Decimal | None = None
    invoice_type: str | None = None
    bank_name: str | None = None
    bank_account: str | None = None
    bank_account_name: str | None = None
    remark: str | None = None


class SupplierCreate(SupplierBase):
    materials: list[SupplierMaterialBase] = []


class SupplierUpdate(BaseModel):
    name: str | None = None
    contact_person: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    company_address: str | None = None
    brands: str | None = None
    categories: str | None = None
    cooperation_status: int | None = None
    first_cooperation_date: date | None = None
    avg_delivery_days: int | None = None
    quality_rating: int | None = None
    settlement_method: str | None = None
    tax_rate: Decimal | None = None
    invoice_type: str | None = None
    bank_name: str | None = None
    bank_account: str | None = None
    bank_account_name: str | None = None
    remark: str | None = None


class SupplierMaterialResponse(SupplierMaterialBase):
    id: int
    supplier_id: int
    material_code: str | None = None
    material_name: str | None = None
    model_config = ConfigDict(from_attributes=True)


class SupplierResponse(SupplierBase):
    id: int
    supplier_code: str
    total_purchase_amount: Decimal
    total_purchase_count: int
    last_purchase_date: date | None
    status: int
    created_at: datetime
    updated_at: datetime
    materials: list[SupplierMaterialResponse] = []
    model_config = ConfigDict(from_attributes=True)


class SupplierStatusUpdate(BaseModel):
    status: int  # 1-启用 0-停用


class SupplierMaterialUpdate(BaseModel):
    supply_price: Decimal | None = None
    supply_price_date: date | None = None
    is_primary: int | None = None
