"""演示数据填充脚本 - 按测试报告创建完整业务数据

使用方法:
    cd backend
    python -m app.seed_demo

数据概览:
    - 10 个物料（6个分类）
    - 4  个供应商 + 12 条供应商物料关联
    - 5  个客户 + 11 个收货地址 + 5 条开票信息
    - 10 个订单（覆盖10种状态）+ 20 条订单明细
    - 8  个采购单
    - 5  条验收记录
    - 3  条发货记录
    - 2  条签收记录
    - 1  条退换货记录
    - 15 条操作日志
"""
import sys
sys.path.insert(0, '.')

from datetime import datetime, date, timedelta
from decimal import Decimal

from app.database import SessionLocal, engine, Base
from app.models.employee import Employee, EmployeeRole
from app.models.material import Material
from app.models.supplier import Supplier, SupplierMaterial
from app.models.customer import Customer, CustomerAddress, CustomerInvoice
from app.models.contract_order import ContractOrder, ContractOrderItem, OrderStatus, DeliveryItemStatus
from app.models.purchase_order import PurchaseOrder, PurchaseStatus
from app.models.inspection_record import InspectionRecord
from app.models.shipment_record import ShipmentRecord
from app.models.receipt_record import ReceiptRecord
from app.models.return_exchange import ReturnExchangeRecord, ReturnStatus
from app.models.operation_log import OperationLog
from app.core.security import hash_password


def seed_demo():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        _ensure_base_seed(db)

        admin = db.query(Employee).filter(Employee.login_name == "admin").one()
        sales01 = db.query(Employee).filter(Employee.login_name == "sales01").one()
        pm01 = db.query(Employee).filter(Employee.login_name == "pm01").one()
        buyer01 = db.query(Employee).filter(Employee.login_name == "buyer01").one()

        print("\n── 物料 ──")
        materials = _seed_materials(db)

        print("\n── 供应商 ──")
        suppliers = _seed_suppliers(db, materials)

        print("\n── 客户 ──")
        customers = _seed_customers(db, sales01)

        print("\n── 订单 ──")
        orders, order_items = _seed_orders(db, customers, materials, sales01, pm01, admin)

        print("\n── 采购单 ──")
        purchases = _seed_purchase_orders(db, orders, order_items, suppliers, materials, buyer01, pm01)

        print("\n── 验收记录 ──")
        _seed_inspections(db, purchases, pm01)

        print("\n── 发货记录 ──")
        shipments = _seed_shipments(db, orders, customers, pm01, sales01)

        print("\n── 签收记录 ──")
        _seed_receipts(db, orders, shipments, pm01)

        print("\n── 退换货记录 ──")
        _seed_return_exchanges(db, orders, order_items, sales01, pm01)

        print("\n── 操作日志 ──")
        _seed_operation_logs(db, orders, sales01, pm01, buyer01, admin)

        db.commit()
        print("\n✅ 演示数据填充完成！")
    except Exception as e:
        db.rollback()
        print(f"\n❌ 填充失败: {e}")
        raise
    finally:
        db.close()


def _ensure_base_seed(db):
    from app.seed import seed
    seed()


# ── 物料 ──
MATERIAL_DATA = [
    ("MAT-BRG-001", "深沟球轴承 6205", "SKF", "6205-2RS", "25×52×15mm", "个", "轴承"),
    ("MAT-BRG-002", "圆锥滚子轴承 30206", "NSK", "30206", "30×62×17.25mm", "个", "轴承"),
    ("MAT-SEAL-001", "油封 TC型", "NOK", "TC-35×52×7", "35×52×7mm", "个", "密封件"),
    ("MAT-SEAL-002", "O型密封圈", "Parker", "OR-50×3.5", "Φ50×3.5mm", "个", "密封件"),
    ("MAT-ELC-001", "三相异步电机", "西门子", "1LE1501", "7.5kW 4极", "台", "电气元件"),
    ("MAT-ELC-002", "变频器", "ABB", "ACS510", "7.5kW", "台", "电气元件"),
    ("MAT-HYD-001", "液压缸", "力士乐", "CDL1MP5", "Φ80/56-300", "根", "液压件"),
    ("MAT-DRS-001", "同步带", "盖茨", "HTD5M-450", "450×25mm", "条", "传动件"),
    ("MAT-DRS-002", "链条", "椿本", "RS40-1", "12.7×7.75mm", "米", "传动件"),
    ("MAT-OTH-001", "润滑脂", "美孚", "Mobilux EP2", "1kg/桶", "桶", "其他"),
]


