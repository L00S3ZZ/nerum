"""User database connections — connect / list / update / delete / test.

Part 1 of the DB-integrations feature (see .claude/skills/nerum-db-integrations):
storage + CRUD only. The query_database agent tool and ToolExecutor wiring come
later and are intentionally NOT here.

Credentials are AES-256-GCM encrypted (core.encryption) before they touch the DB,
exactly like UserIntegration. Raw credentials are NEVER returned to the client —
list/detail responses are masked, and the /test endpoint returns only a
success/error boolean with a sanitized message (no host, port, or secret leaks).

Every query is scoped to the current user; a user can only see or act on their
own connections.
"""
import asyncio
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.encryption import decrypt_data, encrypt_data, mask_credentials
from core.security import get_current_user
from models.models import User, UserDbConnection

router = APIRouter()

SUPPORTED_DB_TYPES = ["postgresql", "mysql", "mongodb"]

# The /test endpoint is the only place Part 1 touches a real external DB. The
# skill's 10-second rule applies even here.
TEST_TIMEOUT = 10

# Default ports per engine, used when the user didn't supply one.
_DEFAULT_PORT = {"postgresql": 5432, "mysql": 3306, "mongodb": 27017}


class DbConnBody(BaseModel):
    name: str
    db_type: str                      # must be in SUPPORTED_DB_TYPES
    credentials: dict                 # {host, port, user, password, database, ...} or {uri}
    allow_write: bool = False
    allow_delete: bool = False


class DbConnUpdate(BaseModel):
    """All fields optional — only what's provided is changed."""
    name: str | None = None
    credentials: dict | None = None   # rotate creds; omit to keep existing
    allow_write: bool | None = None
    allow_delete: bool | None = None
    is_active: bool | None = None


async def _get_owned(db: AsyncSession, user_id: int, conn_id: int) -> UserDbConnection:
    """Fetch a connection that belongs to this user, or 404. Never leaks the
    existence of another user's row."""
    row = (
        await db.scalars(
            select(UserDbConnection).where(
                UserDbConnection.id == conn_id,
                UserDbConnection.user_id == user_id,
            )
        )
    ).first()
    if not row:
        raise HTTPException(404, "Connection not found")
    return row


def _public(row: UserDbConnection) -> dict:
    """Client-safe view of a connection: metadata + toggles + a MASKED credential
    summary. Never includes raw passwords or URIs."""
    try:
        masked = mask_credentials(decrypt_data(row.encrypted_credentials))
    except Exception:  # noqa: BLE001 — a corrupt blob must not break listing
        masked = {}
    return {
        "id": row.id,
        "name": row.name,
        "db_type": row.db_type,
        "allow_write": row.allow_write,
        "allow_delete": row.allow_delete,
        "is_active": row.is_active,
        "credentials_masked": masked,
        "created_at": row.created_at,
        "last_used_at": row.last_used_at,
    }


@router.get("")
async def list_connections(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.scalars(
            select(UserDbConnection)
            .where(UserDbConnection.user_id == user.id)
            .order_by(UserDbConnection.id.desc())
        )
    ).all()
    return {"connections": [_public(r) for r in rows]}


