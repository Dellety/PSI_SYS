from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, extract
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.delivery import Delivery, DeliveryStatus
from app.models.order import Order, OrderStatus
from app.models.procurement import Procurement, ProcurementStatus
from app.models.shipment import Shipment, ShipmentStatus
from app.models.user import User
from app.core.deps import get_current_user

router = APIRouter()


@router.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order_counts = {}
    for s in OrderStatus:
        order_counts[s.value] = db.query(func.count(Order.id)).filter(Order.status == s).scalar()

    procurement_counts = {}
    for s in ProcurementStatus:
        procurement_counts[s.value] = db.query(func.count(Procurement.id)).filter(Procurement.status == s).scalar()

    pending_shipment_count = db.query(func.count(Shipment.id)).filter(
        Shipment.status == ShipmentStatus.pending
    ).scalar()

    pending_delivery_count = db.query(func.count(Delivery.id)).filter(
        Delivery.status == DeliveryStatus.pending
    ).scalar()

    today = date.today()
    month_order_total = db.query(func.coalesce(func.sum(Order.total_amount), Decimal("0"))).filter(
        extract("year", Order.created_at) == today.year,
        extract("month", Order.created_at) == today.month,
    ).scalar()

    return {
        "order_counts": order_counts,
        "procurement_counts": procurement_counts,
        "pending_shipment_count": pending_shipment_count,
        "pending_delivery_count": pending_delivery_count,
        "month_order_total": float(month_order_total),
    }


@router.get("/order-status")
def order_status_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(Order.status, func.count(Order.id))
        .group_by(Order.status)
        .all()
    )
    return {status.value: count for status, count in rows}


@router.get("/procurement-summary")
def procurement_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(
            Procurement.supplier_id,
            func.count(Procurement.id).label("count"),
            func.coalesce(func.sum(Procurement.total_amount), Decimal("0")).label("total_amount"),
        )
        .group_by(Procurement.supplier_id)
        .all()
    )
    return [
        {
            "supplier_id": row.supplier_id,
            "count": row.count,
            "total_amount": float(row.total_amount),
        }
        for row in rows
    ]
