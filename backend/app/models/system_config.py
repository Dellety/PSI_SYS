from datetime import datetime
from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class SystemConfig(Base):
    __tablename__ = "system_config"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    config_key: Mapped[str] = mapped_column(String(100), unique=True, comment="配置键")
    config_value: Mapped[str | None] = mapped_column(Text, comment="配置值")
    config_type: Mapped[str] = mapped_column(String(20), default="string", comment="类型: string/json/number")
    description: Mapped[str | None] = mapped_column(String(200), comment="描述")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)
