from app.models.contract_order import OrderStatus
from app.models.employee import EmployeeRole

STATUS_TRANSITIONS: dict[str, list[str]] = {
    "pending_confirm":   ["pending_quote", "cancelled"],
    "pending_quote":     ["pending_contract", "cancelled"],
    "pending_contract":  ["pending_dispatch", "cancelled"],
    "pending_dispatch":  ["pending_purchase"],
    "pending_purchase":  ["purchasing", "cancelled"],
    "purchasing":        ["pending_inspect", "return_exchange"],
    "pending_inspect":   ["inspecting"],
    "inspecting":        ["pending_ship", "return_exchange"],
    "pending_ship":      ["shipped"],
    "shipped":           ["pending_receipt", "return_exchange"],
    "pending_receipt":   ["received"],
    "received":          ["closed"],
    "return_exchange":   ["pending_inspect", "cancelled"],
}

STATUS_LABELS: dict[str, str] = {
    "pending_confirm":   "待确认内容",
    "pending_quote":     "待报价",
    "pending_contract":  "待签合同",
    "pending_dispatch":  "待下料",
    "pending_purchase":  "待采购",
    "purchasing":        "采购中",
    "pending_inspect":   "待验收",
    "inspecting":        "验收中",
    "pending_ship":      "待发货",
    "shipped":           "已发货",
    "pending_receipt":   "待签收",
    "received":          "已签收",
    "closed":            "已关闭",
    "return_exchange":   "退换货中",
    "cancelled":         "已取消",
}

_STATUS_COLORS: dict[str, str] = {
    "pending_confirm":   "#faad14",
    "pending_quote":     "#faad14",
    "pending_contract":  "#faad14",
    "pending_dispatch":  "#1890ff",
    "pending_purchase":  "#1890ff",
    "purchasing":        "#1890ff",
    "pending_inspect":   "#1890ff",
    "inspecting":        "#1890ff",
    "pending_ship":      "#1890ff",
    "shipped":           "#52c41a",
    "pending_receipt":   "#52c41a",
    "received":          "#52c41a",
    "closed":            "#8c8c8c",
    "return_exchange":   "#ff4d4f",
    "cancelled":         "#8c8c8c",
}

# (from_status, to_status) -> 允许的角色列表
_ROLE_TRANSITIONS: dict[tuple[str, str], list[str]] = {
    # 销售操作
    ("pending_confirm", "pending_quote"):      ["sales", "project_manager"],
    ("pending_quote", "pending_contract"):     ["sales"],
    ("pending_contract", "pending_dispatch"):  ["sales"],
    ("received", "closed"):                    ["sales"],
    # 项目负责人操作
    ("pending_dispatch", "pending_purchase"):  ["project_manager"],
    ("pending_inspect", "inspecting"):         ["project_manager"],
    ("inspecting", "pending_ship"):            ["project_manager"],
    ("pending_ship", "shipped"):               ["project_manager"],
    ("shipped", "pending_receipt"):             ["project_manager"],
    ("pending_receipt", "received"):            ["project_manager"],
    # 采购员操作
    ("pending_purchase", "purchasing"):        ["purchaser"],
    ("purchasing", "pending_inspect"):         ["purchaser"],
    # 退换货
    ("purchasing", "return_exchange"):         ["sales"],
    ("inspecting", "return_exchange"):         ["sales"],
    ("shipped", "return_exchange"):            ["sales"],
    ("return_exchange", "pending_inspect"):    ["project_manager"],
    # 取消 - 销售、项目负责人、采购员都可以取消自己负责阶段的订单
    ("pending_confirm", "cancelled"):          ["sales", "project_manager"],
    ("pending_quote", "cancelled"):            ["sales"],
    ("pending_contract", "cancelled"):         ["sales"],
    ("pending_purchase", "cancelled"):         ["sales", "project_manager"],
    ("return_exchange", "cancelled"):          ["sales", "project_manager"],
}


class OrderStateMachine:
    def validate_transition(self, current_status: str, target_status: str) -> bool:
        allowed = STATUS_TRANSITIONS.get(current_status, [])
        return target_status in allowed

    def get_allowed_transitions(self, current_status: str) -> list[str]:
        return STATUS_TRANSITIONS.get(current_status, [])

    def check_role_permission(self, current_status: str, target_status: str, role: str) -> bool:
        if role == EmployeeRole.admin.value:
            return True
        key = (current_status, target_status)
        allowed_roles = _ROLE_TRANSITIONS.get(key, [])
        return role in allowed_roles

    def get_status_label(self, status: str) -> str:
        return STATUS_LABELS.get(status, status)

    def is_terminal(self, status: str) -> bool:
        return status in ("closed", "cancelled")


def get_status_color(status: str) -> str:
    return _STATUS_COLORS.get(status, "#8c8c8c")
