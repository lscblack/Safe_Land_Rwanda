
import os
from datetime import datetime
from uuid import uuid4
from PyPDF2 import PdfReader, PdfWriter
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from data.database.database import get_db
from data.models.models import AgencyOrBroker, AgencyUser, User
from api.middlewares.auth import get_current_user, get_optional_user
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from sqlalchemy import func
import logging

router = APIRouter()

logger = logging.getLogger(__name__)


# --- Pydantic Schemas ---
class AgencyOrBrokerSchema(BaseModel):
    id: Optional[int] = None
    name: str
    type: str  # 'agency' or 'broker'
    location: Optional[str] = None
    owner_user_id: Optional[int] = None
    logo_path: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    class Config:
        orm_mode = True

# --- Agency Logo Upload ---
@router.post("/agencies-brokers/{agency_id}/logo", response_model=AgencyOrBrokerSchema)
async def upload_agency_logo(
    agency_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Save file to offchain/assets/agency_logos (assume asset folders managed externally)
    folder = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "assets", "agency_logos"))
    ext = os.path.splitext(file.filename)[-1].lower()
    allowed_exts = {".png", ".jpg", ".jpeg", ".webp", ".svg"}
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail="Only image files allowed (.png, .jpg, .jpeg, .webp, .svg)")
    unique_name = f"agency_{agency_id}_{uuid4().hex}{ext}"
    # Ensure asset folder exists (create if missing)
    if not os.path.isdir(folder):
        try:
            os.makedirs(folder, exist_ok=True)
        except Exception:
            raise HTTPException(status_code=500, detail=f"Unable to create asset folder: {folder}. Check server permissions.")
    file_path = os.path.join(folder, unique_name)
    try:
        with open(file_path, "wb") as f:
            f.write(await file.read())
    except Exception:
        raise HTTPException(status_code=500, detail=f"Unable to write file to {file_path}. Check folder permissions.")
    rel_path = f"agency_logos/{unique_name}"
    # Update agency logo_path
    result = await db.execute(select(AgencyOrBroker).where(AgencyOrBroker.id == agency_id))
    agency = result.scalar_one_or_none()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    # Only owner or admins can update logo
    roles = getattr(current_user, 'role', []) or []
    if agency.owner_user_id != current_user.id and 'admin' not in roles and 'superadmin' not in roles:
        raise HTTPException(status_code=403, detail="Not allowed to update this agency")
    agency.logo_path = rel_path
    await db.commit()
    await db.refresh(agency)
    return agency


@router.post("/agencies-brokers/{agency_id}/certificate", response_model=AgencyOrBrokerSchema)
async def upload_agency_certificate(
    agency_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Save and compress PDF, then attach to agency (assume asset folders managed externally)
    folder = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "assets", "rdb_certificates"))
    ext = os.path.splitext(file.filename)[-1].lower()
    if ext != ".pdf":
        raise HTTPException(status_code=400, detail="Only PDF files allowed")
    unique_name = f"agency_{agency_id}_{uuid4().hex}.pdf"
    # Ensure asset folder exists (create if missing)
    if not os.path.isdir(folder):
        try:
            os.makedirs(folder, exist_ok=True)
        except Exception:
            raise HTTPException(status_code=500, detail=f"Unable to create asset folder: {folder}. Check server permissions.")
    file_path = os.path.join(folder, unique_name)
    try:
        with open(file_path, "wb") as f:
            f.write(await file.read())
    except Exception:
        raise HTTPException(status_code=500, detail=f"Unable to write file to {file_path}. Check folder permissions.")
    # Try compressing/resaving
    try:
        reader = PdfReader(file_path)
        writer = PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        with open(file_path, "wb") as f:
            writer.write(f)
    except Exception:
        pass
    rel_path = f"rdb_certificates/{unique_name}"
    # attach to agency
    result = await db.execute(select(AgencyOrBroker).where(AgencyOrBroker.id == agency_id))
    agency = result.scalar_one_or_none()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    # Only owner or admins can upload certificate
    roles = getattr(current_user, 'role', []) or []
    if agency.owner_user_id != current_user.id and 'admin' not in roles and 'superadmin' not in roles:
        raise HTTPException(status_code=403, detail="Not allowed to upload certificate for this agency")
    agency.certificate_path = rel_path
    await db.commit()
    await db.refresh(agency)
    return agency

# --- Pydantic Schemas ---
class AgencyUserSchema(BaseModel):
    id: Optional[int]
    agency_id: int
    user_id: int
    assigned_by_user_id: int
    assigned_at: Optional[datetime]
    class Config:
        orm_mode = True
