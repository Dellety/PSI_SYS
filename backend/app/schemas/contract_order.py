from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from app.models.contract_order import OrderStatus, DeliveryItemStatus


# ── Order Item schemas ──────────────────────────────────────────


class ContractOrderItemCreate(BaseModel):
    material_id: int
    material_code: str
    material_name: str
    brand: str | None = None
    model: str | None = None
    quantity: Decimal
    unit: str
    unit_price: Decimal
    amount: Decimal


class ContractOrderItemResponse(BaseModel):
    id: int
    order_id: int
    material_id: int
    material_code: str
    material_name: str
    brand: str | None = None
    model: str | None = None
    quantity: Decimal
    unit: str
    unit_price: Decimal
    amount: Decimal
    purchase_price: Decimal | None = None
    delivery_status: DeliveryItemStatus

    model_config = ConfigDict(from_attributes=True)


# ── Order Create / Update schemas ───────────────────────────────


class ContractOrderCreate(BaseModel):
    """创建订单 - sales_id/created_by 由后端注入，total_amount 由后端计算"""
    customer_id: int
    project_manager_id: int
    delivery_date: date | None = None
    is_urgent: int = 0
    factory_demand_desc: str | None = None
    remark: str | None = None
    items: list[ContractOrderItemCreate]


class ContractOrderUpdate(BaseModel):
    contract_no: str | None = None
    sign_date: date | None = None
    delivery_date: date | None = None
    is_urgent: int | None = None
    factory_demand_desc: str | None = None
    contract_attachment: str | None = None
    remark: str | None = None


class ContractInfoUpdate(BaseModel):
    """录入合同信息 (M6-02)"""
    contract_no: str | None = None
    sign_date: date | None = None
    contract_attachment: str | None = None


class ContractStatusChange(BaseModel):
    target_status: OrderStatus


# ── Order Response schemas ──────────────────────────────────────


class ContractOrderResponse(BaseModel):
    id: int
    order_no: str
    contract_no: str | None = None
    customer_id: int
    sales_id: int
    project_manager_id: int
    total_amount: Decimal
    delivery_date: date | None = None
    sign_date: date | None = None
    is_urgent: int
    status: OrderStatus
    factory_demand_desc: str | None = None
    contract_attachment: str | None = None
    remark: str | None = None
    created_by: int
    closed_at: datetime | None = None
    closed_by: int | None = None
    created_at: datetime
    updated_at: datetime
    items: list[ContractOrderItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ContractOrderListItem(BaseModel):
    id: int
    order_no: str
    contract_no: str | None = None
    customer_id: int
    sales_id: int
    project_manager_id: int
    total_amount: Decimal
    delivery_date: date | None = None
    sign_date: date | None = None
    is_urgent: int
    status: OrderStatus
    factory_demand_desc: str | None = None
    remark: str | None = None
    created_by: int
    created_at: datetime
    updated_at: datetime
    item_count: int = 0

    model_config = ConfigDict(from_attributes=True)
