from datetime import datetime
from sqlalchemy.orm import Session


def generate_order_no(db: Session) -> str:
    """生成订单编号: ORD-YYYYMMDD-0001"""
    today = datetime.now().strftime("%Y%m%d")
    prefix = f"ORD-{today}-"
    from app.models.contract_order import ContractOrder
    last = (
        db.query(ContractOrder)
        .filter(ContractOrder.order_no.like(f"{prefix}%"))
        .order_by(ContractOrder.order_no.desc())
        .first()
    )
    if last:
        seq = int(last.order_no.split("-")[-1]) + 1
    else:
        seq = 1
    return f"{prefix}{seq:04d}"


def generate_purchase_no(db: Session) -> str:
    """生成采购单号: PO-YYYYMMDD-0001"""
    today = datetime.now().strftime("%Y%m%d")
    prefix = f"PO-{today}-"
    from app.models.purchase_order import PurchaseOrder
    last = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.purchase_no.like(f"{prefix}%"))
        .order_by(PurchaseOrder.purchase_no.desc())
        .first()
    )
    if last:
        seq = int(last.purchase_no.split("-")[-1]) + 1
    else:
        seq = 1
    return f"{prefix}{seq:04d}"


def generate_supplier_code(db: Session) -> str:
    """生成供应商编码: SUP-0001"""
    from app.models.supplier import Supplier
    last = (
        db.query(Supplier)
        .filter(Supplier.supplier_code.like("SUP-%"))
        .order_by(Supplier.supplier_code.desc())
        .first()
    )
    if last:
        seq = int(last.supplier_code.split("-")[-1]) + 1
    else:
        seq = 1
    return f"SUP-{seq:04d}"


def generate_customer_code(db: Session) -> str:
    """生成客户编码: CUS-0001"""
    from app.models.customer import Customer
    last = (
        db.query(Customer)
        .filter(Customer.customer_code.like("CUS-%"))
        .order_by(Customer.customer_code.desc())
        .first()
    )
    if last:
        seq = int(last.customer_code.split("-")[-1]) + 1
    else:
        seq = 1
    return f"CUS-{seq:04d}"


def generate_shipment_no(db: Session) -> str:
    """生成发货单号: SHP-YYYYMMDD-0001"""
    today = datetime.now().strftime("%Y%m%d")
    prefix = f"SHP-{today}-"
    from app.models.shipment_record import ShipmentRecord
    last = (
        db.query(ShipmentRecord)
        .filter(ShipmentRecord.shipment_no.like(f"{prefix}%"))
        .order_by(ShipmentRecord.shipment_no.desc())
        .first()
    )
    if last:
        seq = int(last.shipment_no.split("-")[-1]) + 1
    else:
        seq = 1
    return f"{prefix}{seq:04d}"


def generate_return_no(db: Session) -> str:
    """生成退换货单号: RTN-YYYYMMDD-0001"""
    today = datetime.now().strftime("%Y%m%d")
    prefix = f"RTN-{today}-"
    from app.models.return_exchange import ReturnExchangeRecord
    last = (
        db.query(ReturnExchangeRecord)
        .filter(ReturnExchangeRecord.return_no.like(f"{prefix}%"))
        .order_by(ReturnExchangeRecord.return_no.desc())
        .first()
    )
    if last:
        seq = int(last.return_no.split("-")[-1]) + 1
    else:
        seq = 1
    return f"{prefix}{seq:04d}"
