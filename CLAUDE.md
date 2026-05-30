# PSI_SYS - 备件订货交付跟踪系统

## 项目概述

代理商备件供应链全流程跟踪系统，覆盖从工厂提出备件需求到客户签收归档的完整生命周期（11步业务流程）。

## 业务流程

```
工厂提出需求 → 客户询价 → 项目负责人确认内容 → 销售报价/签合同
→ 销售通知下料 → 项目提交采购单 → 采购员采购 → 到货验收
→ 确认地址/发货 → 客户签收/归档 → 销售关闭
```

逆向流程：销售发起退换货 → 项目确认 → 采购员执行 → 回到正常流程

## 用户角色（4种）

| 角色 | 说明 | 关键权限 |
|------|------|----------|
| 系统管理员 | 系统维护，不参与业务 | 全部可见，管理人员/配置 |
| 销售员 | 面向客户的对外接口人 | 可见价格，不可操作采购 |
| 项目负责人 | 流程中枢 | 可见物料/进度，不可见任何价格 |
| 采购员 | 面向供应商的采购接口人 | 可见采购价，不可见客户报价 |

## 订单状态机（15种状态）

```
pending_confirm → pending_quote → pending_contract → pending_dispatch
→ pending_purchase → purchasing → pending_inspect → inspecting
→ pending_ship → shipped → pending_receipt → received → closed

异常: return_exchange, cancelled
```

## 技术栈

- **后端**: FastAPI + SQLAlchemy 2.0 + MySQL（开发用 SQLite）
- **前端**: React 18 + TypeScript + Ant Design 5 + Vite + Zustand
- **认证**: JWT + RBAC（Employee 模型，4角色）
- **图表**: ECharts

## 开发计划

计划文档：`/Users/doni/.claude/plans/users-doni-downloads-md-psi-sys-new-inu-cached-aho.md`

### 阶段总览

| 阶段 | 范围 | 状态 |
|------|------|------|
| Phase 0 | 基础重构（清理旧模型，搭建新骨架） | ✅ 完成 |
| Phase 1 | 基础数据 CRUD（人员/物料/供应商/客户） | ✅ 完成 |
| Phase 2 | 核心订单模块（合同/订单管理 + 状态机） | ⏳ 待开发 |
| Phase 3 | 采购模块（采购单 + 拆单） | ⏳ 待开发 |
| Phase 4 | 验收/发货/签收/退换货 | ⏳ 待开发 |
| Phase 5 | 操作日志 + 邮件草稿 | ⏳ 待开发 |
| Phase 6 | 报表看板（5个看板 + ECharts） | ⏳ 待开发 |
| Phase 7 | 系统配置 + 完善 | ⏳ 待开发 |

### 数据库表（13张）

employee, material, supplier + supplier_material, customer + customer_address + customer_invoice, contract_order + contract_order_item, purchase_order, inspection_record, shipment_record, receipt_record, return_exchange_record, email_draft, operation_log, system_config

## 后端结构

```
backend/app/
  models/          # 13个模型文件（employee, material, supplier, customer, contract_order 等）
  schemas/         # Pydantic schemas（employee, material, supplier, customer, common）
  api/             # API 路由（auth, employees, materials, suppliers, customers）
  services/        # 业务服务（number_generator, 后续: order_state_machine 等）
  core/            # deps.py(认证), permissions.py(字段过滤), security.py(JWT)
```

## 前端结构

```
frontend/src/
  api/types.ts     # 所有类型定义（EmployeeRole, OrderStatus, 各接口）
  api/             # API 调用层（employees, materials, suppliers, customers）
  pages/           # 页面组件（employees, materials, suppliers, customers）
  stores/auth.ts   # 认证状态（Zustand, Employee 模型）
  layouts/         # MainLayout（基于角色的菜单过滤）
```

## 重要修改记录

### 2026-05-30 项目重构（Phase 0 + Phase 1）
- 角色 7→4（删除 customer/supplier/shipper 外部角色）
- 数据库模型全部重写：13张新表替代旧的14张表
- 订单状态 7→15（13种正向 + return_exchange + cancelled）
- 后端：Employee 模型替代 User，新的 deps.py/permissions.py/number_generator
- 前端：types.ts 全部重写，基于角色的菜单权限，4个 CRUD 页面
- 已实现 API：auth, employees, materials, suppliers, customers（含子表）
- 待实现：contract_orders, purchase_orders, inspection, shipment, receipt, return_exchange, email_drafts, operation_logs, dashboard, reports, system_config
