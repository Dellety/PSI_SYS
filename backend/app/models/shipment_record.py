from datetime import datetime
from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ShipmentRecord(Base):
    __tablename__ = "shipment_record"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("contract_order.id"), comment="订单ID")
    shipment_no: Mapped[str] = mapped_column(String(30), unique=True, comment="发货单号(自动生成)")
    express_company: Mapped[str] = mapped_column(String(50), comment="物流公司")
    tracking_no: Mapped[str] = mapped_column(String(50), comment="物流单号")
    receiver_name: Mapped[str] = mapped_column(String(50), comment="收货人")
    receiver_phone: Mapped[str] = mapped_column(String(20), comment="收货人电话")
    shipping_address: Mapped[str] = mapped_column(String(300), comment="收货地址")
    shipment_date: Mapped[datetime] = mapped_column(DateTime, comment="发货日期")
    shipped_by: Mapped[int] = mapped_column(ForeignKey("employee.id"), comment="发货人ID")
    address_confirmed_by: Mapped[int | None] = mapped_column(ForeignKey("employee.id"), comment="地址确认人ID")
    address_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime, comment="地址确认时间")
    remark: Mapped[str | None] = mapped_column(Text, comment="备注")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
