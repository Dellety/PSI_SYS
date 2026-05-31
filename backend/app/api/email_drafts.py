from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.email_draft import EmailDraft
from app.models.employee import Employee
from app.core.deps import get_current_user
from app.schemas.email_draft import EmailDraftCreate, EmailDraftUpdate, EmailDraftResponse
from app.services.email_service import send_email

router = APIRouter()


@router.get("")
def list_email_drafts(
    status_filter: int | None = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """List email drafts, optionally filtered by status (1=pending, 2=sent, 3=cancelled)."""
    query = db.query(EmailDraft)
    if status_filter is not None:
        query = query.filter(EmailDraft.status == status_filter)
    drafts = query.order_by(EmailDraft.created_at.desc()).all()
    return [EmailDraftResponse.model_validate(d).model_dump() for d in drafts]


@router.get("/order/{order_id}")
def get_order_email_drafts(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Get all email drafts for a specific order."""
    drafts = (
        db.query(EmailDraft)
        .filter(EmailDraft.order_id == order_id)
        .order_by(EmailDraft.created_at.desc())
        .all()
    )
    return [EmailDraftResponse.model_validate(d).model_dump() for d in drafts]


@router.get("/{draft_id}")
def get_email_draft(
    draft_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Get a single email draft."""
    draft = db.query(EmailDraft).filter(EmailDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="邮件草稿不存在")
    return EmailDraftResponse.model_validate(draft).model_dump()


@router.post("", status_code=status.HTTP_201_CREATED)
def create_email_draft(
    data: EmailDraftCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Create an email draft."""
    draft = EmailDraft(
        trigger_event=data.trigger_event,
        order_id=data.order_id,
        recipient=data.recipient,
        cc=data.cc,
        subject=data.subject,
        body=data.body,
        status=1,
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return EmailDraftResponse.model_validate(draft).model_dump()


@router.put("/{draft_id}")
def update_email_draft(
    draft_id: int,
    data: EmailDraftUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Edit an email draft (only if status is pending=1)."""
    draft = db.query(EmailDraft).filter(EmailDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="邮件草稿不存在")
    if draft.status != 1:
        raise HTTPException(status_code=400, detail="只能编辑待确认状态的草稿")

    if data.recipient is not None:
        draft.recipient = data.recipient
    if data.cc is not None:
        draft.cc = data.cc
    if data.subject is not None:
        draft.subject = data.subject
    if data.body is not None:
        draft.body = data.body

    db.commit()
    db.refresh(draft)
    return EmailDraftResponse.model_validate(draft).model_dump()


@router.post("/{draft_id}/send")
def send_email_draft(
    draft_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Send an email draft."""
    draft = db.query(EmailDraft).filter(EmailDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="邮件草稿不存在")
    if draft.status != 1:
        raise HTTPException(status_code=400, detail="只能发送待确认状态的草稿")

    # Attempt to send via SMTP (no-op if not configured)
    send_email(db, draft.recipient, draft.subject, draft.body, draft.cc)

    draft.status = 2
    draft.sent_at = datetime.now()
    draft.sent_by = current_user.id
    db.commit()
    db.refresh(draft)
    return EmailDraftResponse.model_validate(draft).model_dump()


@router.put("/{draft_id}/cancel")
def cancel_email_draft(
    draft_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Cancel an email draft."""
    draft = db.query(EmailDraft).filter(EmailDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="邮件草稿不存在")
    if draft.status != 1:
        raise HTTPException(status_code=400, detail="只能取消待确认状态的草稿")

    draft.status = 3
    db.commit()
    db.refresh(draft)
    return EmailDraftResponse.model_validate(draft).model_dump()
