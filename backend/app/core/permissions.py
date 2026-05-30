from app.models.employee import EmployeeRole

# 订单字段过滤 — 根据角色隐藏不应看到的字段
# 销售员：不可见采购价
# 项目负责人：不可见任何价格字段和合同附件
# 采购员：不可见客户报价、合同信息
ORDER_FIELDS_TO_HIDE: dict[str, list[str]] = {
    "project_manager": ["total_amount", "unit_price", "purchase_price", "contract_attachment"],
    "purchaser": ["unit_price", "total_amount", "contract_no", "contract_attachment"],
    "sales": ["purchase_price"],
}

# 供应商字段过滤
SUPPLIER_FIELDS_TO_HIDE: dict[str, list[str]] = {
    "project_manager": [],
    "sales": [],
    "purchaser": [],
}

# 客户字段过滤
CUSTOMER_FIELDS_TO_HIDE: dict[str, list[str]] = {
    "project_manager": [],
    "sales": [],
    "purchaser": [],
}

ENTITY_FIELDS_MAP: dict[str, dict[str, list[str]]] = {
    "order": ORDER_FIELDS_TO_HIDE,
    "supplier": SUPPLIER_FIELDS_TO_HIDE,
    "customer": CUSTOMER_FIELDS_TO_HIDE,
}


def strip_forbidden_fields(data: dict, role: str, entity_type: str) -> dict:
    """根据角色从响应字典中删除不应看到的字段。

    admin 角色不过滤任何字段，直接返回原始数据。
    """
    if role == EmployeeRole.admin.value:
        return data

    fields_map = ENTITY_FIELDS_MAP.get(entity_type, {})
    forbidden = fields_map.get(role, [])

    if not forbidden:
        return data

    return {k: v for k, v in data.items() if k not in forbidden}
