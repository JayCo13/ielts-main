import os
import smtplib
import dns.resolver
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from email.header import Header
from dotenv import load_dotenv
from fastapi import HTTPException, status

# Load environment variables
load_dotenv()

# Email configuration
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USERNAME = os.getenv("EMAIL_USERNAME")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
EMAIL_FROM = os.getenv("EMAIL_FROM")
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "")  # display name, e.g. "Thi IELTS Trên Máy"

# Print debug information
print(f"Email Configuration Debug:")
print(f"EMAIL_HOST: {EMAIL_HOST}")
print(f"EMAIL_PORT: {EMAIL_PORT}")
print(f"EMAIL_USERNAME: {'Set' if EMAIL_USERNAME else 'Not set'}")
print(f"EMAIL_PASSWORD: {'Set' if EMAIL_PASSWORD else 'Not set'}")
print(f"EMAIL_FROM: {EMAIL_FROM}")

def is_valid_email(email: str) -> bool:
    """
    Check if an email address is potentially valid by verifying the domain's MX records.
    
    Args:
        email: The email address to validate
        
    Returns:
        bool: True if the email domain has valid MX records, False otherwise
    """
    try:
        # Split the email address to get the domain
        domain = email.split('@')[1]
        
        # Check if MX records exist for the domain
        dns.resolver.resolve(domain, 'MX')
        return True
    except (IndexError, dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.exception.Timeout):
        return False
    except Exception as e:
        print(f"Error validating email domain: {str(e)}")
        # Return True in case of other errors to avoid blocking registration
        return True

def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """
    Send an email with the given subject and HTML content to the specified recipient.
    
    Args:
        to_email: Email address of the recipient
        subject: Subject line of the email
        html_content: HTML content of the email body
        
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    # Prefer Resend when configured; otherwise fall back to Gmail SMTP so this
    # stays a no-op until RESEND_API_KEY is set.
    from app.utils.resend_client import resend_configured, send_via_resend, transactional_from
    if resend_configured():
        return send_via_resend(transactional_from(), to_email, subject, html_content)

    if not EMAIL_USERNAME or not EMAIL_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email service is not configured properly"
        )

    # Create message
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    sender_addr = EMAIL_FROM or EMAIL_USERNAME
    # RFC 2047-encode the display name so Vietnamese diacritics don't corrupt the header.
    message["From"] = formataddr((str(Header(EMAIL_FROM_NAME, "utf-8")), sender_addr)) if EMAIL_FROM_NAME else sender_addr
    message["To"] = to_email
    
    # Attach HTML content
    html_part = MIMEText(html_content, "html")
    message.attach(html_part)
    
    try:
        # Connect to SMTP server
        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
        server.starttls()
        server.login(EMAIL_USERNAME, EMAIL_PASSWORD)
        
        # Send email
        server.sendmail(EMAIL_USERNAME, to_email, message.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        return False

def send_password_reset_email(to_email: str, reset_token: str, username: str, frontend_url: str) -> bool:
    """
    Send a password reset email with a reset link to the user.
    
    Args:
        to_email: Email address of the user
        reset_token: The token to be used for password reset
        username: The username of the user
        frontend_url: The base URL of the frontend application
        
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    from app.utils.email_templates import render_email, paragraph, cta_button

    # Create reset link
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"

    subject = "Đặt lại mật khẩu - thiieltstrenmay.com"
    body = (
        paragraph(f"Xin chào <strong>{username}</strong>,")
        + paragraph("Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn nút bên dưới để tạo mật khẩu mới:")
        + cta_button("Đặt lại mật khẩu", reset_link)
        + paragraph("Liên kết này sẽ hết hạn sau <strong>30 phút</strong>.")
        + paragraph("Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này — tài khoản của bạn vẫn an toàn.")
    )
    html_content = render_email("Đặt lại mật khẩu", body, preheader="Yêu cầu đặt lại mật khẩu tài khoản của bạn")
    return send_email(to_email, subject, html_content)

def send_account_created_email(to_email: str, username: str, frontend_url: str) -> bool:
    """
    Send an email notifying a user that an account has been created with their email.
    
    Args:
        to_email: Email address of the user
        username: The username of the user
        frontend_url: The base URL of the frontend application
        
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    from app.utils.email_templates import render_email, paragraph, cta_button

    # Create login link
    login_link = f"{frontend_url}/login"

    subject = "Chào mừng đến với thiieltstrenmay.com!"
    body = (
        paragraph(f"Xin chào <strong>{username}</strong>,")
        + paragraph("Tài khoản của bạn đã được tạo thành công. Bạn có thể đăng nhập ngay để truy cập toàn bộ tài nguyên luyện thi IELTS của chúng tôi.")
        + cta_button("Đăng nhập ngay", login_link)
        + paragraph("Nếu bạn có bất kỳ câu hỏi nào hoặc cần hỗ trợ, đừng ngần ngại liên hệ với chúng tôi.")
    )
    html_content = render_email("Chào mừng bạn! 🎉", body, preheader="Tài khoản của bạn đã sẵn sàng")
    return send_email(to_email, subject, html_content)
