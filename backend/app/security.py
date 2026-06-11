import base64
import hashlib
import hmac
import json
import secrets
import time

from .config import ACCESS_TOKEN_EXPIRE_MINUTES, SECRET_KEY


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    if not stored or "$" not in stored:
        return False
    salt, digest = stored.split("$", 1)
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
    return hmac.compare_digest(candidate.hex(), digest)


# Компактная реализация JWT HS256 без внешних зависимостей

def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def _sign(message: bytes) -> str:
    return _b64url(hmac.new(SECRET_KEY.encode(), message, hashlib.sha256).digest())


def create_access_token(user_id: int, role: str) -> str:
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = _b64url(json.dumps({
        "sub": str(user_id),
        "role": role,
        "exp": int(time.time()) + ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "iat": int(time.time()),
    }).encode())
    message = f"{header}.{payload}"
    return f"{message}.{_sign(message.encode())}"


def decode_token(token: str) -> dict | None:
    try:
        header, payload, signature = token.split(".")
        if not hmac.compare_digest(signature, _sign(f"{header}.{payload}".encode())):
            return None
        claims = json.loads(_b64url_decode(payload))
        if claims.get("exp", 0) < time.time():
            return None
        return claims
    except (ValueError, json.JSONDecodeError):
        return None
