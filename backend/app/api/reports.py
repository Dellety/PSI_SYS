from datetime import date, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, extract, case
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.contract_order import ContractOrder, OrderStatus
from app.models.purchase_order import PurchaseOrder
from app.models.supplier import Supplier
from app.models.employee import Employee, EmployeeRole
from app.models.customer import Customer
from app.core.deps import get_current_user

router = APIRouter()


@router.get("/order-overview")
def order_overview(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Order overview report: status distribution pie chart data + urgent orders."""
    # Status distribution
    rows = (
        db.query(ContractOrder.status, func.count(ContractOrder.id))
        .group_by(ContractOrder.status)
        .all()
    )
    status_distribution = [{"status": s.value, "count": cnt} for s, cnt in rows]

    # Urgent orders list (not closed/cancelled)
    urgent_orders = (
        db.query(ContractOrder, Customer.name.label("customer_name"))
        .join(Customer, ContractOrder.customer_id == Customer.id)
        .filter(
            ContractOrder.is_urgent == 1,
            ContractOrder.status != OrderStatus.closed,
            ContractOrder.status != OrderStatus.cancelled,
        )
        .order_by(ContractOrder.delivery_date.asc())
        .all()
    )
    urgent_list = [
        {
            "id": o.id,
            "order_no": o.order_no,
            "customer_name": cn,
            "delivery_date": str(o.delivery_date) if o.delivery_date else None,
            "total_amount": float(o.total_amount) if o.total_amount else 0,
        }
        for o, cn in urgent_orders
    ]

    return {
        "status_distribution": status_distribution,
        "urgent_orders": urgent_list,
    }


@router.get("/overdue")
def overdue_report(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Overdue warnings: expiring soon (within 3 days) and already overdue orders."""
    today = date.today()
    three_days_later = today + timedelta(days=3)

    # Expiring soon: delivery_date between today and today+3, not yet delivered/closed
    expiring = (
        db.query(ContractOrder, Customer.name.label("customer_name"))
        .join(Customer, ContractOrder.customer_id == Customer.id)
        .filter(
            ContractOrder.delivery_date != None,
            ContractOrder.delivery_date > today,
            ContractOrder.delivery_date <= three_days_later,
            ContractOrder.status != OrderStatus.closed,
            ContractOrder.status != OrderStatus.cancelled,
        )
        .all()
    )
    expiring_list = [
        {
            "id": o.id,
            "order_no": o.order_no,
            "customer_name": cn,
            "delivery_date": str(o.delivery_date) if o.delivery_date else None,
            "days_remaining": (o.delivery_date - today).days if o.delivery_date else None,
        }
        for o, cn in expiring
    ]

    # Already overdue: delivery_date < today and not delivered/closed
    overdue = (
        db.query(ContractOrder, Customer.name.label("customer_name"))
        .join(Customer, ContractOrder.customer_id == Customer.id)
        .filter(
            ContractOrder.delivery_date != None,
            ContractOrder.delivery_date < today,
            ContractOrder.status != OrderStatus.closed,
            ContractOrder.status != OrderStatus.cancelled,
        )
        .all()
    )
    overdue_list = [
        {
            "id": o.id,
            "order_no": o.order_no,
            "customer_name": cn,
            "delivery_date": str(o.delivery_date) if o.delivery_date else None,
            "days_overdue": (today - o.delivery_date).days if o.delivery_date else None,
        }
        for o, cn in overdue
    ]

    return {
        "upcoming": expiring_list,
        "overdue": overdue_list,
    }


@router.get("/purchase-summary")
def purchase_summary(
    year: int | None = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Purchase summary: by month, by supplier, by category."""
    target_year = year or date.today().year

    # Monthly purchase amounts
    monthly_rows = (
        db.query(
            func.strftime("%Y-%m", PurchaseOrder.created_at).label("month"),
            func.coalesce(func.sum(PurchaseOrder.total_amount), Decimal("0")).label("amount"),
        )
        .filter(extract("year", PurchaseOrder.created_at) == target_year)
        .group_by(func.strftime("%Y-%m", PurchaseOrder.created_at))
        .order_by("month")
        .all()
    )
    by_month = [{"month": r.month, "amount": float(r.amount)} for r in monthly_rows]

    # By supplier
    supplier_rows = (
        db.query(
            PurchaseOrder.supplier_id,
            Supplier.name.label("supplier_name"),
            func.count(PurchaseOrder.id).label("count"),
            func.coalesce(func.sum(PurchaseOrder.total_amount), Decimal("0")).label("amount"),
        )
        .join(Supplier, PurchaseOrder.supplier_id == Supplier.id)
        .filter(extract("year", PurchaseOrder.created_at) == target_year)
        .group_by(PurchaseOrder.supplier_id, Supplier.name)
        .all()
    )
    by_supplier = [
        {
            "supplier_id": r.supplier_id,
            "supplier_name": r.supplier_name,
            "count": r.count,
            "amount": float(r.amount),
        }
        for r in supplier_rows
    ]

    # By material category (from order items via order_item_id -> material)
    from app.models.contract_order import ContractOrderItem
    from app.models.material import Material

    category_rows = (
        db.query(
            Material.category,
            func.coalesce(func.sum(PurchaseOrder.quantity), Decimal("0")).label("quantity"),
            func.coalesce(func.sum(PurchaseOrder.total_amount), Decimal("0")).label("amount"),
        )
        .join(ContractOrderItem, PurchaseOrder.order_item_id == ContractOrderItem.id)
        .join(Material, ContractOrderItem.material_id == Material.id)
        .filter(extract("year", PurchaseOrder.created_at) == target_year)
        .group_by(Material.category)
        .all()
    )
    by_category = [
        {
            "category": r.category or "未分类",
            "quantity": float(r.quantity),
            "amount": float(r.amount),
        }
        for r in category_rows
    ]

    return {
        "by_month": by_month,
        "by_supplier": by_supplier,
        "by_category": by_category,
    }


@router.get("/supplier-analysis")
def supplier_analysis(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Supplier analysis: on-time rate, quality rating distribution, top 10 by frequency."""
    # On-time delivery rate per supplier
    supplier_rows = (
        db.query(
            PurchaseOrder.supplier_id,
            Supplier.name.label("supplier_name"),
            func.count(PurchaseOrder.id).label("total"),
            func.sum(
                case(
                    (PurchaseOrder.actual_delivery_date <= PurchaseOrder.expected_delivery_date, 1),
                    else_=0,
                )
            ).label("on_time"),
        )
        .join(Supplier, PurchaseOrder.supplier_id == Supplier.id)
        .filter(
            PurchaseOrder.actual_delivery_date != None,
            PurchaseOrder.expected_delivery_date != None,
        )
        .group_by(PurchaseOrder.supplier_id, Supplier.name)
        .all()
    )
    on_time_rates = [
        {
            "supplier_id": r.supplier_id,
            "supplier_name": r.supplier_name,
            "on_time_rate": round((r.on_time / r.total) * 100, 1) if r.total > 0 else 0,
        }
        for r in supplier_rows
    ]

    # Quality rating distribution
    quality_rows = (
        db.query(Supplier.quality_rating, func.count(Supplier.id).label("count"))
        .filter(Supplier.quality_rating != None)
        .group_by(Supplier.quality_rating)
        .all()
    )
    rating_labels = {1: "优", 2: "良", 3: "差"}
    quality_distribution = [
        {
            "rating": rating_labels.get(r.quality_rating, str(r.quality_rating)),
            "count": r.count,
        }
        for r in quality_rows
    ]

    # Purchase frequency top 10
    freq_rows = (
        db.query(
            PurchaseOrder.supplier_id,
            Supplier.name.label("supplier_name"),
            func.count(PurchaseOrder.id).label("count"),
        )
        .join(Supplier, PurchaseOrder.supplier_id == Supplier.id)
        .group_by(PurchaseOrder.supplier_id, Supplier.name)
        .order_by(func.count(PurchaseOrder.id).desc())
        .limit(10)
        .all()
    )
    top10 = [
        {"supplier_id": r.supplier_id, "supplier_name": r.supplier_name, "count": r.count}
        for r in freq_rows
    ]

    return {
        "delivery_rate": on_time_rates,
        "quality_distribution": quality_distribution,
        "frequency_top10": top10,
    }


@router.get("/sales-performance")
def sales_performance(
    year: int | None = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Sales performance: by salesperson, by customer top 10, monthly trend."""
    target_year = year or date.today().year

    # By salesperson
    sales_rows = (
        db.query(
            ContractOrder.sales_id,
            Employee.name.label("sales_name"),
            func.count(ContractOrder.id).label("order_count"),
            func.coalesce(func.sum(ContractOrder.total_amount), Decimal("0")).label("total_amount"),
        )
        .join(Employee, ContractOrder.sales_id == Employee.id)
        .filter(extract("year", ContractOrder.created_at) == target_year)
        .group_by(ContractOrder.sales_id, Employee.name)
        .all()
    )
    by_sales = [
        {
            "sales_id": r.sales_id,
            "sales_name": r.sales_name,
            "total_amount": float(r.total_amount),
            "order_count": r.order_count,
        }
        for r in sales_rows
    ]

    # By customer top 10
    customer_rows = (
        db.query(
            ContractOrder.customer_id,
            Customer.name.label("customer_name"),
            func.coalesce(func.sum(ContractOrder.total_amount), Decimal("0")).label("amount"),
        )
        .join(Customer, ContractOrder.customer_id == Customer.id)
        .filter(extract("year", ContractOrder.created_at) == target_year)
        .group_by(ContractOrder.customer_id, Customer.name)
        .order_by(func.sum(ContractOrder.total_amount).desc())
        .limit(10)
        .all()
    )
    top10_customers = [
        {
            "customer_id": r.customer_id,
            "customer_name": r.customer_name,
            "amount": float(r.amount),
        }
        for r in customer_rows
    ]

    # Monthly trend
    monthly_rows = (
        db.query(
            func.strftime("%Y-%m", ContractOrder.created_at).label("month"),
            func.coalesce(func.sum(ContractOrder.total_amount), Decimal("0")).label("amount"),
        )
        .filter(extract("year", ContractOrder.created_at) == target_year)
        .group_by(func.strftime("%Y-%m", ContractOrder.created_at))
        .order_by("month")
        .all()
    )
    monthly_trend = [{"month": r.month, "amount": float(r.amount)} for r in monthly_rows]

    return {
        "by_sales": by_sales,
        "by_customer": top10_customers,
        "monthly_trend": monthly_trend,
    }
