import uuid

import filetype
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import storage
from app.config import get_settings
from app.database import get_db
from app.models import Note, NoteStatus
from app.pipeline import run_pipeline
from app.schemas import NoteDetail, NoteListItem, NoteRename

router = APIRouter(prefix="/notes", tags=["notes"])
settings = get_settings()

ALLOWED_EXTENSIONS = {"wav", "mp3", "mp4", "flac", "ogg", "opus", "m4a", "aac", "webm", "amr"}


@router.post("", response_model=NoteDetail, status_code=201)
async def upload_note(
    background_tasks: BackgroundTasks,
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
):
    file_bytes = await file.read()

    if len(file_bytes) > settings.max_upload_bytes:
        raise HTTPException(status_code=400, detail="file exceeds the 10MB limit")

    extension = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"unsupported file extension: .{extension}")

    guessed = filetype.guess(file_bytes)
    if guessed is None or not (guessed.mime.startswith("audio/") or guessed.mime.startswith("video/")):
        raise HTTPException(status_code=400, detail="file doesn't look like a valid audio file")

    note = Note(
        id=uuid.uuid4(),
        original_filename=file.filename,
        storage_path="",
        status=NoteStatus.uploaded,
    )
    note.storage_path = f"{note.id}.{extension}"

    try:
        storage.upload_audio(note.storage_path, file_bytes, file.content_type)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"failed to store file: {exc}") from exc

    db.add(note)
    await db.commit()
    await db.refresh(note)

    background_tasks.add_task(run_pipeline, note.id, note.original_filename, file_bytes, file.content_type)

    return NoteDetail.model_validate(note)


@router.get("", response_model=list[NoteListItem])
async def list_notes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Note).order_by(Note.created_at.desc()))
    return result.scalars().all()


@router.get("/{note_id}", response_model=NoteDetail)
async def get_note(note_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    note = await db.get(Note, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="note not found")

    detail = NoteDetail.model_validate(note)
    try:
        detail.playback_url = storage.get_signed_url(note.storage_path)
    except Exception:
        detail.playback_url = None
    return detail


@router.patch("/{note_id}", response_model=NoteDetail)
async def rename_note(note_id: uuid.UUID, body: NoteRename, db: AsyncSession = Depends(get_db)):
    note = await db.get(Note, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="note not found")

    new_name = body.original_filename.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="name can't be empty")

    note.original_filename = new_name
    await db.commit()
    await db.refresh(note)
    return NoteDetail.model_validate(note)


@router.delete("/{note_id}", status_code=204)
async def delete_note(note_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    note = await db.get(Note, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="note not found")

    try:
        storage.delete_audio(note.storage_path)
    except Exception:
        pass

    await db.delete(note)
    await db.commit()
