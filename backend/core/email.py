import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL

def send_password_reset_email(to_email: str, reset_code: str) -> bool:
    if not SMTP_SERVER or not SMTP_USERNAME or not SMTP_PASSWORD:
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "RealLife Steps - Password Reset"
        msg["From"] = SMTP_FROM_EMAIL
        msg["To"] = to_email

        text = f"Your password reset code is: {reset_code}\nIf you did not request this, please ignore this email."
        html = f"""
        <html>
          <body>
            <h2>Password Reset</h2>
            <p>Your password reset code is: <strong>{reset_code}</strong></p>
            <p>If you did not request this, please ignore this email.</p>
          </body>
        </html>
        """

        part1 = MIMEText(text, "plain")
        part2 = MIMEText(html, "html")
        msg.attach(part1)
        msg.attach(part2)

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM_EMAIL, to_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"[Email Error] Failed to send password reset email to {to_email}: {e}")
        return False
