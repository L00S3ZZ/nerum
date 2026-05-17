from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from models.database import SessionLocal, User, DashboardList, DashboardRecord, WorkflowRun
from jose import jwt, JWTError
from datetime import datetime, date
from security import (
    check_tokens, deduct_tokens, token_error_message,
    get_list_limit, get_list_row_limit, sanitize_input,
    check_content, validate_phone, get_daily_limit
)
import os
import json
import httpx

router = APIRouter()
SECRET_KEY = os.environ.get("SECRET_KEY", "nerum-secret-key-2026")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        email = payload.get("sub")
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def check_daily_msg_limit(user: User, action: str, db: Session) -> bool:
    limit = get_daily_limit(user.plan, action)
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_runs = db.query(WorkflowRun).filter(
        WorkflowRun.user_id == user.id,
        WorkflowRun.action == action,
        WorkflowRun.ran_at >= today_start
    ).count()
    return today_runs < limit

BUSINESS_TEMPLATES = {
    "school": {
        "label": "🏫 School / Coaching",
        "use_cases": [
            {"id": "fee_reminder", "label": "💰 Fee Payment Reminder", "condition_field": "fee_status", "condition_value": "Unpaid", "message": "Dear {name}, the school fee of ₹{fee_amount} for {student_name} is due by {due_date}. Please pay at the earliest."},
            {"id": "exam_result", "label": "📝 Exam Result", "condition_field": "result_status", "condition_value": "Ready", "message": "Dear {name}, {student_name}'s exam results are now available. Please visit the school to collect the report card."},
            {"id": "class_reminder", "label": "📅 Class Reminder", "condition_field": "fee_status", "condition_value": "Paid", "message": "Dear {name}, reminder that {student_name}'s class is tomorrow. Please ensure timely attendance."},
            {"id": "holiday", "label": "🎉 Holiday Notice", "condition_field": "fee_status", "condition_value": "Paid", "message": "Dear {name}, school will remain closed tomorrow. Classes will resume as scheduled."},
            {"id": "meeting", "label": "👨‍👩‍👧 Parent Meeting", "condition_field": "fee_status", "condition_value": "Paid", "message": "Dear {name}, you are invited to the Parent-Teacher meeting. Please contact the school for details."},
        ],
        "fields": ["student_name", "class", "fee_amount", "fee_status", "due_date", "contact"]
    },
    "clinic": {
        "label": "🏥 Clinic / Hospital",
        "use_cases": [
            {"id": "appointment", "label": "📅 Appointment Reminder", "condition_field": "reminded", "condition_value": "No", "message": "Dear {name}, your appointment with Dr. {doctor} is on {appointment_date} at {appointment_time}. Please arrive 10 minutes early."},
            {"id": "followup", "label": "🔄 Follow-up Reminder", "condition_field": "visit_status", "condition_value": "Completed", "message": "Dear {name}, Dr. {doctor} recommends a follow-up visit. Please call us to schedule your next appointment."},
            {"id": "results", "label": "🧪 Test Results Ready", "condition_field": "visit_status", "condition_value": "Scheduled", "message": "Dear {name}, your test results are ready. Please visit the clinic to collect them."},
        ],
        "fields": ["patient_name", "doctor", "appointment_date", "appointment_time", "reminded", "contact"]
    },
    "shop": {
        "label": "🛒 Shop / E-commerce",
        "use_cases": [
            {"id": "payment_reminder", "label": "💰 Payment Reminder", "condition_field": "payment_status", "condition_value": "Pending", "message": "Dear {name}, your payment of ₹{amount} for order #{order_id} is pending. Please pay to avoid cancellation."},
            {"id": "order_confirm", "label": "📦 Order Confirmation", "condition_field": "payment_status", "condition_value": "Paid", "message": "Dear {name}, your order #{order_id} for {product} is confirmed! Total: ₹{amount}. Expected delivery: {delivery_date}."},
            {"id": "shipping", "label": "🚚 Shipping Update", "condition_field": "payment_status", "condition_value": "Shipped", "message": "Dear {name}, your order #{order_id} ({product}) has been shipped! Expected delivery: {delivery_date}."},
            {"id": "feedback", "label": "⭐ Feedback Request", "condition_field": "payment_status", "condition_value": "Delivered", "message": "Dear {name}, thank you for purchasing {product}! We'd love your feedback. Reply to rate your experience."},
        ],
        "fields": ["customer_name", "order_id", "product", "amount", "payment_status", "delivery_date"]
    },
    "restaurant": {
        "label": "🍕 Restaurant / Food",
        "use_cases": [
            {"id": "order_ready", "label": "🍽️ Order Ready", "condition_field": "order_status", "condition_value": "Ready", "message": "Dear {name}, your order #{order_id} is ready! Items: {items}. Total: ₹{amount}. Table: {table_no}."},
            {"id": "order_confirm", "label": "✅ Order Confirmed", "condition_field": "order_status", "condition_value": "Pending", "message": "Dear {name}, your order #{order_id} has been received! Items: {items}. Total: ₹{amount}."},
            {"id": "offer", "label": "🎉 Special Offer", "condition_field": "order_status", "condition_value": "Delivered", "message": "Dear {name}, thank you for dining with us! Here's a special offer for your next visit."},
        ],
        "fields": ["customer_name", "order_id", "items", "amount", "order_status", "table_no"]
    },
    "realestate": {
        "label": "🏠 Real Estate",
        "use_cases": [
            {"id": "emi_reminder", "label": "💰 EMI Reminder", "condition_field": "emi_status", "condition_value": "Pending", "message": "Dear {name}, your EMI of ₹{emi_amount} for {property} is due on {emi_due_date}. Please ensure timely payment."},
            {"id": "overdue", "label": "⚠️ Overdue Alert", "condition_field": "emi_status", "condition_value": "Overdue", "message": "Dear {name}, your EMI of ₹{emi_amount} for {property} is overdue. Please contact {agent_name} immediately."},
            {"id": "site_visit", "label": "🏗️ Site Visit Reminder", "condition_field": "emi_status", "condition_value": "Scheduled", "message": "Dear {name}, your site visit for {property} is scheduled. Our agent {agent_name} will guide you."},
        ],
        "fields": ["client_name", "property", "emi_amount", "emi_due_date", "emi_status", "agent_name"]
    },
    "gym": {
        "label": "🏋️ Gym / Fitness",
        "use_cases": [
            {"id": "membership", "label": "💳 Membership Expiry", "condition_field": "membership_status", "condition_value": "Expiring", "message": "Dear {name}, your {membership_type} membership expires on {expiry_date}. Renew now at ₹{amount}!"},
            {"id": "expired", "label": "❌ Membership Expired", "condition_field": "membership_status", "condition_value": "Expired", "message": "Dear {name}, your gym membership has expired. Renew at ₹{amount} to continue your fitness journey!"},
            {"id": "attendance", "label": "📊 Attendance Alert", "condition_field": "membership_status", "condition_value": "Active", "message": "Dear {name}, we miss you at the gym! Come back and stay fit. Your trainer {trainer} is waiting!"},
        ],
        "fields": ["member_name", "membership_type", "expiry_date", "amount", "membership_status", "trainer"]
    },
    "company": {
        "label": "💼 Company / Office",
        "use_cases": [
            {"id": "deadline", "label": "⏰ Task Deadline", "condition_field": "task_status", "condition_value": "Pending", "message": "Hi {name}, the deadline for '{task_name}' is {deadline}. Current status: {task_status}. Please update your progress."},
            {"id": "overdue", "label": "🚨 Overdue Task", "condition_field": "task_status", "condition_value": "Overdue", "message": "Hi {name}, '{task_name}' is overdue since {deadline}. Please complete it urgently or escalate to your manager."},
            {"id": "meeting", "label": "📅 Meeting Reminder", "condition_field": "task_status", "condition_value": "In Progress", "message": "Hi {name}, reminder for today's meeting regarding '{task_name}'. Please prepare your updates."},
        ],
        "fields": ["employee_name", "department", "task_name", "deadline", "task_status", "priority"]
    },
    "custom": {
        "label": "✨ Custom Business",
        "use_cases": [
            {"id": "custom", "label": "⚡ Custom Message", "condition_field": "status", "condition_value": "Pending", "message": "Dear {name}, {notes}. Please contact us if you have any questions."},
        ],
        "fields": ["contact_name", "category", "amount", "status", "due_date", "notes"]
    }
}

