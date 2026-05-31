from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.contract_order import ContractOrder, ContractOrderItem, OrderStatus, DeliveryItemStatus
from app.models.employee import Employee, EmployeeRole
from app.schemas.common import PaginatedResponse
from app.core.deps import get_current_user, require_roles
from app.core.permissions import strip_forbidden_fields
from app.services.number_generator import generate_order_no
from app.services.order_state_machine import OrderStateMachine

router = APIRouter()
sm = OrderStateMachine()

# 销售和项目负责人可以查看订单，管理员全部可见
ORDER_VIEW_ROLES = (EmployeeRole.sales, EmployeeRole.project_manager, EmployeeRole.admin)
# 只有销售可以创建/编辑订单
ORDER_EDIT_ROLES = (EmployeeRole.sales, EmployeeRole.admin)


def _order_to_dict(order: ContractOrder, role: str) -> dict:
    """将订单 ORM 对象转为 dict，并根据角色过滤字段"""
    data = {
        "id": order.id,
        "order_no": order.order_no,
        "contract_no": order.contract_no,
        "customer_id": order.customer_id,
        "sales_id": order.sales_id,
        "project_manager_id": order.project_manager_id,
        "total_amount": float(order.total_amount) if order.total_amount else 0,
        "delivery_date": str(order.delivery_date) if order.delivery_date else None,
        "sign_date": str(order.sign_date) if order.sign_date else None,
        "is_urgent": order.is_urgent,
        "status": order.status.value if order.status else None,
        "factory_demand_desc": order.factory_demand_desc,
        "contract_attachment": order.contract_attachment,
        "remark": order.remark,
        "created_by": order.created_by,
        "closed_at": str(order.closed_at) if order.closed_at else None,
        "closed_by": order.closed_by,
        "created_at": str(order.created_at) if order.created_at else None,
        "updated_at": str(order.updated_at) if order.updated_at else None,
        "items": [
            {
                "id": item.id,
                "order_id": item.order_id,
                "material_id": item.material_id,
                "material_code": item.material_code,
                "material_name": item.material_name,
                "brand": item.brand,
                "model": item.model,
                "quantity": float(item.quantity),
                "unit": item.unit,
                "unit_price": float(item.unit_price) if item.unit_price else 0,
                "amount": float(item.amount) if item.amount else 0,
                "purchase_price": float(item.purchase_price) if item.purchase_price else None,
                "delivery_status": item.delivery_status.value if item.delivery_status else None,
            }
            for item in (order.items or [])
        ],
    }
    data = strip_forbidden_fields(data, role, "order")
    # also strip price fields from items
    forbidden = {
        "project_manager": ["unit_price", "purchase_price"],
        "purchaser": ["unit_price"],
        "sales": ["purchase_price"],
    }.get(role, [])
    if forbidden:
        for item in data.get("items", []):
            for f in forbidden:
                item.pop(f, None)
    return data


def _order_list_item(order: ContractOrder, role: str) -> dict:
    """订单列表项（不带明细）"""
    data = {
        "id": order.id,
        "order_no": order.order_no,
        "contract_no": order.contract_no,
        "customer_id": order.customer_id,
        "customer_name": order.customer.name if hasattr(order, "customer") and order.customer else None,
        "sales_id": order.sales_id,
        "sales_name": order.sales.name if hasattr(order, "sales") and order.sales else None,
        "project_manager_id": order.project_manager_id,
        "project_manager_name": order.pm.name if hasattr(order, "pm") and order.pm else None,
        "total_amount": float(order.total_amount) if order.total_amount else 0,
        "delivery_date": str(order.delivery_date) if order.delivery_date else None,
        "is_urgent": order.is_urgent,
        "status": order.status.value if order.status else None,
        "item_count": len(order.items) if order.items else 0,
        "created_at": str(order.created_at) if order.created_at else None,
        "updated_at": str(order.updated_at) if order.updated_at else None,
    }
    return strip_forbidden_fields(data, role, "order")


