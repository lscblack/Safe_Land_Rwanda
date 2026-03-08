"""
Chat Routes — RAG Land Assistant
---------------------------------
POST /api/chat/sessions              → create session
GET  /api/chat/sessions              → list sessions for current user
GET  /api/chat/sessions/{id}         → session detail + messages
POST /api/chat/sessions/{id}/message → send a message, get AI reply
DELETE /api/chat/sessions/{id}       → soft-close a session
"""

import uuid
import jwt
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File
from fastapi.security.utils import get_authorization_scheme_param
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from data.database.database import get_db
from data.models.chat import ChatSession, ChatMessage
from api.ml.chat_service import chat as run_chat

logger = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class CreateSessionRequest(BaseModel):
    upi:   Optional[str] = None
    title: Optional[str] = None


class SendMessageRequest(BaseModel):
    message: str


class MessageOut(BaseModel):
    id:         int
    role:       str
    content:    str
    created_at: str

    class Config:
        from_attributes = True


class SessionOut(BaseModel):
    id:         int
    token:      str
    upi:        Optional[str]
    title:      Optional[str]
    is_active:  bool
    created_at: str
    messages:   list[MessageOut] = []

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Auth helper — best-effort, never hard-fails (chat can work anonymously)
# ---------------------------------------------------------------------------

def _get_user_id(request: Request) -> Optional[int]:
    try:
        auth = request.headers.get("authorization", "")
        _, token = get_authorization_scheme_param(auth)
        if not token:
            return None
        payload = jwt.decode(token, options={"verify_signature": False})
        uid = payload.get("id") or payload.get("person_id")
        return int(uid) if uid else None
    except Exception:
        return None


