from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.employee import Employee, EmployeeRole
from app.models.system_config import SystemConfig
from app.core.deps import require_roles
from app.schemas.system_config import SystemConfigResponse, SystemConfigUpdate, SystemConfigCreate

router = APIRouter()


@router.get("")
def list_configs(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(EmployeeRole.admin)),
):
    """列出所有系统配置项（仅管理员）"""
    configs = db.query(SystemConfig).order_by(SystemConfig.id).all()
    return [SystemConfigResponse.model_validate(c).model_dump() for c in configs]


@router.get("/{key}")
def get_config(
    key: str,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(EmployeeRole.admin)),
):
    """按 key 获取配置项（仅管理员）"""
    config = db.query(SystemConfig).filter(SystemConfig.config_key == key).first()
    if not config:
        raise HTTPException(status_code=404, detail="配置项不存在")
    return SystemConfigResponse.model_validate(config).model_dump()


@router.put("/{key}")
def update_config(
    key: str,
    data: SystemConfigUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(EmployeeRole.admin)),
):
    """更新配置项值（仅管理员）"""
    config = db.query(SystemConfig).filter(SystemConfig.config_key == key).first()
    if not config:
        raise HTTPException(status_code=404, detail="配置项不存在")

    config.config_value = data.config_value
    if data.description is not None:
        config.description = data.description

    db.commit()
    db.refresh(config)
    return SystemConfigResponse.model_validate(config).model_dump()


@router.post("")
def create_config(
    data: SystemConfigCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(EmployeeRole.admin)),
):
    """创建新配置项（仅管理员）"""
    existing = db.query(SystemConfig).filter(SystemConfig.config_key == data.config_key).first()
    if existing:
        raise HTTPException(status_code=400, detail="配置键已存在")

    config = SystemConfig(
        config_key=data.config_key,
        config_value=data.config_value,
        config_type=data.config_type,
        description=data.description,
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return SystemConfigResponse.model_validate(config).model_dump()
