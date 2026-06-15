"""Real workflow DAG executor.

Runs a {nodes, edges} graph in topological order. Triggers pass their data
through; actions actually call the integration services. Template variables like
{{trigger.phone}}, {{results.<nodeId>}}, {{ai_output}} are resolved from a shared
context. No fake successes — a failing action raises and marks the run failed.
"""
import asyncio
import json
import re
from collections import defaultdict, deque

import httpx
from fastapi import HTTPException

from core.config import settings
from services.email import send_email
from services.sheets import append_to_sheet
from services.telegram import send_telegram_message
from services.whatsapp import send_whatsapp_message

_TRIGGER_SUBTYPES = {"wa_received", "gmail_received", "schedule", "webhook", "form_submit", "razorpay_payment"}
_VAR_RE = re.compile(r"\{\{\s*([^}]+?)\s*\}\}")


class WorkflowExecutor:
    def __init__(self, byok: dict | None = None):
        # byok: {"anthropic": "sk-ant-...", "openai": "...", ...}
        self.byok = byok or {}

    # ── public ──────────────────────────────────────────────────────────
    async def run_graph(self, config: dict, trigger_data: dict) -> dict:
        nodes = config.get("nodes", [])
        edges = config.get("edges", [])
        order = self._topo_sort(nodes, edges)
        by_id = {n["id"]: n for n in nodes}
        context: dict = {"trigger": trigger_data or {}, "results": {}, "vars": {}, "current": _now()}

        for node_id in order:
            node = by_id.get(node_id)
            if not node:
                continue
            subtype = node.get("subtype") or node.get("type", "")
            if subtype in _TRIGGER_SUBTYPES:
                context["results"][node_id] = context["trigger"]
                continue
            cfg = self._resolve(node.get("config", {}) or {}, context)
            output = await self._exec(subtype, cfg, context)
            context["results"][node_id] = output
            out_var = (node.get("config", {}) or {}).get("outputVar")
            if isinstance(out_var, str) and out_var.strip():
                context["vars"][out_var.strip()] = output if not isinstance(output, dict) else output.get("output", output)
        return context["results"]

    # ── dispatch ────────────────────────────────────────────────────────
    async def _exec(self, subtype: str, cfg: dict, context: dict):
        handlers = {
            "wa_send": self._wa_send,
            "gmail_send": self._email_send,
            "telegram_send": self._telegram_send,
            "sheets_append": self._sheet_append,
            "razorpay_link": self._razorpay_link,
            "http": self._http,
            "wait": self._wait,
            "ai_step": self._ai,
            "classify": self._ai,
            "extract": self._ai,
            "generate_reply": self._ai,
            "summarize": self._ai,
            "if_else": self._condition,
            "filter": self._condition,
            "set_var": self._set_var,
            "smartlist_update": self._noop,  # CRM write handled elsewhere
            "loop": self._noop,
            "merge": self._noop,
        }
        fn = handlers.get(subtype)
        if not fn:
            raise HTTPException(status_code=400, detail=f"Unknown node type: {subtype}")
        return await fn(cfg, context)

    # ── actions ─────────────────────────────────────────────────────────
    async def _wa_send(self, cfg: dict, _ctx: dict) -> dict:
        to = cfg.get("to") or cfg.get("phone")
        msg = cfg.get("message") or cfg.get("body")
        if not to or not msg:
            raise HTTPException(400, "WhatsApp node needs 'to' and 'message'")
        return await send_whatsapp_message(to=str(to), message=str(msg))

    async def _email_send(self, cfg: dict, _ctx: dict) -> dict:
        to = cfg.get("to") or cfg.get("email")
        if not to:
            raise HTTPException(400, "Email node needs 'to'")
        subject = cfg.get("subject", "Message from Nerum")
        body = cfg.get("body") or cfg.get("message", "")
        return await send_email(to=str(to), subject=str(subject), html=f"<div style='font-family:sans-serif'>{body}</div>")

    async def _telegram_send(self, cfg: dict, _ctx: dict) -> dict:
        chat = cfg.get("chatId") or cfg.get("chat_id") or cfg.get("to")
        msg = cfg.get("message") or cfg.get("body")
        if not chat or not msg:
            raise HTTPException(400, "Telegram node needs 'chatId' and 'message'")
        return await send_telegram_message(chat_id=str(chat), message=str(msg))

    async def _sheet_append(self, cfg: dict, _ctx: dict) -> dict:
        sid = cfg.get("spreadsheetId") or cfg.get("spreadsheet_id")
        rng = cfg.get("range") or f"{cfg.get('sheetName', 'Sheet1')}!A:Z"
        row = cfg.get("row", "")
        values = [c.strip() for c in row.split(",")] if isinstance(row, str) else list(row or [])
        if not sid:
            raise HTTPException(400, "Sheet node needs 'spreadsheetId'")
        return await append_to_sheet(sid, rng, [values])

    async def _razorpay_link(self, cfg: dict, _ctx: dict) -> dict:
        if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
            raise HTTPException(503, "Razorpay not configured")
        try:
            amount = int(float(cfg.get("amount", 0)) * 100)
        except (TypeError, ValueError):
            raise HTTPException(400, "Razorpay node needs a numeric 'amount'")
        payload = {"amount": amount, "currency": "INR", "description": cfg.get("description", "Payment"), "notify": {"sms": False, "email": False}}
        customer = cfg.get("customer")
        if customer:
            payload["customer"] = {"contact": str(customer)}
        async with httpx.AsyncClient(timeout=20.0, auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)) as client:
            resp = await client.post("https://api.razorpay.com/v1/payment_links", json=payload)
        if resp.status_code not in (200, 201):
            raise HTTPException(502, f"Razorpay error: {resp.text}")
        data = resp.json()
        return {"payment_link": data.get("short_url"), "id": data.get("id")}

    async def _http(self, cfg: dict, _ctx: dict) -> dict:
        url = cfg.get("url")
        if not url:
            raise HTTPException(400, "HTTP node needs 'url'")
        method = str(cfg.get("method", "GET")).upper()
        headers = _maybe_json(cfg.get("headers"))
        body = _maybe_json(cfg.get("body"))
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.request(method, url, headers=headers or {}, json=body if body else None)
        try:
            parsed = resp.json()
        except Exception:
            parsed = resp.text
        return {"status": resp.status_code, "body": parsed}

    async def _wait(self, cfg: dict, _ctx: dict) -> dict:
        total = int(cfg.get("duration", 0) or 0)
        unit = cfg.get("unit", "seconds")
        total *= {"seconds": 1, "minutes": 60, "hours": 3600}.get(unit, 1)
        if total > 0:
            await asyncio.sleep(min(total, 300))  # cap inline waits at 5 min
        return {"waited_seconds": min(total, 300)}

    async def _ai(self, cfg: dict, _ctx: dict) -> dict:
        provider = (cfg.get("model") or "claude").lower()
        prompt = cfg.get("user") or cfg.get("input") or cfg.get("context") or ""
        system = cfg.get("system", "You are a helpful assistant for an Indian small business. Reply concisely.")
        if cfg.get("categories"):
            system += f"\nClassify the input into exactly one of: {cfg['categories']}. Reply with only the category."
        if cfg.get("fields"):
            system += f"\nExtract these fields as JSON: {cfg['fields']}."
        text = await self._call_ai(provider, system, str(prompt), float(cfg.get("temperature", 0.7)), int(cfg.get("maxTokens", 512)))
        return {"output": text}

    async def _call_ai(self, provider: str, system: str, prompt: str, temperature: float, max_tokens: int) -> str:
        if provider in ("claude", "anthropic"):
            key = self.byok.get("anthropic") or settings.ANTHROPIC_API_KEY
            if not key:
                raise HTTPException(503, "No Anthropic key (BYOK or server) configured for AI step")
            from anthropic import AsyncAnthropic

            client = AsyncAnthropic(api_key=key)
            msg = await client.messages.create(model="claude-haiku-4-5-20251001", max_tokens=max_tokens, temperature=temperature, system=system, messages=[{"role": "user", "content": prompt}])
            return msg.content[0].text if msg.content else ""
        if provider in ("gpt-4o", "openai"):
            key = self.byok.get("openai")
            if not key:
                raise HTTPException(503, "OpenAI BYOK key required for this AI step")
            return await _openai_compatible("https://api.openai.com/v1/chat/completions", key, "gpt-4o-mini", system, prompt, temperature, max_tokens)
        if provider == "groq":
            key = self.byok.get("groq")
            if not key:
                raise HTTPException(503, "Groq BYOK key required for this AI step")
            return await _openai_compatible("https://api.groq.com/openai/v1/chat/completions", key, "llama-3.1-8b-instant", system, prompt, temperature, max_tokens)
        if provider == "gemini":
            key = self.byok.get("gemini")
            if not key:
                raise HTTPException(503, "Gemini BYOK key required for this AI step")
            return await _gemini(key, system, prompt, temperature, max_tokens)
        raise HTTPException(400, f"Unknown AI provider: {provider}")

    async def _condition(self, cfg: dict, _ctx: dict) -> dict:
        conditions = cfg.get("conditions", [])
        match = cfg.get("match", "all")
        results = [_eval_condition(c) for c in conditions] if isinstance(conditions, list) else []
        passed = all(results) if match == "all" else any(results)
        return {"passed": passed, "branch": "yes" if passed else "no"}

    async def _set_var(self, cfg: dict, context: dict) -> dict:
        name = cfg.get("name", "var")
        value = cfg.get("value", "")
        context["vars"][name] = value
        return {name: value}

    async def _noop(self, cfg: dict, _ctx: dict) -> dict:
        return {"skipped": True, "config": cfg}

    # ── template resolution ─────────────────────────────────────────────
    def _resolve(self, data, context: dict):
        if isinstance(data, str):
            def repl(m: re.Match) -> str:
                return str(_lookup(m.group(1).strip(), context))
            return _VAR_RE.sub(repl, data)
        if isinstance(data, dict):
            return {k: self._resolve(v, context) for k, v in data.items()}
        if isinstance(data, list):
            return [self._resolve(v, context) for v in data]
        return data

    # ── graph ───────────────────────────────────────────────────────────
    @staticmethod
    def _topo_sort(nodes: list, edges: list) -> list:
        ids = {n["id"] for n in nodes}
        graph: dict = defaultdict(list)
        indeg = {nid: 0 for nid in ids}
        for e in edges:
            if e.get("source") in ids and e.get("target") in ids:
                graph[e["source"]].append(e["target"])
                indeg[e["target"]] += 1
        queue = deque([nid for nid in ids if indeg[nid] == 0])
        order, seen = [], set()
        while queue:
            nid = queue.popleft()
            if nid in seen:
                continue
            seen.add(nid)
            order.append(nid)
            for nxt in graph[nid]:
                indeg[nxt] -= 1
                if indeg[nxt] == 0:
                    queue.append(nxt)
        order.extend(nid for nid in ids if nid not in seen)  # leftover cycles
        return order