# ─── GET BUSINESS TYPES ────────────────────────────────────────────────────────
@router.get("/business-types")
def get_business_types():
    return {
        "types": [
            {"id": key, "label": val["label"], "use_cases": val["use_cases"]}
            for key, val in BUSINESS_TEMPLATES.items()
        ]
    }

# ─── CREATE LIST ───────────────────────────────────────────────────────────────
@router.post("/lists")
def create_list(data: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # ✅ Plan list limit
    limit = get_list_limit(user.plan)
    current = db.query(DashboardList).filter(DashboardList.user_id == user.id).count()
    if current >= limit:
        raise HTTPException(status_code=403, detail=f"Smart List limit reached for {user.plan} plan ({limit} lists). Upgrade at nerum.in to create more.")

    business_type = data.get("business_type", "custom")
    template = BUSINESS_TEMPLATES.get(business_type, BUSINESS_TEMPLATES["custom"])
    use_case_id = data.get("use_case_id", "custom")
    use_case = next((u for u in template["use_cases"] if u["id"] == use_case_id), template["use_cases"][0])

    new_list = DashboardList(
        user_id=user.id,
        workflow_id=data.get("workflow_id", 0),
        name=sanitize_input(data.get("name", "My List"), 100),
        business_type=business_type,
        message_template=sanitize_input(data.get("message_template", use_case["message"]), 2000),
        condition_field=sanitize_input(data.get("condition_field", use_case["condition_field"]), 100),
        condition_value=sanitize_input(data.get("condition_value", use_case["condition_value"]), 100),
        schedule_time=data.get("schedule_time", "17:00"),
        schedule_type=data.get("schedule_type", "daily"),
        is_active=True,
        whatsapp_enabled=data.get("whatsapp_enabled", True),
        email_enabled=data.get("email_enabled", False),
        telegram_enabled=data.get("telegram_enabled", False),
    )
    db.add(new_list)
    db.commit()
    db.refresh(new_list)
    return {"id": new_list.id, "message": "List created!", "list": _list_to_dict(new_list)}

# ─── GET ALL LISTS ─────────────────────────────────────────────────────────────
@router.get("/lists")
def get_lists(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lists = db.query(DashboardList).filter(DashboardList.user_id == user.id).all()
    result = []
    for l in lists:
        total = db.query(DashboardRecord).filter(DashboardRecord.list_id == l.id).count()
        pending = db.query(DashboardRecord).filter(DashboardRecord.list_id == l.id, DashboardRecord.status == "pending").count()
        done = db.query(DashboardRecord).filter(DashboardRecord.list_id == l.id, DashboardRecord.status == "done").count()
        d = _list_to_dict(l)
        d["stats"] = {"total": total, "pending": pending, "done": done}
        result.append(d)
    return {"lists": result}

# ─── GET SINGLE LIST ───────────────────────────────────────────────────────────
@router.get("/lists/{list_id}")
def get_list(list_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lst = db.query(DashboardList).filter(DashboardList.id == list_id, DashboardList.user_id == user.id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    records = db.query(DashboardRecord).filter(DashboardRecord.list_id == list_id).order_by(DashboardRecord.created_at.desc()).all()
    return {
        "list": _list_to_dict(lst),
        "records": [_record_to_dict(r) for r in records],
        "fields": BUSINESS_TEMPLATES.get(lst.business_type, BUSINESS_TEMPLATES["custom"])["fields"]
    }

# ─── UPDATE LIST ───────────────────────────────────────────────────────────────
@router.put("/lists/{list_id}")
def update_list(list_id: int, data: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lst = db.query(DashboardList).filter(DashboardList.id == list_id, DashboardList.user_id == user.id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    for field in ["name", "message_template", "condition_field", "condition_value", "schedule_time", "schedule_type", "is_active", "whatsapp_enabled", "email_enabled", "telegram_enabled"]:
        if field in data:
            setattr(lst, field, data[field])
    db.commit()
    return {"message": "List updated!"}

# ─── DELETE LIST ───────────────────────────────────────────────────────────────
@router.delete("/lists/{list_id}")
def delete_list(list_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lst = db.query(DashboardList).filter(DashboardList.id == list_id, DashboardList.user_id == user.id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    db.query(DashboardRecord).filter(DashboardRecord.list_id == list_id).delete()
    db.delete(lst)
    db.commit()
    return {"message": "List deleted!"}

# ─── ADD RECORD ────────────────────────────────────────────────────────────────
@router.post("/lists/{list_id}/records")
def add_record(list_id: int, data: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lst = db.query(DashboardList).filter(DashboardList.id == list_id, DashboardList.user_id == user.id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    # ✅ Plan row limit
    row_limit = get_list_row_limit(user.plan)
    current = db.query(DashboardRecord).filter(DashboardRecord.list_id == list_id).count()
    if current >= row_limit:
        raise HTTPException(status_code=403, detail=f"Row limit reached ({row_limit} rows) for {user.plan} plan. Upgrade at nerum.in for more rows.")

    # ✅ Validate phone
    phone = data.get("phone", "")
    if phone and not validate_phone(phone):
        raise HTTPException(status_code=400, detail="Invalid phone number format. Use format: +91XXXXXXXXXX")

    record = DashboardRecord(
        list_id=list_id,
        user_id=user.id,
        name=sanitize_input(data.get("name", ""), 100),
        phone=sanitize_input(phone, 20),
        email=sanitize_input(data.get("email", ""), 200),
        fields=json.dumps({k: sanitize_input(str(v), 500) for k, v in data.items() if k not in ["name", "phone", "email"]}),
        status=data.get("status", "pending"),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id, "message": "Record added!"}

# ─── UPDATE RECORD ─────────────────────────────────────────────────────────────
@router.put("/lists/{list_id}/records/{record_id}")
def update_record(list_id: int, record_id: int, data: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(DashboardRecord).filter(DashboardRecord.id == record_id, DashboardRecord.user_id == user.id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    if "name" in data: record.name = sanitize_input(data["name"], 100)
    if "phone" in data:
        if data["phone"] and not validate_phone(data["phone"]):
            raise HTTPException(status_code=400, detail="Invalid phone number format")
        record.phone = sanitize_input(data["phone"], 20)
    if "email" in data: record.email = sanitize_input(data["email"], 200)
    if "status" in data: record.status = data["status"]
    existing_fields = json.loads(record.fields) if record.fields else {}
    for k, v in data.items():
        if k not in ["name", "phone", "email", "status"]:
            existing_fields[sanitize_input(k, 50)] = sanitize_input(str(v), 500)
    record.fields = json.dumps(existing_fields)
    record.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Record updated!"}

# ─── DELETE RECORD ─────────────────────────────────────────────────────────────
@router.delete("/lists/{list_id}/records/{record_id}")
def delete_record(list_id: int, record_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(DashboardRecord).filter(DashboardRecord.id == record_id, DashboardRecord.user_id == user.id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()
    return {"message": "Record deleted!"}

# ─── MANUAL RUN ────────────────────────────────────────────────────────────────
@router.post("/lists/{list_id}/run")
async def run_list(list_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lst = db.query(DashboardList).filter(DashboardList.id == list_id, DashboardList.user_id == user.id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    records = db.query(DashboardRecord).filter(DashboardRecord.list_id == list_id).all()
    pending_records = []
    for r in records:
        fields = json.loads(r.fields) if r.fields else {}
        field_value = fields.get(lst.condition_field, r.status)
        if field_value == lst.condition_value or r.status == "pending":
            pending_records.append(r)

    if not pending_records:
        return {"message": "No pending records found!", "sent": 0, "skipped": len(records)}

    # ✅ Check tokens for all messages upfront
    tokens_needed = len(pending_records) * 3  # 3 tokens per smart list message
    can_proceed, cost, remaining = check_tokens(user, "smart_list_msg")
    if remaining < tokens_needed:
        raise HTTPException(status_code=403, detail=f"Not enough tokens. Need {tokens_needed} tokens but have {remaining}. Upgrade at nerum.in.")

    sent = 0
    failed = 0

    for record in pending_records:
        fields = json.loads(record.fields) if record.fields else {}
        all_fields = {"name": record.name, "phone": record.phone, "email": record.email or "", **fields}

        # ✅ Format message
        message = lst.message_template
        for key, value in all_fields.items():
            message = message.replace(f"{{{key}}}", str(value))

        # ✅ Content filter
        if not check_content(message):
            failed += 1
            continue

        success = False

        # ✅ Send WhatsApp with daily limit check
        if lst.whatsapp_enabled and record.phone:
            if not check_daily_msg_limit(user, "whatsapp", db):
                failed += 1
                continue
            result = await send_whatsapp(record.phone, message)
            if "sent" in result:
                success = True

        # ✅ Send Email with daily limit check
        if lst.email_enabled and record.email:
            if not check_daily_msg_limit(user, "email", db):
                failed += 1
                continue
            result = await send_email(record.email, f"Message from {lst.name}", message)
            if "sent" in result:
                success = True

        if success:
            sent += 1
            record.last_message_sent = datetime.utcnow()
            record.message_count += 1
            # ✅ Deduct tokens per message sent
            user.tokens_used = (user.tokens_used or 0) + 3

            # ✅ Save to run history
            run = WorkflowRun(
                user_id=user.id,
                workflow_id=0,
                workflow_name=lst.name,
                action="whatsapp" if lst.whatsapp_enabled else "email",
                status="success",
                details=f"Smart List message sent to {record.name}",
                ran_at=datetime.utcnow()
            )
            db.add(run)
        else:
            failed += 1

    lst.last_run = datetime.utcnow()
    db.commit()

    from security import get_token_limit
    return {
        "message": f"Done! Sent {sent} messages",
        "sent": sent,
        "failed": failed,
        "skipped": len(records) - len(pending_records),
        "tokens_remaining": max(0, get_token_limit(user.plan) - user.tokens_used)
    }

# ─── SCHEDULED RUN ─────────────────────────────────────────────────────────────
async def run_scheduled_lists(db: Session):
    now = datetime.utcnow()
    current_time = now.strftime("%H:%M")

    lists = db.query(DashboardList).filter(
        DashboardList.is_active == True,
        DashboardList.schedule_time == current_time
    ).all()

    for lst in lists:
        user = db.query(User).filter(User.id == lst.user_id).first()
        if not user:
            continue

        # ✅ Check tokens before running
        from security import get_token_limit
        token_limit = get_token_limit(user.plan)
        if (user.tokens_used or 0) >= token_limit:
            print(f"⚠️ Skipping list {lst.name} — user {user.email} has no tokens left")
            continue

        records = db.query(DashboardRecord).filter(DashboardRecord.list_id == lst.id).all()

        for record in records:
            fields = json.loads(record.fields) if record.fields else {}
            field_value = fields.get(lst.condition_field, "")

            if field_value != lst.condition_value:
                continue

            # Don't send twice same day
            if record.last_message_sent:
                if record.last_message_sent.date() == now.date():
                    continue

            # ✅ Check tokens per record
            if (user.tokens_used or 0) + 3 > token_limit:
                print(f"⚠️ Token limit reached for user {user.email}")
                break

            all_fields = {"name": record.name, "phone": record.phone, **fields}
            message = lst.message_template
            for key, value in all_fields.items():
                message = message.replace(f"{{{key}}}", str(value))

            # ✅ Content filter
            if not check_content(message):
                continue

            if lst.whatsapp_enabled and record.phone:
                await send_whatsapp(record.phone, message)
                record.last_message_sent = datetime.utcnow()
                record.message_count += 1
                user.tokens_used = (user.tokens_used or 0) + 3

        lst.last_run = datetime.utcnow()

    db.commit()
    print(f"✅ Scheduled run at {current_time} — processed {len(lists)} lists")

# ─── HELPERS ──────────────────────────────────────────────────────────────────
async def send_whatsapp(to: str, message: str):
    TWILIO_SID = os.environ.get("TWILIO_ACCOUNT_SID")
    TWILIO_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
    TWILIO_FROM = os.environ.get("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")
    if not TWILIO_SID or not TWILIO_TOKEN:
        return "not configured"
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json",
                auth=(TWILIO_SID, TWILIO_TOKEN),
                data={"From": TWILIO_FROM, "To": f"whatsapp:{to}", "Body": message[:1600]}
            )
            return "sent" if res.status_code == 201 else f"error: {res.status_code}"
    except Exception as e:
        return f"error: {str(e)}"

async def send_email(to: str, subject: str, body: str):
    if not RESEND_API_KEY:
        return "not configured"
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json={"from": "Nerum <onboarding@resend.dev>", "to": [to], "subject": subject,
                      "html": f"<div style='font-family:sans-serif;padding:20px'><pre style='white-space:pre-wrap'>{body}</pre></div>"}
            )
            return "sent" if res.status_code == 200 else "error"
    except:
        return "error"

def _list_to_dict(l):
    return {
        "id": l.id, "name": l.name, "business_type": l.business_type,
        "message_template": l.message_template, "condition_field": l.condition_field,
        "condition_value": l.condition_value, "schedule_time": l.schedule_time,
        "schedule_type": l.schedule_type, "is_active": l.is_active,
        "whatsapp_enabled": l.whatsapp_enabled, "email_enabled": l.email_enabled,
        "telegram_enabled": l.telegram_enabled,
        "last_run": l.last_run.isoformat() if l.last_run else None,
        "created_at": l.created_at.isoformat() if l.created_at else None
    }

def _record_to_dict(r):
    return {
        "id": r.id, "name": r.name, "phone": r.phone, "email": r.email,
        "fields": json.loads(r.fields) if r.fields else {},
        "status": r.status, "message_count": r.message_count,
        "last_message_sent": r.last_message_sent.isoformat() if r.last_message_sent else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None
    }