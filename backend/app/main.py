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
    import app.models.user, app.models.customer, app.models.supplier, app.models.part
    import app.models.order, app.models.procurement, app.models.shipment, app.models.delivery
    import app.models.audit_log, app.models.attachment
    Base.metadata.create_all(bind=engine)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": settings.APP_NAME}


from app.api import auth, users, customers, suppliers, parts
from app.api import orders, procurements, shipments, deliveries, reports

app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(users.router, prefix="/api/users", tags=["用户"])
app.include_router(customers.router, prefix="/api/customers", tags=["客户"])
app.include_router(suppliers.router, prefix="/api/suppliers", tags=["供应商"])
app.include_router(parts.router, prefix="/api/parts", tags=["备件"])
app.include_router(orders.router, prefix="/api/orders", tags=["订单"])
app.include_router(procurements.router, prefix="/api/procurements", tags=["采购"])
app.include_router(shipments.router, prefix="/api/shipments", tags=["发货"])
app.include_router(deliveries.router, prefix="/api/deliveries", tags=["交货"])
app.include_router(reports.router, prefix="/api/reports", tags=["报表"])
