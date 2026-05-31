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

### 发货地址规则

- 客户档案中维护多个收货地址（工厂地址、客户自身地址等）
- 每次发货前，项目负责人向销售确认发货地址
- 销售从客户已有地址中选择或输入临时地址
- 地址确认后锁定，作为该订单的发货凭证

## 用户角色（4种）

| 角色 | 说明 | 关键权限 |
|------|------|----------|
| 系统管理员 | 系统维护，不参与业务 | 全部可见，管理人员/配置 |
| 销售员 | 面向客户的对外接口人 | 可见价格，不可操作采购 |
| 项目负责人 | 流程中枢 | 可见物料/进度，不可见任何价格 |
| 采购员 | 面向供应商的采购接口人 | 可见采购价，不可见客户报价 |

### 权限矩阵

| 数据/操作 | 销售员 | 项目负责人 | 采购员 | 系统管理员 |
|-----------|:---:|:-------:|:---:|:---------:|
| 客户报价/合同价 | 查看 | - | - | 查看 |
| 采购价/供应商价格 | 查看 | - | 查看 | 查看 |
| 备件明细/数量/货期 | 查看 | 查看 | 查看 | 查看 |
| 供应商信息 | 查看 | 部分 | 查看 | 管理 |
| 客户信息 | 查看 | 查看 | 部分 | 管理 |
| 快递单号/物流 | 查看 | 查看 | 查看 | 查看 |
| 收货签收单 | 查看 | 查看 | 查看 | 查看 |
| 合同附件 | 查看 | 查看 | - | 查看 |
| 操作日志 | 本人的 | 本人的 | 本人的 | 全部 |
| 人员花名册 | - | - | - | 管理 |
| 系统配置 | - | - | - | 管理 |

## 订单状态机（15种状态）

### 状态定义

```python
ORDER_STATUS = {
    # 正向流程
    "pending_confirm":    "待确认内容",      # 项目负责人确认采购内容
    "pending_quote":     "待报价",           # 等待销售报价
    "pending_contract":  "待签合同",         # 等待合同签订
    "pending_dispatch":   "待下料",           # 合同签订后待通知下料
    "pending_purchase":  "待采购",           # 待采购员采购
    "purchasing":        "采购中",           # 采购员已下单
    "pending_inspect":   "待验收",           # 采购到货待验收
    "inspecting":        "验收中",           # 验收进行中
    "pending_ship":      "待发货",           # 验收通过待发货
    "shipped":           "已发货",           # 已发货
    "pending_receipt":    "待签收",           # 待客户签收
    "received":          "已签收",           # 客户已签收
    "closed":            "已关闭",           # 项目关闭

    # 异常流程
    "return_exchange":   "退换货中",         # 退换货流程
    "cancelled":         "已取消",           # 订单取消
}
```

### 状态流转规则

```python
STATUS_TRANSITIONS = {
    "pending_confirm":    ["pending_quote", "cancelled"],
    "pending_quote":     ["pending_contract", "cancelled"],
    "pending_contract":  ["pending_dispatch", "cancelled"],
    "pending_dispatch":   ["pending_purchase"],
    "pending_purchase":  ["purchasing", "cancelled"],
    "purchasing":        ["pending_inspect", "return_exchange"],
    "pending_inspect":   ["inspecting"],
    "inspecting":        ["pending_ship", "return_exchange"],
    "pending_ship":      ["shipped"],
    "shipped":           ["pending_receipt", "return_exchange"],
    "pending_receipt":    ["received"],
    "received":          ["closed"],
    "return_exchange":   ["pending_inspect", "cancelled"],  # 换货完成后回到验收
}
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
| Phase 0 | 基础重构（清理旧模型，搭建新骨架） | 完成 |
| Phase 1 | 基础数据 CRUD（人员/物料/供应商/客户） | 完成 |
| Phase 2 | 核心订单模块（合同/订单管理 + 状态机） | 完成（前端） |
| Phase 3 | 采购模块（采购单 + 拆单） | 完成（前端） |
| Phase 4 | 验收/发货/签收/退换货 | 完成（前端） |
| Phase 5 | 操作日志 + 邮件草稿 | 待开发 |
| Phase 6 | 报表看板（5个看板 + ECharts） | 待开发 |
| Phase 7 | 系统配置 + 完善 | 待开发 |

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
- 角色 7->4（删除 customer/supplier/shipper 外部角色）
- 数据库模型全部重写：13张新表替代旧的14张表
- 订单状态 7->15（13种正向 + return_exchange + cancelled）
- 后端：Employee 模型替代 User，新的 deps.py/permissions.py/number_generator
- 前端：types.ts 全部重写，基于角色的菜单权限，4个 CRUD 页面
- 已实现 API：auth, employees, materials, suppliers, customers（含子表）
- 待实现：contract_orders, purchase_orders, inspection, shipment, receipt, return_exchange, email_drafts, operation_logs, dashboard, reports, system_config

---
---

## 数据模型规格

> 以下为各模块的完整数据字段定义，来源：开发任务书 4.2-4.11 节

### M1. 登录与权限模块

#### 接口清单

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth/login` | POST | 登录，返回 Token |
| `/api/auth/logout` | POST | 登出 |
| `/api/auth/me` | GET | 获取当前用户信息及权限 |

