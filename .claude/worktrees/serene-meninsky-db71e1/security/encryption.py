import os
import json
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _get_key() -> bytes:
    hex_key = os.environ.get("ENCRYPTION_KEY")
    if not hex_key:
        raise RuntimeError("ENCRYPTION_KEY env var is not set")
    try:
        key = bytes.fromhex(hex_key.strip())
    except ValueError as e:
        raise RuntimeError("ENCRYPTION_KEY must be a hex string") from e
    if len(key) != 32:
        raise RuntimeError(
            f"ENCRYPTION_KEY must be 32 bytes (64 hex chars), got {len(key)}"
        )
    return key


def encrypt_credentials(data: dict) -> str:
    """AES-256-GCM encrypt a dict. Returns base64 of nonce(12) + ciphertext+tag."""
    aes = AESGCM(_get_key())
    nonce = os.urandom(12)
    plaintext = json.dumps(data).encode("utf-8")
    ct = aes.encrypt(nonce, plaintext, None)
    return base64.b64encode(nonce + ct).decode("ascii")


def decrypt_credentials(blob: str) -> dict:
    """Reverse of encrypt_credentials. Raises on tamper or wrong key."""
    raw = base64.b64decode(blob)
    nonce, ct = raw[:12], raw[12:]
    aes = AESGCM(_get_key())
    plaintext = aes.decrypt(nonce, ct, None)
    return json.loads(plaintext.decode("utf-8"))