def _seed_materials(db):
    existing_codes = {m.material_code for m in db.query(Material).all()}
    materials = []
    for code, name, brand, model, specs, unit, category in MATERIAL_DATA:
        if code in existing_codes:
            mat = db.query(Material).filter(Material.material_code == code).one()
        else:
            mat = Material(
                material_code=code, name=name, brand=brand, model=model,
                specs=specs, unit=unit, category=category, status=1,
            )
            db.add(mat)
            db.flush()
            print(f"  + 物料: {code} {name}")
        materials.append(mat)
    db.flush()
    return materials


# ── 供应商 ──
SUPPLIER_DATA = [
    {
        "name": "上海轴承贸易公司",
        "contact_person": "赵经理", "contact_phone": "021-55550001",
        "contact_email": "zhao@sh-bearing.com",
        "company_address": "上海市闵行区xx路100号",
        "brands": "SKF,NSK,FAG", "categories": "轴承",
        "cooperation_status": 1, "quality_rating": 1,
        "settlement_method": "月结", "tax_rate": Decimal("13.00"),
        "materials": [(0, Decimal("85.00"), True), (1, Decimal("120.00"), True)],
    },
    {
        "name": "广州密封件科技",
        "contact_person": "钱工", "contact_phone": "020-88000002",
        "contact_email": "qian@gz-seal.com",
        "company_address": "广州市天河区yy路200号",
        "brands": "NOK,Parker,特瑞堡", "categories": "密封件",
        "cooperation_status": 1, "quality_rating": 2,
        "settlement_method": "现结", "tax_rate": Decimal("13.00"),
        "materials": [(2, Decimal("15.00"), True), (3, Decimal("8.50"), True)],
    },
    {
        "name": "北京工控设备有限公司",
        "contact_person": "孙总", "contact_phone": "010-66000003",
        "contact_email": "sun@bj-automation.com",
        "company_address": "北京市朝阳区zz路300号",
        "brands": "西门子,ABB,施耐德", "categories": "电气元件",
        "cooperation_status": 1, "quality_rating": 1,
        "settlement_method": "预付款", "tax_rate": Decimal("13.00"),
        "materials": [(4, Decimal("3200.00"), True), (5, Decimal("4500.00"), True)],
    },
    {
        "name": "武汉液压传动技术",
        "contact_person": "李经理", "contact_phone": "027-88000004",
        "contact_email": "li@wh-hydra.com",
        "company_address": "武汉市洪山区ww路400号",
        "brands": "力士乐,盖茨,椿本", "categories": "液压件,传动件",
        "cooperation_status": 1, "quality_rating": 1,
        "settlement_method": "月结", "tax_rate": Decimal("13.00"),
        "materials": [(6, Decimal("2800.00"), True), (7, Decimal("180.00"), True),
                      (8, Decimal("45.00"), True), (9, Decimal("65.00"), True)],
    },
]


