from datetime import datetime
from sqlalchemy import String, DateTime, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class EmailDraft(Base):
    __tablename__ = "email_draft"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    trigger_event: Mapped[str] = mapped_column(String(50), comment="触发事件")
    order_id: Mapped[int] = mapped_column(ForeignKey("contract_order.id"), comment="订单ID")
    recipient: Mapped[str] = mapped_column(String(100), comment="收件人")
    cc: Mapped[str | None] = mapped_column(String(500), comment="抄送")
    subject: Mapped[str] = mapped_column(String(200), comment="主题")
    body: Mapped[str] = mapped_column(Text, comment="正文")
    status: Mapped[int] = mapped_column(Integer, default=1, comment="状态: 1-待确认 2-已发送 3-已取消")
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, comment="发送时间")
    sent_by: Mapped[int | None] = mapped_column(ForeignKey("employee.id"), comment="发送人ID")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
