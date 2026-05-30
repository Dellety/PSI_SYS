# PSI_SYS - 备件供应链跟踪系统

## 项目概述

代理商备件供应链全流程跟踪系统，覆盖从客户订货到最终交货的完整生命周期。

## 业务流程

```
客户订货 → 采购（向供应商采购）→ 发货（物流跟踪）→ 交货（客户签收）
```

每个环节需有完整的操作记录和状态变更历史。

## 用户角色

| 角色 | 说明 |
|------|------|
| 内部管理人员 | 管理整个系统，查看所有数据 |
| 客户 | 下单订货，查看订单和物流状态 |
| 供应商 | 确认订单，更新发货信息 |
| 采购员 | 负责采购环节的操作 |
| 项目经理 | 统筹项目，查看项目维度数据 |
| 发货人员 | 管理发货和物流 |
| 销售人员 | 维护客户关系，跟进订单 |

## 技术栈

- **后端**: Python FastAPI（API-first 设计，便于后续对接 OA 系统）
- **前端**: React + Ant Design Pro（企业级中文 UI 组件）
- **数据库**: MySQL
- **ORM**: SQLAlchemy
- **认证**: JWT + RBAC（基于角色的访问控制）
- **界面语言**: 中文

## 部署方式

- 内部服务器部署（on-premise）
- OA 系统对接方式：REST API

## 核心功能

### 订单管理（订货）
- 客户下单、订单编辑、订单状态跟踪
- 备件信息管理（型号、规格、品牌等）

### 采购管理
- 根据订单生成采购需求
- 供应商报价对比
- 采购单创建与审批

### 发货/物流管理
- 发货单创建
- 物流信息跟踪
- 发货通知

### 交货管理
- 交货确认
- 签收记录
- 异常处理（破损、短缺等）

### 通用功能
- 全流程操作日志/审计追踪
- 文件附件管理（报价单、发票、发货单等）
- 角色权限控制
- 数据统计与报表

## 重要修改记录

### 2026-05-30 项目初始化
- 创建 monorepo 结构：backend/ (FastAPI) + frontend/ (React + AntD)
- 数据库模型：users, customers, suppliers, parts, orders, order_items, procurements, procurement_items, shipments, shipment_items, deliveries, delivery_items, attachments, audit_logs（共 14 张表）
- 后端 API：认证(JWT)、基础数据 CRUD(users/customers/suppliers/parts)、业务流程(orders/procurements/shipments/deliveries)、报表(reports)
- 前端：登录页、主布局(侧边栏+顶栏)、仪表盘、订单管理页（含新建/详情/筛选）
- 部署：docker-compose.yml (MySQL 8.0 + 后端)、Dockerfile
