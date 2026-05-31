"""种子数据脚本 - 初始化系统配置和管理员账号"""
import sys
sys.path.insert(0, '.')

from app.database import SessionLocal, engine, Base
from app.models.employee import Employee, EmployeeRole
from app.models.system_config import SystemConfig
from app.core.security import hash_password


def seed():
    # 创建所有表
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 创建管理员
        admin = db.query(Employee).filter(Employee.login_name == "admin").first()
        if not admin:
            admin = Employee(
                employee_no="EMP001",
                login_name="admin",
                password_hash=hash_password("admin123"),
                name="系统管理员",
                phone="13800000000",
                email="admin@example.com",
                role=EmployeeRole.admin,
                status=1,
            )
            db.add(admin)
            print("  created admin account: admin / admin123")

        # 创建示例销售
        sales = db.query(Employee).filter(Employee.login_name == "sales01").first()
        if not sales:
            sales = Employee(
                employee_no="EMP002",
                login_name="sales01",
                password_hash=hash_password("123456"),
                name="张销售",
                phone="13800000001",
                email="sales01@example.com",
                role=EmployeeRole.sales,
                status=1,
            )
            db.add(sales)
            print("  created sales account: sales01 / 123456")

        # 创建示例项目负责人
        pm = db.query(Employee).filter(Employee.login_name == "pm01").first()
        if not pm:
            pm = Employee(
                employee_no="EMP003",
                login_name="pm01",
                password_hash=hash_password("123456"),
                name="李项目",
                phone="13800000002",
                email="pm01@example.com",
                role=EmployeeRole.project_manager,
                status=1,
            )
            db.add(pm)
            print("  created project manager account: pm01 / 123456")

        # 创建示例采购员
        purchaser = db.query(Employee).filter(Employee.login_name == "buyer01").first()
        if not purchaser:
            purchaser = Employee(
                employee_no="EMP004",
                login_name="buyer01",
                password_hash=hash_password("123456"),
                name="王采购",
                phone="13800000003",
                email="buyer01@example.com",
                role=EmployeeRole.purchaser,
                status=1,
            )
            db.add(purchaser)
            print("  created purchaser account: buyer01 / 123456")

        # 系统配置默认值
        configs = [
            ("SMTP_HOST", "", "SMTP服务器地址"),
            ("SMTP_PORT", "587", "SMTP端口"),
            ("SMTP_USER", "", "SMTP用户名"),
            ("SMTP_PASSWORD", "", "SMTP密码"),
            ("SMTP_FROM", "", "发件人地址"),
            ("OVERDUE_WARNING_DAYS", "3", "超期预警天数阈值"),
            ("MATERIAL_CATEGORIES", '["轴承","密封件","电气元件","液压件","传动件","其他"]', "物料分类列表"),
            ("EXPRESS_COMPANIES", '["顺丰速运","中通快递","圆通速递","韵达快递","申通快递","京东物流","德邦快递","其他"]', "快递公司列表"),
            ("OA_API_URL", "", "OA系统接口地址（预留）"),
            ("OA_AUTH_TOKEN", "", "OA系统认证令牌（预留）"),
        ]
        for key, value, desc in configs:
            existing = db.query(SystemConfig).filter(SystemConfig.config_key == key).first()
            if not existing:
                db.add(SystemConfig(config_key=key, config_value=value, config_type="string", description=desc))
                print(f"  created config: {key}")

        db.commit()
        print("\nSeed data initialized.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