### M2. 人员花名册模块

> 仅系统管理员可操作

#### 数据字段 (employee)

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| id | BIGINT | Y | 主键 |
| name | VARCHAR(50) | Y | 姓名 |
| employee_no | VARCHAR(30) | Y | 工号 |
| login_name | VARCHAR(50) | Y | 登录名（与 OA 统一） |
| phone | VARCHAR(20) | Y | 手机号 |
| email | VARCHAR(100) | | 邮箱（用于邮件通知） |
| role | TINYINT | Y | 岗位：1-销售员 2-项目负责人 3-采购员 4-系统管理员 |
| status | TINYINT | Y | 状态：1-启用 0-停用 |
| created_at | DATETIME | Y | 创建时间 |
| updated_at | DATETIME | Y | 更新时间 |

### M3. 备件物料库模块

#### 数据字段 (material)

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| id | BIGINT | Y | 主键 |
| material_code | VARCHAR(50) | Y | 物料编码（唯一） |
| name | VARCHAR(100) | Y | 物料名称 |
| brand | VARCHAR(50) | | 品牌（如 SKF、NSK） |
| model | VARCHAR(100) | | 型号 |
| specs | VARCHAR(200) | | 规格参数 |
| unit | VARCHAR(20) | Y | 计量单位（个、件、套等） |
| category | VARCHAR(50) | | 分类（轴承、密封件、电气元件等） |
| description | TEXT | | 备注说明 |
| status | TINYINT | Y | 状态：1-启用 0-停用 |
| created_at | DATETIME | Y | 创建时间 |
| updated_at | DATETIME | Y | 更新时间 |

### M4. 供应商管理模块

#### 数据字段 - 供应商主表 (supplier)

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| id | BIGINT | Y | 主键 |
| supplier_code | VARCHAR(30) | Y | 供应商编码（自动生成） |
| name | VARCHAR(100) | Y | 供应商名称 |
| contact_person | VARCHAR(50) | Y | 联系人 |
| contact_phone | VARCHAR(20) | Y | 联系人电话 |
| contact_email | VARCHAR(100) | | 联系人邮箱 |
| company_address | VARCHAR(300) | | 公司地址 |
| brands | VARCHAR(500) | | 主营品牌（多个，逗号分隔或关联表） |
| categories | VARCHAR(500) | | 供应备件品类 |
| cooperation_status | TINYINT | Y | 合作状态：1-正常合作 2-暂停合作 3-已终止 |
| first_cooperation_date | DATE | | 首次合作日期 |
| avg_delivery_days | INT | | 平均交货周期（天，系统自动计算） |
| quality_rating | TINYINT | | 质量评级：1-优 2-良 3-差 |
| settlement_method | VARCHAR(30) | | 结算方式：月结/现结/预付款 |
| tax_rate | DECIMAL(5,2) | | 税率(%) |
| invoice_type | VARCHAR(30) | | 发票类型 |
| bank_name | VARCHAR(100) | | 开户行 |
| bank_account | VARCHAR(50) | | 银行账号 |
| bank_account_name | VARCHAR(100) | | 账户名 |
| total_purchase_amount | DECIMAL(15,2) | | 历史采购总金额（系统汇总） |
| total_purchase_count | INT | | 历史采购次数（系统汇总） |
| last_purchase_date | DATE | | 最近一次采购日期 |
| remark | TEXT | | 备注 |
| status | TINYINT | Y | 状态：1-启用 0-停用 |
| created_at | DATETIME | Y | 创建时间 |
| updated_at | DATETIME | Y | 更新时间 |

#### 数据字段 - 供应商物料关联表 (supplier_material)

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| id | BIGINT | Y | 主键 |
| supplier_id | BIGINT | Y | 供应商 ID |
| material_id | BIGINT | Y | 物料 ID |
| supply_price | DECIMAL(15,2) | | 最近供货价格 |
| supply_price_date | DATE | | 价格更新日期 |
| is_primary | TINYINT | Y | 是否主供应商：1-是 0-否 |

### M5. 客户管理模块