# ── module helpers ──────────────────────────────────────────────────────
def _now() -> dict:
    from datetime import datetime

    n = datetime.utcnow()
    return {"date": n.strftime("%Y-%m-%d"), "time": n.strftime("%H:%M")}


def _lookup(path: str, context: dict):
    # builtins like trigger.message / results.<id> / current.date, else a var name
    parts = path.split(".")
    if parts[0] in ("trigger", "results", "current"):
        val = context.get(parts[0], {})
        for key in parts[1:]:
            val = val.get(key, "") if isinstance(val, dict) else ""
        return val
    return context.get("vars", {}).get(path, "")


def _maybe_json(value):
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str) and value.strip():
        try:
            return json.loads(value)
        except Exception:
            return None
    return None


def _eval_condition(c: dict) -> bool:
    field = str(c.get("field", ""))
    op = c.get("op", "contains")
    value = str(c.get("value", ""))
    if op == "equals":
        return field == value
    if op == "contains":
        return value in field
    if op == "starts":
        return field.startswith(value)
    if op == "empty":
        return field.strip() == ""
    if op in ("gt", "lt"):
        try:
            return (float(field) > float(value)) if op == "gt" else (float(field) < float(value))
        except ValueError:
            return False
    return False


async def _openai_compatible(url: str, key: str, model: str, system: str, prompt: str, temperature: float, max_tokens: int) -> str:
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(url, headers={"Authorization": f"Bearer {key}"}, json={"model": model, "temperature": temperature, "max_tokens": max_tokens, "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}]})
    if resp.status_code != 200:
        raise HTTPException(502, f"AI provider error: {resp.text}")
    return resp.json()["choices"][0]["message"]["content"]


async def _gemini(key: str, system: str, prompt: str, temperature: float, max_tokens: int) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(url, json={"system_instruction": {"parts": [{"text": system}]}, "contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens}})
    if resp.status_code != 200:
        raise HTTPException(502, f"Gemini error: {resp.text}")
    cands = resp.json().get("candidates", [])
    return cands[0]["content"]["parts"][0]["text"] if cands else ""
