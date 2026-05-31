# PSI_SYS 快速开始

## 一、开发环境启动

### 前置要求

- Python 3.12+
- Node.js 18+
- SQLite 3（开发环境自带）

### 1. 后端启动

```bash
cd backend

# 创建虚拟环境并安装依赖（首次运行）
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 初始化数据库（创建表 + 种子数据）
python -m app.seed

# 填充演示数据（可选）
python -m app.seed_demo

# 启动服务
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

后端启动后访问：http://localhost:8000/api/health

### 2. 前端启动

```bash
cd frontend

# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev
```

前端启动后访问：http://localhost:5173（或 5174 如果 5173 端口被占用）

## 二、测试账号

| 角色 | 账号 | 密码 | 权限说明 |
|------|------|------|----------|
| 系统管理员 | admin | admin123 | 全部功能，人员管理、系统配置 |
| 销售员 | sales01 | 123456 | 订单创建、报价、合同、发货、关闭 |
| 项目负责人 | pm01 | 123456 | 确认内容、提交采购、验收、发货、签收 |
| 采购员 | buyer01 | 123456 | 采购单创建、采购状态更新 |

**注意**: 演示数据中已创建 10 个订单，覆盖完整生命周期状态，可直接在各模块查看。

## 三、功能模块导航

| 模块 | 路由 | 主要角色 |
|------|------|----------|
| 订单管理 | `/orders` | 销售、项目负责人 |
| 采购管理 | `/purchases` | 采购员 |
| 发货管理 | `/shipments` | 项目负责人 |
| 报表看板 | `/dashboard` | 全部角色 |
| 系统配置 | `/settings` | 管理员 |
| 操作日志 | `/logs` | 管理员 |

## 四、常见问题

### 后端启动失败
```bash
# 检查端口是否被占用
lsof -i :8000

# 删除旧数据库重新初始化
rm psi_sys.db
python -m app.seed
```

### 前端启动失败
```bash
# 清理 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

### 数据库无数据
```bash
cd backend
source .venv/bin/activate
python -m app.seed_demo
```