def _seed_suppliers(db, materials):
    existing_names = {s.name for s in db.query(Supplier).all()}
    suppliers = []
    for i, data in enumerate(SUPPLIER_DATA):
        if data["name"] in existing_names:
            sup = db.query(Supplier).filter(Supplier.name == data["name"]).one()
        else:
            sup = Supplier(
                supplier_code=f"SUP-{i+1:04d}", name=data["name"],
                contact_person=data["contact_person"], contact_phone=data["contact_phone"],
                contact_email=data["contact_email"], company_address=data["company_address"],
                brands=data["brands"], categories=data["categories"],
                cooperation_status=data["cooperation_status"],
                first_cooperation_date=date(2025, 1, 15),
                avg_delivery_days=7, quality_rating=data["quality_rating"],
                settlement_method=data["settlement_method"], tax_rate=data["tax_rate"],
                invoice_type="增值税专用发票",
                bank_name=f"中国工商银行{data['name'][:4]}支行",
                bank_account=f"6222{'0'*12}{i+1:04d}",
                bank_account_name=data["name"],
                total_purchase_amount=Decimal("0"), total_purchase_count=0, status=1,
            )
            db.add(sup)
            db.flush()
            print(f"  + 供应商: {sup.supplier_code} {data['name']}")

        for mat_idx, price, is_primary in data["materials"]:
            link = db.query(SupplierMaterial).filter(
                SupplierMaterial.supplier_id == sup.id,
                SupplierMaterial.material_id == materials[mat_idx].id,
            ).first()
            if not link:
                db.add(SupplierMaterial(
                    supplier_id=sup.id, material_id=materials[mat_idx].id,
                    supply_price=price, supply_price_date=date.today(),
                    is_primary=1 if is_primary else 0,
                ))
                db.flush()
                print(f"    + 关联: {materials[mat_idx].name} @ ¥{price}")
        suppliers.append(sup)
    db.flush()
    return suppliers


# ── 客户 ──
CUSTOMER_DATA = [
    {
        "name": "宝钢集团有限公司", "contact_person": "周主管",
        "contact_phone": "021-26000001", "contact_email": "zhou@baosteel.com",
        "customer_level": 1, "remark": "大型钢铁企业，A级客户",
        "addresses": [
            {"address_type": 1, "receiver_name": "周主管", "receiver_phone": "021-26000001",
             "province": "上海市", "city": "宝山区", "district": "月浦镇",
             "detail_address": "宝山钢铁股份有限公司设备部", "is_default": 1},
            {"address_type": 2, "receiver_name": "吴仓管", "receiver_phone": "021-26000002",
             "province": "上海市", "city": "宝山区", "district": "罗泾镇",
             "detail_address": "宝钢罗泾仓储中心3号库", "is_default": 0},
        ],
        "invoices": [
            {"invoice_title": "宝山钢铁股份有限公司", "tax_no": "91310000132200XXX",
             "bank_name": "中国建设银行上海宝山支行", "bank_account": "3100150XXXXXX1234",
             "invoice_address": "上海市宝山区富锦路885号", "invoice_phone": "021-26000001"},
        ],
    },
    {
        "name": "一汽解放汽车有限公司", "contact_person": "郑工",
        "contact_phone": "0431-86000002", "contact_email": "zheng@faw.com.cn",
        "customer_level": 1, "remark": "汽车制造龙头企业",
        "addresses": [
            {"address_type": 1, "receiver_name": "郑工", "receiver_phone": "0431-86000002",
             "province": "吉林省", "city": "长春市", "district": "汽车产业开发区",
             "detail_address": "一汽解放总装车间设备科", "is_default": 1},
        ],
        "invoices": [
            {"invoice_title": "一汽解放汽车有限公司", "tax_no": "91220100XXXXXX5678",
             "bank_name": "中国银行长春汽车厂支行", "bank_account": "1570XXXXXX5678",
             "invoice_address": "长春市汽车产业开发区东风大街1号", "invoice_phone": "0431-86000002"},
        ],
    },
    {
        "name": "中联重科股份有限公司", "contact_person": "王主任",
        "contact_phone": "0731-88000003", "contact_email": "wang@zoomlion.com",
        "customer_level": 2, "remark": "工程机械行业标杆",
        "addresses": [
            {"address_type": 1, "receiver_name": "王主任", "receiver_phone": "0731-88000003",
             "province": "湖南省", "city": "长沙市", "district": "岳麓区",
             "detail_address": "中联重科麓谷工业园设备保障部", "is_default": 1},
            {"address_type": 2, "receiver_name": "李仓管", "receiver_phone": "0731-88000004",
             "province": "湖南省", "city": "长沙市", "district": "望城区",
             "detail_address": "中联重科望城制造基地仓库", "is_default": 0},
            {"address_type": 3, "receiver_name": "张工", "receiver_phone": "0731-88000005",
             "province": "湖南省", "city": "常德市", "district": "鼎城区",
             "detail_address": "中联重科汉寿工业园临时收货点", "is_default": 0},
        ],
        "invoices": [
            {"invoice_title": "中联重科股份有限公司", "tax_no": "91430000XXXXXX9012",
             "bank_name": "中国工商银行长沙岳麓支行", "bank_account": "1901XXXXXX9012",
             "invoice_address": "长沙市岳麓区麓谷大道666号", "invoice_phone": "0731-88000003"},
        ],
    },
    {
        "name": "海尔智家股份有限公司", "contact_person": "刘经理",
        "contact_phone": "0532-88000004", "contact_email": "liu@haier.com",
        "customer_level": 2, "remark": "家电龙头企业，备件需求量大",
        "addresses": [
            {"address_type": 1, "receiver_name": "刘经理", "receiver_phone": "0532-88000004",
             "province": "山东省", "city": "青岛市", "district": "崂山区",
             "detail_address": "海尔工业园设备管理处", "is_default": 1},
            {"address_type": 2, "receiver_name": "陈仓管", "receiver_phone": "0532-88000005",
             "province": "山东省", "city": "青岛市", "district": "黄岛区",
             "detail_address": "海尔黄岛工厂备件仓库", "is_default": 0},
        ],
        "invoices": [
            {"invoice_title": "海尔智家股份有限公司", "tax_no": "91370200XXXXXX3456",
             "bank_name": "中国农业银行青岛崂山支行", "bank_account": "3806XXXXXX3456",
             "invoice_address": "青岛市崂山区海尔路1号", "invoice_phone": "0532-88000004"},
        ],
    },
    {
        "name": "三一重工股份有限公司", "contact_person": "何部长",
        "contact_phone": "0731-84000005", "contact_email": "he@sany.com.cn",
        "customer_level": 3, "remark": "工程机械，C级客户，合作初期",
        "addresses": [
            {"address_type": 1, "receiver_name": "何部长", "receiver_phone": "0731-84000005",
             "province": "湖南省", "city": "长沙市", "district": "长沙县",
             "detail_address": "三一重工星沙产业园设备部", "is_default": 1},
        ],
        "invoices": [
            {"invoice_title": "三一重工股份有限公司", "tax_no": "91430000XXXXXX7890",
             "bank_name": "招商银行长沙星沙支行", "bank_account": "7319XXXXXX7890",
             "invoice_address": "长沙市长沙县三一工业城", "invoice_phone": "0731-84000005"},
        ],
    },
]


