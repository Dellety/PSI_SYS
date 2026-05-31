import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.orm import Session
from app.models.system_config import SystemConfig


def _get_smtp_config(db: Session) -> dict:
    """Read SMTP configuration from system_config table."""
    keys = ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from"]
    rows = db.query(SystemConfig).filter(SystemConfig.config_key.in_(keys)).all()
    config = {r.config_key: r.config_value for r in rows}
    return config


def send_email(db: Session, to: str, subject: str, body: str, cc: str | None = None) -> bool:
    """Send email via SMTP. If SMTP is not configured, just log and return True."""
    config = _get_smtp_config(db)

    host = config.get("smtp_host")
    port = config.get("smtp_port")
    user = config.get("smtp_user")
    password = config.get("smtp_password")
    from_addr = config.get("smtp_from") or user

    if not host or not user or not password:
        print(f"[Email] SMTP未配置，跳过发送: to={to}, subject={subject}")
        return True

    try:
        msg = MIMEMultipart()
        msg["From"] = from_addr
        msg["To"] = to
        msg["Subject"] = subject
        if cc:
            msg["Cc"] = cc
        msg.attach(MIMEText(body, "html", "utf-8"))

        port_int = int(port or 465)
        if port_int == 465:
            server = smtplib.SMTP_SSL(host, port_int)
        else:
            server = smtplib.SMTP(host, port_int)
            server.starttls()

        server.login(user, password)
        recipients = [to]
        if cc:
            recipients.extend([addr.strip() for addr in cc.split(",") if addr.strip()])
        server.sendmail(from_addr, recipients, msg.as_string())
        server.quit()
        print(f"[Email] 邮件发送成功: to={to}, subject={subject}")
        return True
    except Exception as e:
        print(f"[Email] 邮件发送失败: {e}")
        return False
