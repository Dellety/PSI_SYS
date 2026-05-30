import enum
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, DateTime, Text, Enum, Numeric, Integer, ForeignKey, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ProcurementStatus(str, enum.Enum):
    pending = "pending"
    quoted = "quoted"
    confirmed = "confirmed"
    ordered = "ordered"
    received = "received"


class Procurement(Base):
    __tablename__ = "procurements"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    procurement_no: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"))
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"))
    purchaser_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    status: Mapped[ProcurementStatus] = mapped_column(Enum(ProcurementStatus), default=ProcurementStatus.pending)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    items: Mapped[list["ProcurementItem"]] = relationship(back_populates="procurement", cascade="all, delete-orphan")


class ProcurementItem(Base):
    __tablename__ = "procurement_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    procurement_id: Mapped[int] = mapped_column(ForeignKey("procurements.id"))
    part_id: Mapped[int] = mapped_column(ForeignKey("parts.id"))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    expected_date: Mapped[datetime | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)

    procurement: Mapped["Procurement"] = relationship(back_populates="items")
