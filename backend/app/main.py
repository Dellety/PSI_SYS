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