def _seed_customers(db, sales01):
    existing_names = {c.name for c in db.query(Customer).all()}
    customers = []
    for i, data in enumerate(CUSTOMER_DATA):
        if data["name"] in existing_names:
            cust = db.query(Customer).filter(Customer.name == data["name"]).one()
        else:
            cust = Customer(
                customer_code=f"CUS-{i+1:04d}", name=data["name"],
                contact_person=data["contact_person"], contact_phone=data["contact_phone"],
                contact_email=data["contact_email"], sales_id=sales01.id,
                customer_level=data["customer_level"],
                total_order_amount=Decimal("0"), total_order_count=0,
                remark=data.get("remark", ""), status=1,
            )
            db.add(cust)
            db.flush()
            print(f"  + 客户: {cust.customer_code} {data['name']}")

        for addr_data in data["addresses"]:
            if not db.query(CustomerAddress).filter(
                CustomerAddress.customer_id == cust.id,
                CustomerAddress.detail_address == addr_data["detail_address"],
            ).first():
                db.add(CustomerAddress(customer_id=cust.id, **addr_data))
                db.flush()
                print(f"    + 地址: {addr_data['detail_address'][:20]}...")

        for inv_data in data["invoices"]:
            if not db.query(CustomerInvoice).filter(
                CustomerInvoice.customer_id == cust.id,
                CustomerInvoice.tax_no == inv_data["tax_no"],
            ).first():
                db.add(CustomerInvoice(customer_id=cust.id, **inv_data))
                db.flush()
                print(f"    + 开票: {inv_data['invoice_title'][:15]}...")

        customers.append(cust)
    db.flush()
    return customers