#### 数据字段 - 客户主表 (customer)

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| id | BIGINT | Y | 主键 |
| customer_code | VARCHAR(30) | Y | 客户编码（自动生成） |
| name | VARCHAR(100) | Y | 客户名称 |
| contact_person | VARCHAR(50) | Y | 对接人 |
| contact_phone | VARCHAR(20) | Y | 联系电话 |
| contact_email | VARCHAR(100) | | 联系邮箱 |
| sales_id | BIGINT | | 归属销售（关联人员表） |
| customer_level | TINYINT | | 客户级别：1-A级 2-B级 3-C级 |
| total_order_amount | DECIMAL(15,2) | | 历史订单总金额（系统汇总） |
| total_order_count | INT | | 历史订单数（系统汇总） |
| remark | TEXT | | 备注 |
| status | TINYINT | Y | 状态：1-启用 0-停用 |
| created_at | DATETIME | Y | 创建时间 |
| updated_at | DATETIME | Y | 更新时间 |

#### 数据字段 - 客户收货地址表 (customer_address)

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| id | BIGINT | Y | 主键 |
| customer_id | BIGINT | Y | 客户 ID |
| address_type | TINYINT | Y | 地址类型：1-工厂地址 2-客户地址 3-其他 |
| receiver_name | VARCHAR(50) | Y | 收件人 |
| receiver_phone | VARCHAR(20) | Y | 收件人电话 |
| province | VARCHAR(30) | | 省 |
| city | VARCHAR(30) | | 市 |
| district | VARCHAR(30) | | 区 |
| detail_address | VARCHAR(300) | Y | 详细地址 |
| is_default | TINYINT | Y | 是否默认地址 |
| created_at | DATETIME | Y | 创建时间 |

#### 数据字段 - 客户开票信息表 (customer_invoice)

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| id | BIGINT | Y | 主键 |
| customer_id | BIGINT | Y | 客户 ID |
| invoice_title | VARCHAR(200) | Y | 开票抬头（公司全称） |
| tax_no | VARCHAR(50) | Y | 税号 |
| bank_name | VARCHAR(100) | | 开户行 |
| bank_account | VARCHAR(50) | | 银行账号 |
| invoice_address | VARCHAR(300) | | 开票地址 |
| invoice_phone | VARCHAR(20) | | 开票电话 |
| created_at | DATETIME | Y | 创建时间 |
| updated_at | DATETIME | Y | 更新时间 |

### M6. 订单管理模块（核心）

#### 数据字段 - 合同/订单主表 (contract_order)

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| id | BIGINT | Y | 主键 |
| order_no | VARCHAR(30) | Y | 订单编号（系统自动生成） |
| contract_no | VARCHAR(50) | Y | 合同编号（手工录入） |
| customer_id | BIGINT | Y | 客户 ID |
| sales_id | BIGINT | Y | 销售员 ID |
| project_manager_id | BIGINT | Y | 项目负责人 ID |
| total_amount | DECIMAL(15,2) | Y | 合同总价 |
| delivery_date | DATE | Y | 承诺交货日期（货期） |
| sign_date | DATE | | 签订日期 |
| is_urgent | TINYINT | Y | 是否加急：0-否 1-是 |
| status | VARCHAR(20) | Y | 订单状态（见状态流转定义） |
| factory_demand_desc | TEXT | | 工厂需求描述 |
| contract_attachment | VARCHAR(500) | | 合同附件路径 |
| remark | TEXT | | 备注 |
| created_by | BIGINT | Y | 创建人 |
| created_at | DATETIME | Y | 创建时间 |
| updated_at | DATETIME | Y | 更新时间 |
| closed_at | DATETIME | | 关闭时间 |
| closed_by | BIGINT | | 关闭人 |

#### 数据字段 - 订单明细表 (contract_order_item)

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| id | BIGINT | Y | 主键 |
| order_id | BIGINT | Y | 订单 ID |
| material_id | BIGINT | Y | 物料 ID |
| material_code | VARCHAR(50) | Y | 物料编码（冗余） |
| material_name | VARCHAR(100) | Y | 物料名称（冗余） |
| brand | VARCHAR(50) | | 品牌（冗余） |
| model | VARCHAR(100) | | 型号（冗余） |
| quantity | DECIMAL(15,2) | Y | 数量 |
| unit | VARCHAR(20) | Y | 单位 |
| unit_price | DECIMAL(15,2) | Y | 单价（客户报价，权限控制） |
| amount | DECIMAL(15,2) | Y | 金额 = 数量 x 单价 |
| purchase_price | DECIMAL(15,2) | | 采购单价（权限控制） |
| delivery_status | VARCHAR(20) | Y | 发货状态：待采购/采购中/已到货/已发货/已签收 |

