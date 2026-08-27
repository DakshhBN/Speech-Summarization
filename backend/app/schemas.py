import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models import NoteStatus


class NoteListItem(BaseModel):
    id: uuid.UUID
    original_filename: str
    status: NoteStatus
    duration_seconds: int | None
    error_message: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class NoteDetail(NoteListItem):
    transcript: str | None
    summary: str | None
    playback_url: str | None = None

    class Config:
        from_attributes = True