# ── 订单 ──
ORDER_TEMPLATES = [
    # 0: 已关闭
    {"customer_idx": 0, "status": OrderStatus.closed, "is_urgent": 0,
     "contract_no": "HT-2026-001", "sign_date": date(2026, 5, 10),
     "delivery_date": date(2026, 5, 25),
     "factory_demand_desc": "宝钢热轧厂2号线轴承更换", "remark": "已完成订单", "closed": True,
     "items": [(0, 20, Decimal("150.00"), Decimal("85.00")),
               (1, 10, Decimal("200.00"), Decimal("120.00"))]},
    # 1: 已签收
    {"customer_idx": 1, "status": OrderStatus.received, "is_urgent": 0,
     "contract_no": "HT-2026-002", "sign_date": date(2026, 5, 15),
     "delivery_date": date(2026, 5, 28),
     "factory_demand_desc": "一汽解放总装车间密封件定期更换", "remark": "客户已签收，等待关闭", "closed": False,
     "items": [(2, 50, Decimal("25.00"), Decimal("15.00")),
               (3, 100, Decimal("15.00"), Decimal("8.50"))]},
    # 2: 待签收
    {"customer_idx": 2, "status": OrderStatus.pending_receipt, "is_urgent": 0,
     "contract_no": "HT-2026-003", "sign_date": date(2026, 5, 18),
     "delivery_date": date(2026, 6, 5),
     "factory_demand_desc": "中联重科泵车液压缸更换", "remark": "已发货，等待签收", "closed": False,
     "items": [(6, 2, Decimal("4800.00"), Decimal("2800.00"))]},
    # 3: 待发货
    {"customer_idx": 3, "status": OrderStatus.pending_ship, "is_urgent": 0,
     "contract_no": "HT-2026-004", "sign_date": date(2026, 5, 20),
     "delivery_date": date(2026, 6, 8),
     "factory_demand_desc": "海尔产线电机更换，变频器备件", "remark": "验收通过，待发货", "closed": False,
     "items": [(4, 1, Decimal("5500.00"), Decimal("3200.00")),
               (5, 1, Decimal("7500.00"), Decimal("4500.00"))]},
    # 4: 采购中（加急）
    {"customer_idx": 0, "status": OrderStatus.purchasing, "is_urgent": 1,
     "contract_no": "HT-2026-005", "sign_date": date(2026, 5, 25),
     "delivery_date": date(2026, 6, 3),
     "factory_demand_desc": "宝钢冷轧厂突发故障，轴承紧急更换！", "remark": "⚠ 加急订单", "closed": False,
     "items": [(0, 30, Decimal("155.00"), Decimal("85.00")),
               (1, 15, Decimal("210.00"), Decimal("120.00")),
               (2, 20, Decimal("28.00"), Decimal("15.00"))]},
    # 5: 待采购
    {"customer_idx": 4, "status": OrderStatus.pending_purchase, "is_urgent": 0,
     "contract_no": "HT-2026-006", "sign_date": date(2026, 5, 27),
     "delivery_date": date(2026, 6, 15),
     "factory_demand_desc": "三一挖掘机传动系统维护", "remark": "合同已签，通知下料中", "closed": False,
     "items": [(7, 5, Decimal("300.00"), Decimal("180.00")),
               (8, 10, Decimal("80.00"), Decimal("45.00"))]},
    # 6: 待签合同
    {"customer_idx": 2, "status": OrderStatus.pending_contract, "is_urgent": 0,
     "contract_no": None, "sign_date": None,
     "delivery_date": date(2026, 6, 20),
     "factory_demand_desc": "中联重科搅拌站电气改造", "remark": "报价已确认，等待签合同", "closed": False,
     "items": [(4, 2, Decimal("5200.00"), None),
               (5, 2, Decimal("7200.00"), None)]},
    # 7: 待报价
    {"customer_idx": 3, "status": OrderStatus.pending_quote, "is_urgent": 0,
     "contract_no": None, "sign_date": None,
     "delivery_date": date(2026, 6, 25),
     "factory_demand_desc": "海尔模具车间密封件批量采购", "remark": "内容已确认，等待销售报价", "closed": False,
     "items": [(2, 100, None, None), (3, 200, None, None)]},
    # 8: 待确认（加急）
    {"customer_idx": 1, "status": OrderStatus.pending_confirm, "is_urgent": 1,
     "contract_no": None, "sign_date": None,
     "delivery_date": date(2026, 6, 10),
     "factory_demand_desc": "一汽解放新车间液压系统筹建", "remark": "⚠ 加急！新车间项目", "closed": False,
     "items": [(6, 4, None, None), (9, 20, None, None)]},
    # 9: 已取消
    {"customer_idx": 4, "status": OrderStatus.cancelled, "is_urgent": 0,
     "contract_no": None, "sign_date": None,
     "delivery_date": date(2026, 5, 30),
     "factory_demand_desc": "三一塔吊轴承更换（客户暂停项目）", "remark": "客户项目暂停，订单取消", "closed": False,
     "items": [(0, 10, Decimal("150.00"), None)]},
]