#### 数据字段 - 采购单表 (purchase_order)

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| id | BIGINT | Y | 主键 |
| purchase_no | VARCHAR(30) | Y | 采购单号（系统自动生成） |
| order_id | BIGINT | Y | 关联订单 ID |
| order_item_id | BIGINT | Y | 关联订单明细 ID |
| supplier_id | BIGINT | Y | 供应商 ID |
| material_id | BIGINT | Y | 物料 ID |
| quantity | DECIMAL(15,2) | Y | 采购数量 |
| unit_price | DECIMAL(15,2) | Y | 采购单价 |
| total_amount | DECIMAL(15,2) | Y | 采购金额 |
| purchaser_id | BIGINT | Y | 采购员 ID |
| status | VARCHAR(20) | Y | 状态：待采购/采购中/已下单/已到货/已验收 |
| expected_delivery_date | DATE | | 预计到货日期 |
| actual_delivery_date | DATE | | 实际到货日期 |
| remark | TEXT | | 备注 |
| created_by | BIGINT | Y | 创建人（项目负责人） |
| created_at | DATETIME | Y | 创建时间 |
| updated_at | DATETIME | Y | 更新时间 |

> 拆单逻辑：一个订单明细对应一张或多张采购单（由采购员创建时自行拆分）。采购员收到项目提交的采购单后，根据不同供应商自行拆分创建子采购单。

#### 数据字段 - 验收记录表 (inspection_record)

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| id | BIGINT | Y | 主键 |
| purchase_order_id | BIGINT | Y | 采购单 ID |
| inspector_id | BIGINT | Y | 验收人（项目负责人） |
| inspection_date | DATETIME | Y | 验收时间 |
| inspection_result | TINYINT | Y | 验收结果：1-合格 2-不合格 |
| actual_quantity | DECIMAL(15,2) | Y | 实收数量 |
| remark | TEXT | | 验收备注（不合格原因等） |

#### 数据字段 - 发货记录表 (shipment_record)

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| id | BIGINT | Y | 主键 |
| order_id | BIGINT | Y | 订单 ID |
| shipment_no | VARCHAR(30) | Y | 发货单号（系统自动生成） |
| express_company | VARCHAR(50) | Y | 快递公司 |
| tracking_no | VARCHAR(50) | Y | 快递单号（手动录入） |
| receiver_name | VARCHAR(50) | Y | 收件人 |
| receiver_phone | VARCHAR(20) | Y | 收件人电话 |
| shipping_address | VARCHAR(300) | Y | 发货地址（全地址） |
| shipment_date | DATETIME | Y | 发货时间 |
| shipped_by | BIGINT | Y | 发货人（项目负责人） |
| address_confirmed_by | BIGINT | Y | 地址确认人（销售） |
| address_confirmed_at | DATETIME | Y | 地址确认时间 |
| remark | TEXT | | 备注 |
| created_at | DATETIME | Y | 创建时间 |

#### 数据字段 - 签收记录表 (receipt_record)

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| id | BIGINT | Y | 主键 |
| order_id | BIGINT | Y | 订单 ID |
| shipment_id | BIGINT | Y | 关联发货记录 ID |
| receipt_date | DATE | Y | 签收日期 |
| receipt_status | TINYINT | Y | 签收状态：1-已签收 2-有问题 |
| receipt_attachment | VARCHAR(500) | | 签收单附件（签字版扫描件） |
| archived_by | BIGINT | | 归档人（项目负责人） |
| archived_at | DATETIME | | 归档时间 |
| created_at | DATETIME | Y | 创建时间 |

#### 数据字段 - 退换货记录表 (return_exchange_record)

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| id | BIGINT | Y | 主键 |
| return_no | VARCHAR(30) | Y | 退换货单号（系统自动生成） |
| order_id | BIGINT | Y | 关联订单 ID |
| order_item_id | BIGINT | Y | 关联订单明细 ID |
| type | TINYINT | Y | 类型：1-退货 2-换货 |
| reason | TEXT | Y | 退换货原因 |
| initiator_id | BIGINT | Y | 发起人（销售） |
| project_confirmed | TINYINT | Y | 项目是否确认：0-待确认 1-已确认 2-拒绝 |
| project_confirmed_by | BIGINT | | 确认人（项目负责人） |
| status | VARCHAR(20) | Y | 状态：待确认/处理中/已完成/已取消 |
| purchase_order_id | BIGINT | | 关联换货采购单 ID |
| remark | TEXT | | 备注 |
| created_at | DATETIME | Y | 创建时间 |
| updated_at | DATETIME | Y | 更新时间 |

### M7. 邮件通知模块