def _session_to_dict(s: ChatSession) -> dict:
    return {
        "id":         s.id,
        "token":      s.token,
        "upi":        s.upi,
        "title":      s.title,
        "is_active":  s.is_active,
        "created_at": str(s.created_at),
        "updated_at": str(s.updated_at),
        "messages": [
            {
                "id":         m.id,
                "role":       m.role,
                "content":    m.content,
                "created_at": str(m.created_at),
            }
            for m in (s.messages or [])
        ],
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/sessions", response_model=dict, status_code=201)
async def create_session(
    body: CreateSessionRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Start a new chat session.
    Optionally pin it to a specific UPI so every message in this thread
    has that parcel's data in context.
    """
    user_id = _get_user_id(request)
    title   = body.title or (f"UPI {body.upi}" if body.upi else "New chat")

    session = ChatSession(
        token   = str(uuid.uuid4()),
        user_id = user_id,
        upi     = body.upi,
        title   = title,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    logger.info(f"[chat] New session {session.token} (user={user_id}, upi={body.upi})")
    return _session_to_dict(session)


@router.get("/sessions", response_model=list[dict])
async def list_sessions(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Return all active sessions for the authenticated user."""
    user_id = _get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required to list sessions.")

    result = await db.execute(
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.user_id == user_id, ChatSession.is_active == True)
        .order_by(ChatSession.updated_at.desc())
    )
    sessions = result.scalars().all()
    return [_session_to_dict(s) for s in sessions]


@router.get("/sessions/{session_id}", response_model=dict)
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a session with its full message history."""
    result = await db.execute(
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return _session_to_dict(session)


@router.post("/sessions/{session_id}/message", response_model=dict)
async def send_message(
    session_id: int,
    body: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message in a session and get the AI reply.

    The bot will:
    • Detect a UPI in the message (or use the session-pinned UPI).
    • Fetch GIS mapping + property data for that UPI.
    • Build a system prompt with all the parcel context.
    • Call qwen2.5:1.5b via Ollama.
    • Persist both the user message and the assistant reply.
    • Return the assistant reply alongside the session.
    """
    # --- load session + history ---
    result = await db.execute(
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if not session.is_active:
        raise HTTPException(status_code=400, detail="Session is closed.")

    # Build history list for the model
    history = [
        {"role": m.role, "content": m.content}
        for m in session.messages
        if m.role in ("user", "assistant")
    ]

    # --- run RAG + LLM ---
    try:
        reply, context_snapshot = await run_chat(
            user_message=body.message,
            db=db,
            history=history,
            session_upi=session.upi,
            pdf_context=session.pdf_context,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    # --- persist user message ---
    user_msg = ChatMessage(
        session_id       = session.id,
        role             = "user",
        content          = body.message,
        context_snapshot = None,
    )
    db.add(user_msg)

    # --- persist assistant reply ---
    assistant_msg = ChatMessage(
        session_id       = session.id,
        role             = "assistant",
        content          = reply,
        context_snapshot = context_snapshot,
    )
    db.add(assistant_msg)

    await db.commit()
    await db.refresh(user_msg)
    await db.refresh(assistant_msg)

    return {
        "session_id":    session.id,
        "user_message":  {"id": user_msg.id,      "role": "user",      "content": body.message, "created_at": str(user_msg.created_at)},
        "reply":         {"id": assistant_msg.id, "role": "assistant", "content": reply,         "created_at": str(assistant_msg.created_at)},
        "resolved_upi":  context_snapshot.get("resolved_upi"),
        # Parcel chips are only shown when the user uploads a PDF in the chat.
        # The message endpoint never returns chips to protect other users' UPI privacy.
        "parcels": [],
    }


@router.delete("/sessions/{session_id}", status_code=200)
async def close_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Soft-close a session (marks is_active = False, keeps history)."""
    result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    session.is_active = False
    await db.commit()
    return {"message": "Session closed.", "session_id": session_id}


@router.post("/sessions/{session_id}/upload-pdf", response_model=dict)
async def upload_pdf_to_session(
    session_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    request: Request = None,
):
    """
    Upload a PDF land certificate to a chat session.
    Delegates to the existing /api/mappings/verify-pdf logic (verify_pdf function),
    stores the result as the session's pdf_context, and returns the parcel data
    so the frontend can show a chip and fly-to on the map.
    """
    from api.routes.mapping_routes import verify_pdf

    # --- load session ---
    stmt = select(ChatSession).where(ChatSession.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if not session.is_active:
        raise HTTPException(status_code=400, detail="Session is closed.")

    # --- delegate to the existing verify_pdf endpoint ---
    try:
        preview = await verify_pdf(file=file, db=db, request=request)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"PDF processing failed: {exc}")

    # verify_pdf returns a plain dict (or raises on hard error)
    if isinstance(preview, dict):
        data = preview
    else:
        # JSONResponse fallback
        import json as _json
        data = _json.loads(preview.body)

    canonical_upi = (data.get("upi") or "").strip()
    if not canonical_upi:
        return {
            "success": False,
            "message": "Could not extract a UPI from the uploaded PDF. Please make sure it is a valid land certificate.",
            "parcel": None,
        }

    # --- Build pdf_context from verify_pdf's mapping_preview fields ---
    pdf_ctx = {
        "upi":                       canonical_upi,
        "official_registry_polygon": data.get("official_registry_polygon"),
        "document_detected_polygon": data.get("document_detected_polygon"),
        "latitude":                  data.get("latitude"),
        "longitude":                 data.get("longitude"),
        "parcel_area_sqm":           data.get("parcel_area_sqm"),
        "province":                  data.get("province"),
        "district":                  data.get("district"),
        "sector":                    data.get("sector"),
        "cell":                      data.get("cell"),
        "village":                   data.get("village"),
        "full_address":              data.get("full_address"),
        "land_use_type":             data.get("land_use_type"),
        "tenure_type":               data.get("tenure_type"),
        "under_mortgage":            data.get("under_mortgage") or False,
        "has_caveat":                data.get("has_caveat") or False,
        "in_transaction":            data.get("in_transaction") or False,
        "has_building":              data.get("has_building") or False,
        "approval_date":             data.get("approval_date"),
        "for_sale":                  data.get("for_sale", False),
        "price":                     data.get("price"),
        "already_registered":        data.get("already_registered", False),
        "property":                  data.get("property"),
        "filename":                  file.filename,
    }

    # --- Persist on session ---
    session.pdf_context = pdf_ctx
    if not session.title or session.title.startswith("New chat"):
        session.title = f"Certificate {canonical_upi}"
    await db.commit()

    # --- Parcel chip response (same shape as map parcels) ---
    has_condition = bool(
        pdf_ctx["under_mortgage"] or pdf_ctx["has_caveat"] or pdf_ctx["in_transaction"]
    )
    parcel_out = {
        "upi":             canonical_upi,
        "polygon":         pdf_ctx["official_registry_polygon"],
        "lat":             pdf_ctx["latitude"],
        "lon":             pdf_ctx["longitude"],
        "for_sale":        pdf_ctx["for_sale"],
        "price":           pdf_ctx["price"],
        "under_mortgage":  pdf_ctx["under_mortgage"],
        "has_caveat":      pdf_ctx["has_caveat"],
        "in_transaction":  pdf_ctx["in_transaction"],
        "overlaps":        False,
        "property_id":     None,
        "has_condition":   has_condition,
        "district":        pdf_ctx["district"],
        "sector":          pdf_ctx["sector"],
        "land_use_type":   pdf_ctx["land_use_type"],
        "parcel_area_sqm": pdf_ctx["parcel_area_sqm"],
    }

    return {
        "success": True,
        "message": f"Certificate for {canonical_upi} loaded. Ask me anything about this parcel.",
        "parcel": parcel_out,
        "session_id": session_id,
        # pass the full verify-pdf preview so the frontend can use it for the map too
        "mapping_preview": data,
    }