@router.post("/agencies-brokers", response_model=AgencyOrBrokerSchema)
async def create_agency_broker(data: AgencyOrBrokerSchema, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    payload = data.dict(exclude_unset=True)
    logger.info(f"Creating agency with payload: {payload}")
    # Ensure owner is the authenticated user unless an admin sets otherwise
    if not payload.get('owner_user_id'):
        payload['owner_user_id'] = current_user.id
    # Non-admins cannot create active agencies directly
    roles = getattr(current_user, 'role', []) or []
    if 'admin' not in roles and 'superadmin' not in roles:
        payload['status'] = 'inactive'
    try:
        obj = AgencyOrBroker(**payload)
        db.add(obj)
        await db.commit()
        await db.refresh(obj)
        # Debug: log created id and total count
        try:
            result = await db.execute(select(AgencyOrBroker))
            all_objs = result.scalars().all()
            logger.info(f"Agency created id={obj.id}; total agencies in session query={len(all_objs)}")
        except Exception as e:
            logger.exception("Error querying agencies after create: %s", e)
        return obj
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/agencies-brokers/{agency_id}", response_model=AgencyOrBrokerSchema)
async def update_agency(
    agency_id: int,
    data: AgencyOrBrokerSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(AgencyOrBroker).where(AgencyOrBroker.id == agency_id))
    agency = result.scalar_one_or_none()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    roles = getattr(current_user, 'role', []) or []
    # Only owner or admin can update
    if agency.owner_user_id != current_user.id and 'admin' not in roles and 'superadmin' not in roles:
        raise HTTPException(status_code=403, detail="Not allowed to update this agency")
    payload = data.dict(exclude_unset=True)
    for k, v in payload.items():
        if k == 'id':
            continue
        setattr(agency, k, v)
    await db.commit()
    await db.refresh(agency)
    return agency


@router.delete("/agencies-brokers/{agency_id}")
async def delete_agency(
    agency_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(AgencyOrBroker).where(AgencyOrBroker.id == agency_id))
    agency = result.scalar_one_or_none()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    roles = getattr(current_user, 'role', []) or []
    # Only owner or admin can delete
    if agency.owner_user_id != current_user.id and 'admin' not in roles and 'superadmin' not in roles:
        raise HTTPException(status_code=403, detail="Not allowed to delete this agency")
    await db.delete(agency)
    await db.commit()
    return {"detail": "deleted"}

@router.get("/agencies-brokers", response_model=List[AgencyOrBrokerSchema])
async def list_agency_broker(
    db: AsyncSession = Depends(get_db),
    all: bool = Query(False, description="If true, return all agencies (admin only)"),
    mine: bool = Query(False, description="If true, return agencies owned by current user"),
    current_user: Optional[User] = Depends(get_optional_user),
):
    q = select(AgencyOrBroker)
    # admin request to see all
    if all:
        if not current_user:
            raise HTTPException(status_code=401, detail="Authentication required")
        roles = getattr(current_user, 'role', []) or []
        if 'admin' not in roles and 'superadmin' not in roles:
            raise HTTPException(status_code=403, detail="Requires admin privileges")
        result = await db.execute(q)
        return result.scalars().all()
    # owner-specific listings
    if mine:
        if not current_user:
            raise HTTPException(status_code=401, detail="Authentication required")
        result = await db.execute(q.where(AgencyOrBroker.owner_user_id == current_user.id))
        return result.scalars().all()
    # public listing: only active agencies
    result = await db.execute(q.where(AgencyOrBroker.status == 'active'))
    return result.scalars().all()

# --- Agency User Assignment ---
@router.post("/agency-users", response_model=AgencyUserSchema)
async def assign_user_to_agency(data: AgencyUserSchema, db: AsyncSession = Depends(get_db)):
    obj = AgencyUser(**data.dict(exclude_unset=True))
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/agencies-brokers/{agency_id}", response_model=AgencyOrBrokerSchema)
async def get_agency(agency_id: int, db: AsyncSession = Depends(get_db), current_user: Optional[User] = Depends(get_optional_user)):
    result = await db.execute(select(AgencyOrBroker).where(AgencyOrBroker.id == agency_id))
    agency = result.scalar_one_or_none()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    # If inactive, only owner or admins can view
    if agency.status != 'active':
        if not current_user or (current_user.id != agency.owner_user_id and 'admin' not in (getattr(current_user,'role',[]) or [])):
            raise HTTPException(status_code=404, detail="Agency not found")
    return agency


@router.put("/agencies-brokers/{agency_id}/approve", response_model=AgencyOrBrokerSchema)
async def approve_agency(agency_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    roles = getattr(current_user, 'role', []) or []
    if 'admin' not in roles and 'superadmin' not in roles:
        raise HTTPException(status_code=403, detail="Requires admin privileges")
    result = await db.execute(select(AgencyOrBroker).where(AgencyOrBroker.id == agency_id))
    agency = result.scalar_one_or_none()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    agency.status = 'active'
    await db.commit()
    await db.refresh(agency)
    return agency

@router.get("/agency-users", response_model=List[AgencyUserSchema])
async def list_agency_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgencyUser))
    return result.scalars().all()

# --- RDB Certificate Upload (PDF, compress) ---
@router.post("/rdb-certificate/upload")
async def upload_rdb_certificate(
    user_id: int = Form(...),
    file: UploadFile = File(...)
):
    # Save and compress PDF (assume asset folders managed externally)
    folder = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "assets", "rdb_certificates"))
    ext = os.path.splitext(file.filename)[-1].lower()
    if ext != ".pdf":
        raise HTTPException(status_code=400, detail="Only PDF files allowed")
    unique_name = f"{user_id}_{uuid4().hex}.pdf"
    # Ensure asset folder exists (create if missing)
    if not os.path.isdir(folder):
        try:
            os.makedirs(folder, exist_ok=True)
        except Exception:
            raise HTTPException(status_code=500, detail=f"Unable to create asset folder: {folder}. Check server permissions.")
    file_path = os.path.join(folder, unique_name)
    # Save original
    try:
        with open(file_path, "wb") as f:
            f.write(await file.read())
    except Exception:
        raise HTTPException(status_code=500, detail=f"Unable to write file to {file_path}. Check folder permissions.")
    # Compress PDF (simple: re-save with PyPDF2, for real compression use external tools)
    try:
        reader = PdfReader(file_path)
        writer = PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        with open(file_path, "wb") as f:
            writer.write(f)
    except Exception:
        pass  # fallback: just save original
    rel_path = f"rdb_certificates/{unique_name}"
    return {"user_id": user_id, "certificate_path": rel_path}
