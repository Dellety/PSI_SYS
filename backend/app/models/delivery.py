import enum
from datetime import datetime
from sqlalchemy import String, DateTime, Text, Enum, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class DeliveryStatus(str, enum.Enum):
    pending = "pending"
    delivered = "delivered"
    accepted = "accepted"
    rejected = "rejected"


class ItemCondition(str, enum.Enum):
    normal = "normal"
    damaged = "damaged"
    short = "short"


class Delivery(Base):
    __tablename__ = "deliveries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    delivery_no: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    shipment_id: Mapped[int] = mapped_column(ForeignKey("shipments.id"))
    status: Mapped[DeliveryStatus] = mapped_column(Enum(DeliveryStatus), default=DeliveryStatus.pending)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime)
    receiver_name: Mapped[str | None] = mapped_column(String(100))
    receiver_phone: Mapped[str | None] = mapped_column(String(20))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    items: Mapped[list["DeliveryItem"]] = relationship(back_populates="delivery", cascade="all, delete-orphan")


class DeliveryItem(Base):
    __tablename__ = "delivery_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    delivery_id: Mapped[int] = mapped_column(ForeignKey("deliveries.id"))
    part_id: Mapped[int] = mapped_column(ForeignKey("parts.id"))
    quantity: Mapped[int] = mapped_column(Integer)
    condition: Mapped[ItemCondition] = mapped_column(Enum(ItemCondition), default=ItemCondition.normal)

    delivery: Mapped["Delivery"] = relationship(back_populates="items")
