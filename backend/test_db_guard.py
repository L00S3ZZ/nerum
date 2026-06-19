"""One-off guard test for the Database Soldier (Part 2).

Calls ToolExecutor._query_database directly (no Commander / no LLM) against
connection_id=2 ("Test Postgres", allow_write=false, allow_delete=false), and
ALSO calls db_guard.guard_sql directly so we can separate two concerns:

  * GUARD layer  — pure Python, needs no database. This is the real test of
    classification + multi-statement rejection + LIMIT clamping.
  * EXECUTOR path — the full method, which first looks up the connection in the
    app DB, decrypts creds, guards, then tries the *external* Postgres. Since the
    external Postgres (localhost:5432, fake creds) is unreachable, a guard-PASS
    case that then fails to connect is still a PASS for guard-testing — we label
    the layer so connection reachability isn't confused with guard correctness.

Run:  docker compose exec backend python3 test_db_guard.py
"""
import asyncio

from agent.tools import db_guard
from agent.tools.executor import ToolExecutor

CONNECTION_ID = 2
ALLOW_WRITE = False
ALLOW_DELETE = False

# (label, sql, expected_guard, clamp_check)
CASES = [
    ("1", "SELECT 1", "ALLOWED", False),
    ("2", "INSERT INTO foo VALUES (1)", "REJECTED", False),
    ("3", "DELETE FROM foo", "REJECTED", False),
    ("4", "SELECT 1; DROP TABLE users;", "REJECTED", False),
    ("5", "SELECT * FROM big_table LIMIT 999999", "ALLOWED", True),
]


async def _owner_user_id(conn_id: int):
    """Find which user owns the connection so the executor's ownership scope
    matches. Returns None if the app DB is unreachable or the row is missing."""
    try:
        from sqlalchemy import select

        from core.database import AsyncSessionLocal
        from models.models import UserDbConnection

        async with AsyncSessionLocal() as db:
            row = (
                await db.scalars(
                    select(UserDbConnection).where(UserDbConnection.id == conn_id)
                )
            ).first()
            return row.user_id if row else None
    except Exception as exc:  # noqa: BLE001
        print(f"    (note: app DB lookup failed: {type(exc).__name__})")
        return None


def _layer(res: dict) -> str:
    """Classify which layer the executor ACTUALLY reached, derived solely from the
    executor's returned envelope — never inferred from the standalone guard call.
    Order mirrors _query_database: lookup -> decrypt -> guard -> connect/execute."""
    if res.get("success"):
        return "EXECUTED (external DB reachable)"
    err = res.get("error") or ""
    if "not found" in err or "Could not load" in err or "disabled" in err:
        return "APP-DB lookup (connection row)"
    if "credentials" in err:
        return "DECRYPT"
    if ("require allow_" in err or "Multiple SQL statements" in err
            or "Could not determine" in err or "could not be safely analysed" in err):
        return "GUARD (executor rejected before execution)"
    if "exceeded" in err and "limit" in err:
        return "CONNECTION (timeout)"
    if "query failed" in err:
        return "CONNECTION (external DB unreachable)"
    return f"OTHER: {err}"


async def main():
    print("=" * 78)
    print(f"Nerum DB Guard test — connection_id={CONNECTION_ID} "
          f"(allow_write={ALLOW_WRITE}, allow_delete={ALLOW_DELETE})")
    print("=" * 78)

    user_id = await _owner_user_id(CONNECTION_ID)
    if user_id is None:
        print("WARNING: could not resolve the owner of connection_id=2 from the app DB.")
        print("         GUARD-layer results below are still valid (pure Python).")
        print("         The EXECUTOR path will report the APP-DB layer instead of CONNECTION.\n")
        user_id = 0  # executor lookup will simply miss; guard results stand alone

    ex = ToolExecutor(user_id=user_id, db=None, credentials={})

    passed = 0
    for label, sql, expected, clamp_check in CASES:
        # ── GUARD layer (no DB) ─────────────────────────────────────────────
        v = db_guard.guard_sql(sql, ALLOW_WRITE, ALLOW_DELETE)
        guard_allowed = v["allowed"]
        guard_word = "ALLOWED" if guard_allowed else "REJECTED"
        ok = (guard_word == expected)

        clamp_note = ""
        if clamp_check:
            out_q = v.get("query") or ""
            clamp_ok = ("LIMIT 1000" in out_q) and ("999999" not in out_q)
            ok = ok and clamp_ok
            clamp_note = (
                f"\n    CLAMP:    {'OK' if clamp_ok else 'FAIL'} — "
                f"rewritten query = {out_q!r}"
            )

        # ── EXECUTOR path (full method) ─────────────────────────────────────
        res = await ex._query_database(
            {"connection_id": CONNECTION_ID, "query": sql, "params": []}
        )
        layer = _layer(res)

        status = "PASS" if ok else "FAIL"
        if ok:
            passed += 1
        print(f"[Case {label}] {sql}")
        print(f"    GUARD:    {guard_word} ({v['operation_type']})   "
              f"expected {expected}   -> {status}")
        if v.get("reason"):
            print(f"    reason:   {v['reason']}")
        print(f"    EXECUTOR: layer={layer} | success={res.get('success')} | "
              f"error={res.get('error')!r}")
        if res.get("success"):
            r = res.get("result") or {}
            print(f"    result:   operation_type={r.get('operation_type')} "
                  f"row_count={r.get('row_count')}")
        if clamp_note:
            print(clamp_note)
        print()

    print("-" * 78)
    print(f"SUMMARY (guard correctness): {passed}/{len(CASES)} PASS")
    print("-" * 78)


if __name__ == "__main__":
    asyncio.run(main())