def _seed_orders(db, customers, materials, sales01, pm01, admin):
    existing_nos = {o.order_no for o in db.query(ContractOrder).all()}
    orders = []
    all_items = []

    for i, tpl in enumerate(ORDER_TEMPLATES):
        order_no = f"ORD-202605{20+i:02d}-{i+1:04d}"
        if order_no in existing_nos:
            order = db.query(ContractOrder).filter(ContractOrder.order_no == order_no).one()
            items = db.query(ContractOrderItem).filter(ContractOrderItem.order_id == order.id).all()
            orders.append(order)
            all_items.extend(items)
            print(f"  = 订单已存在: {order_no} [{tpl['status'].value}]")
            continue

        total = sum(qty * up for _, qty, up, _ in tpl["items"] if up)

        order = ContractOrder(
            order_no=order_no, contract_no=tpl.get("contract_no"),
            customer_id=customers[tpl["customer_idx"]].id,
            sales_id=sales01.id, project_manager_id=pm01.id,
            total_amount=total, delivery_date=tpl.get("delivery_date"),
            sign_date=tpl.get("sign_date"), is_urgent=tpl["is_urgent"],
            status=tpl["status"],
            factory_demand_desc=tpl.get("factory_demand_desc", ""),
            remark=tpl.get("remark", ""), created_by=sales01.id,
        )
        if tpl.get("closed"):
            order.closed_at = datetime(2026, 5, 28, 16, 0, 0)
            order.closed_by = sales01.id

        db.add(order)
        db.flush()

        order_items = []
        for mat_idx, qty, unit_price, purchase_price in tpl["items"]:
            mat = materials[mat_idx]
            amount = qty * unit_price if unit_price else Decimal("0")

            ds = DeliveryItemStatus.pending_purchase
            st = tpl["status"]
            if st in (OrderStatus.received, OrderStatus.closed):
                ds = DeliveryItemStatus.received
            elif st == OrderStatus.pending_receipt:
                ds = DeliveryItemStatus.shipped
            elif st in (OrderStatus.pending_ship, OrderStatus.pending_inspect, OrderStatus.inspecting):
                ds = DeliveryItemStatus.arrived
            elif st == OrderStatus.purchasing:
                ds = DeliveryItemStatus.purchasing

            item = ContractOrderItem(
                order_id=order.id, material_id=mat.id,
                material_code=mat.material_code, material_name=mat.name,
                brand=mat.brand, model=mat.model,
                quantity=qty, unit=mat.unit,
                unit_price=unit_price or Decimal("0"), amount=amount,
                purchase_price=purchase_price, delivery_status=ds,
            )
            db.add(item)
            db.flush()
            order_items.append(item)

        orders.append(order)
        all_items.extend(order_items)
        print(f"  + 订单: {order_no} [{tpl['status'].value}] {len(order_items)}个明细 ¥{total}")

    db.flush()
    return orders, all_items


