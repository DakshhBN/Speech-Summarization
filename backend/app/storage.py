from functools import lru_cache

from supabase import Client, create_client

from app.config import get_settings

settings = get_settings()


@lru_cache
def get_storage_client() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_key)


def upload_audio(storage_path: str, data: bytes, content_type: str) -> None:
    client = get_storage_client()
    client.storage.from_(settings.supabase_bucket).upload(
        storage_path, data, {"content-type": content_type or "application/octet-stream"}
    )


def get_signed_url(storage_path: str, expires_in: int = 3600) -> str:
    client = get_storage_client()
    result = client.storage.from_(settings.supabase_bucket).create_signed_url(storage_path, expires_in)
    return result["signedURL"] if "signedURL" in result else result.get("signed_url", "")
