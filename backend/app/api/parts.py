from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.part import Part
from app.schemas.part import PartCreate, PartUpdate, PartResponse
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter()


@router.get("")
def list_parts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    keyword: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Part).filter(Part.is_active == True)
    if keyword:
        query = query.filter(
            (Part.part_number.contains(keyword))
            | (Part.name.contains(keyword))
            | (Part.brand.contains(keyword))
            | (Part.category.contains(keyword))
        )
    total = query.count()
    items = query.order_by(Part.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "items": [PartResponse.model_validate(i) for i in items]}


@router.post("", response_model=PartResponse, status_code=status.HTTP_201_CREATED)
def create_part(
    data: PartCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.query(Part).filter(Part.part_number == data.part_number).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="备件编号已存在")
    part = Part(**data.model_dump())
    db.add(part)
    db.commit()
    db.refresh(part)
    return part


@router.get("/{part_id}", response_model=PartResponse)
def get_part(
    part_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    part = db.query(Part).filter(Part.id == part_id, Part.is_active == True).first()
    if not part:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="备件不存在")
    return part


@router.put("/{part_id}", response_model=PartResponse)
def update_part(
    part_id: int,
    data: PartUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    part = db.query(Part).filter(Part.id == part_id, Part.is_active == True).first()
    if not part:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="备件不存在")
    update_data = data.model_dump(exclude_unset=True)
    if "part_number" in update_data and update_data["part_number"] != part.part_number:
        if db.query(Part).filter(Part.part_number == update_data["part_number"]).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="备件编号已存在")
    for field, value in update_data.items():
        setattr(part, field, value)
    db.commit()
    db.refresh(part)
    return part


@router.delete("/{part_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_part(
    part_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    part = db.query(Part).filter(Part.id == part_id, Part.is_active == True).first()
    if not part:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="备件不存在")
    part.is_active = False
    db.commit()
