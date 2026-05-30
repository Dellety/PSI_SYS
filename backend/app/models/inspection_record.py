from datetime import datetime
from decimal import Decimal
from sqlalchemy import DateTime, Text, Numeric, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class InspectionRecord(Base):
    __tablename__ = "inspection_record"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    purchase_order_id: Mapped[int] = mapped_column(ForeignKey("purchase_order.id"), comment="采购单ID")
    inspector_id: Mapped[int] = mapped_column(ForeignKey("employee.id"), comment="验收人ID")
    inspection_date: Mapped[datetime] = mapped_column(DateTime, comment="验收日期")
    inspection_result: Mapped[int] = mapped_column(Integer, comment="验收结果: 1-合格 2-不合格")
    actual_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 2), comment="实收数量")
    remark: Mapped[str | None] = mapped_column(Text, comment="备注")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
