"""Client for Gnani's async Batch STT API.

Sync STT caps out at 60s of audio so it's a non-starter for this app.
Everything goes through the batch job lifecycle: create -> start -> poll -> fetch.
"""

import asyncio
import json

import httpx

from app.config import get_settings

settings = get_settings()

TERMINAL_STATUSES = {"COMPLETED", "PARTIAL_FAILURE", "FAILED", "START_FAILED", "CANCELLED"}
SUCCESS_STATUSES = {"COMPLETED", "PARTIAL_FAILURE"}


class GnaniJobFailed(Exception):
    pass


class GnaniJobTimeout(Exception):
    pass


def _headers() -> dict:
    return {"X-API-Key-ID": settings.gnani_api_key}


async def create_job(filename: str, file_bytes: bytes, content_type: str) -> str:
    config = {
        "model": settings.gnani_model,
        "language_code": settings.gnani_language_code,
        "mode": "transcribe",
    }
    async with httpx.AsyncClient(base_url=settings.gnani_base_url, timeout=60) as client:
        response = await client.post(
            "/stt/v3/batch/jobs",
            headers=_headers(),
            data={"config": json.dumps(config)},
            files={"files": (filename, file_bytes, content_type or "application/octet-stream")},
        )
        response.raise_for_status()
        return response.json()["job_id"]


async def start_job(job_id: str) -> None:
    async with httpx.AsyncClient(base_url=settings.gnani_base_url, timeout=30) as client:
        response = await client.post(f"/stt/v3/batch/jobs/{job_id}/start", headers=_headers())
        response.raise_for_status()


async def get_job_status(job_id: str) -> dict:
    async with httpx.AsyncClient(base_url=settings.gnani_base_url, timeout=30) as client:
        response = await client.get(f"/stt/v3/batch/jobs/{job_id}", headers=_headers())
        response.raise_for_status()
        return response.json()


async def get_job_files(job_id: str) -> list[dict]:
    async with httpx.AsyncClient(base_url=settings.gnani_base_url, timeout=30) as client:
        response = await client.get(f"/stt/v3/batch/jobs/{job_id}/files", headers=_headers())
        response.raise_for_status()
        return response.json()["files"]


async def fetch_transcript(transcript_url: str) -> dict:
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.get(transcript_url)
        response.raise_for_status()
        return response.json()


async def transcribe(filename: str, file_bytes: bytes, content_type: str) -> tuple[str, dict]:
    """Runs the full create -> start -> poll -> fetch lifecycle. Returns (job_id, transcript_payload)."""
    job_id = await create_job(filename, file_bytes, content_type)
    await start_job(job_id)

    elapsed = 0
    while elapsed < settings.job_timeout_seconds:
        await asyncio.sleep(settings.job_poll_interval_seconds)
        elapsed += settings.job_poll_interval_seconds

        status_payload = await get_job_status(job_id)
        status = status_payload.get("status")

        if status in TERMINAL_STATUSES:
            if status not in SUCCESS_STATUSES:
                raise GnaniJobFailed(f"gnani job {job_id} ended with status {status}")

            files = await get_job_files(job_id)
            if not files or not files[0].get("transcript_url"):
                raise GnaniJobFailed(f"gnani job {job_id} completed but returned no transcript")

            transcript_payload = await fetch_transcript(files[0]["transcript_url"])
            return job_id, transcript_payload

    raise GnaniJobTimeout(f"gnani job {job_id} did not finish within {settings.job_timeout_seconds}s")
