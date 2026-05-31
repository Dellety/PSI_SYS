import enum
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, DateTime, Text, Enum, Numeric, Integer, ForeignKey, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class OrderStatus(str, enum.Enum):
    """订单状态枚举 - 13种正向/异常状态"""
    # 正向流程
    pending_confirm = "pending_confirm"          # 待确认内容
    pending_quote = "pending_quote"              # 待报价
    pending_contract = "pending_contract"        # 待签合同
    pending_dispatch = "pending_dispatch"        # 待下料
    pending_purchase = "pending_purchase"        # 待采购
    purchasing = "purchasing"                    # 采购中
    pending_inspect = "pending_inspect"          # 待验收
    inspecting = "inspecting"                    # 验收中
    pending_ship = "pending_ship"                # 待发货
    shipped = "shipped"                          # 已发货
    pending_receipt = "pending_receipt"          # 待签收
    received = "received"                        # 已签收
    closed = "closed"                            # 已关闭
    # 异常流程
    return_exchange = "return_exchange"          # 退换货中
    cancelled = "cancelled"                      # 已取消


class DeliveryItemStatus(str, enum.Enum):
    """订单明细发货状态"""
    pending_purchase = "pending_purchase"        # 待采购
    purchasing = "purchasing"                    # 采购中
    arrived = "arrived"                          # 已到货
    shipped = "shipped"                          # 已发货
    received = "received"                        # 已签收


class ContractOrder(Base):
    __tablename__ = "contract_order"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_no: Mapped[str] = mapped_column(String(30), unique=True, index=True, comment="订单编号(自动生成)")
    contract_no: Mapped[str | None] = mapped_column(String(50), comment="合同编号(手工录入)")
    customer_id: Mapped[int] = mapped_column(ForeignKey("customer.id"), comment="客户ID")
    sales_id: Mapped[int] = mapped_column(ForeignKey("employee.id"), comment="销售员ID")
    project_manager_id: Mapped[int] = mapped_column(ForeignKey("employee.id"), comment="项目负责人ID")
    total_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), comment="合同总价")
    delivery_date: Mapped[str | None] = mapped_column(Date, comment="承诺交货日期")
    sign_date: Mapped[str | None] = mapped_column(Date, comment="签订日期")
    is_urgent: Mapped[int] = mapped_column(Integer, default=0, comment="是否加急: 0-否 1-是")
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), default=OrderStatus.pending_confirm, comment="订单状态")
    factory_demand_desc: Mapped[str | None] = mapped_column(Text, comment="工厂需求描述")
    contract_attachment: Mapped[str | None] = mapped_column(String(500), comment="合同附件路径")
    remark: Mapped[str | None] = mapped_column(Text, comment="备注")
    created_by: Mapped[int] = mapped_column(ForeignKey("employee.id"), comment="创建人")
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, comment="关闭时间")
    closed_by: Mapped[int | None] = mapped_column(ForeignKey("employee.id"), comment="关闭人")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    items: Mapped[list["ContractOrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan", foreign_keys="ContractOrderItem.order_id")
    customer = relationship("Customer", foreign_keys=[customer_id], lazy="selectin")
    sales = relationship("Employee", foreign_keys=[sales_id], lazy="selectin")
    pm = relationship("Employee", foreign_keys=[project_manager_id], lazy="selectin")


class ContractOrderItem(Base):
    __tablename__ = "contract_order_item"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("contract_order.id"), comment="订单ID")
    material_id: Mapped[int] = mapped_column(ForeignKey("material.id"), comment="物料ID")
    material_code: Mapped[str] = mapped_column(String(50), comment="物料编码(冗余)")
    material_name: Mapped[str] = mapped_column(String(100), comment="物料名称(冗余)")
    brand: Mapped[str | None] = mapped_column(String(50), comment="品牌(冗余)")
    model: Mapped[str | None] = mapped_column(String(100), comment="型号(冗余)")
    quantity: Mapped[Decimal] = mapped_column(Numeric(15, 2), comment="数量")
    unit: Mapped[str] = mapped_column(String(20), comment="单位")
    unit_price: Mapped[Decimal] = mapped_column(Numeric(15, 2), comment="单价(客户报价)")
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), comment="金额")
    purchase_price: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), comment="采购单价")
    delivery_status: Mapped[DeliveryItemStatus] = mapped_column(
        Enum(DeliveryItemStatus), default=DeliveryItemStatus.pending_purchase, comment="发货状态"
    )

    order: Mapped["ContractOrder"] = relationship(back_populates="items", foreign_keys=[order_id])
