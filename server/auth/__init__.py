"""JWT authentication for the exo-platform."""

from __future__ import annotations

import hashlib
import hmac
import json
import time
import base64

import config


def hash_password(password: str) -> str:
    salt = "exo-platform-salt"
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000).hex()


def verify_password(password: str, password_hash: str) -> bool:
    return hash_password(password) == password_hash


def create_token(username: str, role: str) -> str:
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip("=")
    payload_data = {
        "sub": username,
        "role": role,
        "exp": time.time() + config.JWT_EXPIRE_MINUTES * 60,
        "iat": time.time(),
    }
    payload = base64.urlsafe_b64encode(json.dumps(payload_data).encode()).decode().rstrip("=")
    signature = hmac.new(config.JWT_SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).hexdigest()
    return f"{header}.{payload}.{signature}"


def verify_token(token: str) -> dict | None:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        header, payload, signature = parts
        expected_sig = hmac.new(config.JWT_SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None

        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += "=" * padding
        payload_data = json.loads(base64.urlsafe_b64decode(payload))

        if payload_data.get("exp", 0) < time.time():
            return None

        return payload_data
    except Exception:
        return None
