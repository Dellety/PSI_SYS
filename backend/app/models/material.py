from datetime import datetime
from sqlalchemy import String, DateTime, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Material(Base):
    __tablename__ = "material"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    material_code: Mapped[str] = mapped_column(String(50), unique=True, comment="物料编码(唯一)")
    name: Mapped[str] = mapped_column(String(100), comment="物料名称")
    brand: Mapped[str | None] = mapped_column(String(50), comment="品牌")
    model: Mapped[str | None] = mapped_column(String(100), comment="型号")
    specs: Mapped[str | None] = mapped_column(String(200), comment="规格参数")
    unit: Mapped[str] = mapped_column(String(20), comment="计量单位")
    category: Mapped[str | None] = mapped_column(String(50), comment="分类")
    description: Mapped[str | None] = mapped_column(Text, comment="备注")
    status: Mapped[int] = mapped_column(Integer, default=1, comment="状态: 1-启用 0-停用")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)
