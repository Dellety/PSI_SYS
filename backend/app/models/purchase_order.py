import enum
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, DateTime, Date, Text, Numeric, Integer, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class PurchaseStatus(str, enum.Enum):
    """采购单状态"""
    pending = "pending"            # 待采购
    purchasing = "purchasing"      # 采购中
    ordered = "ordered"            # 已下单
    arrived = "arrived"            # 已到货
    inspected = "inspected"        # 已验收


class PurchaseOrder(Base):
    __tablename__ = "purchase_order"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    purchase_no: Mapped[str] = mapped_column(String(30), unique=True, comment="采购单号(自动生成)")
    order_id: Mapped[int] = mapped_column(ForeignKey("contract_order.id"), comment="订单ID")
    order_item_id: Mapped[int] = mapped_column(ForeignKey("contract_order_item.id"), comment="订单明细ID")
    supplier_id: Mapped[int] = mapped_column(ForeignKey("supplier.id"), comment="供应商ID")
    material_id: Mapped[int] = mapped_column(ForeignKey("material.id"), comment="物料ID")
    quantity: Mapped[Decimal] = mapped_column(Numeric(15, 2), comment="数量")
    unit_price: Mapped[Decimal] = mapped_column(Numeric(15, 2), comment="采购单价")
    total_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), comment="采购总额")
    purchaser_id: Mapped[int] = mapped_column(ForeignKey("employee.id"), comment="采购员ID")
    status: Mapped[PurchaseStatus] = mapped_column(Enum(PurchaseStatus), default=PurchaseStatus.pending, comment="采购状态")
    expected_delivery_date: Mapped[date | None] = mapped_column(Date, comment="预计到货日期")
    actual_delivery_date: Mapped[date | None] = mapped_column(Date, comment="实际到货日期")
    remark: Mapped[str | None] = mapped_column(Text, comment="备注")
    created_by: Mapped[int] = mapped_column(ForeignKey("employee.id"), comment="创建人ID")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)
