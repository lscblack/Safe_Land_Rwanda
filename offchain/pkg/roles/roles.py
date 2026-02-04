"""
Role definitions and utilities
"""

from typing import List

# Role constants
ADMIN = "admin"
BUYER = "buyer"
SELLER = "seller"
AGENT = "agent"
MODERATOR = "moderator"
SUPER_ADMIN = "super_admin"

# All valid roles
ALL_ROLES = [ADMIN, BUYER, SELLER, AGENT, MODERATOR, SUPER_ADMIN]


def is_valid_role(role: str) -> bool:
    """Check if a role is valid"""
    return role in ALL_ROLES


def validate_roles(roles: List[str]) -> bool:
    """Validate a list of roles"""
    return all(is_valid_role(role) for role in roles)


def has_role(user_roles: List[str], required_role: str) -> bool:
    """Check if user has a specific role"""
    return required_role in user_roles


def has_any_role(user_roles: List[str], required_roles: List[str]) -> bool:
    """Check if user has any of the required roles"""
    return any(role in user_roles for role in required_roles)


def has_all_roles(user_roles: List[str], required_roles: List[str]) -> bool:
    """Check if user has all of the required roles"""
    return all(role in user_roles for role in required_roles)


def is_admin(user_roles: List[str]) -> bool:
    """Check if user is an admin"""
    return ADMIN in user_roles or SUPER_ADMIN in user_roles
