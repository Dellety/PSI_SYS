from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.customer import Customer, CustomerAddress, CustomerInvoice
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerAddressBase,
    CustomerAddressResponse,
    CustomerInvoiceBase,
    CustomerInvoiceResponse,
    CustomerStatusUpdate,
    CustomerSimpleItem,
)
from app.schemas.common import PaginatedResponse
from app.core.deps import get_current_user
from app.models.employee import Employee
from app.services.number_generator import generate_customer_code

router = APIRouter()


# ── 下拉选择（simple-list 放在 /{id} 路由之前，避免被 /{id} 拦截）──
@router.get("/simple-list", response_model=list[CustomerSimpleItem])
def simple_list(
    keyword: str | None = None,
    db: Session = Depends(get_db),
    _current_user: Employee = Depends(get_current_user),
):
    query = db.query(Customer.id, Customer.name, Customer.customer_code).filter(
        Customer.status == 1
    )
    if keyword:
        query = query.filter(
            (Customer.name.contains(keyword))
            | (Customer.customer_code.contains(keyword))
        )
    return query.order_by(Customer.id.desc()).limit(50).all()


# ── 列表 ──────────────────────────────────────────────
@router.get("", response_model=PaginatedResponse[CustomerResponse])
def list_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    keyword: str | None = None,
    db: Session = Depends(get_db),
    _current_user: Employee = Depends(get_current_user),
):
    query = db.query(Customer)
    if keyword:
        query = query.filter(
            (Customer.name.contains(keyword))
            | (Customer.customer_code.contains(keyword))
            | (Customer.contact_person.contains(keyword))
            | (Customer.contact_phone.contains(keyword))
        )
    total = query.count()
    items = (
        query.order_by(Customer.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {"total": total, "items": items}


# ── 新增 ──────────────────────────────────────────────
@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    data: CustomerCreate,
    db: Session = Depends(get_db),
    _current_user: Employee = Depends(get_current_user),
):
    code = generate_customer_code(db)
    customer = Customer(
        customer_code=code,
        **data.model_dump(exclude={"addresses", "invoices"}),
    )
    for addr in data.addresses:
        customer.addresses.append(CustomerAddress(**addr.model_dump()))
    for inv in data.invoices:
        customer.invoices.append(CustomerInvoice(**inv.model_dump()))
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


# ── 编辑基本信息 ──────────────────────────────────────
@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int,
    data: CustomerUpdate,
    db: Session = Depends(get_db),
    _current_user: Employee = Depends(get_current_user),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="客户不存在")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return customer


# ── 启用/停用 ─────────────────────────────────────────
@router.put("/{customer_id}/status", response_model=CustomerResponse)
def update_customer_status(
    customer_id: int,
    data: CustomerStatusUpdate,
    db: Session = Depends(get_db),
    _current_user: Employee = Depends(get_current_user),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="客户不存在")
    customer.status = data.status
    db.commit()
    db.refresh(customer)
    return customer


# ── 详情 ──────────────────────────────────────────────
@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _current_user: Employee = Depends(get_current_user),
):
    customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id)
        .options(joinedload(Customer.addresses), joinedload(Customer.invoices))
        .first()
    )
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="客户不存在")
    return customer


# ── 收货地址 CRUD ─────────────────────────────────────

@router.post(
    "/{customer_id}/addresses",
    response_model=CustomerAddressResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_customer_address(
    customer_id: int,
    data: CustomerAddressBase,
    db: Session = Depends(get_db),
    _current_user: Employee = Depends(get_current_user),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="客户不存在")
    addr = CustomerAddress(customer_id=customer_id, **data.model_dump())
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return addr


@router.put("/{customer_id}/addresses/{address_id}", response_model=CustomerAddressResponse)
def update_customer_address(
    customer_id: int,
    address_id: int,
    data: CustomerAddressBase,
    db: Session = Depends(get_db),
    _current_user: Employee = Depends(get_current_user),
):
    addr = (
        db.query(CustomerAddress)
        .filter(
            CustomerAddress.customer_id == customer_id,
            CustomerAddress.id == address_id,
        )
        .first()
    )
    if not addr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="地址不存在")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(addr, field, value)
    db.commit()
    db.refresh(addr)
    return addr


@router.delete(
    "/{customer_id}/addresses/{address_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_customer_address(
    customer_id: int,
    address_id: int,
    db: Session = Depends(get_db),
    _current_user: Employee = Depends(get_current_user),
):
    addr = (
        db.query(CustomerAddress)
        .filter(
            CustomerAddress.customer_id == customer_id,
            CustomerAddress.id == address_id,
        )
        .first()
    )
    if not addr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="地址不存在")
    db.delete(addr)
    db.commit()


# ── 开票信息 CRUD ─────────────────────────────────────

@router.post(
    "/{customer_id}/invoices",
    response_model=CustomerInvoiceResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_customer_invoice(
    customer_id: int,
    data: CustomerInvoiceBase,
    db: Session = Depends(get_db),
    _current_user: Employee = Depends(get_current_user),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="客户不存在")
    inv = CustomerInvoice(customer_id=customer_id, **data.model_dump())
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv


@router.put("/{customer_id}/invoices/{invoice_id}", response_model=CustomerInvoiceResponse)
def update_customer_invoice(
    customer_id: int,
    invoice_id: int,
    data: CustomerInvoiceBase,
    db: Session = Depends(get_db),
    _current_user: Employee = Depends(get_current_user),
):
    inv = (
        db.query(CustomerInvoice)
        .filter(
            CustomerInvoice.customer_id == customer_id,
            CustomerInvoice.id == invoice_id,
        )
        .first()
    )
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="开票信息不存在")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(inv, field, value)
    db.commit()
    db.refresh(inv)
    return inv
