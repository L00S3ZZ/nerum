"""Shared slowapi rate limiter + key functions.

Storage is IN-MEMORY (no Redis in the stack yet): counters live per-process, so
with ``uvicorn --workers 2`` the effective ceiling is ~2x each configured limit
and state resets on restart. Good enough as an abuse backstop today; point
``storage_uri`` at ``redis://`` (and add a redis service) for exact, shared limits.

Client IP: the app sits behind nginx, which sets ``X-Real-IP`` to the real
connecting IP and OVERWRITES any client-supplied value. The backend port is
private to nginx (127.0.0.1:8000), so ``X-Real-IP`` cannot be forged by a caller.
We deliberately do NOT trust the first hop of ``X-Forwarded-For`` (client-supplied
and therefore spoofable).
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def client_ip(request: Request) -> str:
    """Trustworthy client IP in this stack: nginx's X-Real-IP, else socket peer."""
    xri = request.headers.get("X-Real-IP")
    if xri:
        return xri.strip()
    return get_remote_address(request)


def ip_key(request: Request) -> str:
    return client_ip(request)


def email_key(request: Request) -> str:
    """Per-email bucket; falls back to IP when no email was captured on the request."""
    email = (getattr(request.state, "rl_email", "") or "").strip()
    return f"email:{email}" if email else f"ip:{client_ip(request)}"


def ip_email_key(request: Request) -> str:
    """Composite IP+email bucket (both must match to share a counter)."""
    email = (getattr(request.state, "rl_email", "") or "").strip()
    return f"{client_ip(request)}|{email}"


def webhook_key_key(request: Request) -> str:
    """Per-webhook-key bucket — NOT per-IP, since legit callers may share NAT/IPs."""
    key = request.path_params.get("webhook_key", "")
    return f"whk:{key}" if key else f"ip:{client_ip(request)}"


def user_key(request: Request) -> str:
    """Per-authenticated-user bucket; falls back to IP if the user wasn't captured."""
    uid = getattr(request.state, "rl_user", None)
    return f"user:{uid}" if uid else f"ip:{client_ip(request)}"


limiter = Limiter(key_func=client_ip, storage_uri="memory://")
