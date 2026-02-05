"""
Utility functions for SafeLand API
"""

import random
import string
import hashlib
from typing import Optional
from datetime import datetime, timedelta, timezone


def generate_otp(length: int = 6) -> str:
    """Generate a random OTP code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


def generate_token(length: int = 32) -> str:
    """Generate a random token"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))


def generate_user_code(role: str, country: str) -> str:
    """
    Generate a unique user code
    Format: ROLE_PREFIX-COUNTRY-RANDOM
    Example: BUY-RW-A3F9G2
    """
    role_prefixes = {
        "buyer": "BUY",
        "seller": "SEL",
        "agent": "AGT",
        "admin": "ADM",
        "moderator": "MOD"
    }
    
    prefix = role_prefixes.get(role, "USR")
    country_code = country[:2].upper() if country else "XX"
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    return f"{prefix}-{country_code}-{random_part}"


def hash_string(text: str) -> str:
    """Generate SHA256 hash of a string"""
    return hashlib.sha256(text.encode()).hexdigest()


def is_expired(expires_at: datetime, skew_seconds: int = 60) -> bool:
    """Check if a datetime has expired, normalizing to UTC and allowing small clock skew."""
    now_utc = datetime.now(timezone.utc)
    target = expires_at
    if target.tzinfo is None:
        target = target.replace(tzinfo=timezone.utc)
    else:
        target = target.astimezone(timezone.utc)
    # Allow a small negative skew so fresh links don't show expired due to clock drift
    return now_utc > (target + timedelta(seconds=skew_seconds))


def get_expiration_time(minutes: Optional[int] = None, hours: Optional[int] = None, days: Optional[int] = None) -> datetime:
    """
    Get expiration datetime
    
    Args:
        minutes: Minutes from now
        hours: Hours from now
        days: Days from now
    
    Returns:
        Expiration datetime
    """
    delta_kwargs = {}
    if minutes:
        delta_kwargs['minutes'] = minutes
    if hours:
        delta_kwargs['hours'] = hours
    if days:
        delta_kwargs['days'] = days
    
    return datetime.now(timezone.utc) + timedelta(**delta_kwargs)


def sanitize_phone(phone: str) -> str:
    """Sanitize phone number"""
    # Remove all non-digit characters
    digits_only = ''.join(filter(str.isdigit, phone))
    
    # Add country code if not present (assuming Rwanda +250)
    if len(digits_only) == 9:
        return f"250{digits_only}"
    
    return digits_only


def validate_email(email: str) -> bool:
    """Basic email validation"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_nid(nid: str) -> bool:
    """Validate Rwanda National ID format"""
    # Rwanda NID is 16 digits
    return nid.isdigit() and len(nid) == 16
