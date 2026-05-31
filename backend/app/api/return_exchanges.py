from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.return_exchange import ReturnExchangeRecord, ReturnStatus
from app.models.contract_order import ContractOrder, OrderStatus
from app.models.employee import Employee, EmployeeRole
from app.core.deps import get_current_user, require_roles
from app.services.number_generator import generate_return_no
from app.services.order_state_machine import OrderStateMachine
from app.schemas.return_exchange import ReturnExchangeCreate, ReturnConfirmRequest, ReturnCompleteRequest, ReturnExchangeResponse

router = APIRouter()
sm = OrderStateMachine()


def _return_to_dict(record: ReturnExchangeRecord) -> dict:
    return {
        "id": record.id,
        "return_no": record.return_no,
        "order_id": record.order_id,
        "order_item_id": record.order_item_id,
        "type": record.type,
        "reason": record.reason,
        "initiator_id": record.initiator_id,
        "project_confirmed": record.project_confirmed,
        "project_confirmed_by": record.project_confirmed_by,
        "status": record.status.value if record.status else None,
        "purchase_order_id": record.purchase_order_id,
        "remark": record.remark,
        "created_at": str(record.created_at) if record.created_at else None,
        "updated_at": str(record.updated_at) if record.updated_at else None,
    }


# ── 发起退换货 ──────────────────────────────────────────
@router.post("", status_code=status.HTTP_201_CREATED)
def create_return_exchange(
    data: ReturnExchangeCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(EmployeeRole.sales, EmployeeRole.admin)),
):
    # 验证订单存在
    order = db.query(ContractOrder).filter(ContractOrder.id == data.order_id).first()
    if not order:
        raise HTTPException(status_code=400, detail="订单不存在")

    # 销售只能为自己负责的订单发起退换货
    if current_user.role == EmployeeRole.sales and order.sales_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能为自己负责的订单发起退换货")

    record = ReturnExchangeRecord(
        return_no=generate_return_no(db),
        order_id=data.order_id,
        order_item_id=data.order_item_id,
        type=data.type,
        reason=data.reason,
        initiator_id=current_user.id,
        project_confirmed=0,
        status=ReturnStatus.pending_confirm,
        purchase_order_id=data.purchase_order_id,
        remark=data.remark,
    )
    db.add(record)

    # 联动更新订单状态为 return_exchange
    if order.status not in (OrderStatus.return_exchange, OrderStatus.cancelled, OrderStatus.closed):
        order.status = OrderStatus.return_exchange

    db.commit()
    db.refresh(record)
    return _return_to_dict(record)


# ── 项目负责人确认 ──────────────────────────────────────
@router.put("/{return_id}/confirm")
def confirm_return_exchange(
    return_id: int,
    data: ReturnConfirmRequest,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(EmployeeRole.project_manager, EmployeeRole.admin)),
):
    record = db.query(ReturnExchangeRecord).filter(ReturnExchangeRecord.id == return_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="退换货记录不存在")

    if record.status != ReturnStatus.pending_confirm:
        raise HTTPException(status_code=400, detail="当前状态不允许确认操作")

    # 权限检查
    if current_user.role == EmployeeRole.project_manager:
        order = db.query(ContractOrder).filter(ContractOrder.id == record.order_id).first()
        if order and order.project_manager_id != current_user.id:
            raise HTTPException(status_code=403, detail="只能确认自己负责订单的退换货")

    record.project_confirmed = data.project_confirmed
    record.project_confirmed_by = current_user.id

    if data.project_confirmed == 1:
        # 确认 → processing
        record.status = ReturnStatus.processing
    elif data.project_confirmed == 2:
        # 拒绝 → cancelled
        record.status = ReturnStatus.cancelled

    db.commit()
    db.refresh(record)
    return _return_to_dict(record)


# ── 采购员标记完成 ──────────────────────────────────────
@router.put("/{return_id}/complete")
def complete_return_exchange(
    return_id: int,
    data: ReturnCompleteRequest,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(EmployeeRole.purchaser, EmployeeRole.admin)),
):
    record = db.query(ReturnExchangeRecord).filter(ReturnExchangeRecord.id == return_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="退换货记录不存在")

    if record.status != ReturnStatus.processing:
        raise HTTPException(status_code=400, detail="只有处理中的退换货才能标记完成")

    record.status = ReturnStatus.completed
    if data.remark:
        record.remark = data.remark

    # 换货完成后将订单恢复到 pending_inspect（通过状态机验证）
    if record.type == 2:  # 换货
        order = db.query(ContractOrder).filter(ContractOrder.id == record.order_id).first()
        if order and order.status == OrderStatus.return_exchange:
            # 状态机验证：return_exchange → pending_inspect
            current_status = order.status.value
            target_status = OrderStatus.pending_inspect.value
            if sm.validate_transition(current_status, target_status):
                order.status = OrderStatus(target_status)

    db.commit()
    db.refresh(record)
    return _return_to_dict(record)


# ── 退换货列表 ──────────────────────────────────────────
@router.get("")
def list_return_exchanges(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    query = db.query(ReturnExchangeRecord)

    # 非管理员过滤
    if current_user.role == EmployeeRole.sales:
        order_ids = (
            db.query(ContractOrder.id)
            .filter(ContractOrder.sales_id == current_user.id)
            .subquery()
        )
        query = query.filter(ReturnExchangeRecord.order_id.in_(order_ids))
    elif current_user.role == EmployeeRole.project_manager:
        order_ids = (
            db.query(ContractOrder.id)
            .filter(ContractOrder.project_manager_id == current_user.id)
            .subquery()
        )
        query = query.filter(ReturnExchangeRecord.order_id.in_(order_ids))

    if status_filter:
        try:
            query = query.filter(ReturnExchangeRecord.status == ReturnStatus(status_filter))
        except ValueError:
            pass

    total = query.count()
    records = (
        query.order_by(ReturnExchangeRecord.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [_return_to_dict(r) for r in records]
    return {"total": total, "items": items}


# ── 获取订单的退换货记录 ────────────────────────────────
@router.get("/order/{order_id}")
def get_order_return_exchanges(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    order = db.query(ContractOrder).filter(ContractOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    records = (
        db.query(ReturnExchangeRecord)
        .filter(ReturnExchangeRecord.order_id == order_id)
        .order_by(ReturnExchangeRecord.created_at.desc())
        .all()
    )
    return [_return_to_dict(r) for r in records]
