"""Query safety guard for user database integrations (Part 2).

The guard is THE safety layer (see .claude/skills/nerum-db-integrations, Rule 6):
every query is parsed and classified BEFORE execution, and rejected if the
connection's toggles don't permit its operation type. We never rely on the user's
own DB-level permissions as the safeguard.

Two entry points:
  * ``guard_sql(query, allow_write, allow_delete)``   — postgresql / mysql
  * ``guard_mongo(operation, allow_write, allow_delete)`` — mongodb

Both return the same structured verdict and NEVER raise — the caller (the
executor) decides what to do with a rejection:

    {
      "allowed": bool,
      "operation_type": "read" | "write" | "destructive" | "unknown",
      "reason": str | None,           # human-readable rejection reason
      "query": str | None,            # SQL only: the (possibly LIMIT-clamped) text to run
    }

SQL is classified with the ``sqlparse`` tokenizer — never naive ``startswith`` or
regex keyword matching, and never by splitting on ``;`` (semicolons can appear in
string literals; ``sqlparse.split`` respects real statement boundaries).
"""
import sqlparse
from sqlparse import tokens as T

MAX_ROWS = 1000

# ── SQL operation keyword sets (compared against tokenizer Keyword tokens) ───
_READ = {"SELECT"}
_WRITE = {"INSERT", "UPDATE"}
# Destructive / DDL / DCL. MERGE and (MySQL) REPLACE can delete rows, so they are
# treated as destructive — the conservative choice for a security guard.
_DESTRUCTIVE = {
    "DELETE", "DROP", "TRUNCATE", "ALTER", "CREATE", "GRANT", "REVOKE",
    "RENAME", "REPLACE", "MERGE",
}
_ALL_SQL_OPS = _READ | _WRITE | _DESTRUCTIVE


def _verdict(allowed: bool, operation_type: str, reason: str | None = None, query: str | None = None) -> dict:
    return {"allowed": allowed, "operation_type": operation_type, "reason": reason, "query": query}


# ════════════════════════════════════════════════════════════════════════════
# SQL guard
# ════════════════════════════════════════════════════════════════════════════
def guard_sql(query: str, allow_write: bool, allow_delete: bool) -> dict:
    try:
        raw = (query or "").strip()
        if not raw:
            return _verdict(False, "unknown", "Empty query.")

        # Real statement-boundary split — semicolons inside strings are ignored.
        statements = [s for s in sqlparse.split(raw) if s.strip()]
        if not statements:
            return _verdict(False, "unknown", "Empty query.")
        if len(statements) > 1:
            return _verdict(
                False, "unknown",
                "Multiple SQL statements are not allowed. Send exactly one statement.",
            )

        single = statements[0].strip()
        parsed = sqlparse.parse(single)
        if not parsed:
            return _verdict(False, "unknown", "Could not parse the SQL statement.")
        stmt = parsed[0]

        op = _classify_sql(stmt)
        if op == "unknown":
            return _verdict(
                False, "unknown",
                "Could not determine the statement type; rejected for safety.",
            )
        if op == "destructive" and not allow_delete:
            return _verdict(
                False, "destructive",
                "Destructive operations (DELETE/DROP/TRUNCATE/ALTER/…) require "
                "allow_delete to be enabled on this connection.",
            )
        if op == "write" and not allow_write:
            return _verdict(
                False, "write",
                "Write operations (INSERT/UPDATE) require allow_write to be "
                "enabled on this connection.",
            )

        out = single
        if op == "read":
            out = _enforce_select_limit(single)
        return _verdict(True, op, None, out)
    except Exception as exc:  # noqa: BLE001 — guard must never raise
        return _verdict(False, "unknown", f"Query rejected — could not be safely analysed ({type(exc).__name__}).")


def _classify_sql(stmt) -> str:
    """Return read | write | destructive | unknown by scanning Keyword tokens.

    Using the tokenizer means keywords inside string literals or quoted
    identifiers are NOT counted (they aren't Keyword-typed tokens). Priority is
    destructive > write > read so a data-modifying CTE (``WITH ... DELETE``) is
    classified by its most dangerous operation, not by the leading ``WITH``.
    """
    found: set[str] = set()
    for tok in stmt.flatten():
        if tok.ttype in T.Keyword and tok.value.upper() in _ALL_SQL_OPS:
            found.add(tok.value.upper())
    if found & _DESTRUCTIVE:
        return "destructive"
    if found & _WRITE:
        return "write"
    if found & _READ:
        return "read"
    return "unknown"


