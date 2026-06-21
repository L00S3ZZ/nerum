"""Async SQLAlchemy engine + session. Supabase only — no SQLite fallback."""
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from core.config import settings

# Normalise to the asyncpg driver no matter how DATABASE_URL is written.
DATABASE_URL = settings.DATABASE_URL
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=False,
    connect_args={
        # Supabase routes through pgbouncer, which doesn't support prepared
        # statements. Disable both asyncpg's cache and SQLAlchemy's.
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    },
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    """Request-scoped session. Commits on success, rolls back on error."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# Columns added in V2 that don't exist in the original V1/Supabase schema.
# Applied idempotently after create_all so existing data is never touched.
_MIGRATIONS = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR",
    "ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS purpose VARCHAR DEFAULT 'verify'",
    "ALTER TABLE workflows ADD COLUMN IF NOT EXISTS webhook_key VARCHAR",
    "CREATE UNIQUE INDEX IF NOT EXISTS ix_workflows_webhook_key ON workflows (webhook_key)",
]


async def init_db() -> None:
    """Create all tables + apply additive migrations. Raises if DB unreachable."""
    import models.models  # noqa: F401 — register mapped classes on Base.metadata

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for stmt in _MIGRATIONS:
            try:
                await conn.execute(text(stmt))
            except Exception as exc:  # one bad migration shouldn't abort the rest
                print(f"[nerum] migration skipped: {stmt.split('ADD COLUMN')[0].strip()} … ({exc})")
    # Backfill runs AFTER the column+index migration above has committed.
    await _backfill_webhook_keys()


async def _backfill_webhook_keys() -> None:
    """One-time, idempotent: give pre-existing workflows a webhook_key.

    Rows created before the webhook_key column existed have NULL keys. Under the
    indexed /webhooks/receive lookup a NULL key simply never matches (no 500, no
    misroute) — those workflows are just unreachable until keyed. Assign each NULL
    row a fresh token_urlsafe(32). Only NULL rows are touched, so every later boot
    is a no-op. A failure here is logged, never blocks startup.
    """
    import secrets

    async with AsyncSessionLocal() as session:
        try:
            ids = (
                await session.execute(
                    text("SELECT id FROM workflows WHERE webhook_key IS NULL")
                )
            ).scalars().all()
            for wid in ids:
                await session.execute(
                    text("UPDATE workflows SET webhook_key = :k WHERE id = :id"),
                    {"k": secrets.token_urlsafe(32), "id": wid},
                )
            if ids:
                await session.commit()
                print(f"[nerum] backfilled webhook_key for {len(ids)} workflow(s)")
        except Exception as exc:  # backfill must never block boot
            print(f"[nerum] webhook_key backfill skipped: {exc}")
