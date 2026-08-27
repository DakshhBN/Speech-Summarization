import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app import gnani_stt, storage
from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models import Note, NoteStatus
from app.summarizer import summarize

logger = logging.getLogger(__name__)
settings = get_settings()


async def run_pipeline(note_id: uuid.UUID, filename: str, file_bytes: bytes, content_type: str) -> None:
    async with AsyncSessionLocal() as db:
        note = await db.get(Note, note_id)
        if note is None:
            return

        note.status = NoteStatus.transcribing
        await db.commit()

        try:
            job_id, transcript_payload = await gnani_stt.transcribe(filename, file_bytes, content_type)
            note.gnani_job_id = job_id
            note.transcript = transcript_payload.get("full_transcript", "")
            duration = transcript_payload.get("duration_seconds")
            note.duration_seconds = int(duration) if duration is not None else None
            note.status = NoteStatus.summarizing
            await db.commit()
        except Exception as exc:
            logger.exception("transcription failed for note %s", note_id)
            note.status = NoteStatus.failed
            note.error_message = f"transcription failed: {exc}"
            await db.commit()
            return

        try:
            note.summary = await summarize(note.transcript)
            note.status = NoteStatus.done
            await db.commit()
        except Exception as exc:
            logger.exception("summarization failed for note %s", note_id)
            note.status = NoteStatus.failed
            note.error_message = f"summarization failed: {exc}"
            await db.commit()


async def recover_stale_notes() -> None:
    """On startup, re-drive any notes that were mid-pipeline when the app last stopped."""
    threshold = datetime.now(timezone.utc) - timedelta(minutes=settings.stale_job_threshold_minutes)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Note).where(
                Note.status.in_([NoteStatus.transcribing, NoteStatus.summarizing]),
                Note.updated_at < threshold,
            )
        )
        stale_notes = result.scalars().all()

        for note in stale_notes:
            logger.info("recovering stale note %s (was %s)", note.id, note.status)
            note.status = NoteStatus.uploaded
            note.error_message = "recovered after restart, retrying"
        await db.commit()

    for note in stale_notes:
        file_bytes = storage.get_storage_client().storage.from_(settings.supabase_bucket).download(
            note.storage_path
        )
        await run_pipeline(note.id, note.original_filename, file_bytes, "application/octet-stream")
