import enum
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Enum, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class EmployeeRole(str, enum.Enum):
    """4种业务角色，一人一岗"""
    admin = "admin"                              # 系统管理员
    sales = "sales"                              # 销售员
    project_manager = "project_manager"          # 项目负责人
    purchaser = "purchaser"                      # 采购员


class Employee(Base):
    __tablename__ = "employee"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    employee_no: Mapped[str] = mapped_column(String(30), unique=True, index=True, comment="工号")
    login_name: Mapped[str] = mapped_column(String(50), unique=True, index=True, comment="登录名(与OA统一)")
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(50), comment="姓名")
    phone: Mapped[str] = mapped_column(String(20), comment="手机号")
    email: Mapped[str | None] = mapped_column(String(100), comment="邮箱")
    role: Mapped[EmployeeRole] = mapped_column(Enum(EmployeeRole), comment="岗位")
    status: Mapped[int] = mapped_column(Integer, default=1, comment="状态: 1-启用 0-停用")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)
