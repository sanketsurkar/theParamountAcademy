"""Where uploaded files live.

- Locally: the uploads/ folder.
- Online: Supabase Storage (a private bucket). Free hosts like Render wipe their disk on every
  restart, so files must not be kept on the server itself.

Use it as:  from .storage import files;  files.save(key, data, content_type)
"""
import logging

import httpx

from .config import STORAGE_BUCKET, SUPABASE_SERVICE_KEY, SUPABASE_URL, UPLOAD_DIR

log = logging.getLogger("storage")


class LocalStorage:
    name = "local folder"

    def setup(self) -> None:
        UPLOAD_DIR.mkdir(exist_ok=True)

    def save(self, key: str, data: bytes, content_type: str) -> None:
        UPLOAD_DIR.mkdir(exist_ok=True)
        (UPLOAD_DIR / key).write_bytes(data)

    def read(self, key: str) -> bytes | None:
        path = UPLOAD_DIR / key
        return path.read_bytes() if path.is_file() else None

    def delete(self, key: str) -> None:
        (UPLOAD_DIR / key).unlink(missing_ok=True)


class SupabaseStorage:
    name = "Supabase Storage"

    def __init__(self, url: str, service_key: str, bucket: str, transport: httpx.BaseTransport | None = None):
        self.bucket = bucket
        self.client = httpx.Client(
            base_url=f"{url}/storage/v1",
            headers={"Authorization": f"Bearer {service_key}", "apikey": service_key},
            timeout=httpx.Timeout(60.0, connect=10.0),
            transport=transport,
        )

    def setup(self) -> None:
        """Create the private bucket if it doesn't exist yet."""
        r = self.client.get(f"/bucket/{self.bucket}")
        if r.status_code == 200:
            return
        r = self.client.post("/bucket", json={"id": self.bucket, "name": self.bucket, "public": False})
        if r.status_code >= 400 and "already exists" not in r.text.lower():
            raise RuntimeError(f"Could not create storage bucket '{self.bucket}': {r.status_code} {r.text}")
        log.info("Created storage bucket %s", self.bucket)

    def save(self, key: str, data: bytes, content_type: str) -> None:
        r = self.client.post(f"/object/{self.bucket}/{key}", content=data,
                             headers={"Content-Type": content_type, "x-upsert": "true"})
        if r.status_code >= 400:
            raise RuntimeError(f"Upload to storage failed: {r.status_code} {r.text}")

    def read(self, key: str) -> bytes | None:
        r = self.client.get(f"/object/{self.bucket}/{key}")
        if r.status_code == 200:
            return r.content
        if r.status_code not in (400, 404):
            log.warning("Storage read %s -> %s %s", key, r.status_code, r.text[:200])
        return None

    def delete(self, key: str) -> None:
        r = self.client.request("DELETE", f"/object/{self.bucket}", json={"prefixes": [key]})
        if r.status_code >= 400:
            log.warning("Storage delete %s -> %s %s", key, r.status_code, r.text[:200])


backend = (SupabaseStorage(SUPABASE_URL, SUPABASE_SERVICE_KEY, STORAGE_BUCKET)
           if SUPABASE_URL and SUPABASE_SERVICE_KEY else LocalStorage())


def use(new_backend) -> None:
    """Swap the storage backend (used by tests)."""
    global backend
    backend = new_backend


class _Files:
    def __getattr__(self, item):
        return getattr(backend, item)


files = _Files()
