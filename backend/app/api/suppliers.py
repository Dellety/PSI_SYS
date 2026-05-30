from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.supplier import Supplier, SupplierMaterial
from app.schemas.supplier import (
    SupplierCreate,
    SupplierUpdate,
    SupplierResponse,
    SupplierMaterialBase,
    SupplierMaterialResponse,
    SupplierMaterialUpdate,
    SupplierStatusUpdate,
)
from app.schemas.common import PaginatedResponse
from app.core.deps import get_current_user
from app.models.employee import Employee
from app.services.number_generator import generate_supplier_code

router = APIRouter()


# ── 列表 ──────────────────────────────────────────────
@router.get("", response_model=PaginatedResponse[SupplierResponse])
def list_suppliers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    keyword: str | None = None,
    cooperation_status: int | None = None,
    db: Session = Depends(get_db),
    _current_user: Employee = Depends(get_current_user),
):
    query = db.query(Supplier)
    if keyword:
        query = query.filter(
            (Supplier.name.contains(keyword))
            | (Supplier.brands.contains(keyword))
            | (Supplier.contact_person.contains(keyword))
        )
    if cooperation_status is not None:
        query = query.filter(Supplier.cooperation_status == cooperation_status)
    total = query.count()
    items = (
        query.order_by(Supplier.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .options(joinedload(Supplier.materials))
        .all()
    )
    return {"total": total, "items": items}


# ── 新增 ──────────────────────────────────────────────
@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(
    data: SupplierCreate,
    db: Session = Depends(get_db),
    _current_user: Employee = Depends(get_current_user),
):
    code = generate_supplier_code(db)
    supplier = Supplier(
        supplier_code=code,
        **data.model_dump(exclude={"materials"}),
    )
    for m in data.materials:
        supplier.materials.append(SupplierMaterial(**m.model_dump()))
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


# ── 编辑基本信息 ──────────────────────────────────────
@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: int,
    data: SupplierUpdate,
    db: Session = Depends(get_db),
    _current_user: Employee = Depends(get_current_user),
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="供应商不存在")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(supplier, field, value)
    db.commit()
    db.refresh(supplier)
    return supplier


# ── 启用/停用 ─────────────────────────────────────────
@router.put("/{supplier_id}/status", response_model=SupplierResponse)
def update_supplier_status(
    supplier_id: int,
    data: SupplierStatusUpdate,
    db: Session = Depends(get_db),
    _current_user: Employee = Depends(get_current_user),
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="供应商不存在")
    supplier.status = data.status
    db.commit()
    db.refresh(supplier)
    return supplier


# ── 详情 ──────────────────────────────────────────────
@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    _current_user: Employee = Depends(get_current_user),
):
    supplier = (
        db.query(Supplier)
        .filter(Supplier.id == supplier_id)
        .options(joinedload(Supplier.materials))
        .first()
    )
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="供应商不存在")
    return supplier


# ── 添加关联物料 ──────────────────────────────────────
@router.post(
    "/{supplier_id}/materials",
    response_model=SupplierMaterialResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_supplier_material(
    supplier_id: int,
    data: SupplierMaterialBase,
    db: Session = Depends(get_db),
    _current_user: Employee = Depends(get_current_user),
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="供应商不存在")
    sm = SupplierMaterial(supplier_id=supplier_id, **data.model_dump())
    db.add(sm)
    db.commit()
    db.refresh(sm)
    return sm


# ── 编辑关联物料价格 ──────────────────────────────────
@router.put("/{supplier_id}/materials/{material_id}", response_model=SupplierMaterialResponse)
def update_supplier_material(
    supplier_id: int,
    material_id: int,
    data: SupplierMaterialUpdate,
    db: Session = Depends(get_db),
    _current_user: Employee = Depends(get_current_user),
):
    sm = (
        db.query(SupplierMaterial)
        .filter(
            SupplierMaterial.supplier_id == supplier_id,
            SupplierMaterial.id == material_id,
        )
        .first()
    )
    if not sm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="关联物料不存在")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(sm, field, value)
    db.commit()
    db.refresh(sm)
    return sm


# ── 删除关联物料 ──────────────────────────────────────
@router.delete("/{supplier_id}/materials/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier_material(
    supplier_id: int,
    material_id: int,
    db: Session = Depends(get_db),
    _current_user: Employee = Depends(get_current_user),
):
    sm = (
        db.query(SupplierMaterial)
        .filter(
            SupplierMaterial.supplier_id == supplier_id,
            SupplierMaterial.id == material_id,
        )
        .first()
    )
    if not sm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="关联物料不存在")
    db.delete(sm)
    db.commit()
