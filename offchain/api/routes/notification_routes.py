"""
Notification routes (email and SMS)
"""

from fastapi import APIRouter, Depends, HTTPException, status, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Union
from datetime import datetime
import logging

from data.database.database import get_db
from data.models.models import User, PasswordReset
from data.services.notification_service import NotificationService
from api.middlewares.auth import verify_token
from pkg.auth.auth import hash_password
from pkg.utils.utils import sanitize_phone, validate_email, validate_nid, generate_token, get_expiration_time, is_expired
from config.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


class EmailRequest(BaseModel):
    email: EmailStr
    subject: str
    message: str
    html: bool = False


class SMSRequest(BaseModel):
    phone: str
    message: str


class SendOTPCombinedRequest(BaseModel):
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    type: Optional[str] = Field(default=None, description="email or phone")


class PasswordResetEmailRequest(BaseModel):
    email: EmailStr


class PasswordResetRequest(BaseModel):
    token: str
    password: str
    confirm_password: str


class NotificationResponse(BaseModel):
    error: bool
    message: str
    sent: bool
    delivery_method: str


async def resolve_user_id(db: AsyncSession, email: Optional[str] = None, phone: Optional[str] = None, nid: Optional[str] = None) -> Optional[int]:
    """Resolve user id from email, phone, or NID; returns None if not found."""
    try:
        if email:
            result = await db.execute(select(User).where(User.email == email))
        elif phone:
            result = await db.execute(select(User).where(User.phone == phone))
        elif nid and validate_nid(nid):
            result = await db.execute(select(User).where(User.national_id == nid))
        else:
            return None
        user = result.scalar_one_or_none()
        return user.id if user else None
    except Exception:
        return None


@router.post("/send-email", response_model=NotificationResponse)
async def send_email_notification(
    request: EmailRequest,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token)
):
    """Send an email notification using SMTP."""
    try:
        if not validate_email(request.email):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email")

        user_id = await resolve_user_id(db, email=request.email)

        await NotificationService.send_email(
            db=db,
            recipient=request.email,
            subject=request.subject,
            message=request.message,
            user_id=user_id,
            html=request.html
        )

        logger.info(f"Email sent to {request.email} by user {token_payload.get('id', 'unknown')}")

        return NotificationResponse(
            error=False,
            message="Email sent successfully",
            sent=True,
            delivery_method="email"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email"
        )


@router.post("/send-sms", response_model=NotificationResponse)
async def send_sms_notification(
    request: SMSRequest,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token)
):
    """Send an SMS notification using the configured provider."""
    try:
        phone = sanitize_phone(request.phone)
        user_id = await resolve_user_id(db, phone=phone)

        await NotificationService.send_sms(
            db=db,
            phone=phone,
            message=request.message,
            user_id=user_id
        )

        logger.info(f"SMS sent to {phone} by user {token_payload.get('id', 'unknown')}")

        return NotificationResponse(
            error=False,
            message="SMS sent successfully",
            sent=True,
            delivery_method="sms"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending SMS: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send SMS"
        )


