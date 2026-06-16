"""Per-run conversation + execution state for one agent session.

Holds three distinct things:

* ``messages`` — the exact role/content list sent to the Anthropic API. Assistant
  turns are stored as lists of content blocks (text and/or tool_use) and tool
  outputs are stored as ``tool_result`` blocks in a user turn, which is the shape
  the Messages API requires for a tool-use conversation.
* ``steps`` — a human/DB oriented log of each tool execution and its outcome.
* ``context`` — free-form facts the loop wants to remember (counts, ids, etc).

This object lives only for the duration of a single ``AgentEngine.run`` call.
"""
import json


class AgentMemory:
    MAX_LOOPS = 10

    def __init__(self, session_id: str, user_id: int):
        self.session_id = session_id
        self.user_id = user_id
        self.messages: list[dict] = []   # Anthropic-formatted conversation
        self.steps: list[dict] = []      # executed tool steps
        self.context: dict = {}          # extracted facts
        self.loop_count: int = 0

    # ── conversation ─────────────────────────────────────────────────────
    def add_user_message(self, content: str) -> None:
        self.messages.append({"role": "user", "content": content})

    def add_assistant_message(self, content) -> None:
        """content is either a plain string or a list of content-block dicts."""
        self.messages.append({"role": "assistant", "content": content})

    def add_tool_result(self, tool_use_id: str, result: dict) -> None:
        """Feed a tool's outcome back to Claude as a tool_result block.

        The block content is a JSON string of the executor envelope. ``is_error``
        is set on failure so the model knows the call did not succeed and can try
        an alternative approach.
        """
        self.messages.append({
            "role": "user",
            "content": [{
                "type": "tool_result",
                "tool_use_id": tool_use_id,
                "content": json.dumps(result, ensure_ascii=False, default=str),
                "is_error": not result.get("success", False),
            }],
        })

    def to_claude_messages(self) -> list:
        return self.messages

    # ── context facts ────────────────────────────────────────────────────
    def store_context(self, key: str, value) -> None:
        self.context[key] = value

    def get_context(self, key: str):
        return self.context.get(key)

    # ── step log ─────────────────────────────────────────────────────────
    def add_step(self, tool_name: str, params: dict, result: dict, success: bool) -> None:
        self.steps.append({
            "tool_name": tool_name,
            "params": params,
            "result": result,
            "success": success,
        })

    # ── loop control ─────────────────────────────────────────────────────
    def is_loop_limit_reached(self) -> bool:
        return self.loop_count >= self.MAX_LOOPS

    # ── persistence ──────────────────────────────────────────────────────
    def get_summary(self) -> dict:
        steps_done = len(self.steps)
        succeeded = sum(1 for s in self.steps if s["success"])
        return {
            "session_id": self.session_id,
            "steps_count": steps_done,
            "succeeded": succeeded,
            "failed": steps_done - succeeded,
            "tools_used": [s["tool_name"] for s in self.steps],
            "context": self.context,
        }
