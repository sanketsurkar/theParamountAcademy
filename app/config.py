"""All settings. Locally nothing needs configuring; online, set the environment variables in DEPLOY.md."""
import os
import secrets
from pathlib import Path

VERSION = "2.0"
BASE_DIR = Path(__file__).resolve().parent.parent
INSTANCE_DIR = BASE_DIR / "instance"
UPLOAD_DIR = BASE_DIR / "uploads"
INSTANCE_DIR.mkdir(exist_ok=True)
UPLOAD_DIR.mkdir(exist_ok=True)

IS_PRODUCTION = os.getenv("APP_ENV", "").lower() == "production"


def _database_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        return f"sqlite:///{INSTANCE_DIR / 'paramount.db'}"
    # Supabase gives "postgresql://..." - tell SQLAlchemy to use the psycopg 3 driver.
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


DATABASE_URL = _database_url()

# File storage: local "uploads/" folder, or Supabase Storage when these are set.
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "").strip()
STORAGE_BUCKET = os.getenv("STORAGE_BUCKET", "academy-files").strip()

# First admin account for a fresh online database (no demo data online).
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")

MAX_UPLOAD_MB = 10
ALLOWED_CONTENT = {".pdf": "application/pdf",
                   ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
ALLOWED_IMAGES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}


def _secret_key() -> str:
    """Session signing key: env var online, otherwise generated once and kept on disk."""
    if os.getenv("SECRET_KEY"):
        return os.environ["SECRET_KEY"]
    if IS_PRODUCTION:
        raise RuntimeError("Set the SECRET_KEY environment variable (a long random string).")
    path = INSTANCE_DIR / "secret.key"
    if not path.exists():
        path.write_text(secrets.token_urlsafe(48))
    return path.read_text().strip()


SECRET_KEY = _secret_key()
SESSION_HOURS = 24 * 30  # students stay signed in for 30 days

STANDARDS = list(range(1, 13))

# Subject look: colour name -> hex, and the icons the admin can pick from.
SUBJECT_COLOURS = {
    "indigo": "#4f46e5", "emerald": "#059669", "amber": "#d97706", "rose": "#e11d48",
    "sky": "#0284c7", "violet": "#7c3aed", "orange": "#ea580c", "teal": "#0d9488",
    "pink": "#db2777", "slate": "#475569",
}
SUBJECT_ICONS = ["📖", "📐", "🔬", "🌍", "🧪", "⚛️", "🧬", "🧮", "💻", "🎨", "🎵", "🏛️", "🗣️", "✏️", "🌱", "📘"]

# Every standard (1-12) starts with these. The admin can add, rename, reorder or remove them later.
DEFAULT_SUBJECTS = [("English", "indigo", "📖"), ("Mathematics", "amber", "📐"), ("Science", "emerald", "🔬")]