#### 数据字段 - 邮件草稿表 (email_draft)

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| id | BIGINT | Y | 主键 |
| trigger_event | VARCHAR(50) | Y | 触发事件类型 |
| order_id | BIGINT | Y | 关联订单 ID |
| recipient | VARCHAR(100) | Y | 收件人邮箱 |
| cc | VARCHAR(500) | | 抄送人邮箱 |
| subject | VARCHAR(200) | Y | 邮件主题 |
| body | TEXT | Y | 邮件正文（HTML） |
| status | TINYINT | Y | 状态：1-待确认 2-已发送 3-已取消 |
| sent_at | DATETIME | | 发送时间 |
| sent_by | BIGINT | | 发送确认人 |
| created_at | DATETIME | Y | 创建时间 |

### M8. 操作日志模块

#### 数据字段 - 操作日志表 (operation_log)

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| id | BIGINT | Y | 主键 |
| operator_id | BIGINT | Y | 操作人 ID |
| operator_name | VARCHAR(50) | Y | 操作人姓名（冗余） |
| operator_role | TINYINT | Y | 操作人角色 |
| module | VARCHAR(30) | Y | 操作模块（order/purchase/customer/supplier...） |
| action | VARCHAR(50) | Y | 操作动作（create/update/status_change/upload...） |
| target_type | VARCHAR(30) | Y | 操作对象类型 |
| target_id | BIGINT | Y | 操作对象 ID |
| detail | TEXT | | 操作详情（变更前后数据） |
| ip_address | VARCHAR(50) | | IP 地址 |
| created_at | DATETIME | Y | 操作时间 |

---

## 功能规格

> 来源：开发任务书各模块 M1-M10 功能清单

### M1. 登录与权限

| 编号 | 功能 | 说明 |
|------|------|------|
| M1-01 | 用户登录 | 登录名与 OA 统一登录名，密码独立或对接 OA 单点登录 |
| M1-02 | 登录鉴权 | 登录后根据岗位角色加载对应权限 |
| M1-03 | 会话管理 | Token 鉴权，支持超时自动登出 |
| M1-04 | 权限控制 | 前端路由守卫 + 后端接口级权限校验 |

### M2. 人员花名册

| 编号 | 功能 | 说明 |
|------|------|------|
| M2-01 | 新增人员 | 填写信息，一人一岗 |
| M2-02 | 编辑人员 | 修改人员信息 |
| M2-03 | 停用/启用 | 停用后不可登录，历史数据保留 |
| M2-04 | 人员列表 | 分页查询，支持按姓名/工号/岗位搜索 |

### M3. 备件物料库

| 编号 | 功能 | 说明 |
|------|------|------|
| M3-01 | 新增物料 | 录入物料信息，物料编码唯一校验 |
| M3-02 | 编辑物料 | 修改物料信息 |
| M3-03 | 停用/启用 | 停用后不可在新订单中选择 |
| M3-04 | 物料列表 | 分页查询，支持按编码/名称/品牌/分类搜索 |
| M3-05 | 物料下拉选择 | 订单录入时从物料库选择，带入编码、名称、单位等 |

### M4. 供应商管理

| 编号 | 功能 | 说明 |
|------|------|------|
| M4-01 | 新增供应商 | 录入供应商信息 |
| M4-02 | 编辑供应商 | 修改供应商信息 |
| M4-03 | 停用/启用 | 停用后不可在新采购单中选择 |
| M4-04 | 供应商列表 | 分页查询，支持按名称/品牌/品类/合作状态搜索 |
| M4-05 | 供应商详情 | 查看基础信息、关联物料、历史采购记录 |
| M4-06 | 供应商货物查询 | 按供应商查看其历史供货记录、常供型号、价格趋势 |
| M4-07 | 关联物料 | 为供应商关联可供应的物料及价格 |
| M4-08 | 质量评级 | 手工标记供应商质量评级 |

### M5. 客户管理

| 编号 | 功能 | 说明 |
|------|------|------|
| M5-01 | 新增客户 | 录入客户信息、地址、开票信息 |
| M5-02 | 编辑客户 | 修改客户信息 |
| M5-03 | 管理收货地址 | 新增/编辑/删除/设默认 |
| M5-04 | 管理开票信息 | 新增/编辑开票信息 |
| M5-05 | 客户列表 | 分页查询，支持按名称/归属销售/级别搜索 |
| M5-06 | 客户详情 | 查看基础信息、地址列表、开票信息、历史订单 |

### M6. 订单管理（核心）

#### 合同/订单管理

