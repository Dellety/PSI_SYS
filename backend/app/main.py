from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base

app = FastAPI(title=settings.APP_NAME, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    # 导入所有模型确保表创建
    import app.models.employee
    import app.models.material
    import app.models.supplier
    import app.models.customer
    import app.models.contract_order
    import app.models.purchase_order
    import app.models.inspection_record
    import app.models.shipment_record
    import app.models.receipt_record
    import app.models.return_exchange
    import app.models.email_draft
    import app.models.operation_log
    import app.models.system_config
    Base.metadata.create_all(bind=engine)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": settings.APP_NAME}


# 已实现的 API 路由
from app.api import auth as auth_api
app.include_router(auth_api.router, prefix="/api/auth", tags=["认证"])

# Phase 1 后逐步注册:
from app.api import employees, materials
app.include_router(employees.router, prefix="/api/employees", tags=["人员花名册"])
app.include_router(materials.router, prefix="/api/materials", tags=["物料库"])
from app.api import suppliers as suppliers_api
from app.api import customers as customers_api
from app.api import contract_orders
app.include_router(suppliers_api.router, prefix="/api/suppliers", tags=["供应商"])
app.include_router(customers_api.router, prefix="/api/customers", tags=["客户"])
app.include_router(contract_orders.router, prefix="/api/orders", tags=["订单管理"])

# Phase 3 + Phase 4 路由:
from app.api import purchase_orders, inspection_records, shipment_records, receipt_records, return_exchanges
app.include_router(purchase_orders.router, prefix="/api/purchases", tags=["采购管理"])
app.include_router(inspection_records.router, prefix="/api/inspections", tags=["验收管理"])
app.include_router(shipment_records.router, prefix="/api/shipments", tags=["发货管理"])
app.include_router(receipt_records.router, prefix="/api/receipts", tags=["签收管理"])
app.include_router(return_exchanges.router, prefix="/api/returns", tags=["退换货"])

# Phase 5 + Phase 6 路由:
from app.api import operation_logs, email_drafts
from app.api import dashboard as dashboard_api
from app.api import reports as reports_api
app.include_router(operation_logs.router, prefix="/api/logs", tags=["操作日志"])
app.include_router(email_drafts.router, prefix="/api/emails", tags=["邮件通知"])
app.include_router(dashboard_api.router, prefix="/api/dashboard", tags=["仪表盘"])
app.include_router(reports_api.router, prefix="/api/reports", tags=["统计报表"])

# Phase 7 系统配置:
from app.api import system_config
app.include_router(system_config.router, prefix="/api/settings", tags=["系统配置"])
