from sqlalchemy.orm import Session
from app.models.operation_log import OperationLog
from app.models.employee import Employee


def log_operation(
    db: Session,
    operator: Employee,
    module: str,
    action: str,
    target_type: str,
    target_id: int,
    detail: str | None = None,
):
    """Record an operation log entry. Call this from any API handler."""
    # Convert EmployeeRole enum to its int ordinal for storage
    from app.models.employee import EmployeeRole

    role_map = {
        EmployeeRole.admin: 1,
        EmployeeRole.sales: 2,
        EmployeeRole.project_manager: 3,
        EmployeeRole.purchaser: 4,
    }
    role_value = role_map.get(operator.role, 0)

    log = OperationLog(
        operator_id=operator.id,
        operator_name=operator.name,
        operator_role=role_value,
        module=module,
        action=action,
        target_type=target_type,
        target_id=target_id,
        detail=detail,
    )
    db.add(log)
    # NOTE: caller is responsible for db.commit()