| 编号 | 功能 | 操作角色 | 说明 |
|------|------|---------|------|
| M6-01 | 创建订单 | 销售 | 录入客户、备件明细、报价、货期，可标记加急 |
| M6-02 | 录入合同信息 | 销售 | 填写合同编号、签订日期、上传合同附件 |
| M6-03 | 确认采购内容 | 项目负责人 | 确认采购内容无误，推动订单进入下一环节 |
| M6-04 | 确认报价/签合同 | 销售 | 标记合同已签订 |
| M6-05 | 提交采购单 | 项目负责人 | 向采购员提交采购需求 |
| M6-06 | 订单列表 | 销售/项目 | 分页查询，支持按状态/客户/加急/日期范围筛选 |
| M6-07 | 订单详情 | 销售/项目 | 查看订单全部信息（含明细、采购、发货、签收记录） |
| M6-08 | 订单看板 | 销售/项目 | 看板视图展示各状态订单分布，加急订单高亮置顶 |
| M6-09 | 关闭订单 | 销售 | 客户签收归档后，销售关闭订单 |

#### 采购管理

| 编号 | 功能 | 操作角色 | 说明 |
|------|------|---------|------|
| M6-10 | 创建采购单 | 采购员 | 收到采购需求后，选择供应商、填写采购价、拆分采购单 |
| M6-11 | 更新采购状态 | 采购员 | 更新采购进度：已下单->已到货 |
| M6-12 | 到货通知 | 采购员 | 到货后通知项目负责人验收 |
| M6-13 | 采购单列表 | 采购员 | 分页查询，支持按状态/供应商/日期筛选 |

#### 验收管理

| 编号 | 功能 | 操作角色 | 说明 |
|------|------|---------|------|
| M6-14 | 到货验收 | 项目负责人 | 核对型号数量，填写验收结果（合格/不合格） |

#### 发货管理

| 编号 | 功能 | 操作角色 | 说明 |
|------|------|---------|------|
| M6-15 | 确认发货地址 | 销售 | 从客户地址中选择或输入临时地址 |
| M6-16 | 创建发货单 | 项目负责人 | 填写快递公司、快递单号（手动录入）、发货 |
| M6-17 | 同步快递单号 | 项目 | 发货后快递单号同步给销售 |

#### 退换货管理

| 编号 | 功能 | 操作角色 | 说明 |
|------|------|---------|------|
| M6-18 | 发起退换货 | 销售 | 选择订单明细，填写原因 |
| M6-19 | 确认退换货 | 项目负责人 | 确认退换货申请 |
| M6-20 | 执行换货采购 | 采购员 | 向供应商执行换货/退货 |

### M7. 邮件通知

| 编号 | 功能 | 说明 |
|------|------|------|
| M7-01 | 自动生成草稿 | 事件触发后自动生成邮件草稿 |
| M7-02 | 草稿列表 | 操作人查看待发送的邮件草稿 |
| M7-03 | 编辑草稿 | 操作人可修改草稿内容后再发送 |
| M7-04 | 发送邮件 | 确认后发送，记录发送日志 |
| M7-05 | 发送日志 | 记录每封邮件的发送时间、收件人、状态 |
| M7-06 | 超期预警定时任务 | 每日定时扫描即将超期/已超期订单，生成预警草稿 |

### M8. 操作日志

| 编号 | 功能 | 说明 |
|------|------|------|
| M8-01 | 自动记录 | 所有关键操作（创建、修改、状态变更、上传附件）自动写入日志 |
| M8-02 | 日志查询 | 系统管理员可按人员/模块/时间范围查询全部日志 |
| M8-03 | 订单操作时间线 | 订单详情页展示该订单的全部操作时间线 |

### M9. 报表看板

| 编号 | 功能 | 说明 |
|------|------|------|
| M9-01 | 看板首页 | 展示上述 5 个看板的核心指标 |
| M9-02 | 订单概览 | 图表展示订单状态分布 |
| M9-03 | 超期预警 | 列表+图表展示超期情况 |
| M9-04 | 采购汇总 | 支持按月/供应商/品类维度查看 |
| M9-05 | 供应商分析 | 交货准时率、质量评级图表 |
| M9-06 | 销售业绩 | 按销售/客户维度统计 |

### M10. 系统配置

| 编号 | 功能 | 说明 |
|------|------|------|
| M10-01 | 物料分类管理 | 维护备件物料分类（轴承、密封件、电气元件等） |
| M10-02 | 快递公司管理 | 维护快递公司列表 |
| M10-03 | 邮件服务配置 | SMTP 服务器配置 |
| M10-04 | 超期预警配置 | 预警天数阈值配置（默认 3 天） |
| M10-05 | 编号规则配置 | 订单编号、采购单号等自动编号规则 |
| M10-06 | OA 对接配置 | 预留 OA 接口地址、认证方式等配置项 |

---

## 邮件通知规则

> 来源：开发任务书 4.8 节

### 通知规则表

