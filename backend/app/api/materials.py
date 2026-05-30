from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.employee import Employee, EmployeeRole
from app.models.material import Material
from app.schemas.material import MaterialCreate, MaterialUpdate, MaterialResponse
from app.core.deps import get_current_user, require_roles

router = APIRouter()


@router.get("")
def list_materials(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    keyword: str | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    query = db.query(Material)
    if category:
        query = query.filter(Material.category == category)
    if keyword:
        query = query.filter(
            (Material.material_code.contains(keyword))
            | (Material.name.contains(keyword))
            | (Material.brand.contains(keyword))
        )
    total = query.count()
    items = (
        query.order_by(Material.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {"total": total, "items": [MaterialResponse.model_validate(i) for i in items]}


@router.post("", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
def create_material(
    data: MaterialCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(EmployeeRole.admin)),
):
    if db.query(Material).filter(Material.material_code == data.material_code).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="物料编码已存在"
        )
    material = Material(**data.model_dump())
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@router.put("/{material_id}", response_model=MaterialResponse)
def update_material(
    material_id: int,
    data: MaterialUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(EmployeeRole.admin)),
):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="物料不存在"
        )
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(material, field, value)
    db.commit()
    db.refresh(material)
    return material


@router.put("/{material_id}/status")
def toggle_material_status(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(EmployeeRole.admin)),
):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="物料不存在"
        )
    material.status = 0 if material.status == 1 else 1
    db.commit()
    db.refresh(material)
    return {"code": 0, "message": "success", "status": material.status}


@router.get("/simple-list")
def simple_list(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    materials = (
        db.query(Material.id, Material.material_code, Material.name, Material.unit)
        .filter(Material.status == 1)
        .all()
    )
    return [
        {"id": m.id, "material_code": m.material_code, "name": m.name, "unit": m.unit}
        for m in materials
    ]