def _enforce_select_limit(query: str, max_rows: int = MAX_ROWS) -> str:
    """Ensure a top-level ``LIMIT`` no greater than ``max_rows``.

    This is mechanism (a) of the skill's Rule 4. It is NOT sufficient on its own —
    a subquery/CTE/UNION can still produce more rows before an outer LIMIT — so
    the executor ALSO caps the cursor read at ``max_rows`` (mechanism (b)).
    """
    stmt = sqlparse.parse(query)[0]
    tokens = stmt.tokens

    limit_pos = None
    for i, tok in enumerate(tokens):
        if tok.ttype in T.Keyword and tok.value.upper() == "LIMIT":
            limit_pos = i
            break

    if limit_pos is None:
        # Append on a new line so a trailing line-comment can't swallow the LIMIT.
        base = query.rstrip().rstrip(";").rstrip()
        return f"{base}\nLIMIT {max_rows}"

    # Clamp the first integer following LIMIT, if it is a plain integer.
    for tok in tokens[limit_pos + 1:]:
        if tok.is_whitespace:
            continue
        if tok.ttype in (T.Number.Integer, T.Literal.Number.Integer):
            try:
                if int(tok.value) > max_rows:
                    tok.value = str(max_rows)
            except ValueError:
                pass
            return str(stmt)
        # Complex form (e.g. "LIMIT offset, count" or "LIMIT :n") — leave the text
        # alone; the executor's hard cursor cap is the real guarantee.
        break
    return str(stmt)


# ════════════════════════════════════════════════════════════════════════════
# Mongo guard  (structured operations, not query strings)
# ════════════════════════════════════════════════════════════════════════════
_MONGO_READ = {"find", "aggregate", "countdocuments", "count", "distinct"}
_MONGO_WRITE = {
    "insertone", "insertmany", "updateone", "updatemany",
    "replaceone", "findoneandupdate", "findoneandreplace", "bulkwrite",
}
_MONGO_DESTRUCTIVE = {
    "deleteone", "deletemany", "findoneanddelete",
    "drop", "dropdatabase", "dropcollection", "renamecollection",
}


def guard_mongo(operation: dict, allow_write: bool, allow_delete: bool) -> dict:
    try:
        if not isinstance(operation, dict):
            return _verdict(False, "unknown", "mongo_operation must be an object.")
        op_name = str(operation.get("operation") or "").strip()
        if not op_name:
            return _verdict(False, "unknown", "mongo_operation.operation is required.")

        op_type = _classify_mongo(op_name.lower(), operation)
        if op_type == "unknown":
            return _verdict(False, "unknown", f"Unsupported Mongo operation '{op_name}'.")
        if op_type == "destructive" and not allow_delete:
            return _verdict(
                False, "destructive",
                "Destructive operations (delete/drop/$out/$merge/…) require "
                "allow_delete to be enabled on this connection.",
            )
        if op_type == "write" and not allow_write:
            return _verdict(
                False, "write",
                "Write operations (insert/update/replace) require allow_write "
                "to be enabled on this connection.",
            )
        return _verdict(True, op_type, None)
    except Exception as exc:  # noqa: BLE001 — guard must never raise
        return _verdict(False, "unknown", f"Operation rejected — could not be safely analysed ({type(exc).__name__}).")


def _classify_mongo(key: str, operation: dict) -> str:
    if key == "aggregate":
        # $out / $merge stages write/replace a collection — destructive per the
        # skill (Section 6), even though aggregate is otherwise a read.
        if _pipeline_writes(operation.get("pipeline") or []):
            return "destructive"
        return "read"
    if key in _MONGO_READ:
        return "read"
    if key == "bulkwrite":
        return _classify_bulk(operation.get("operations") or operation.get("requests") or [])
    if key in _MONGO_DESTRUCTIVE:
        return "destructive"
    if key in _MONGO_WRITE:
        return "write"
    return "unknown"


def _pipeline_writes(pipeline) -> bool:
    if not isinstance(pipeline, list):
        return False
    for stage in pipeline:
        if isinstance(stage, dict) and ("$out" in stage or "$merge" in stage):
            return True
    return False


def _classify_bulk(ops) -> str:
    """Classify a bulkWrite by inspecting each sub-operation. Any delete makes the
    whole batch destructive; otherwise any write makes it a write."""
    if not isinstance(ops, list) or not ops:
        return "unknown"
    has_write = False
    for item in ops:
        if not isinstance(item, dict):
            return "unknown"
        for k in item.keys():
            kl = k.lower()
            if kl in _MONGO_DESTRUCTIVE:
                return "destructive"
            if kl in _MONGO_WRITE:
                has_write = True
            elif kl not in _MONGO_READ:
                return "unknown"  # unrecognized sub-operation → reject conservatively
    return "write" if has_write else "unknown"
