from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ReceiptRecord(Base):
    __tablename__ = "receipt_record"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("contract_order.id"), comment="订单ID")
    shipment_id: Mapped[int] = mapped_column(ForeignKey("shipment_record.id"), comment="发货记录ID")
    receipt_date: Mapped[date] = mapped_column(Date, comment="签收日期")
    receipt_status: Mapped[int] = mapped_column(Integer, comment="签收状态: 1-已签收 2-有问题")
    receipt_attachment: Mapped[str | None] = mapped_column(String(500), comment="签收附件路径")
    archived_by: Mapped[int | None] = mapped_column(ForeignKey("employee.id"), comment="归档人ID")
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, comment="归档时间")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
