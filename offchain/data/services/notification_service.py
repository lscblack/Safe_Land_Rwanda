"""
Notification service for sending emails and SMS
"""

import smtplib
import httpx
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from typing import Optional
import logging

from config.config import settings
from data.models.models import NotificationLog

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for sending notifications (email, SMS)"""
    
    @staticmethod
    async def send_email(
        db: AsyncSession,
        recipient: str,
        subject: str,
        message: str,
        user_id: Optional[int] = None,
        html: bool = False
    ) -> bool:
        """
        Send email notification
        
        Args:
            db: Database session
            recipient: Recipient email address
            subject: Email subject
            message: Email body
            user_id: User ID (optional)
            html: Whether message is HTML
        
        Returns:
            True if sent successfully, False otherwise
        """
        notification_log = NotificationLog(
            user_id=user_id,
            notification_type="email",
            recipient=recipient,
            subject=subject,
            message=message,
            status="pending"
        )
        db.add(notification_log)
        await db.commit()
        
        try:
            # Support both new and legacy env keys
            smtp_host = settings.SMTP_HOST or settings.EMAIL_SMTP_SERVER
            smtp_port = settings.SMTP_PORT or settings.EMAIL_SMTP_PORT or 587
            smtp_user = settings.SMTP_USER or settings.EMAIL_LOGIN or settings.EMAIL_SENDER_EMAIL
            smtp_password = settings.SMTP_PASSWORD or settings.EMAIL_SENDER_PASSWORD
            smtp_from = settings.SMTP_FROM or settings.EMAIL_SENDER_EMAIL or smtp_user

            if not all([smtp_host, smtp_user, smtp_password]):
                logger.warning("SMTP not configured, email not sent")
                notification_log.status = "failed"
                notification_log.error_message = "SMTP not configured"
                await db.commit()
                return False
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = smtp_from
            msg['To'] = recipient
            msg['Subject'] = subject
            
            # Attach message body
            mime_type = 'html' if html else 'plain'
            msg.attach(MIMEText(message, mime_type))
            
            # Send email (STARTTLS by default; fall back to plain when TLS not offered)
            with smtplib.SMTP(smtp_host, int(smtp_port)) as server:
                try:
                    server.starttls()
                except Exception:
                    # Server might not advertise STARTTLS; continue without upgrading
                    pass
                server.login(smtp_user, smtp_password)
                server.send_message(msg)
            
            # Update log
            notification_log.status = "sent"
            notification_log.sent_at = datetime.utcnow()
            await db.commit()
            
            logger.info(f"Email sent to {recipient}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            notification_log.status = "failed"
            notification_log.error_message = str(e)
            await db.commit()
            return False
    
    @staticmethod
    async def send_sms(
        db: AsyncSession,
        phone: str,
        message: str,
        user_id: Optional[int] = None
    ) -> bool:
        """
        Send SMS notification
        
        Args:
            db: Database session
            phone: Recipient phone number
            message: SMS message
            user_id: User ID (optional)
        
        Returns:
            True if sent successfully, False otherwise
        """
        notification_log = NotificationLog(
            user_id=user_id,
            notification_type="sms",
            recipient=phone,
            message=message,
            status="pending"
        )
        db.add(notification_log)
        await db.commit()
        
        try:
            if not settings.SMS_AUTH or not settings.SMS_SEND or not settings.SMS_USERNAME or not settings.SMS_PASSWORD:
                logger.warning("SMS API not configured, SMS not sent")
                notification_log.status = "failed"
                notification_log.error_message = "SMS API not configured"
                await db.commit()
                return False

            token = await NotificationService._fetch_sms_token()
            if not token:
                notification_log.status = "failed"
                notification_log.error_message = "Failed to obtain SMS token"
                await db.commit()
                return False

            payload = {
                "msisdn": phone,
                "message": message,
                "msgRef": NotificationService._build_msg_ref(),
                "sender_id": settings.SMS_SENDER_ID or "NLA",
            }

            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    settings.SMS_SEND,
                    json=payload,
                    headers={"Authorization": f"Bearer {token}"}
                )
                if resp.status_code >= 400:
                    notification_log.status = "failed"
                    notification_log.error_message = f"SMS send failed: {resp.status_code} {resp.text}"
                    await db.commit()
                    return False

            # Update log
            notification_log.status = "sent"
            notification_log.sent_at = datetime.utcnow()
            await db.commit()
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending SMS: {e}")
            notification_log.status = "failed"
            notification_log.error_message = str(e)
            await db.commit()
            return False

    @staticmethod
    async def _fetch_sms_token() -> Optional[str]:
        """Authenticate with SMS provider to get access token."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    settings.SMS_AUTH,
                    json={
                        "api_username": settings.SMS_USERNAME,
                        "api_password": settings.SMS_PASSWORD,
                    },
                )
                if resp.status_code >= 400:
                    logger.error(f"SMS auth failed: {resp.status_code} {resp.text}")
                    return None
                data = resp.json()
                token = data.get("access_token")
                if not token:
                    logger.error("SMS auth response missing access_token")
                return token
        except Exception as e:
            logger.error(f"SMS auth error: {e}")
            return None

    @staticmethod
    def _build_msg_ref() -> str:
        """Generate a simple message reference."""
        return datetime.utcnow().strftime("%Y%m%d%H%M%S%f")

    @staticmethod
    def _render_otp_template(otp_code: str) -> str:
        """Render a styled OTP email similar to the Go implementation."""
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SafeLand OTP</title>
    <style>
        body {{ margin: 0; padding: 0; background-color: #f5f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #0a162e; }}
        table {{ border-collapse: collapse; }}
        .container {{ width: 100%; background-color: #f5f7fb; padding: 24px 0; }}
        .card {{ width: 100%; max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08); }}
        .header {{ background: linear-gradient(135deg, #395d91 0%, #2b4b7f 100%); padding: 28px 32px; color: #ffffff; }}
        .header-title {{ font-size: 22px; font-weight: 700; margin: 0; letter-spacing: 0.3px; }}
        .header-subtitle {{ font-size: 13px; opacity: 0.9; margin: 6px 0 0; }}
        .badge {{ display: inline-block; background: #eaf0fb; color: #395d91; font-weight: 600; font-size: 12px; padding: 6px 10px; border-radius: 999px; letter-spacing: 0.3px; margin-bottom: 12px; }}
        .content {{ padding: 32px; }}
        .content h2 {{ margin: 0 0 12px; font-size: 22px; color: #0a162e; }}
        .content p {{ margin: 0 0 18px; font-size: 15px; line-height: 1.7; color: #42526b; }}
        .otp-box {{ background: #f0f5ff; border: 1px solid #d7e3ff; border-radius: 12px; padding: 16px 18px; font-size: 22px; font-weight: 700; letter-spacing: 2px; color: #1f3b73; text-align: center; }}
        .divider {{ height: 1px; background: #e6edf7; margin: 24px 0; }}
        .security {{ background: #fff5f5; border-left: 4px solid #e11d48; padding: 12px 14px; border-radius: 8px; font-size: 12px; color: #7a1f3d; }}
        .footer {{ padding: 24px 32px 30px; background: #f8fafc; text-align: center; }}
        .footer p {{ margin: 6px 0; font-size: 12px; color: #667085; }}
        .footer a {{ color: #395d91; text-decoration: none; }}
        @media (max-width: 620px) {{ .content, .footer {{ padding: 24px; }} .header {{ padding: 24px; }} .header-title {{ font-size: 20px; }} }}
    </style>
</head>
<body>
    <span style="display:none; visibility:hidden; opacity:0; color:transparent; height:0; width:0;">Your SafeLand OTP code is {otp_code}</span>
    <table role="presentation" class="container" width="100%">
        <tr>
            <td align="center">
                <table role="presentation" class="card" width="620">
                    <tr>
                        <td class="header">
                            <div class="badge">SafeLand Rwanda</div>
                            <h1 class="header-title">Secure Marketplace For Land Transactions</h1>
                            <p class="header-subtitle">Your verification code is below</p>
                        </td>
                    </tr>
                    <tr>
                        <td class="content">
                            <h2>Verification Code</h2>
                            <p>Use this one-time code to continue your action. It expires in 10 minutes.</p>
                            <div class="otp-box">{otp_code}</div>
                            <div class="divider"></div>
                            <div class="security">
                                <strong>Security Notice:</strong> Never share this code. SafeLand will never ask for your password or OTP via email or phone.
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td class="footer">
                            <p>&copy; 2024 SafeLand Rwanda. All rights reserved.</p>
                            <p>Empowering Rwanda's Land Management</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

    @staticmethod
    def _render_reset_template(reset_link: str) -> str:
        """Render password reset email using the same visual style as OTP."""
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SafeLand Password Reset</title>
    <style>
        body {{ margin: 0; padding: 0; background-color: #f5f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #0a162e; }}
        table {{ border-collapse: collapse; }}
        .container {{ width: 100%; background-color: #f5f7fb; padding: 24px 0; }}
        .card {{ width: 100%; max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08); }}
        .header {{ background: linear-gradient(135deg, #395d91 0%, #2b4b7f 100%); padding: 28px 32px; color: #ffffff; }}
        .header-title {{ font-size: 22px; font-weight: 700; margin: 0; letter-spacing: 0.3px; }}
        .header-subtitle {{ font-size: 13px; opacity: 0.9; margin: 6px 0 0; }}
        .badge {{ display: inline-block; background: #eaf0fb; color: #395d91; font-weight: 600; font-size: 12px; padding: 6px 10px; border-radius: 999px; letter-spacing: 0.3px; margin-bottom: 12px; }}
        .content {{ padding: 32px; }}
        .content h2 {{ margin: 0 0 12px; font-size: 22px; color: #0a162e; }}
        .content p {{ margin: 0 0 18px; font-size: 15px; line-height: 1.7; color: #42526b; }}
        .cta {{ display: inline-block; color: white; padding: 14px 22px; background: linear-gradient(135deg, #395d91 0%, #2b4b7f 100%); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; margin-top: 8px; }}
        .divider {{ height: 1px; background: #e6edf7; margin: 24px 0; }}
        .security {{ background: #fff5f5; border-left: 4px solid #e11d48; padding: 12px 14px; border-radius: 8px; font-size: 12px; color: #7a1f3d; }}
        .footer {{ padding: 24px 32px 30px; background: #f8fafc; text-align: center; }}
        .footer p {{ margin: 6px 0; font-size: 12px; color: #667085; }}
        .footer a {{ color: #395d91; text-decoration: none; }}
        @media (max-width: 620px) {{ .content, .footer {{ padding: 24px; }} .header {{ padding: 24px; }} .header-title {{ font-size: 20px; }} }}
    </style>
</head>
<body>
    <table role="presentation" class="container" width="100%">
        <tr>
            <td align="center">
                <table role="presentation" class="card" width="620">
                    <tr>
                        <td class="header">
                            <div class="badge">SafeLand Rwanda</div>
                            <h1 class="header-title">Password Reset Request</h1>
                            <p class="header-subtitle">Secure Marketplace For Land Transactions</p>
                        </td>
                    </tr>
                    <tr>
                        <td class="content">
                            <h2>Reset Your Password</h2>
                            <p>We received a request to reset your password. Click the button below to set a new one. This link expires in 1 hour.</p>
                            <a class="cta" href="{reset_link}" style="color: white;">Reset Password</a>
                            <div class="divider"></div>
                            <div class="security">
                                <strong>Security Notice:</strong> If you did not request this, you can safely ignore this email. Your password will remain unchanged.
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td class="footer">
                            <p>&copy; 2024 SafeLand Rwanda. All rights reserved.</p>
                            <p>Empowering Rwanda's Land Management</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""
    
    @staticmethod
    async def send_otp_email(
        db: AsyncSession,
        recipient: str,
        otp_code: str,
        user_id: Optional[int] = None
    ) -> bool:
        """Send OTP via email"""
        subject = "SafeLand OTP Code"
        message = NotificationService._render_otp_template(otp_code)
        return await NotificationService.send_email(db, recipient, subject, message, user_id, html=True)
    
    @staticmethod
    async def send_otp_sms(
        db: AsyncSession,
        phone: str,
        otp_code: str,
        user_id: Optional[int] = None
    ) -> bool:
        """Send OTP via SMS"""
        message = f"Your SafeLand verification code is: {otp_code}. Valid for 10 minutes."
        return await NotificationService.send_sms(db, phone, message, user_id)
    
    @staticmethod
    async def send_password_reset_email(
        db: AsyncSession,
        recipient: str,
        reset_link: str,
        user_id: Optional[int] = None
    ) -> bool:
        """Send password reset email"""
        subject = "SafeLand Password Reset"
        message = NotificationService._render_reset_template(reset_link)
        return await NotificationService.send_email(db, recipient, subject, message, user_id, html=True)
