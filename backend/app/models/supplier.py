from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, DateTime, Date, Text, Numeric, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Supplier(Base):
    __tablename__ = "supplier"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    supplier_code: Mapped[str] = mapped_column(String(30), unique=True, comment="供应商编码(自动生成)")
    name: Mapped[str] = mapped_column(String(100), comment="供应商名称")
    contact_person: Mapped[str] = mapped_column(String(50), comment="联系人")
    contact_phone: Mapped[str] = mapped_column(String(20), comment="联系人电话")
    contact_email: Mapped[str | None] = mapped_column(String(100), comment="邮箱")
    company_address: Mapped[str | None] = mapped_column(String(300), comment="公司地址")
    brands: Mapped[str | None] = mapped_column(String(500), comment="主营品牌")
    categories: Mapped[str | None] = mapped_column(String(500), comment="供应品类")
    cooperation_status: Mapped[int] = mapped_column(Integer, default=1, comment="合作状态: 1-正常 2-暂停 3-终止")
    first_cooperation_date: Mapped[date | None] = mapped_column(Date, comment="首次合作日期")
    avg_delivery_days: Mapped[int | None] = mapped_column(Integer, comment="平均交货周期(天)")
    quality_rating: Mapped[int | None] = mapped_column(Integer, comment="质量评级: 1-优 2-良 3-差")
    settlement_method: Mapped[str | None] = mapped_column(String(30), comment="结算方式")
    tax_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), comment="税率")
    invoice_type: Mapped[str | None] = mapped_column(String(30), comment="发票类型")
    bank_name: Mapped[str | None] = mapped_column(String(100), comment="开户银行")
    bank_account: Mapped[str | None] = mapped_column(String(50), comment="银行账号")
    bank_account_name: Mapped[str | None] = mapped_column(String(100), comment="银行户名")
    total_purchase_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), comment="累计采购金额")
    total_purchase_count: Mapped[int] = mapped_column(Integer, default=0, comment="累计采购次数")
    last_purchase_date: Mapped[date | None] = mapped_column(Date, comment="最近采购日期")
    remark: Mapped[str | None] = mapped_column(Text, comment="备注")
    status: Mapped[int] = mapped_column(Integer, default=1, comment="状态: 1-启用 0-停用")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    materials: Mapped[list["SupplierMaterial"]] = relationship(back_populates="supplier", cascade="all, delete-orphan")


class SupplierMaterial(Base):
    __tablename__ = "supplier_material"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("supplier.id"), comment="供应商ID")
    material_id: Mapped[int] = mapped_column(ForeignKey("material.id"), comment="物料ID")
    supply_price: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), comment="最近供货价格")
    supply_price_date: Mapped[date | None] = mapped_column(Date, comment="供货价格日期")
    is_primary: Mapped[int] = mapped_column(Integer, default=0, comment="是否主供应商: 1-是 0-否")

    supplier: Mapped["Supplier"] = relationship(back_populates="materials")
