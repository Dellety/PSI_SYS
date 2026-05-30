from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.employee import Employee, EmployeeRole
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from app.core.deps import get_current_user, require_roles
from app.core.security import hash_password

router = APIRouter()


@router.get("")
def list_employees(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    keyword: str | None = None,
    role: EmployeeRole | None = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(EmployeeRole.admin)),
):
    query = db.query(Employee)
    if role:
        query = query.filter(Employee.role == role)
    if keyword:
        query = query.filter(
            (Employee.name.contains(keyword)) | (Employee.employee_no.contains(keyword))
        )
    total = query.count()
    items = (
        query.order_by(Employee.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {"total": total, "items": [EmployeeResponse.model_validate(e) for e in items]}


@router.post("", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(
    data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(EmployeeRole.admin)),
):
    if db.query(Employee).filter(Employee.login_name == data.login_name).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="登录名已存在"
        )
    employee = Employee(
        employee_no=data.employee_no,
        login_name=data.login_name,
        password_hash=hash_password(data.password),
        name=data.name,
        phone=data.phone,
        email=data.email,
        role=data.role,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    data: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(EmployeeRole.admin)),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="人员不存在"
        )
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(employee, field, value)
    db.commit()
    db.refresh(employee)
    return employee


@router.put("/{employee_id}/status")
def toggle_employee_status(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(EmployeeRole.admin)),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="人员不存在"
        )
    employee.status = 0 if employee.status == 1 else 1
    db.commit()
    db.refresh(employee)
    return {"code": 0, "message": "success", "status": employee.status}


@router.get("/simple-list")
def simple_list(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    employees = (
        db.query(Employee.id, Employee.name, Employee.role)
        .filter(Employee.status == 1)
        .all()
    )
    return [
        {"id": e.id, "name": e.name, "role": e.role.value} for e in employees
    ]
