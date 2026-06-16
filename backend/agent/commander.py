"""The Commander — decides the next action with Claude tool_use.

One ``decide`` call == one Anthropic Messages API round trip. It appends the
assistant's response to memory (as re-sendable content-block dicts) and reports
back what the engine should do next: run tool(s) or finish.

Anthropic note: a single assistant turn may contain MORE THAN ONE ``tool_use``
block (parallel tool use). The Messages API then requires a ``tool_result`` for
*every* one of those ids on the next user turn, or it rejects the request. So we
surface the full list in ``tool_calls`` and the engine results each of them. The
single ``tool_name``/``tool_input``/``tool_use_id`` fields mirror the first call
for convenience.
"""
from anthropic import AsyncAnthropic

from models.models import User
from .tools.definitions import TOOLS_LIST

MODEL = "claude-sonnet-4-6"  # the model id the user's Anthropic key must allow


class Commander:
    SYSTEM_PROMPT = """You are Neru, the AI brain of Nerum — an automation platform for Indian businesses.
Your job is to help Indian SMB owners automate their business tasks.

When given a goal, you MUST use the available tools to actually execute it.
Do NOT just explain — actually call the tools and get things done.

You have access to: WhatsApp, Gmail, Google Sheets, Telegram, Razorpay.

Rules:
1. Always fetch data before sending messages (you need phone numbers/emails)
2. Personalize messages when possible using customer names
3. After executing, always summarize what was done
4. If a tool fails, try an alternative approach
5. Maximum 10 tool calls per run
6. Be concise in your thinking, detailed in your results

User: {user_name}, Plan: {user_plan}
"""

    def __init__(self, api_key: str, user: User):
        self.client = AsyncAnthropic(api_key=api_key)
        self.user = user
        self.system = self.SYSTEM_PROMPT.format(
            user_name=user.name or "there",
            user_plan=user.plan or "free",
        )

    async def decide(self, memory) -> dict:
        response = await self.client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=self.system,
            tools=TOOLS_LIST,
            tool_choice={"type": "auto"},
            messages=memory.to_claude_messages(),
        )

        # Split the response into re-sendable blocks, collected text, and tool calls.
        assistant_blocks: list[dict] = []
        text_parts: list[str] = []
        tool_calls: list[dict] = []
        for block in response.content:
            if block.type == "text":
                assistant_blocks.append({"type": "text", "text": block.text})
                if block.text:
                    text_parts.append(block.text)
            elif block.type == "tool_use":
                assistant_blocks.append({
                    "type": "tool_use",
                    "id": block.id,
                    "name": block.name,
                    "input": dict(block.input),
                })
                tool_calls.append({
                    "tool_use_id": block.id,
                    "tool_name": block.name,
                    "tool_input": dict(block.input),
                })

        # Record the assistant turn so the next API call has the full history,
        # including the tool_use blocks we must later answer with tool_results.
        memory.add_assistant_message(assistant_blocks)

        text = "\n".join(text_parts).strip()

        if response.stop_reason == "tool_use" and tool_calls:
            first = tool_calls[0]
            return {
                "type": "tool_call",
                "text": text,
                "tool_calls": tool_calls,
                "tool_name": first["tool_name"],
                "tool_input": first["tool_input"],
                "tool_use_id": first["tool_use_id"],
            }

        # end_turn, max_tokens, or any stop_reason without a usable tool call.
        answer = text or "I've finished, but I don't have anything further to add."
        if response.stop_reason == "max_tokens":
            answer += "\n\n(Response was cut off at the length limit.)"
        return {"type": "final_answer", "answer": answer, "stop_reason": response.stop_reason}
