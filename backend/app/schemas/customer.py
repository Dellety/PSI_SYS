from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class CustomerAddressBase(BaseModel):
    address_type: int = 1
    receiver_name: str
    receiver_phone: str
    province: str | None = None
    city: str | None = None
    district: str | None = None
    detail_address: str
    is_default: int = 0


class CustomerInvoiceBase(BaseModel):
    invoice_title: str
    tax_no: str
    bank_name: str | None = None
    bank_account: str | None = None
    invoice_address: str | None = None
    invoice_phone: str | None = None


class CustomerBase(BaseModel):
    name: str
    contact_person: str
    contact_phone: str
    contact_email: str | None = None
    sales_id: int | None = None
    customer_level: int | None = None
    remark: str | None = None


class CustomerCreate(CustomerBase):
    addresses: list[CustomerAddressBase] = []
    invoices: list[CustomerInvoiceBase] = []


class CustomerUpdate(BaseModel):
    name: str | None = None
    contact_person: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    sales_id: int | None = None
    customer_level: int | None = None
    remark: str | None = None


class CustomerAddressResponse(CustomerAddressBase):
    id: int
    customer_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CustomerInvoiceResponse(CustomerInvoiceBase):
    id: int
    customer_id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CustomerResponse(CustomerBase):
    id: int
    customer_code: str
    total_order_amount: Decimal
    total_order_count: int
    status: int
    created_at: datetime
    updated_at: datetime
    addresses: list[CustomerAddressResponse] = []
    invoices: list[CustomerInvoiceResponse] = []
    model_config = ConfigDict(from_attributes=True)


class CustomerStatusUpdate(BaseModel):
    status: int  # 1-启用 0-停用


class CustomerSimpleItem(BaseModel):
    id: int
    name: str
    customer_code: str
    model_config = ConfigDict(from_attributes=True)
