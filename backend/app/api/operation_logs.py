from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.operation_log import OperationLog
from app.models.employee import Employee, EmployeeRole
from app.core.deps import get_current_user, require_roles
from app.schemas.operation_log import OperationLogResponse

router = APIRouter()


@router.get("", response_model=dict)
def get_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    operator_id: int | None = None,
    module: str | None = None,
    action: str | None = None,
    target_type: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Paginated operation log list. Admin sees all; others see only their own."""
    query = db.query(OperationLog)

    # Non-admin users can only see their own logs
    if current_user.role != EmployeeRole.admin:
        query = query.filter(OperationLog.operator_id == current_user.id)

    # Apply filters
    if operator_id is not None:
        query = query.filter(OperationLog.operator_id == operator_id)
    if module:
        query = query.filter(OperationLog.module == module)
    if action:
        query = query.filter(OperationLog.action == action)
    if target_type:
        query = query.filter(OperationLog.target_type == target_type)
    if date_from:
        try:
            df = datetime.fromisoformat(date_from)
            query = query.filter(OperationLog.created_at >= df)
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to)
            query = query.filter(OperationLog.created_at <= dt)
        except ValueError:
            pass

    total = query.count()
    items = (
        query.order_by(OperationLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "total": total,
        "items": [OperationLogResponse.model_validate(item).model_dump() for item in items],
    }


@router.get("/order/{order_id}")
def get_order_logs(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Get operation log timeline for a specific order."""
    logs = (
        db.query(OperationLog)
        .filter(OperationLog.target_type == "order", OperationLog.target_id == order_id)
        .order_by(OperationLog.created_at.desc())
        .all()
    )
    return [OperationLogResponse.model_validate(log).model_dump() for log in logs]
