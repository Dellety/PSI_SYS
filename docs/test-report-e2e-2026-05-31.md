# PSI_SYS 端到端测试报告

## 测试环境

- **后端**: FastAPI + SQLite，端口 8000
- **前端**: React + TypeScript + Vite
- **测试日期**: 2026-05-31

## 测试结果总览

| 类别 | 测试数 | 通过 | 失败 | 已修复 |
|------|:------:|:----:|:----:|:------:|
| 健康检查 + 种子数据 | 2 | 2 | 0 | 0 |
| 认证（4角色登录） | 8 | 8 | 0 | 0 |
| 基础数据 CRUD | 10 | 10 | 0 | 0 |
| 订单生命周期（13种状态） | 13 | 11 | 2 | 2 |
| 角色字段过滤 | 3 | 3 | 0 | 0 |
| 权限拦截 | 6 | 6 | 0 | 0 |
| 仪表盘 + 报表 + 配置 | 7 | 7 | 0 | 0 |
| 前端编译 | 1 | 1 | 0 | 0 |
| **合计** | **50** | **48** | **2** | **2** |

---

## Bug 记录

### Bug 1: 日期字符串未解析导致创建订单 500

- **症状**: `POST /api/orders` 返回 500 Internal Server Error -- `SQLite Date type only accepts Python date objects`
- **根因**: `contract_orders.py` 中 `create_order()`、`update_order()`、`update_contract_info()` 将 JSON 字符串直接赋值给 SQLAlchemy Date 列
- **修复**: 添加 `_parse_date()` 辅助函数，在 `delivery_date` 和 `sign_date` 赋值前转换
- **文件**: `backend/app/api/contract_orders.py`

### Bug 2: 状态机缺少发货→签收的角色映射

- **症状**: `PUT /api/orders/{id}/status` 设置 `target_status=pending_receipt` 或 `received` 时所有角色都返回 403
- **根因**: `_ROLE_TRANSITIONS` 字典缺少 `(shipped, pending_receipt)` 和 `(pending_receipt, received)` 的角色映射
- **修复**: 补充 `project_manager` 角色的两条转换权限
- **文件**: `backend/app/services/order_state_machine.py`

---

## 详细测试结果

### 1. 健康检查 + 种子数据

| 测试 | 结果 |
|------|------|
| `GET /api/health` 返回 `{"status":"ok"}` | ✅ |
| 种子数据初始化（4账号 + 10配置项） | ✅ |

### 2. 认证（4角色）

| 测试 | 结果 |
|------|------|
| admin / admin123 登录获取 token | ✅ |
| sales01 / 123456 登录获取 token | ✅ |
| pm01 / 123456 登录获取 token | ✅ |
| buyer01 / 123456 登录获取 token | ✅ |
| `GET /api/auth/me` 返回正确角色信息 | ✅ |
| 错误密码登录被拒绝 | ✅ |
| 停用账号登录被拒绝 | ✅ |
| 无效 token 请求被拒绝 | ✅ |

### 3. 基础数据 CRUD

| 测试 | 结果 |
|------|------|
| 创建物料（POST /api/materials） | ✅ |
| 物料列表查询（GET /api/materials） | ✅ |
| 创建供应商 + 关联物料 | ✅ |
| 创建客户 + 收货地址 + 开票信息 | ✅ |
| 物料编码唯一校验 | ✅ |
| 供应商状态切换 | ✅ |
| 客户详情含地址和发票 | ✅ |
| 人员列表（仅管理员） | ✅ |
| 非 admin 创建员工被拒绝 | ✅ |
| 简单列表下拉（simple-list） | ✅ |

### 4. 订单生命周期（13步完整流程）

| 步骤 | 状态流转 | 操作角色 | 结果 |
|------|----------|----------|------|
| 创建订单 | → pending_confirm | 销售 | ✅ |
| 确认内容 | → pending_quote | 销售/PM | ✅ |
| 报价 | → pending_contract | 销售 | ✅ |
| 签合同 | → pending_dispatch | 销售 | ✅ |
| 通知下料 | → pending_purchase | PM | ✅ |
| 采购开始 | → purchasing | 采购员 | ✅ |
| 到货 | → pending_inspect | 采购员 | ✅ |
| 开始验收 | → inspecting | PM | ✅ |
| 验收通过 | → pending_ship | PM | ✅ |
| 发货 | → shipped | PM | ✅（修复后） |
| 待签收 | → pending_receipt | PM | ✅（修复后） |
| 已签收 | → received | PM | ✅（修复后） |
| 关闭 | → closed | 销售 | ✅ |

**异常流程**：

| 测试 | 结果 |
|------|------|
| 取消订单（pending_confirm → cancelled） | ✅ |
| 退换货流程（发起→确认→完成→回到验收） | ✅ |

### 5. 角色字段过滤

| 测试 | 预期 | 结果 |
|------|------|------|
| 项目负责人获取订单详情 | 不含 unit_price, purchase_price, total_amount | ✅ |
| 采购员获取订单详情 | 不含 unit_price，含 purchase_price | ✅ |
| 销售获取订单详情 | 含 unit_price，不含 purchase_price | ✅ |

### 6. 权限拦截

| 测试 | 结果 |
|------|------|
| 采购员创建订单被拒绝 | ✅ 403 |
| 无效状态流转被拒绝（如 pending_confirm → closed） | ✅ 400 |
| 采购员确认采购内容被拒绝 | ✅ 403 |
| 项目负责人关闭订单被拒绝 | ✅ 403 |
| 销售发起退换货 | ✅ |
| 项目负责人确认退换货 | ✅ |

### 7. 子记录联动

| 测试 | 结果 |
|------|------|
| 创建采购单 + 状态推进（pending→purchasing→ordered→arrived） | ✅ |
| 验收记录创建（合格/不合格） | ✅ |
| 发货单创建 + 地址确认 + 快递信息更新 | ✅ |
| 签收记录创建 + 归档 | ✅ |
| 退换货：发起→确认→完成，订单恢复到 pending_inspect | ✅ |

### 8. 仪表盘 + 报表 + 系统配置

| 测试 | 结果 |
|------|------|
| `GET /api/dashboard/overview` 返回统计数据 | ✅ |
| 订单概览报表（状态分布 + 加急订单） | ✅ |
| 超期预警报表 | ✅ |
| 采购汇总报表（按月/供应商/品类） | ✅ |
| 供应商分析报表（准时率/质量/频次） | ✅ |
| 销售业绩报表（按销售/客户/月度） | ✅ |
| 系统配置列表（10项）+ 更新配置 | ✅ |

### 9. 前端编译

| 测试 | 结果 |
|------|------|
| `npx tsc --noEmit` 零错误 | ✅ |

---

## 测试账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 系统管理员 | admin | admin123 |
| 销售员 | sales01 | 123456 |
| 项目负责人 | pm01 | 123456 |
| 采购员 | buyer01 | 123456 |

## 后续建议

1. **前端 E2E 测试**: 建议使用 Playwright 或 Cypress 进行前端页面级自动化测试
2. **数据库迁移**: 生产环境应使用 Alembic 管理数据库迁移，而非 `Base.metadata.create_all()`
3. **测试覆盖**: 建议为后端 API 添加 pytest 单元测试
4. **性能测试**: 报表聚合查询在大数据量下可能需要优化（添加索引）
5. **安全加固**: SMTP 密码应加密存储，API 应添加限流中间件
