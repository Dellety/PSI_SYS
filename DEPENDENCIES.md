# PSI_SYS 依赖与安装清单

记录本项目引入的所有依赖和外部程序，便于未来清理。

---

## Docker 镜像

| 镜像 | 用途 | 清理命令 |
|------|------|----------|
| mysql:8.0 | 数据库 | `docker rmi mysql:8.0` |
| python:3.12-slim | 后端运行环境（Dockerfile 中引用） | `docker rmi python:3.12-slim` |

### Docker 卷

| 卷名 | 用途 | 清理命令 |
|------|------|----------|
| psi_sys_mysql_data | MySQL 数据持久化 | `docker volume rm psi_sys_mysql_data` |
| psi_sys_uploads_data | 上传文件持久化 | `docker volume rm psi_sys_uploads_data` |

### Docker 容器

| 容器名 | 用途 | 清理命令 |
|--------|------|----------|
| psi_sys_mysql | MySQL 服务 | `docker stop psi_sys_mysql && docker rm psi_sys_mysql` |
| psi_sys_backend | FastAPI 后端 | `docker stop psi_sys_backend && docker rm psi_sys_backend` |

### 一键清理全部 Docker 资源

```bash
docker compose -f /Users/doni/PJ/PSI_SYS/docker-compose.yml down -v --rmi all
```

---

## 后端 Python 依赖

路径：`backend/requirements.txt`

| 包名 | 版本 | 用途 |
|------|------|------|
| fastapi | 0.115.6 | Web 框架 |
| uvicorn[standard] | 0.34.0 | ASGI 服务器 |
| sqlalchemy | 2.0.36 | ORM |
| alembic | 1.14.1 | 数据库迁移 |
| pymysql | 1.1.1 | MySQL 驱动 |
| cryptography | 44.0.0 | 加密库（JWT 依赖） |
| python-jose[cryptography] | 3.3.0 | JWT 令牌 |
| passlib[bcrypt] | 1.7.4 | 密码哈希 |
| python-multipart | 0.0.19 | 文件上传支持 |
| pydantic | 2.10.4 | 数据校验 |
| pydantic-settings | 2.7.1 | 配置管理 |
| python-dotenv | 1.0.1 | .env 文件加载 |
| aiofiles | 24.1.0 | 异步文件操作 |

### 清理

```bash
# 如果使用了虚拟环境
rm -rf /Users/doni/PJ/PSI_SYS/backend/venv
rm -rf /Users/doni/PJ/PSI_SYS/backend/.venv
```

---

## 前端 npm 依赖

路径：`frontend/package.json`

### 运行时依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| react | ^18.3.1 | UI 框架 |
| react-dom | ^18.3.1 | React DOM 渲染 |
| react-router-dom | ^7.1.1 | 路由 |
| antd | ^5.23.2 | UI 组件库 |
| @ant-design/icons | ^5.6.1 | 图标 |
| @ant-design/pro-components | ^2.8.6 | Pro 高级组件 |
| axios | ^1.7.9 | HTTP 客户端 |
| zustand | ^5.0.3 | 状态管理 |
| dayjs | ^1.11.13 | 日期处理 |
| echarts | ^5.6.0 | 图表库 |
| echarts-for-react | ^3.0.2 | ECharts React 封装 |

### 开发依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| typescript | ~5.6.2 | TypeScript 编译 |
| vite | ^6.0.5 | 构建工具 |
| @vitejs/plugin-react | ^4.3.4 | Vite React 插件 |
| @types/react | ^18.3.18 | React 类型定义 |
| @types/react-dom | ^18.3.5 | React DOM 类型定义 |

### 清理

```bash
rm -rf /Users/doni/PJ/PSI_SYS/frontend/node_modules
```

---

## 端口占用

| 端口 | 服务 |
|------|------|
| 3306 | MySQL |
| 8000 | FastAPI 后端 |
| 5173 | Vite 前端开发服务器 |

---

## 项目完整清理

删除整个项目目录即可清理所有本地文件：

```bash
rm -rf /Users/doni/PJ/PSI_SYS
docker system prune  # 清理未使用的 Docker 资源
```
