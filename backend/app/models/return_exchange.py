import enum
from datetime import datetime
from sqlalchemy import String, DateTime, Text, Integer, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ReturnStatus(str, enum.Enum):
    """退换货状态"""
    pending_confirm = "pending_confirm"    # 待确认
    processing = "processing"              # 处理中
    completed = "completed"                # 已完成
    cancelled = "cancelled"                # 已取消


class ReturnExchangeRecord(Base):
    __tablename__ = "return_exchange_record"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    return_no: Mapped[str] = mapped_column(String(30), unique=True, comment="退换货单号")
    order_id: Mapped[int] = mapped_column(ForeignKey("contract_order.id"), comment="订单ID")
    order_item_id: Mapped[int] = mapped_column(ForeignKey("contract_order_item.id"), comment="订单明细ID")
    type: Mapped[int] = mapped_column(Integer, comment="类型: 1-退货 2-换货")
    reason: Mapped[str] = mapped_column(Text, comment="原因")
    initiator_id: Mapped[int] = mapped_column(ForeignKey("employee.id"), comment="发起人ID")
    project_confirmed: Mapped[int] = mapped_column(Integer, default=0, comment="项目确认: 0-待确认 1-已确认 2-拒绝")
    project_confirmed_by: Mapped[int | None] = mapped_column(ForeignKey("employee.id"), comment="项目确认人ID")
    status: Mapped[ReturnStatus] = mapped_column(Enum(ReturnStatus), default=ReturnStatus.pending_confirm, comment="状态")
    purchase_order_id: Mapped[int | None] = mapped_column(ForeignKey("purchase_order.id"), comment="关联采购单ID")
    remark: Mapped[str | None] = mapped_column(Text, comment="备注")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)
