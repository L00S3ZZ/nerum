"""AES-256-GCM encryption for stored integration credentials.

Ported from V1 (security/encryption.py). ENCRYPTION_KEY may be any string: a
64-char hex string is used directly as the 32-byte key, anything else (base64,
arbitrary length) is hashed to 32 bytes via SHA-256. Token format:
base64(nonce[12] + ciphertext).
"""
import base64
import hashlib
import json
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from core.config import settings


def get_key(raw_key: str) -> bytes:
    """Accept any string key and derive 32 bytes from it."""
    # If it's already a valid 64-char hex string, use it directly.
    try:
        if len(raw_key) == 64:
            return bytes.fromhex(raw_key)
    except ValueError:
        pass
    # Otherwise derive 32 bytes via SHA-256.
    return hashlib.sha256(raw_key.encode()).digest()


_KEY = get_key(settings.ENCRYPTION_KEY)


def encrypt_data(data: dict) -> str:
    aesgcm = AESGCM(_KEY)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, json.dumps(data).encode("utf-8"), None)
    return base64.b64encode(nonce + ciphertext).decode("ascii")


def decrypt_data(encrypted: str) -> dict:
    raw = base64.b64decode(encrypted)
    nonce, ciphertext = raw[:12], raw[12:]
    aesgcm = AESGCM(_KEY)
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return json.loads(plaintext.decode("utf-8"))


def mask_credentials(data: dict) -> dict:
    """Mask credential values for safe display."""
    masked: dict = {}
    for key, value in data.items():
        s = str(value)
        masked[key] = "••••••••" if len(s) <= 8 else f"{s[:4]}••••••••{s[-4:]}"
    return masked
