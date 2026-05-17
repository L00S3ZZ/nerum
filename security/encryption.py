from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os, json, base64

ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY", "")

def encrypt_data(data: dict) -> str:
    key = bytes.fromhex(ENCRYPTION_KEY)
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    plaintext = json.dumps(data).encode()
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)
    return base64.b64encode(nonce + ciphertext).decode()

def decrypt_data(encrypted: str) -> dict:
    key = bytes.fromhex(ENCRYPTION_KEY)
    aesgcm = AESGCM(key)
    raw = base64.b64decode(encrypted)
    nonce, ciphertext = raw[:12], raw[12:]
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return json.loads(plaintext)