@router.post("/send-otp", response_model=dict)
async def send_otp_notification(
    request: SendOTPCombinedRequest,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token)
):
    """
    Send OTP via SMS or Email (exclusive)
    If type=email, send only email. If type=phone, send only SMS.
    If type is omitted, default to phone when provided, else email.
    """
    try:
        import random
        import string
        import uuid

        if not request.phone and not request.email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="phone or email is required for OTP delivery")

        # Decide destination
        delivery_type = request.type
        if not delivery_type:
            delivery_type = "phone" if request.phone else "email"

        if delivery_type == "email" and not request.email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="email is required when type is 'email'")
        if delivery_type == "phone" and not request.phone:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="phone is required when type is 'phone'")

        # Generate 6-character mixed alphanumeric OTP
        otp = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        verification_code = str(uuid.uuid4())

        user_id: Optional[int] = None
        email_sent = False

        if delivery_type == "phone":
            phone = sanitize_phone(request.phone) if request.phone else None
            user_id = await resolve_user_id(db, phone=phone)
            await NotificationService.send_otp_sms(
                db=db,
                phone=phone,
                otp_code=otp,
                user_id=user_id
            )
        else:
            user_id = await resolve_user_id(db, email=request.email)
            await NotificationService.send_otp_email(
                db=db,
                recipient=request.email,
                otp_code=otp,
                user_id=user_id
            )
            email_sent = True

        logger.info(f"OTP sent via {delivery_type} to {request.phone or request.email} by user {token_payload.get('id', 'unknown')}")

        return {
            "error": False,
            "msg": "OTP sent via Email successfully" if delivery_type == "email" else "OTP sent via SMS successfully",
            "otp": otp,
            "verification_code": verification_code,
            "expires_in": "10 minutes",
            "email_sent": email_sent
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending OTP: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to send OTP")


@router.post("/send-reset-email", response_model=dict)
async def send_password_reset_email_notification(
    request: PasswordResetEmailRequest,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token)
):
    """
    Send password reset email
    
    Sends a password reset email with a professional template.
    Creates a password reset token and stores it in the database.
    Requires authentication.
    """
    try:
        if not validate_email(request.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )
        
        # Find user by email
        result = await db.execute(
            select(User).where(User.email == request.email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found with this email"
            )
        
        # Generate reset token
        reset_token = generate_token(64)
        expires_at = get_expiration_time(minutes=20)
        
        # Create password reset record
        password_reset = PasswordReset(
            user_id=user.id,
            email=request.email,
            token=reset_token,
            expires_at=expires_at,
            is_used=False
        )
        
        db.add(password_reset)
        await db.commit()
        
        # Generate reset link
        base_url = settings.BASE_URL
        reset_link = f"{base_url}/api/notifications/password-reset-form?token={reset_token}"
        
        # Send password reset email
        await NotificationService.send_password_reset_email(
            db=db,
            recipient=request.email,
            reset_link=reset_link,
            user_id=user.id
        )
        
        logger.info(f"Password reset email sent to {request.email}")
        
        return {
            "error": False,
            "msg": "Password reset email sent successfully",
            "expires_in": "20 minutes"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending password reset email: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send password reset email"
        )


@router.get("/password-reset-form", response_class=HTMLResponse)
async def password_reset_form(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Password reset form
    
    Returns an HTML form for password reset with validation and professional styling.
    """
    # Verify token
    result = await db.execute(
        select(PasswordReset).where(
            PasswordReset.token == token,
            PasswordReset.is_used == False
        )
    )
    password_reset = result.scalar_one_or_none()

    if not password_reset:
        return HTMLResponse(content=f"""<!DOCTYPE html>
<html lang=\"en\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>Invalid Reset Link - SafeLand</title>
    <style>
        body {{ margin:0; padding:0; background: linear-gradient(135deg,#f5f7fb 0%,#e6edf7 100%); display:flex; align-items:center; justify-content:center; min-height:100vh; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; color:#0a162e; }}
        .card {{ width:100%; max-width:480px; background:#fff; border-radius:16px; box-shadow:0 12px 30px rgba(15,23,42,0.12); overflow:hidden; text-align:center; }}
        .header {{ background:linear-gradient(135deg,#e11d48 0%,#be123c 100%); padding:28px; color:#fff; }}
        .header h1 {{ margin:0; font-size:22px; }}
        .content {{ padding:28px; }}
        .content p {{ margin:0 0 16px; color:#42526b; font-size:15px; line-height:1.6; }}
        .btn {{ display:inline-block; margin-top:8px; padding:12px 20px; background:linear-gradient(135deg,#395d91 0%,#2b4b7f 100%); color:#fff; text-decoration:none; border-radius:10px; font-weight:600; }}
    </style>
</head>
<body>
    <div class=\"card\">
        <div class=\"header\">
            <h1>Invalid or Used Link</h1>
        </div>
        <div class=\"content\">
            <p>This password reset link is invalid or has already been used.</p>
            <a class=\"btn\" href=\"{settings.FRONTEND_BASE_URL}\">Return to SafeLand</a>
        </div>
    </div>
</body>
</html>""", status_code=400)

    if is_expired(password_reset.expires_at):
        return HTMLResponse(content=f"""<!DOCTYPE html>
<html lang=\"en\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>Reset Link Expired - SafeLand</title>
    <style>
        body {{ margin:0; padding:0; background: linear-gradient(135deg,#f5f7fb 0%,#e6edf7 100%); display:flex; align-items:center; justify-content:center; min-height:100vh; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; color:#0a162e; }}
        .card {{ width:100%; max-width:480px; background:#fff; border-radius:16px; box-shadow:0 12px 30px rgba(15,23,42,0.12); overflow:hidden; text-align:center; }}
        .header {{ background:linear-gradient(135deg,#f97316 0%,#ea580c 100%); padding:28px; color:#fff; }}
        .header h1 {{ margin:0; font-size:22px; }}
        .content {{ padding:28px; }}
        .content p {{ margin:0 0 16px; color:#42526b; font-size:15px; line-height:1.6; }}
        .btn {{ display:inline-block; margin-top:8px; padding:12px 20px; background:linear-gradient(135deg,#395d91 0%,#2b4b7f 100%); color:#fff; text-decoration:none; border-radius:10px; font-weight:600; }}
    </style>
</head>
<body>
    <div class=\"card\">
        <div class=\"header\">
            <h1>Link Expired</h1>
        </div>
        <div class=\"content\">
            <p>This password reset link has expired. Please request a new one.</p>
            <a class=\"btn\" href=\"{settings.FRONTEND_BASE_URL}\">Back to SafeLand</a>
        </div>
    </div>
</body>
</html>""", status_code=400)

    # Return HTML form
    return HTMLResponse(content=f"""<!DOCTYPE html>
<html lang=\"en\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>Reset Password - SafeLand</title>
    <style>
        * {{ box-sizing:border-box; }}
        body {{ margin:0; padding:0; background: linear-gradient(135deg,#f5f7fb 0%,#e6edf7 100%); display:flex; align-items:center; justify-content:center; min-height:100vh; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; color:#0a162e; }}
        .card {{ width:100%; max-width:520px; background:#fff; border-radius:16px; box-shadow:0 16px 36px rgba(15,23,42,0.12); overflow:hidden; }}
        .header {{ background:linear-gradient(135deg,#395d91 0%,#2b4b7f 100%); padding:28px; color:#fff; }}
        .badge {{ display:inline-block; background:rgba(255,255,255,0.15); padding:6px 12px; border-radius:999px; font-size:12px; letter-spacing:0.4px; margin-bottom:10px; }}
        .header h1 {{ margin:0; font-size:24px; font-weight:700; }}
        .header p {{ margin:6px 0 0; font-size:13px; opacity:0.95; }}
        .content {{ padding:28px; }}
        .content h2 {{ margin:0 0 8px; font-size:20px; }}
        .content p.subtitle {{ margin:0 0 18px; color:#42526b; font-size:14px; }}
        .form-group {{ margin-bottom:18px; }}
        label {{ display:block; font-weight:600; margin-bottom:8px; color:#0a162e; }}
        .input-wrapper {{ position:relative; }}
        .input-wrapper input {{ width:100%; padding:12px 14px; border:1.5px solid #d7e3ff; border-radius:10px; font-size:15px; transition:border-color 0.2s, box-shadow 0.2s; }}
        .input-wrapper input:focus {{ border-color:#395d91; box-shadow:0 0 0 3px rgba(57,93,145,0.12); outline:none; }}
        .strength-bar {{ height:4px; background:#e6edf7; border-radius:2px; margin-top:8px; overflow:hidden; }}
        .strength-fill {{ height:100%; width:0%; transition:width 0.3s ease, background-color 0.3s ease; }}
        .strength-weak {{ background:#ef4444; width:33%; }}
        .strength-medium {{ background:#f59e0b; width:66%; }}
        .strength-strong {{ background:#10b981; width:100%; }}
        .error {{ color:#e11d48; font-size:12px; margin-top:6px; display:none; }}
        .actions {{ margin-top:24px; }}
        button {{ width:100%; padding:14px; border:none; border-radius:10px; background:linear-gradient(135deg,#395d91 0%,#2b4b7f 100%); color:#fff; font-weight:700; font-size:15px; cursor:pointer; transition:transform 0.15s, box-shadow 0.15s; }}
        button:hover {{ transform:translateY(-1px); box-shadow:0 12px 24px rgba(57,93,145,0.28); }}
        button:disabled {{ opacity:0.6; cursor:not-allowed; box-shadow:none; transform:none; }}
        .security {{ margin-top:18px; background:#fff5f5; border-left:4px solid #e11d48; padding:12px 14px; border-radius:10px; font-size:12px; color:#7a1f3d; }}
        .footer {{ padding:18px 28px 24px; background:#f8fafc; text-align:center; color:#667085; font-size:12px; }}
    </style>
</head>
<body>
    <div class=\"card\">
        <div class=\"header\">
            <div class=\"badge\">SafeLand Rwanda</div>
            <h1>Reset your password</h1>
            <p>Secure Marketplace For Land Transactions</p>
        </div>
        <div class=\"content\">
            <h2>Create a new password</h2>
            <p class=\"subtitle\">Choose a strong password you haven't used before.</p>
            <form id=\"resetForm\" method=\"POST\" action=\"/api/notifications/password-reset\">\n        <input type=\"hidden\" name=\"token\" value=\"{token}\">\n        <div class=\"form-group\">\n          <label for=\"password\">New Password</label>\n          <div class=\"input-wrapper\">\n            <input type=\"password\" id=\"password\" name=\"password\" required minlength=\"8\" placeholder=\"Enter new password\">\n          </div>\n          <div class=\"strength-bar\"><div class=\"strength-fill\" id=\"strengthFill\"></div></div>\n          <div class=\"error\" id=\"strengthError\"></div>\n        </div>\n        <div class=\"form-group\">\n          <label for=\"confirm_password\">Confirm Password</label>\n          <div class=\"input-wrapper\">\n            <input type=\"password\" id=\"confirm_password\" name=\"confirm_password\" required minlength=\"8\" placeholder=\"Confirm new password\">\n          </div>\n          <div class=\"error\" id=\"matchError\">Passwords do not match</div>\n        </div>\n        <div class=\"actions\">\n          <button type=\"submit\" id=\"submitBtn\">Reset Password</button>\n        </div>\n      </form>\n      <div class=\"security\"><strong>Security Tip:</strong> Never reuse passwords across services. Avoid dictionary words; mix letters, numbers, and symbols.</div>
        </div>
        <div class=\"footer\">&copy; 2026 SafeLand Rwanda. All rights reserved.</div>
    </div>
    <script>
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirm_password');
        const strengthFill = document.getElementById('strengthFill');
        const matchError = document.getElementById('matchError');
        const strengthError = document.getElementById('strengthError');
        const form = document.getElementById('resetForm');
        const submitBtn = document.getElementById('submitBtn');

        function assessStrength(val) {{
            let score = 0;
            if (val.length >= 8) score++;
            if (/[a-z]/.test(val) && /[A-Z]/.test(val)) score++;
            if (/\d/.test(val)) score++;
            if (/[!@#$%^&*(),.?":{{}}|<>]/.test(val)) score++;
            return score;
        }}

        password.addEventListener('input', () => {{
            const val = password.value;
            const score = assessStrength(val);
            strengthFill.className = 'strength-fill';
            if (score === 0) {{ strengthFill.style.width = '0'; strengthError.textContent = ''; return; }}
            if (score <= 2) {{ strengthFill.classList.add('strength-weak'); strengthError.textContent = 'Add uppercase, lowercase, numbers, and symbols.'; }}
            else if (score === 3) {{ strengthFill.classList.add('strength-medium'); strengthError.textContent = 'Almost there—add another character type.'; }}
            else {{ strengthFill.classList.add('strength-strong'); strengthError.textContent = ''; }}
        }});

        confirmPassword.addEventListener('input', () => {{
            matchError.style.display = confirmPassword.value && password.value !== confirmPassword.value ? 'block' : 'none';
        }});

        form.addEventListener('submit', (e) => {{
            if (password.value !== confirmPassword.value) {{
                e.preventDefault();
                matchError.style.display = 'block';
                return;
            }}
            submitBtn.disabled = true;
        }});
    </script>
</body>
</html>""", status_code=200)


@router.post("/password-reset", response_class=HTMLResponse)
async def submit_password_reset(
    token: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit password reset
    
    Processes the password reset form submission.
    Updates the user's password and invalidates the reset token.
    """
    try:
        # Validate passwords match
        if password != confirm_password:
            return HTMLResponse(content="""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Error - SafeLand</title>
                <style>
                    body { font-family: Arial, sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                    .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
                    h1 { color: #e11d48; }
                    p { color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>❌ Error</h1>
                    <p>Passwords do not match. Please go back and try again.</p>
                </div>
            </body>
            </html>
            """, status_code=400)
        
        # Find password reset record
        result = await db.execute(
            select(PasswordReset).where(
                PasswordReset.token == token,
                PasswordReset.is_used == False
            )
        )
        password_reset = result.scalar_one_or_none()
        
        if not password_reset:
            return HTMLResponse(content="""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invalid Token - SafeLand</title>
                <style>
                    body { font-family: Arial, sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                    .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
                    h1 { color: #e11d48; }
                    p { color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>❌ Invalid Token</h1>
                    <p>This password reset link is invalid or has already been used.</p>
                </div>
            </body>
            </html>
            """, status_code=400)
        
        if is_expired(password_reset.expires_at):
            return HTMLResponse(content="""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Token Expired - SafeLand</title>
                <style>
                    body { font-family: Arial, sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                    .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
                    h1 { color: #e11d48; }
                    p { color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>⏱️ Token Expired</h1>
                    <p>This password reset link has expired. Please request a new one.</p>
                </div>
            </body>
            </html>
            """, status_code=400)
        
        # Get user
        result = await db.execute(
            select(User).where(User.id == password_reset.user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return HTMLResponse(content="""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Error - SafeLand</title>
                <style>
                    body { font-family: Arial, sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                    .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
                    h1 { color: #e11d48; }
                    p { color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>❌ Error</h1>
                    <p>User not found.</p>
                </div>
            </body>
            </html>
            """, status_code=404)
        
        # Update password
        user.password = hash_password(password)
        
        # Mark token as used
        password_reset.is_used = True
        password_reset.used_at = datetime.utcnow()
        
        await db.commit()
        
        logger.info(f"Password reset successful for user: {user.email}")
        
        frontend_url = settings.FRONTEND_BASE_URL
        
        return HTMLResponse(content=f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Success - SafeLand</title>
            <meta http-equiv="refresh" content="5;url={frontend_url}">
            <style>
                body {{ font-family: Arial, sans-serif; background: linear-gradient(135deg, #0a162e 0%, #395d91 100%); display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }}
                .container {{ background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.2); text-align: center; max-width: 420px; }}
                h1 {{ color: #10b981; font-size: 48px; margin-bottom: 16px; }}
                h2 {{ color: #0a162e; margin-bottom: 16px; }}
                p {{ color: #666; margin-bottom: 24px; }}
                a {{ display: inline-block; padding: 14px 32px; background: #395d91; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }}
                a:hover {{ background: #2d4a73; }}
                .countdown {{ color: #999; font-size: 14px; margin-top: 16px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>✓</h1>
                <h2>Password Reset Successful!</h2>
                <p>Your password has been updated successfully. You can now log in with your new password.</p>
                <a href="{frontend_url}">Go to SafeLand</a>
                <p class="countdown">Redirecting automatically in 5 seconds...</p>
            </div>
        </body>
        </html>
        """)
        
    except Exception as e:
        logger.error(f"Error resetting password: {e}")
        await db.rollback()
        return HTMLResponse(content="""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Error - SafeLand</title>
            <style>
                body { font-family: Arial, sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
                h1 { color: #e11d48; }
                p { color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>❌ Error</h1>
                <p>An error occurred while resetting your password. Please try again.</p>
            </div>
        </body>
        </html>
        """, status_code=500)
