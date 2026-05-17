from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from datetime import datetime
import json

from models.database import Workflow, User
from routes.workflow import get_current_user, get_db
from security import check_tokens, deduct_tokens, token_error_message, get_workflow_limit, sanitize_input

router = APIRouter(prefix="/triggers", tags=["triggers"])


# ── Trigger catalogue ─────────────────────────────────────────────────────────
# Single source of truth for both `GET /triggers/types` (UI picker) and
# server-side config validation. Keep keys stable — they are stored in
# `workflows.trigger`.

_SKIP_HOLIDAY_FIELD = {
    "key": "skip_indian_holidays", "type": "checkbox",
    "label": "Skip Indian public holidays", "required": False, "default": False
}

TRIGGER_SCHEMAS: Dict[str, Dict[str, Any]] = {
    # ── Schedule ────────────────────────────────────────────────────────────
    "every_x_minutes": {
        "category": "schedule", "label": "Every X minutes", "icon": "⟳",
        "description": "Run on a fixed minute interval.",
        "config_schema": [
            {"key": "interval", "type": "number", "label": "Interval (minutes)", "required": True, "default": 5},
            _SKIP_HOLIDAY_FIELD,
        ],
    },
    "every_x_hours": {
        "category": "schedule", "label": "Every X hours", "icon": "⟲",
        "description": "Run on a fixed hour interval.",
        "config_schema": [
            {"key": "interval", "type": "number", "label": "Interval (hours)", "required": True, "default": 1},
            _SKIP_HOLIDAY_FIELD,
        ],
    },
    "daily": {
        "category": "schedule", "label": "Daily at time", "icon": "☀",
        "description": "Run once a day at a specific time.",
        "config_schema": [
            {"key": "time", "type": "time", "label": "Time (HH:MM)", "required": True, "default": "09:00"},
            {"key": "timezone", "type": "text", "label": "Timezone", "required": False, "default": "Asia/Kolkata"},
            _SKIP_HOLIDAY_FIELD,
        ],
    },
    "weekly": {
        "category": "schedule", "label": "Weekly on day", "icon": "◷",
        "description": "Run weekly on a chosen day.",
        "config_schema": [
            {"key": "day", "type": "select", "label": "Day of week", "required": True,
             "options": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"], "default": "monday"},
            {"key": "time", "type": "time", "label": "Time (HH:MM)", "required": True, "default": "09:00"},
            _SKIP_HOLIDAY_FIELD,
        ],
    },
    "monthly": {
        "category": "schedule", "label": "Monthly on date", "icon": "◐",
        "description": "Run monthly on a chosen date.",
        "config_schema": [
            {"key": "date", "type": "number", "label": "Day of month (1-31)", "required": True, "default": 1},
            {"key": "time", "type": "time", "label": "Time (HH:MM)", "required": True, "default": "09:00"},
            _SKIP_HOLIDAY_FIELD,
        ],
    },
    "custom_cron": {
        "category": "schedule", "label": "Custom cron", "icon": "❖",
        "description": "Advanced — supply a standard 5-field cron expression.",
        "config_schema": [
            {"key": "expression", "type": "text", "label": "Cron expression", "required": True, "default": "0 9 * * *"},
            _SKIP_HOLIDAY_FIELD,
        ],
    },

    # ── Sheets ──────────────────────────────────────────────────────────────
    "sheets_new_row": {
        "category": "sheets", "label": "New row in Sheet", "icon": "▦",
        "description": "Fires when a new row is added to the sheet.",
        "config_schema": [
            {"key": "spreadsheet_id", "type": "text", "label": "Spreadsheet ID", "required": True},
            {"key": "sheet_name", "type": "text", "label": "Sheet name", "required": True, "default": "Sheet1"},
        ],
    },
    "sheets_row_updated": {
        "category": "sheets", "label": "Row updated in Sheet", "icon": "▤",
        "description": "Fires when a watched column changes value in a row.",
        "config_schema": [
            {"key": "spreadsheet_id", "type": "text", "label": "Spreadsheet ID", "required": True},
            {"key": "sheet_name", "type": "text", "label": "Sheet name", "required": True, "default": "Sheet1"},
            {"key": "column", "type": "text", "label": "Column header to watch", "required": True},
        ],
    },
    "sheets_cell_threshold": {
        "category": "sheets", "label": "Cell crosses threshold", "icon": "▥",
        "description": "Fires when a numeric cell crosses a threshold.",
        "config_schema": [
            {"key": "spreadsheet_id", "type": "text", "label": "Spreadsheet ID", "required": True},
            {"key": "sheet_name", "type": "text", "label": "Sheet name", "required": True, "default": "Sheet1"},
            {"key": "column", "type": "text", "label": "Column header", "required": True},
            {"key": "operator", "type": "select", "label": "Operator", "required": True,
             "options": [">", "<", ">=", "<=", "=="], "default": ">"},
            {"key": "value", "type": "number", "label": "Threshold value", "required": True, "default": 0},
        ],
    },

    # ── Smart List ──────────────────────────────────────────────────────────
    "smartlist_row_added": {
        "category": "smartlist", "label": "Row added to Smart List", "icon": "＋",
        "description": "Fires when a new contact is added to the Smart List.",
        "config_schema": [
            {"key": "list_id", "type": "number", "label": "Smart List ID", "required": True},
        ],
    },
    "smartlist_status_changed": {
        "category": "smartlist", "label": "Status changed", "icon": "⇄",
        "description": "Fires when a contact's status transitions.",
        "config_schema": [
            {"key": "list_id", "type": "number", "label": "Smart List ID", "required": True},
            {"key": "from_status", "type": "text", "label": "From status", "required": True, "default": "pending"},
            {"key": "to_status", "type": "text", "label": "To status", "required": True, "default": "done"},
        ],
    },
    "smartlist_birthday": {
        "category": "smartlist", "label": "Birthday reminder", "icon": "🎂",
        "description": "Daily check — fire N days before a contact's birthday.",
        "config_schema": [
            {"key": "list_id", "type": "number", "label": "Smart List ID", "required": True},
            {"key": "days_before", "type": "number", "label": "Days before", "required": True, "default": 0},
        ],
    },
    "smartlist_anniversary": {
        "category": "smartlist", "label": "Anniversary reminder", "icon": "❀",
        "description": "Daily check — fire N days before an anniversary.",
        "config_schema": [
            {"key": "list_id", "type": "number", "label": "Smart List ID", "required": True},
            {"key": "days_before", "type": "number", "label": "Days before", "required": True, "default": 0},
        ],
    },
    "smartlist_overdue": {
        "category": "smartlist", "label": "Overdue contact", "icon": "⌛",
        "description": "Daily check — fire when a record has been pending past a deadline.",
        "config_schema": [
            {"key": "list_id", "type": "number", "label": "Smart List ID", "required": True},
            {"key": "field", "type": "text", "label": "Date field to compare", "required": True, "default": "due_date"},
            {"key": "days_overdue", "type": "number", "label": "Days overdue", "required": True, "default": 1},
        ],
    },

    # ── Nerum internal ──────────────────────────────────────────────────────
    "workflow_completed": {
        "category": "internal", "label": "Workflow completed", "icon": "✔",
        "description": "Chain: fires when another workflow finishes successfully.",
        "config_schema": [
            {"key": "workflow_id", "type": "number", "label": "Upstream workflow ID", "required": True},
        ],
    },
    "workflow_failed": {
        "category": "internal", "label": "Workflow failed", "icon": "✖",
        "description": "Chain: fires when another workflow errors.",
        "config_schema": [
            {"key": "workflow_id", "type": "number", "label": "Upstream workflow ID", "required": True},
        ],
    },
    "token_threshold": {
        "category": "internal", "label": "Token balance threshold", "icon": "◈",
        "description": "Periodic check — fire when remaining tokens drop below a threshold.",
        "config_schema": [
            {"key": "threshold", "type": "number", "label": "Tokens remaining threshold", "required": True, "default": 100},
        ],
    },

    # ── Gmail ───────────────────────────────────────────────────────────────
    "gmail_new_email": {
        "category": "gmail", "label": "New email", "icon": "✉",
        "description": "Fires on any new email for the connected Gmail user.",
        "config_schema": [
            {"key": "user_id", "type": "number", "label": "Connected Gmail user ID", "required": True},
        ],
    },
    "gmail_keyword": {
        "category": "gmail", "label": "Email contains keyword", "icon": "✎",
        "description": "Fires when an inbound email contains a keyword.",
        "config_schema": [
            {"key": "user_id", "type": "number", "label": "Connected Gmail user ID", "required": True},
            {"key": "keyword", "type": "text", "label": "Keyword", "required": True},
        ],
    },
    "gmail_from_sender": {
        "category": "gmail", "label": "Email from sender", "icon": "✦",
        "description": "Fires when an inbound email is from a specific address.",
        "config_schema": [
            {"key": "user_id", "type": "number", "label": "Connected Gmail user ID", "required": True},
            {"key": "sender_email", "type": "text", "label": "Sender email", "required": True},
        ],
    },

    # ── Webhook ─────────────────────────────────────────────────────────────
    "webhook_with_keyword": {
        "category": "webhook", "label": "Webhook with keyword", "icon": "⌥",
        "description": "Webhook fires only if a JSON field contains a keyword.",
        "config_schema": [
            {"key": "field", "type": "text", "label": "JSON field path", "required": True},
            {"key": "keyword", "type": "text", "label": "Keyword", "required": True},
        ],
    },
    "webhook_conditional": {
        "category": "webhook", "label": "Webhook conditional", "icon": "⌘",
        "description": "Webhook fires only if a field passes a comparison.",
        "config_schema": [
            {"key": "field", "type": "text", "label": "JSON field path", "required": True},
            {"key": "operator", "type": "select", "label": "Operator", "required": True,
             "options": ["==", "!=", ">", "<", ">=", "<=", "contains"], "default": "=="},
            {"key": "value", "type": "text", "label": "Compare value", "required": True},
        ],
    },
}

_SCHEDULE_FAMILY = {"every_x_minutes", "every_x_hours", "daily", "weekly", "monthly", "custom_cron"}


# ── Validation helper ─────────────────────────────────────────────────────────

def _coerce_type(value: Any, expected: str):
    if value is None:
        return None
    if expected == "number":
        try:
            f = float(value)
            return int(f) if f.is_integer() else f
        except (TypeError, ValueError):
            return None
    if expected == "checkbox":
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.lower() in ("1", "true", "yes", "on")
        return bool(value)
    return str(value)


def _validate_config(trigger_type: str, cfg: Dict[str, Any]) -> Dict[str, Any]:
    schema = TRIGGER_SCHEMAS.get(trigger_type)
    if not schema:
        raise HTTPException(status_code=400, detail=f"Unknown trigger_type: {trigger_type}")
    clean: Dict[str, Any] = {}
    for field in schema["config_schema"]:
        key = field["key"]
        required = field.get("required", False)
        raw = cfg.get(key, field.get("default"))
        if required and (raw is None or raw == ""):
            raise HTTPException(status_code=400, detail=f"Missing required field '{key}' for trigger '{trigger_type}'")
        coerced = _coerce_type(raw, field["type"])
        if required and coerced is None:
            raise HTTPException(status_code=400, detail=f"Field '{key}' must be of type {field['type']}")
        if coerced is not None:
            clean[key] = coerced
    return clean


# ── Request models ────────────────────────────────────────────────────────────

class TriggerCreateRequest(BaseModel):
    workflow_name: str
    description: str = ""
    trigger_type: str
    trigger_config: Dict[str, Any] = {}
    actions: List[Dict[str, Any]] = []


class AISuggestRequest(BaseModel):
    prompt: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/types")
def list_trigger_types(user: User = Depends(get_current_user)):
    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for key, schema in TRIGGER_SCHEMAS.items():
        entry = {
            "type": key,
            "label": schema["label"],
            "icon": schema["icon"],
            "description": schema["description"],
            "config_schema": schema["config_schema"],
        }
        grouped.setdefault(schema["category"], []).append(entry)
    return {"categories": grouped, "total": len(TRIGGER_SCHEMAS)}


@router.post("/create")
def create_trigger(req: TriggerCreateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if req.trigger_type not in TRIGGER_SCHEMAS:
        raise HTTPException(status_code=400, detail=f"Unknown trigger_type: {req.trigger_type}")

    limit = get_workflow_limit(user.plan)
    current_count = db.query(Workflow).filter(Workflow.user_id == user.id).count()
    if current_count >= limit:
        raise HTTPException(
            status_code=403,
            detail=f"Workflow limit reached for {user.plan} plan ({limit} workflows). Upgrade at nerum.in to create more.",
        )

    clean_cfg = _validate_config(req.trigger_type, req.trigger_config or {})
    first_action_kind = req.actions[0].get("kind", "") if req.actions else ""

    config_payload = {
        "trigger_config": clean_cfg,
        "actions": req.actions or [],
    }

    workflow = Workflow(
        user_id=user.id,
        name=sanitize_input(req.workflow_name, 100),
        description=sanitize_input(req.description, 500),
        trigger=sanitize_input(req.trigger_type, 100),
        action=sanitize_input(first_action_kind, 100),
        config=json.dumps(config_payload),
        is_active=True,
        runs=0,
        created_at=datetime.utcnow(),
    )
    db.add(workflow)
    db.commit()
    db.refresh(workflow)

    if req.trigger_type in _SCHEDULE_FAMILY:
        try:
            from scheduler import register_trigger_job
            register_trigger_job(workflow.id, req.trigger_type, clean_cfg)
        except Exception as e:
            print(f"⚠️  Trigger job registration failed for workflow {workflow.id}: {e}")

    return {
        "trigger_id": workflow.id,
        "workflow_id": workflow.id,
        "trigger_type": req.trigger_type,
        "config": clean_cfg,
        "is_active": workflow.is_active,
    }


@router.post("/ai-suggest")
def ai_suggest(req: AISuggestRequest, user: User = Depends(get_current_user)):
    # Stub — returns a deterministic sample so the builder chat bar works.
    # Real AI wiring lives in routes/ai_agent.py and is a follow-up.
    return {
        "trigger_type": "daily",
        "trigger_config": {"time": "09:00", "timezone": "Asia/Kolkata"},
        "actions": [],
        "explanation": "AI suggestion coming soon. For now, defaulting to a daily 9 AM trigger you can edit.",
        "prompt_received": sanitize_input(req.prompt, 500),
    }