| 触发事件 | 邮件模板 | 收件人 | 抄送 |
|---------|---------|--------|------|
| 合同签订完成 | 采购下料通知 | 项目负责人 | |
| 采购需求已提交 | 采购需求通知 | 采购员 | 项目负责人 |
| 采购开始执行 | 采购进度通知 | 项目负责人 | |
| 采购到货 | 到货验收通知 | 项目负责人 | |
| 发货完成 | 快递单号通知 | 销售 | |
| 货期超期预警 | 超期预警通知 | 项目负责人、销售 | |
| 加急订单标记 | 加急订单通知 | 项目负责人、采购员 | |

### 通知流程

```
业务事件触发
    |
    v
生成邮件草稿（自动填充收件人、主题、正文）
    |
    v
邮件草稿列表展示给对应操作人
    |
    v
操作人审核草稿内容，确认发送
    |
    v
系统发送邮件，记录发送日志
```

### 邮件模板字段

每封邮件需包含：
- 订单编号
- 客户名称
- 备件明细摘要
- 当前状态
- 加急标记（如有）
- 相关链接（跳转到订单详情）

---

## 报表看板指标

> 来源：开发任务书 4.10 节，5个看板的详细指标定义

### 1. 订单概览看板

| 指标 | 说明 |
|------|------|
| 在途订单总数 | 未关闭的订单数量 |
| 各状态分布 | 按订单状态统计数量 |
| 加急订单数 | 当前加急订单数量 |
| 今日新增订单 | 当天创建的订单数 |
| 本月新增订单 | 当月创建的订单数 |

### 2. 超期预警看板

| 指标 | 说明 |
|------|------|
| 即将超期订单 | 货期在 3 天内的未交付订单 |
| 已超期订单 | 已超过货期仍未交付的订单 |
| 超期天数统计 | 各超期订单的超期天数 |

### 3. 采购汇总看板

| 指标 | 说明 |
|------|------|
| 按月采购金额 | 月度采购金额趋势 |
| 按供应商统计 | 各供应商采购金额排名 |
| 按品类统计 | 各备件品类采购数量/金额 |

### 4. 供应商分析看板

| 指标 | 说明 |
|------|------|
| 交货准时率 | 各供应商按时交货的比例 |
| 质量评级分布 | 优/良/差供应商数量 |
| 采购频次排名 | 最活跃的供应商排名 |

### 5. 销售业绩看板

| 指标 | 说明 |
|------|------|
| 按销售人员统计 | 各销售的合同金额、订单数量 |
| 按客户统计 | 各客户的订单金额排名 |
| 月度趋势 | 月度合同金额趋势 |

---

## API 接口规格

> 来源：开发任务书各模块接口清单。Phase 1 已实现的接口未重复列出，以下为各模块规划接口。

### M1. 登录认证

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth/login` | POST | 登录，返回 Token |
| `/api/auth/logout` | POST | 登出 |
| `/api/auth/me` | GET | 获取当前用户信息及权限 |

### M2. 人员管理（已实现）

- CRUD: GET/POST/PUT/DELETE `/api/employees`
- 仅系统管理员可操作

### M3. 物料管理（已实现）

- CRUD: GET/POST/PUT/DELETE `/api/materials`

### M4. 供应商管理（已实现）

- CRUD: GET/POST/PUT/DELETE `/api/suppliers`
- 子表: `/api/suppliers/{id}/materials` 供应商物料关联

### M5. 客户管理（已实现）

- CRUD: GET/POST/PUT/DELETE `/api/customers`
- 子表: `/api/customers/{id}/addresses` 收货地址
- 子表: `/api/customers/{id}/invoices` 开票信息

### M6. 订单管理（待实现）

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/orders` | GET | 订单列表（分页、筛选） |
| `/api/orders` | POST | 创建订单 |
| `/api/orders/{id}` | GET | 订单详情（含明细、采购、发货、签收） |
| `/api/orders/{id}` | PUT | 更新订单 |
| `/api/orders/{id}/status` | PUT | 状态流转（按 STATUS_TRANSITIONS 校验） |
| `/api/orders/{id}/contract` | PUT | 录入合同信息 |
| `/api/orders/{id}/close` | POST | 关闭订单 |
| `/api/purchase-orders` | GET | 采购单列表 |
| `/api/purchase-orders` | POST | 创建采购单（拆单） |
| `/api/purchase-orders/{id}` | PUT | 更新采购状态 |
| `/api/inspections` | POST | 提交验收记录 |
| `/api/shipments` | POST | 创建发货单 |
| `/api/shipments/{id}/confirm-address` | PUT | 确认发货地址 |
| `/api/receipts` | POST | 提交签收记录 |
| `/api/return-exchanges` | GET | 退换货列表 |
| `/api/return-exchanges` | POST | 发起退换货 |
| `/api/return-exchanges/{id}/confirm` | PUT | 确认退换货 |

