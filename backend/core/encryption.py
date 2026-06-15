"""AES-256-GCM encryption for stored integration credentials.

Ported from V1 (security/encryption.py). ENCRYPTION_KEY is a 64-char hex string
(32 bytes). Token format: base64(nonce[12] + ciphertext).
"""
import base64
import json
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from core.config import settings

_key_hex = settings.ENCRYPTION_KEY
if len(_key_hex) != 64:
    raise ValueError("ENCRYPTION_KEY must be a 64-character hex string (32 bytes)")
_KEY = bytes.fromhex(_key_hex)


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