@router.post("")
async def create_connection(
    body: DbConnBody,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.db_type not in SUPPORTED_DB_TYPES:
        raise HTTPException(400, f"Unsupported db_type. Use one of: {', '.join(SUPPORTED_DB_TYPES)}")
    if not body.name.strip():
        raise HTTPException(400, "name is required")
    if not body.credentials:
        raise HTTPException(400, "credentials are required")

    row = UserDbConnection(
        user_id=user.id,
        name=body.name.strip(),
        db_type=body.db_type,
        encrypted_credentials=encrypt_data(body.credentials),
        allow_write=body.allow_write,
        allow_delete=body.allow_delete,
        is_active=True,
    )
    db.add(row)
    await db.flush()  # assign row.id before we build the response
    return _public(row)


@router.patch("/{conn_id}")
async def update_connection(
    conn_id: int,
    body: DbConnUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await _get_owned(db, user.id, conn_id)

    if body.name is not None:
        if not body.name.strip():
            raise HTTPException(400, "name cannot be empty")
        row.name = body.name.strip()
    if body.credentials is not None:  # rotate
        if not body.credentials:
            raise HTTPException(400, "credentials cannot be empty when provided")
        row.encrypted_credentials = encrypt_data(body.credentials)
    if body.allow_write is not None:
        row.allow_write = body.allow_write
    if body.allow_delete is not None:
        row.allow_delete = body.allow_delete
    if body.is_active is not None:
        row.is_active = body.is_active

    return _public(row)


@router.delete("/{conn_id}")
async def delete_connection(
    conn_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await _get_owned(db, user.id, conn_id)
    await db.delete(row)
    return {"success": True, "id": conn_id}


@router.post("/{conn_id}/test")
async def test_connection(
    conn_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Open a connection, run a trivial liveness check (SELECT 1 / ping), close.

    Returns {"success": bool, "error": str | None}. Never raises out, never leaks
    host/port/credential details — the error is a sanitized, fixed message.
    """
    row = await _get_owned(db, user.id, conn_id)
    try:
        creds = decrypt_data(row.encrypted_credentials)
    except Exception:  # noqa: BLE001
        return {"success": False, "error": "Stored credentials could not be read."}

    try:
        await asyncio.wait_for(_run_liveness(row.db_type, creds), timeout=TEST_TIMEOUT)
    except asyncio.TimeoutError:
        return {"success": False, "error": f"Connection timed out after {TEST_TIMEOUT}s."}
    except Exception:  # noqa: BLE001 — sanitized; original may contain host/creds
        return {
            "success": False,
            "error": "Connection failed — check the host, port, credentials, "
                     "and that the database accepts remote connections.",
        }

    # Best-effort usage stamp; commit handled by get_db.
    row.last_used_at = datetime.utcnow()
    return {"success": True, "error": None}


# ── per-driver liveness checks (lazy imports so a missing driver can't break
#    module import; connections are short-lived and always closed) ───────────
async def _run_liveness(db_type: str, creds: dict) -> None:
    if db_type == "postgresql":
        await _test_postgres(creds)
    elif db_type == "mysql":
        await _test_mysql(creds)
    elif db_type == "mongodb":
        await _test_mongo(creds)
    else:
        raise ValueError("unsupported db_type")


async def _test_postgres(creds: dict) -> None:
    import asyncpg

    if creds.get("uri"):
        conn = await asyncpg.connect(dsn=creds["uri"], timeout=TEST_TIMEOUT)
    else:
        conn = await asyncpg.connect(
            host=creds.get("host"),
            port=int(creds.get("port") or _DEFAULT_PORT["postgresql"]),
            user=creds.get("user"),
            password=creds.get("password"),
            database=creds.get("database"),
            ssl=creds.get("ssl"),
            timeout=TEST_TIMEOUT,
        )
    try:
        await conn.fetchval("SELECT 1")
    finally:
        await conn.close()


async def _test_mysql(creds: dict) -> None:
    import asyncmy

    conn = await asyncmy.connect(
        host=creds.get("host"),
        port=int(creds.get("port") or _DEFAULT_PORT["mysql"]),
        user=creds.get("user"),
        password=creds.get("password") or "",
        database=creds.get("database"),
        connect_timeout=TEST_TIMEOUT,
    )
    try:
        async with conn.cursor() as cur:
            await cur.execute("SELECT 1")
            await cur.fetchone()
    finally:
        conn.close()


async def _test_mongo(creds: dict) -> None:
    from motor.motor_asyncio import AsyncIOMotorClient

    uri = creds.get("uri")
    if uri:
        client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=TEST_TIMEOUT * 1000)
    else:
        client = AsyncIOMotorClient(
            host=creds.get("host"),
            port=int(creds.get("port") or _DEFAULT_PORT["mongodb"]),
            username=creds.get("user"),
            password=creds.get("password"),
            serverSelectionTimeoutMS=TEST_TIMEOUT * 1000,
        )
    try:
        await client.admin.command("ping")
    finally:
        client.close()
