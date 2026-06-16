"""The agent loop — orchestrates Commander + ToolExecutor and streams SSE events.

``run`` is an async generator of plain dicts; the route serialises them to SSE.
The loop is: decide → (run tool(s) → feed results back) → decide → … until the
Commander finishes or the 10-step ceiling is hit.

Persistence (agent_runs / agent_steps) is best-effort and uses its OWN database
session, not the request's. During a StreamingResponse the request-scoped session
can be torn down before the generator finishes producing events, so writing
through it is unsafe. Logging must also never break a live automation, so every
persistence call swallows-and-logs its own errors.
"""
from datetime import datetime

from core.database import AsyncSessionLocal
from models.models import AgentRun, AgentStep, User
from .commander import Commander
from .memory import AgentMemory
from .tools.executor import ToolExecutor

# Human-readable text shown when a tool starts. Falls back to a generic line.
_TOOL_START = {
    "fetch_sheets_data": lambda p: "Fetching data from Google Sheets...",
    "write_sheets_data": lambda p: "Writing data to Google Sheets...",
    "send_whatsapp_message": lambda p: f"Sending WhatsApp to {p.get('phone_number', 'customer')}...",
    "send_whatsapp_bulk": lambda p: f"Sending WhatsApp to {len(p.get('recipients', []))} customers...",
    "send_email": lambda p: f"Sending email to {p.get('to_email', 'recipient')}...",
    "send_telegram_message": lambda p: "Sending Telegram message...",
    "fetch_razorpay_payments": lambda p: "Fetching payment data from Razorpay...",
    "generate_message": lambda p: "Writing personalized message...",
    "fetch_gmail_emails": lambda p: "Checking Gmail inbox...",
    "schedule_workflow": lambda p: "Scheduling workflow...",
}


class AgentEngine:
    def __init__(self, user: User, db, api_key: str, credentials: dict):
        self.user = user
        self.db = db  # request session — kept for interface parity, not used for writes
        self.commander = Commander(api_key, user)
        self.executor = ToolExecutor(user.id, db, credentials)

    async def run(self, goal: str, language: str, session_id: str):
        lang = "Tamil" if str(language).lower().startswith("ta") else "English"
        memory = AgentMemory(session_id, self.user.id)
        memory.add_user_message(
            f"{goal}\n\n(Respond to me, and write any customer-facing messages, in {lang}.)"
        )

        run_id = await self._create_run(session_id, goal)
        status = "complete"
        final_text: str | None = None

        try:
            yield {"type": "thinking", "content": "Understanding your goal..."}

            while True:
                if memory.is_loop_limit_reached():
                    final_text = (
                        "I reached the 10-step limit for a single run. "
                        f"Here's what I completed: {self._brief(memory)}."
                    )
                    break

                yield {"type": "loop", "count": memory.loop_count + 1, "max": AgentMemory.MAX_LOOPS}

                action = await self.commander.decide(memory)

                if action["type"] == "final_answer":
                    final_text = action["answer"]
                    break

                # The Commander may have narrated a plan alongside its tool calls.
                if action.get("text"):
                    yield {"type": "plan", "content": action["text"]}

                # Execute every tool_use block in this assistant turn. Each one MUST
                # get a tool_result before the next decide() or the API will reject it.
                for call in action["tool_calls"]:
                    tool_name = call["tool_name"]
                    tool_input = call["tool_input"]
                    yield {"type": "tool_start", "tool": tool_name, "content": self._describe(tool_name, tool_input)}

                    result = await self.executor.execute(tool_name, tool_input)
                    success = bool(result.get("success"))

                    memory.add_tool_result(call["tool_use_id"], result)
                    memory.add_step(tool_name, tool_input, result, success)
                    await self._save_step(run_id, tool_name, tool_input, result, success)
                    memory.loop_count += 1

                    if success:
                        yield {
                            "type": "tool_result",
                            "tool": tool_name,
                            "content": self._summarize(tool_name, result),
                            "success": True,
                        }
                    else:
                        yield {
                            "type": "tool_error",
                            "tool": tool_name,
                            "content": result.get("error") or "Tool failed.",
                        }

            yield {"type": "complete", "content": final_text, "summary": memory.get_summary()}

        except Exception as exc:  # noqa: BLE001 — surface any failure to the client cleanly
            status = "error"
            final_text = f"Something went wrong: {str(exc)[:300]}"
            yield {"type": "error", "content": final_text}

        finally:
            await self._finalize_run(run_id, status, memory, final_text)

    # ── human-readable helpers ───────────────────────────────────────────
    def _describe(self, tool_name: str, params: dict) -> str:
        fn = _TOOL_START.get(tool_name)
        return fn(params) if fn else f"Running {tool_name}..."

    def _summarize(self, tool_name: str, envelope: dict) -> str:
        data = envelope.get("result") or {}
        if tool_name == "fetch_sheets_data":
            return f"Found {data.get('count', 0)} rows."
        if tool_name == "write_sheets_data":
            return f"Appended {data.get('appended', 0)} rows to the sheet."
        if tool_name == "send_whatsapp_message":
            return f"WhatsApp sent to {data.get('phone', 'customer')}."
        if tool_name == "send_whatsapp_bulk":
            return f"WhatsApp: {data.get('sent', 0)} sent, {data.get('failed', 0)} failed."
        if tool_name == "send_email":
            return f"Email sent to {data.get('to', 'recipient')}."
        if tool_name == "send_telegram_message":
            return "Telegram message sent."
        if tool_name == "fetch_razorpay_payments":
            return f"Fetched {data.get('count', 0)} payments."
        if tool_name == "generate_message":
            return "Message drafted."
        if tool_name == "schedule_workflow":
            return data.get("message", "Workflow scheduled.")
        return "Done."

    def _brief(self, memory: AgentMemory) -> str:
        s = memory.get_summary()
        return f"{s['succeeded']} step(s) succeeded, {s['failed']} failed"

    # ── persistence (best-effort, own session) ───────────────────────────
    async def _create_run(self, session_id: str, goal: str) -> int | None:
        try:
            async with AsyncSessionLocal() as db:
                run = AgentRun(
                    user_id=self.user.id,
                    session_id=session_id,
                    goal=goal,
                    status="running",
                    steps_count=0,
                )
                db.add(run)
                await db.commit()
                await db.refresh(run)
                return run.id
        except Exception as exc:  # noqa: BLE001
            print(f"[nerum.agent] could not create agent_run: {exc}")
            return None

    async def _save_step(self, run_id, tool_name: str, tool_input: dict, result: dict, success: bool) -> None:
        if run_id is None:
            return
        try:
            async with AsyncSessionLocal() as db:
                db.add(AgentStep(
                    run_id=run_id,
                    user_id=self.user.id,
                    tool_name=tool_name,
                    tool_input=tool_input,
                    tool_result=result,
                    success=success,
                ))
                await db.commit()
        except Exception as exc:  # noqa: BLE001
            print(f"[nerum.agent] could not save agent_step ({tool_name}): {exc}")

    async def _finalize_run(self, run_id, status: str, memory: AgentMemory, final_text: str | None) -> None:
        if run_id is None:
            return
        try:
            async with AsyncSessionLocal() as db:
                run = await db.get(AgentRun, run_id)
                if not run:
                    return
                run.status = status
                run.steps_count = len(memory.steps)
                run.result_summary = (final_text or "")[:4000]
                run.completed_at = datetime.utcnow()
                await db.commit()
        except Exception as exc:  # noqa: BLE001
            print(f"[nerum.agent] could not finalize agent_run {run_id}: {exc}")