### M7. 邮件通知（待实现）

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/email-drafts` | GET | 邮件草稿列表 |
| `/api/email-drafts/{id}` | PUT | 编辑草稿 |
| `/api/email-drafts/{id}/send` | POST | 发送邮件 |

### M8. 操作日志（待实现）

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/operation-logs` | GET | 日志查询（管理员） |
| `/api/orders/{id}/timeline` | GET | 订单操作时间线 |

### M9. 报表看板（待实现）

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/dashboard/overview` | GET | 订单概览数据 |
| `/api/dashboard/overdue` | GET | 超期预警数据 |
| `/api/dashboard/purchase-summary` | GET | 采购汇总数据 |
| `/api/dashboard/supplier-analysis` | GET | 供应商分析数据 |
| `/api/dashboard/sales-performance` | GET | 销售业绩数据 |

### M10. 系统配置（待实现）

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/system-config` | GET | 获取系统配置 |
| `/api/system-config` | PUT | 更新系统配置 |
| `/api/system-config/categories` | GET/POST/PUT/DELETE | 物料分类管理 |
| `/api/system-config/express-companies` | GET/POST/PUT/DELETE | 快递公司管理 |

## 变更记录

### 2026-05-31: 订单管理前端页面（Phase 2 前端部分）

新增文件：
- `frontend/src/api/contractOrders.ts` — 订单 API 层（getOrders, getOrder, createOrder, updateOrder, changeOrderStatus, updateContractInfo, closeOrder, getOrderActions, getOrderStatuses）
- `frontend/src/pages/orders/index.tsx` — 订单列表页，含筛选栏（状态/客户/加急/搜索）、新建订单 Modal（备件明细可编辑表格、自动计算金额）
- `frontend/src/pages/orders/DetailPage.tsx` — 订单详情页，含基本信息卡片、备件明细表、状态时间线、合同信息编辑、状态流转操作按钮

修改文件：
- `frontend/src/App.tsx` — 替换 `/orders` PlaceholderPage 为 OrderListPage，新增 `/orders/:id` 子路由指向 OrderDetailPage

### 2026-05-31: 采购/验收/发货/签收/退换货前端页面（Phase 3 + Phase 4 前端）

新增文件：
- `frontend/src/api/purchaseOrders.ts` — 采购单 API 层（getPurchases, createPurchase, updatePurchaseStatus, getPurchase, getOrderPurchases）
- `frontend/src/api/inspectionRecords.ts` — 验收 API 层（createInspection, getPurchaseInspection, getOrderInspections, confirmInspection）
- `frontend/src/api/shipmentRecords.ts` — 发货 API 层（getShipments, createShipment, getOrderShipments, confirmAddress, updateTracking）
- `frontend/src/api/receiptRecords.ts` — 签收 API 层（createReceipt, archiveReceipt, getOrderReceipts）
- `frontend/src/api/returnExchanges.ts` — 退换货 API 层（getReturns, createReturn, confirmReturn, completeReturn, getOrderReturns）
- `frontend/src/pages/purchases/index.tsx` — 采购管理页，含列表筛选（状态/供应商）、状态流转按钮、创建采购单 Modal、详情 Modal
- `frontend/src/pages/shipments/index.tsx` — 发货管理页，含发货记录列表、快递信息编辑 Modal、地址确认

修改文件：
- `frontend/src/pages/orders/DetailPage.tsx` — 嵌入验收管理（验收 Modal + 验收完成按钮）、发货管理（创建发货单 Modal）、签收管理（签收 Modal + 归档按钮）、退换货管理（发起退换货 Modal + 确认/完成按钮），各模块按订单状态条件显示
- `frontend/src/App.tsx` — 替换 `/purchases` PlaceholderPage 为 PurchaseListPage，新增 `/shipments` 路由指向 ShipmentListPage

### 2026-05-31: E2E测试发现的Bug修复

1. **contract_orders.py 日期解析 Bug**：`create_order`/`update_order`/`update_contract_info` 直接将 JSON 字符串赋值给 Date 类型字段，SQLite 不接受字符串日期。修复：添加 `_parse_date()` 辅助函数，在写入前将字符串转为 `datetime.date` 对象。
2. **order_state_machine.py 缺少角色映射**：`shipped -> pending_receipt` 和 `pending_receipt -> received` 两个状态转换没有配置允许的角色，导致项目经理无法操作发货后的签收流程。修复：在 `_ROLE_TRANSITIONS` 中补充这两个转换的 `project_manager` 角色权限。
