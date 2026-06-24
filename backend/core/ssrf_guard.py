"""SSRF guard for user-supplied database connection targets (M2).

A logged-in user can save a DB connection pointing at ANY host/port, and the
server will dial it — on ``POST /db-connections/{id}/test`` and on every
``query_database`` agent run. Without a guard the backend becomes an SSRF proxy
and a fast internal port scanner: ``localhost``, a Docker service name,
``169.254.169.254`` (cloud metadata), or any internal-only port.

``assert_public_target(host, port)`` RESOLVES the host via real DNS and rejects
it when ANY resolved address is private / loopback / link-local / multicast /
reserved / unspecified, when the host is a known metadata endpoint, or when the
port is a known internal-service port. The address check runs AFTER resolution
(never a bare hostname string match), so a name that resolves to an internal IP
— including DNS-rebinding tricks — is still caught. For that same reason the
caller MUST re-run this on every use, not cache a pass from connection-creation
time: DNS can change between when a connection was saved and when it is used.

KNOWN LIMITATION — ``mongodb+srv://`` (MongoDB Atlas): an Atlas URI such as
``mongodb+srv://cluster.mongodb.net`` carries NO A/AAAA record on the bare
hostname; the real shard hosts live in ``_mongodb._tcp.<host>`` DNS SRV records.
This guard performs a DIRECT A/AAAA lookup, so ``getaddrinfo`` returns nothing
and the URI is REJECTED. That is fail-CLOSED (safe), not fail-open. Supporting
``+srv`` would require resolving the SRV records first (dnspython); deferred —
no Atlas ``+srv`` connections exist in this codebase today. Plain
``mongodb://host:port`` URIs are unaffected.
"""
from __future__ import annotations

import asyncio
import ipaddress
import socket
from urllib.parse import urlparse

# Hostnames that must never be dialed regardless of what they resolve to.
_BLOCKED_HOSTNAMES = {"metadata", "metadata.google.internal"}

# Internal-service ports blocked even when the IP itself is public:
# 22 ssh, 23 telnet, 25 smtp, 53 dns, 111 rpcbind, 135/139/445 smb/rpc,
# 2375/2376 docker daemon, 6379 redis, 9200/9300 elasticsearch,
# 8500/8501 consul, 10250/10255 kubelet.
_BLOCKED_PORTS = {
    22, 23, 25, 53, 111, 135, 139, 445,
    2375, 2376, 6379, 9200, 9300, 8500, 8501, 10250, 10255,
}

_RESOLVE_TIMEOUT = 5  # seconds

# Generic, IP-free message so the endpoint can't be used as a DNS/port oracle.
_GENERIC_REJECT = "This host resolves to an internal or reserved address and is not allowed."


class SSRFRejected(Exception):
    """Raised when a target host/port is not a permitted public destination.

    The message is intentionally generic and NEVER contains the resolved IP, so
    a caller can't probe internal infrastructure through the error text.
    """


def _strip_brackets(host: str) -> str:
    h = (host or "").strip()
    if h.startswith("[") and h.endswith("]"):
        h = h[1:-1]
    return h


def _ip_is_blocked(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    # Unwrap IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1) and check the v4 form too.
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
        if _ip_is_blocked(ip.ipv4_mapped):
            return True
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def extract_host_port(creds: dict, default_port: int) -> tuple[str, int]:
    """Pull (host, port) from a {host, port} dict OR a {uri} connection string.

    Both shapes are valid in UserDbConnection.encrypted_credentials. A missing or
    unparseable target yields ("", default_port) — assert_public_target then
    rejects the empty host (fail closed).
    """
    if not isinstance(creds, dict):
        return "", default_port
    uri = creds.get("uri")
    if uri:
        try:
            parsed = urlparse(str(uri))
            host = parsed.hostname or ""
            port = parsed.port or default_port
            return host, int(port)
        except (ValueError, TypeError):
            return "", default_port
    host = str(creds.get("host") or "").strip()
    try:
        port = int(creds.get("port") or default_port)
    except (TypeError, ValueError):
        port = default_port
    return host, port


async def assert_public_target(host: str, port: int) -> None:
    """Raise SSRFRejected unless (host, port) is a permitted public destination.

    Order: cheap structural + port + metadata-hostname checks first, then — only
    if the host isn't already an IP literal — a real DNS resolution whose EVERY
    returned address must be public.
    """
    host = _strip_brackets(host)
    if not host or len(host) > 255 or any(c.isspace() for c in host):
        raise SSRFRejected(_GENERIC_REJECT)

    try:
        port = int(port)
    except (TypeError, ValueError):
        raise SSRFRejected(_GENERIC_REJECT)
    if port < 1 or port > 65535:
        raise SSRFRejected(_GENERIC_REJECT)
    if port in _BLOCKED_PORTS:
        raise SSRFRejected("Connections to this port are not allowed.")

    if host.lower() in _BLOCKED_HOSTNAMES:
        raise SSRFRejected(_GENERIC_REJECT)

    # IP literal? Check directly, no DNS needed.
    try:
        literal = ipaddress.ip_address(host)
    except ValueError:
        literal = None
    if literal is not None:
        if _ip_is_blocked(literal):
            raise SSRFRejected(_GENERIC_REJECT)
        return

    # Hostname → resolve to BOTH A and AAAA (family=0) and check every result.
    loop = asyncio.get_event_loop()
    try:
        infos = await asyncio.wait_for(
            loop.getaddrinfo(host, port, family=0, type=0),
            timeout=_RESOLVE_TIMEOUT,
        )
    except (asyncio.TimeoutError, socket.gaierror, OSError, UnicodeError):
        # Unresolvable or timed out → fail closed.
        raise SSRFRejected(_GENERIC_REJECT)

    if not infos:
        raise SSRFRejected(_GENERIC_REJECT)

    # Round-robin DNS can return several addresses — reject if ANY is internal.
    for info in infos:
        ip_str = info[4][0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            raise SSRFRejected(_GENERIC_REJECT)
        if _ip_is_blocked(ip):
            raise SSRFRejected(_GENERIC_REJECT)
