"""Password hashing with the standard library (PBKDF2-SHA256) - no compiled packages needed."""
import hashlib
import hmac
import secrets
import time
from collections import defaultdict

ITERATIONS = 240_000
_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"  # no 0/o/1/l/i confusion


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), ITERATIONS)
    return f"pbkdf2${ITERATIONS}${salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, iterations, salt, digest = stored.split("$")
        check = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(iterations))
        return hmac.compare_digest(check.hex(), digest)
    except (ValueError, TypeError):
        return False


def temp_password() -> str:
    """Easy-to-read one-time password, e.g. 'k7m2p9'. User must change it on first login."""
    return "".join(secrets.choice(_ALPHABET) for _ in range(6))


def password_problem(pw: str) -> str | None:
    if len(pw) < 8:
        return "Password must be at least 8 characters."
    if pw.isdigit() or pw.isalpha():
        return "Use a mix of letters and numbers."
    return None


class LoginLimiter:
    """Max 5 failed attempts per minute per login ID (in memory - fine for one server)."""

    def __init__(self, limit: int = 5, window: int = 60):
        self.limit, self.window = limit, window
        self.fails: dict[str, list[float]] = defaultdict(list)

    def blocked(self, key: str) -> bool:
        cutoff = time.time() - self.window
        self.fails[key] = [t for t in self.fails[key] if t > cutoff]
        return len(self.fails[key]) >= self.limit

    def fail(self, key: str) -> None:
        self.fails[key].append(time.time())

    def reset(self, key: str) -> None:
        self.fails.pop(key, None)


login_limiter = LoginLimiter()
