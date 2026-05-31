from datetime import date, datetime
from fastapi import APIRouter, Depends
from sqlalchemy import func, extract
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.contract_order import ContractOrder, OrderStatus
from app.models.employee import Employee, EmployeeRole
from app.core.deps import get_current_user

router = APIRouter()


@router.get("/overview")
def dashboard_overview(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Order overview statistics for the dashboard."""
    # Base query filtered by role
    base_query = db.query(ContractOrder)
    if current_user.role == EmployeeRole.sales:
        base_query = base_query.filter(ContractOrder.sales_id == current_user.id)
    elif current_user.role == EmployeeRole.project_manager:
        base_query = base_query.filter(ContractOrder.project_manager_id == current_user.id)

    # In-transit orders (not closed and not cancelled)
    in_transit = base_query.filter(
        ContractOrder.status != OrderStatus.closed,
        ContractOrder.status != OrderStatus.cancelled,
    ).count()

    # Status distribution
    status_rows = (
        base_query.with_entities(ContractOrder.status, func.count(ContractOrder.id))
        .group_by(ContractOrder.status)
        .all()
    )
    status_distribution = [
        {"status": s.value, "count": cnt} for s, cnt in status_rows
    ]

    # Urgent orders
    urgent_count = base_query.filter(
        ContractOrder.is_urgent == 1,
        ContractOrder.status != OrderStatus.closed,
        ContractOrder.status != OrderStatus.cancelled,
    ).count()

    # Today's new orders
    today = date.today()
    today_count = base_query.filter(
        func.date(ContractOrder.created_at) == today,
    ).count()

    # This month's new orders
    month_count = base_query.filter(
        extract("year", ContractOrder.created_at) == today.year,
        extract("month", ContractOrder.created_at) == today.month,
    ).count()

    return {
        "active_count": in_transit,
        "status_distribution": status_distribution,
        "urgent_count": urgent_count,
        "today_count": today_count,
        "month_count": month_count,
    }