# ── 采购单 ──
def _seed_purchase_orders(db, orders, order_items, suppliers, materials, buyer01, pm01):
    existing_nos = {p.purchase_no for p in db.query(PurchaseOrder).all()}
    purchases = []

    PO_DATA = [
        (0, 0, 0, 0, 20, Decimal("85.00"), PurchaseStatus.inspected, date(2026, 5, 18)),
        (0, 1, 0, 1, 10, Decimal("120.00"), PurchaseStatus.inspected, date(2026, 5, 18)),
        (1, 2, 1, 2, 50, Decimal("15.00"), PurchaseStatus.inspected, date(2026, 5, 22)),
        (1, 3, 1, 3, 100, Decimal("8.50"), PurchaseStatus.inspected, date(2026, 5, 22)),
        (2, 4, 3, 6, 2, Decimal("2800.00"), PurchaseStatus.inspected, date(2026, 5, 28)),
        (3, 5, 2, 4, 1, Decimal("3200.00"), PurchaseStatus.inspected, date(2026, 5, 30)),
        (3, 6, 2, 5, 1, Decimal("4500.00"), PurchaseStatus.inspected, date(2026, 5, 30)),
        (4, 7, 0, 0, 30, Decimal("85.00"), PurchaseStatus.purchasing, date(2026, 6, 2)),
    ]

    for i, (oi, ii, si, mi, qty, price, status, exp_date) in enumerate(PO_DATA):
        pno = f"PO-202605{18+i:02d}-{i+1:04d}"
        if pno in existing_nos:
            po = db.query(PurchaseOrder).filter(PurchaseOrder.purchase_no == pno).one()
            purchases.append(po)
            print(f"  = 采购单已存在: {pno}")
            continue
        if oi >= len(orders) or ii >= len(order_items):
            continue

        po = PurchaseOrder(
            purchase_no=pno, order_id=orders[oi].id,
            order_item_id=order_items[ii].id,
            supplier_id=suppliers[si].id, material_id=materials[mi].id,
            quantity=qty, unit_price=price, total_amount=qty * price,
            purchaser_id=buyer01.id, status=status,
            expected_delivery_date=exp_date,
            actual_delivery_date=exp_date if status.value == "inspected" else None,
            created_by=pm01.id,
        )
        db.add(po)
        db.flush()
        purchases.append(po)
        print(f"  + 采购单: {pno} [{status.value}] {materials[mi].name} × {qty}")

    db.flush()
    return purchases


# ── 验收 ──
def _seed_inspections(db, purchases, pm01):
    for po in purchases:
        if po.status == PurchaseStatus.inspected:
            if db.query(InspectionRecord).filter(
                InspectionRecord.purchase_order_id == po.id
            ).first():
                continue
            db.add(InspectionRecord(
                purchase_order_id=po.id, inspector_id=pm01.id,
                inspection_date=datetime(2026, 5, po.expected_delivery_date.day, 14, 0, 0)
                if po.expected_delivery_date else datetime.now(),
                inspection_result=1, actual_quantity=po.quantity, remark="验收合格",
            ))
            print(f"  + 验收: {po.purchase_no} → 合格")
    db.flush()


# ── 发货 ──
def _seed_shipments(db, orders, customers, pm01, sales01):
    existing_nos = {s.shipment_no for s in db.query(ShipmentRecord).all()}
    shipments = []
    ship_data = [
        (0, "顺丰速运", "SF1234567890"),
        (1, "德邦快递", "DP0987654321"),
        (2, "中通快递", "ZT20260530001"),
    ]

    for i, (oi, express, tracking) in enumerate(ship_data):
        sno = f"SHP-202605{25+i:02d}-{i+1:04d}"
        if sno in existing_nos:
            s = db.query(ShipmentRecord).filter(ShipmentRecord.shipment_no == sno).one()
            shipments.append(s)
            print(f"  = 发货记录已存在: {sno}")
            continue

        order = orders[oi]
        cust = customers[ORDER_TEMPLATES[oi]["customer_idx"]]
        addr = db.query(CustomerAddress).filter(
            CustomerAddress.customer_id == cust.id, CustomerAddress.is_default == 1,
        ).first()
        addr_str = f"{addr.province or ''}{addr.city or ''}{addr.district or ''}{addr.detail_address}" if addr else "地址未确认"

        s = ShipmentRecord(
            shipment_no=sno, order_id=order.id,
            express_company=express, tracking_no=tracking,
            receiver_name=addr.receiver_name if addr else "待确认",
            receiver_phone=addr.receiver_phone if addr else "",
            shipping_address=addr_str,
            shipment_date=datetime(2026, 5, 25 + i, 10, 0, 0),
            shipped_by=pm01.id,
            address_confirmed_by=sales01.id,
            address_confirmed_at=datetime(2026, 5, 25 + i, 9, 0, 0),
        )
        db.add(s)
        db.flush()
        shipments.append(s)
        print(f"  + 发货: {sno} {express} {tracking}")

    db.flush()
    return shipments