# ── 列表 ──────────────────────────────────────────────
@router.get("")
def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    customer_id: int | None = None,
    is_urgent: int | None = None,
    keyword: str | None = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    query = db.query(ContractOrder).options(
        joinedload(ContractOrder.items),
        joinedload(ContractOrder.customer),
        joinedload(ContractOrder.sales),
        joinedload(ContractOrder.pm),
    )
    # 非管理员只能看自己相关的订单
    if current_user.role == EmployeeRole.sales:
        query = query.filter(ContractOrder.sales_id == current_user.id)
    elif current_user.role == EmployeeRole.project_manager:
        query = query.filter(ContractOrder.project_manager_id == current_user.id)
    elif current_user.role == EmployeeRole.purchaser:
        # 采购员只看已到待采购及之后的订单
        purchase_statuses = [
            OrderStatus.pending_purchase, OrderStatus.purchasing,
            OrderStatus.pending_inspect, OrderStatus.inspecting,
            OrderStatus.pending_ship, OrderStatus.shipped,
            OrderStatus.pending_receipt, OrderStatus.received,
        ]
        query = query.filter(ContractOrder.status.in_(purchase_statuses))

    if status_filter:
        try:
            query = query.filter(ContractOrder.status == OrderStatus(status_filter))
        except ValueError:
            pass
    if customer_id:
        query = query.filter(ContractOrder.customer_id == customer_id)
    if is_urgent is not None:
        query = query.filter(ContractOrder.is_urgent == is_urgent)
    if keyword:
        query = query.filter(
            (ContractOrder.order_no.contains(keyword))
            | (ContractOrder.contract_no.contains(keyword))
            | (ContractOrder.factory_demand_desc.contains(keyword))
        )

    total = query.count()
    orders = (
        query.order_by(ContractOrder.is_urgent.desc(), ContractOrder.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    role = current_user.role.value
    items = [_order_list_item(o, role) for o in orders]
    return {"total": total, "items": items}


# ── 创建订单 ──────────────────────────────────────────
@router.post("", status_code=status.HTTP_201_CREATED)
def create_order(
    data: dict,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(*ORDER_EDIT_ROLES)),
):
    from app.models.customer import Customer
    from app.models.employee import Employee as Emp

    # 验证客户存在
    customer = db.query(Customer).filter(Customer.id == data.get("customer_id")).first()
    if not customer:
        raise HTTPException(status_code=400, detail="客户不存在")

    # 验证项目负责人存在且是项目负责人角色
    pm_id = data.get("project_manager_id")
    pm = db.query(Emp).filter(Emp.id == pm_id, Emp.role == EmployeeRole.project_manager, Emp.status == 1).first()
    if not pm:
        raise HTTPException(status_code=400, detail="项目负责人不存在或不可用")

    items_data = data.get("items", [])
    if not items_data:
        raise HTTPException(status_code=400, detail="订单明细不能为空")

    # 计算总金额
    total_amount = Decimal("0")
    order_items = []
    for item_data in items_data:
        qty = Decimal(str(item_data.get("quantity", 0)))
        price = Decimal(str(item_data.get("unit_price", 0)))
        amount = qty * price
        total_amount += amount
        order_items.append(ContractOrderItem(
            material_id=item_data["material_id"],
            material_code=item_data["material_code"],
            material_name=item_data["material_name"],
            brand=item_data.get("brand"),
            model=item_data.get("model"),
            quantity=qty,
            unit=item_data["unit"],
            unit_price=price,
            amount=amount,
            delivery_status=DeliveryItemStatus.pending_purchase,
        ))

    order = ContractOrder(
        order_no=generate_order_no(db),
        customer_id=data["customer_id"],
        sales_id=current_user.id,
        project_manager_id=pm_id,
        total_amount=total_amount,
        delivery_date=data.get("delivery_date"),
        is_urgent=data.get("is_urgent", 0),
        status=OrderStatus.pending_confirm,
        factory_demand_desc=data.get("factory_demand_desc"),
        remark=data.get("remark"),
        created_by=current_user.id,
    )
    order.items = order_items
    db.add(order)
    db.commit()
    db.refresh(order)

    role = current_user.role.value
    return _order_to_dict(order, role)


# ── 订单详情 ──────────────────────────────────────────
@router.get("/{order_id}")
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    order = (
        db.query(ContractOrder)
        .filter(ContractOrder.id == order_id)
        .options(
            joinedload(ContractOrder.items),
            joinedload(ContractOrder.customer),
            joinedload(ContractOrder.sales),
            joinedload(ContractOrder.pm),
        )
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    # 权限检查：非管理员只能看自己的订单
    if current_user.role == EmployeeRole.sales and order.sales_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权查看此订单")
    if current_user.role == EmployeeRole.project_manager and order.project_manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权查看此订单")

    role = current_user.role.value
    return _order_to_dict(order, role)


# ── 更新订单 ──────────────────────────────────────────
@router.put("/{order_id}")
def update_order(
    order_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(*ORDER_EDIT_ROLES)),
):
    order = db.query(ContractOrder).filter(ContractOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    if order.sales_id != current_user.id and current_user.role != EmployeeRole.admin:
        raise HTTPException(status_code=403, detail="只能编辑自己创建的订单")

    # 只允许在特定状态下编辑
    editable_statuses = [OrderStatus.pending_confirm, OrderStatus.pending_quote, OrderStatus.pending_contract]
    if order.status not in editable_statuses:
        raise HTTPException(status_code=400, detail="当前状态不允许编辑订单")

    allowed_fields = ["delivery_date", "is_urgent", "factory_demand_desc", "remark", "contract_no"]
    for field in allowed_fields:
        if field in data:
            setattr(order, field, data[field])

    # 支持更新明细
    if "items" in data:
        # 删除旧明细
        for old_item in order.items:
            db.delete(old_item)
        total_amount = Decimal("0")
        for item_data in data["items"]:
            qty = Decimal(str(item_data.get("quantity", 0)))
            price = Decimal(str(item_data.get("unit_price", 0)))
            amount = qty * price
            total_amount += amount
            order.items.append(ContractOrderItem(
                material_id=item_data["material_id"],
                material_code=item_data["material_code"],
                material_name=item_data["material_name"],
                brand=item_data.get("brand"),
                model=item_data.get("model"),
                quantity=qty,
                unit=item_data["unit"],
                unit_price=price,
                amount=amount,
                delivery_status=DeliveryItemStatus.pending_purchase,
            ))
        order.total_amount = total_amount

    db.commit()
    db.refresh(order)
    role = current_user.role.value
    return _order_to_dict(order, role)


# ── 状态流转 ──────────────────────────────────────────
@router.put("/{order_id}/status")
def change_order_status(
    order_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    order = db.query(ContractOrder).filter(ContractOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    target_status = data.get("target_status")
    if not target_status:
        raise HTTPException(status_code=400, detail="请指定目标状态")

    current_status = order.status.value
    # 验证状态流转合法性
    if not sm.validate_transition(current_status, target_status):
        allowed = sm.get_allowed_transitions(current_status)
        raise HTTPException(
            status_code=400,
            detail=f"不允许从 '{sm.get_status_label(current_status)}' 转换到 '{sm.get_status_label(target_status)}'，允许的状态: {[sm.get_status_label(s) for s in allowed]}",
        )

    # 验证角色权限
    role = current_user.role.value
    if not sm.check_role_permission(current_status, target_status, role):
        raise HTTPException(status_code=403, detail=f"您的角色（{current_user.role.value}）无权执行此操作")

    order.status = OrderStatus(target_status)
    db.commit()
    db.refresh(order)

    role = current_user.role.value
    result = _order_to_dict(order, role)
    result["allowed_transitions"] = [
        {"status": s, "label": sm.get_status_label(s)}
        for s in sm.get_allowed_transitions(target_status)
        if sm.check_role_permission(target_status, s, role)
    ]
    return result


# ── 录入合同信息 ──────────────────────────────────────
@router.put("/{order_id}/contract")
def update_contract_info(
    order_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(*ORDER_EDIT_ROLES)),
):
    order = db.query(ContractOrder).filter(ContractOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    if order.status not in [OrderStatus.pending_contract, OrderStatus.pending_quote]:
        raise HTTPException(status_code=400, detail="当前状态不允许录入合同信息")

    if "contract_no" in data:
        order.contract_no = data["contract_no"]
    if "sign_date" in data:
        order.sign_date = data["sign_date"]
    if "contract_attachment" in data:
        order.contract_attachment = data["contract_attachment"]

    db.commit()
    db.refresh(order)
    role = current_user.role.value
    return _order_to_dict(order, role)


# ── 关闭订单 ──────────────────────────────────────────
@router.post("/{order_id}/close")
def close_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_roles(EmployeeRole.sales, EmployeeRole.admin)),
):
    from datetime import datetime
    order = db.query(ContractOrder).filter(ContractOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    if order.status != OrderStatus.received:
        raise HTTPException(status_code=400, detail="只有已签收的订单才能关闭")

    order.status = OrderStatus.closed
    order.closed_at = datetime.now()
    order.closed_by = current_user.id
    db.commit()
    db.refresh(order)

    role = current_user.role.value
    return _order_to_dict(order, role)


# ── 获取订单可执行操作 ────────────────────────────────
@router.get("/{order_id}/actions")
def get_order_actions(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    order = db.query(ContractOrder).filter(ContractOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    current_status = order.status.value
    role = current_user.role.value
    allowed = sm.get_allowed_transitions(current_status)
    actions = [
        {"status": s, "label": sm.get_status_label(s)}
        for s in allowed
        if sm.check_role_permission(current_status, s, role)
    ]
    return {"current_status": current_status, "actions": actions}


# ── 获取订单状态选项 ──────────────────────────────────
@router.get("/meta/statuses")
def get_all_statuses(
    _current_user: Employee = Depends(get_current_user),
):
    return [
        {"value": s.value, "label": sm.get_status_label(s.value)}
        for s in OrderStatus
    ]
