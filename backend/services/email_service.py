import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from backend.config import settings


def send_password_reset_email(to_email: str, reset_token: str) -> None:
    if not settings.SMTP_FROM_EMAIL or not settings.SMTP_APP_PASSWORD:
        raise RuntimeError("SMTP_FROM_EMAIL and SMTP_APP_PASSWORD must be set in .env")

    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "GovMCP — Reset your password"
    msg["From"] = settings.SMTP_FROM_EMAIL
    msg["To"] = to_email

    text = f"Reset your GovMCP password by visiting:\n{reset_url}\n\nThis link expires in 1 hour. If you did not request this, ignore this email."
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#4f46e5">GovMCP</h2>
      <p>You requested a password reset. Click the button below to set a new password.</p>
      <a href="{reset_url}"
         style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;
                border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
        Reset Password
      </a>
      <p style="color:#6b7280;font-size:13px">This link expires in 1 hour.<br>
      If you did not request a password reset, you can safely ignore this email.</p>
    </div>
    """

    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(settings.SMTP_FROM_EMAIL, settings.SMTP_APP_PASSWORD)
        server.sendmail(settings.SMTP_FROM_EMAIL, to_email, msg.as_string())
