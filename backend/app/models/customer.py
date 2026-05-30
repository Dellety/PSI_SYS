from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, DateTime, Text, Numeric, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Customer(Base):
    __tablename__ = "customer"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    customer_code: Mapped[str] = mapped_column(String(30), unique=True, comment="客户编码(自动生成)")
    name: Mapped[str] = mapped_column(String(100), comment="客户名称")
    contact_person: Mapped[str] = mapped_column(String(50), comment="对接人")
    contact_phone: Mapped[str] = mapped_column(String(20), comment="联系电话")
    contact_email: Mapped[str | None] = mapped_column(String(100), comment="邮箱")
    sales_id: Mapped[int | None] = mapped_column(ForeignKey("employee.id"), comment="归属销售ID")
    customer_level: Mapped[int | None] = mapped_column(Integer, comment="客户级别: 1-A 2-B 3-C")
    total_order_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), comment="累计下单金额")
    total_order_count: Mapped[int] = mapped_column(Integer, default=0, comment="累计下单次数")
    remark: Mapped[str | None] = mapped_column(Text, comment="备注")
    status: Mapped[int] = mapped_column(Integer, default=1, comment="状态: 1-启用 0-停用")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    addresses: Mapped[list["CustomerAddress"]] = relationship(back_populates="customer", cascade="all, delete-orphan")
    invoices: Mapped[list["CustomerInvoice"]] = relationship(back_populates="customer", cascade="all, delete-orphan")


class CustomerAddress(Base):
    __tablename__ = "customer_address"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customer.id"), comment="客户ID")
    address_type: Mapped[int] = mapped_column(Integer, comment="地址类型: 1-工厂 2-客户 3-其他")
    receiver_name: Mapped[str] = mapped_column(String(50), comment="收货人")
    receiver_phone: Mapped[str] = mapped_column(String(20), comment="收货人电话")
    province: Mapped[str | None] = mapped_column(String(30), comment="省")
    city: Mapped[str | None] = mapped_column(String(30), comment="市")
    district: Mapped[str | None] = mapped_column(String(30), comment="区")
    detail_address: Mapped[str] = mapped_column(String(300), comment="详细地址")
    is_default: Mapped[int] = mapped_column(Integer, default=0, comment="是否默认: 1-是 0-否")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    customer: Mapped["Customer"] = relationship(back_populates="addresses")


class CustomerInvoice(Base):
    __tablename__ = "customer_invoice"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customer.id"), comment="客户ID")
    invoice_title: Mapped[str] = mapped_column(String(200), comment="开票抬头")
    tax_no: Mapped[str] = mapped_column(String(50), comment="税号")
    bank_name: Mapped[str | None] = mapped_column(String(100), comment="开户银行")
    bank_account: Mapped[str | None] = mapped_column(String(50), comment="银行账号")
    invoice_address: Mapped[str | None] = mapped_column(String(300), comment="开票地址")
    invoice_phone: Mapped[str | None] = mapped_column(String(20), comment="开票电话")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    customer: Mapped["Customer"] = relationship(back_populates="invoices")
