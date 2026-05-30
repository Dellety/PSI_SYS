from datetime import datetime
from sqlalchemy import String, DateTime, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class OperationLog(Base):
    __tablename__ = "operation_log"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    operator_id: Mapped[int] = mapped_column(ForeignKey("employee.id"), comment="操作人ID")
    operator_name: Mapped[str] = mapped_column(String(50), comment="操作人姓名")
    operator_role: Mapped[int] = mapped_column(Integer, comment="操作人角色(对应EmployeeRole)")
    module: Mapped[str] = mapped_column(String(30), comment="模块")
    action: Mapped[str] = mapped_column(String(50), comment="操作")
    target_type: Mapped[str] = mapped_column(String(30), comment="目标类型")
    target_id: Mapped[int] = mapped_column(comment="目标ID")
    detail: Mapped[str | None] = mapped_column(Text, comment="详情")
    ip_address: Mapped[str | None] = mapped_column(String(50), comment="IP地址")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
