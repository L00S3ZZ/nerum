"""Anthropic tool_use schemas for every action Neru can take.

This list is passed verbatim to the Anthropic Messages API as the `tools`
argument. Descriptions are written for the model, not for humans — they are how
Claude decides which tool fits the user's goal, so they stay concrete and
mention the situations each tool is for.

The executor in ``agent.tools.executor`` implements one handler per tool name
defined here. Names MUST stay in sync between the two files.
"""

# Each entry is a JSON-Schema-shaped dict in Anthropic's tool_use format.
TOOLS_LIST = [
    {
        "name": "fetch_sheets_data",
        "description": (
            "Fetch rows from a Google Sheet. Use when you need customer data, "
            "lists, or any spreadsheet data. Returns rows as objects keyed by the "
            "sheet's header row. Always fetch data before sending messages so you "
            "have the phone numbers, emails, and names you need."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "spreadsheet_id": {
                    "type": "string",
                    "description": "The Google Sheet ID (the long string in the sheet URL).",
                },
                "sheet_name": {
                    "type": "string",
                    "description": "Tab name within the spreadsheet.",
                    "default": "Sheet1",
                },
                "filter_column": {
                    "type": "string",
                    "description": "Optional: only return rows where this column matches filter_value.",
                },
                "filter_value": {
                    "type": "string",
                    "description": "Optional: value to match in filter_column.",
                },
            },
            "required": ["spreadsheet_id"],
        },
    },
    {
        "name": "send_whatsapp_message",
        "description": (
            "Send a WhatsApp message to ONE phone number. Use for customer "
            "communication, reminders, and alerts. For many recipients use "
            "send_whatsapp_bulk instead."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "phone_number": {
                    "type": "string",
                    "description": "Full phone number with country code, e.g. 919876543210.",
                },
                "message": {
                    "type": "string",
                    "description": "The message text to send.",
                },
            },
            "required": ["phone_number", "message"],
        },
    },
    {
        "name": "send_whatsapp_bulk",
        "description": (
            "Send WhatsApp messages to MANY phone numbers at once. Use for bulk "
            "campaigns and mass reminders. Personalise each message with {name} in "
            "the template, which is replaced per recipient."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "recipients": {
                    "type": "array",
                    "description": "List of recipients to message.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "phone": {"type": "string", "description": "Phone with country code."},
                            "name": {"type": "string", "description": "Recipient name for personalisation."},
                        },
                        "required": ["phone"],
                    },
                },
                "message_template": {
                    "type": "string",
                    "description": "Message text. Use {name} where the recipient's name should appear.",
                },
            },
            "required": ["recipients", "message_template"],
        },
    },
    {
        "name": "send_email",
        "description": (
            "Send an email. Use for formal communication, invoices, and documents. "
            "The body may contain plain text or simple HTML."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "to_email": {"type": "string", "description": "Recipient email address."},
                "subject": {"type": "string", "description": "Email subject line."},
                "body": {"type": "string", "description": "Email body (text or HTML)."},
            },
            "required": ["to_email", "subject", "body"],
        },
    },
    {
        "name": "send_telegram_message",
        "description": (
            "Send a Telegram message. Use for quick notifications and alerts to a "
            "known chat. chat_id is the numeric Telegram chat or user id."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "chat_id": {"type": "string", "description": "Telegram chat id or user id."},
                "message": {"type": "string", "description": "The message text to send."},
            },
            "required": ["chat_id", "message"],
        },
    },
    {
        "name": "fetch_razorpay_payments",
        "description": (
            "Fetch payment data from Razorpay. Use when the user asks about "
            "payments, orders, collections, or pending amounts. Returns recent "
            "payments with amount, status, contact, and timestamp."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                    "description": "Filter: 'paid' (captured), 'unpaid' (not captured), or 'all'.",
                    "enum": ["paid", "unpaid", "all"],
                    "default": "all",
                },
                "count": {
                    "type": "integer",
                    "description": "How many recent payments to fetch (max 100).",
                    "default": 20,
                },
            },
            "required": [],
        },
    },
    {
        "name": "write_sheets_data",
        "description": (
            "Append rows to a Google Sheet. Use to log results, record outcomes, or "
            "save a generated list. Each object in data becomes one row; keys of the "
            "first object define the column order."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "spreadsheet_id": {"type": "string", "description": "The Google Sheet ID."},
                "sheet_name": {
                    "type": "string",
                    "description": "Tab name to write to.",
                    "default": "Sheet1",
                },
                "data": {
                    "type": "array",
                    "description": "Rows to write, each an object of column->value.",
                    "items": {"type": "object"},
                },
                "mode": {
                    "type": "string",
                    "description": "'append' adds rows to the end. 'update' is not supported yet — use 'append'.",
                    "enum": ["append", "update"],
                    "default": "append",
                },
            },
            "required": ["spreadsheet_id", "data"],
        },
    },
    {
        "name": "generate_message",
        "description": (
            "Compose a personalised message from a context string and variables by "
            "substituting {placeholders}. Use when you need to draft message or email "
            "text before sending. This does not send anything — it returns the text."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "context": {
                    "type": "string",
                    "description": "The message text or template. Use {variable} placeholders.",
                },
                "tone": {
                    "type": "string",
                    "description": "Desired tone.",
                    "enum": ["formal", "friendly", "urgent"],
                    "default": "friendly",
                },
                "language": {
                    "type": "string",
                    "description": "Target language.",
                    "enum": ["english", "tamil"],
                    "default": "english",
                },
                "variables": {
                    "type": "object",
                    "description": "Key->value pairs substituted into {placeholders} in context.",
                },
            },
            "required": ["context"],
        },
    },
    {
        "name": "schedule_workflow",
        "description": (
            "Schedule this workflow to run automatically on a cron schedule. Use when "
            "the user wants something to repeat (e.g. 'every morning at 9'). Provide a "
            "standard 5-field cron expression."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "cron_expression": {
                    "type": "string",
                    "description": "5-field cron: 'minute hour day-of-month month day-of-week'. E.g. '0 9 * * *'.",
                },
                "workflow_name": {"type": "string", "description": "Short name for the scheduled workflow."},
                "description": {"type": "string", "description": "What the workflow does."},
            },
            "required": ["cron_expression", "workflow_name"],
        },
    },
    {
        "name": "fetch_gmail_emails",
        "description": (
            "Fetch emails from a Gmail inbox. Use when the user wants to process "
            "emails, check replies, or read messages. Requires a connected Gmail "
            "account."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Gmail search query, e.g. 'is:unread from:customer@x.com'.",
                    "default": "",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of emails to return.",
                    "default": 10,
                },
            },
            "required": [],
        },
    },
]

# Set of valid tool names, used by the executor to reject unknown calls fast.
TOOL_NAMES = {tool["name"] for tool in TOOLS_LIST}