# ── 签收 ──
def _seed_receipts(db, orders, shipments, pm01):
    if db.query(ReceiptRecord).count() > 0:
        print("  = 签收记录已存在")
        return

    for oi, si, r_date, r_status, archived in [
        (0, 0, date(2026, 5, 27), 1, True),
        (1, 1, date(2026, 5, 29), 1, False),
    ]:
        if oi >= len(orders) or si >= len(shipments):
            continue
        rec = ReceiptRecord(
            order_id=orders[oi].id, shipment_id=shipments[si].id,
            receipt_date=r_date, receipt_status=r_status,
        )
        if archived:
            rec.archived_by = pm01.id
            rec.archived_at = datetime(2026, 5, 28, 16, 0, 0)
        db.add(rec)
        print(f"  + 签收: 订单{orders[oi].order_no} 日期={r_date}")
    db.flush()


# ── 退换货 ──
def _seed_return_exchanges(db, orders, order_items, sales01, pm01):
    if db.query(ReturnExchangeRecord).count() > 0:
        print("  = 退换货记录已存在")
        return

    order = orders[3]  # 订单4（待发货）
    item = db.query(ContractOrderItem).filter(ContractOrderItem.order_id == order.id).first()
    if not item:
        return

    db.add(ReturnExchangeRecord(
        return_no="RTN-20260530-0001", order_id=order.id, order_item_id=item.id,
        type=2, reason="客户反馈电机型号不符，需要更换为1LE1502型号",
        initiator_id=sales01.id, project_confirmed=1, project_confirmed_by=pm01.id,
        status=ReturnStatus.processing, remark="已确认换货，采购员联系供应商处理中",
    ))
    db.flush()
    print(f"  + 退换货: RTN-20260530-0001 换货 订单={order.order_no}")


# ── 操作日志 ──
def _seed_operation_logs(db, orders, sales01, pm01, buyer01, admin):
    if db.query(OperationLog).count() > 0:
        print("  = 操作日志已存在")
        return

    now = datetime.now()
    logs = [
        (sales01, "order", "create", "order", 0, "创建订单 ORD-20260520-0001"),
        (pm01, "order", "status_change", "order", 0, "确认采购内容 → 待报价"),
        (sales01, "order", "status_change", "order", 0, "报价确认 → 待签合同"),
        (sales01, "order", "status_change", "order", 0, "合同签订 → 待下料"),
        (pm01, "order", "status_change", "order", 0, "通知下料 → 待采购"),
        (buyer01, "purchase", "create", "purchase", 0, "创建采购单 PO-20260518-0001"),
        (buyer01, "purchase", "status_change", "purchase", 0, "采购状态更新 → 已下单"),
        (pm01, "inspection", "create", "inspection", 0, "提交验收记录：合格"),
        (pm01, "order", "status_change", "order", 0, "验收通过 → 待发货"),
        (pm01, "shipment", "create", "shipment", 0, "创建发货单 SHP-20260525-0001"),
        (sales01, "order", "status_change", "order", 0, "已发货 → 待签收"),
        (pm01, "receipt", "create", "receipt", 0, "确认签收"),
        (sales01, "order", "close", "order", 0, "关闭订单"),
        (admin, "system", "update", "system_config", -1, "更新系统配置: OVERDUE_WARNING_DAYS"),
        (admin, "employee", "create", "employee", -1, "创建员工: sales01"),
    ]

    for j, (operator, module, action, target_type, oi, detail) in enumerate(logs):
        target_id = orders[oi].id if 0 <= oi < len(orders) else 1
        db.add(OperationLog(
            operator_id=operator.id, operator_name=operator.name,
            operator_role=operator.role.value, module=module, action=action,
            target_type=target_type, target_id=target_id, detail=detail,
            ip_address="127.0.0.1", created_at=now - timedelta(minutes=len(logs) - j),
        ))
    db.flush()
    print(f"  + 操作日志: {len(logs)} 条")


if __name__ == "__main__":
    seed_demo()
