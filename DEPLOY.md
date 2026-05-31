# PSI_SYS 部署指南

## 一、环境要求

### 后端
- Python 3.12+
- MySQL 8.0+（生产环境）
- SMTP 服务器（邮件通知功能，可选）

### 前端
- Node.js 18+
- 现代浏览器（Chrome 90+, Firefox 88+, Safari 14+）

### 服务器
- CPU: 2核+
- 内存: 4GB+
- 磁盘: 20GB+

## 二、依赖清单

### 后端依赖（requirements.txt）

| 包名 | 版本 | 用途 |
|------|------|------|
| fastapi | 0.115.6 | Web 框架 |
| uvicorn | 0.34.0 | ASGI 服务器 |
| sqlalchemy | 2.0.36 | ORM |
| alembic | 1.14.1 | 数据库迁移 |
| pymysql | 1.1.1 | MySQL 驱动 |
| cryptography | 44.0.0 | 加密库 |
| python-jose | 3.3.0 | JWT 处理 |
| passlib | 1.7.4 | 密码哈希 |
| pydantic | 2.10.4 | 数据验证 |
| pydantic-settings | 2.7.1 | 配置管理 |
| python-dotenv | 1.0.1 | 环境变量 |
| aiofiles | 24.1.0 | 异步文件操作 |
| python-multipart | 0.0.19 | 文件上传 |

### 前端依赖（package.json）

| 包名 | 版本 | 用途 |
|------|------|------|
| react | 18.3.1 | UI 框架 |
| typescript | 5.6.3 | 类型系统 |
| antd | 5.22.6 | UI 组件库 |
| zustand | 5.0.2 | 状态管理 |
| react-router | 7.1.1 | 路由 |
| axios | 1.7.9 | HTTP 客户端 |
| echarts | 5.6.0 | 图表库 |
| dayjs | 1.11.13 | 日期处理 |
| vite | 6.4.2 | 构建工具 |

## 三、生产环境部署

### 3.1 后端部署

```bash
# 1. 创建虚拟环境
python3 -m venv .venv
source .venv/bin/activate

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置环境变量（.env）
cp .env.example .env
# 编辑 .env 文件，配置数据库、JWT_SECRET 等

# 4. 数据库迁移
alembic upgrade head

# 5. 初始化种子数据
python -m app.seed

# 6. 使用 systemd/supervisor 配置服务启动
# 或使用 gunicorn + uvicorn workers
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### 3.2 前端部署

```bash
# 1. 安装依赖
npm install

# 2. 构建生产包
npm run build

# 3. 将 dist/ 目录部署到 Nginx/Apache
# 配置反向代理到后端 API
```

### 3.3 Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/psi-sys/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 四、Docker 部署

### Docker Compose 部署（推荐）

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

### 单独 Docker 部署

```bash
# 后端
docker build -t psi-sys-backend ./backend
docker run -d -p 8000:8000 --env-file .env psi-sys-backend

# 前端
docker build -t psi-sys-frontend ./frontend
docker run -d -p 80:80 psi-sys-frontend
```

## 五、安全配置

### 必须修改的配置项

1. **JWT 密钥** (`SECRET_KEY`): 生产环境必须使用强随机字符串
2. **数据库密码**: 修改默认数据库密码
3. **SMTP 凭证**: 如需邮件功能，配置 SMTP 服务器

### 建议配置

1. 启用 HTTPS（使用 Let's Encrypt）
2. 配置防火墙只开放必要端口
3. 定期备份数据库
4. 启用日志审计

## 六、数据库备份

```bash
# MySQL 备份
mysqldump -u username -p psi_sys > backup_$(date +%Y%m%d).sql

# SQLite 备份（开发环境）
cp psi_sys.db psi_sys_backup_$(date +%Y%m%d).db
```
