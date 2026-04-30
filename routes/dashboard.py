from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from models.database import SessionLocal, User, DashboardList, DashboardRecord, WorkflowRun
from jose import jwt, JWTError
from datetime import datetime
from typing import Optional
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

# ─── BUSINESS TYPES & TEMPLATES ───────────────────────────────────────────────
BUSINESS_TEMPLATES = {
    "school": {
        "label": "🏫 School / Coaching",
        "use_cases": [
            {"id": "fee_reminder", "label": "💰 Fee Payment Reminder", "condition_field": "fee_status", "condition_value": "Unpaid", "message": "Dear {name}, this is a reminder that the school fee of ₹{fee_amount} for {student_name} is due. Please pay by {due_date}. Contact: {contact}"},
            {"id": "exam_result", "label": "📝 Exam Result", "condition_field": "result_status", "condition_value": "Pending", "message": "Dear {name}, {student_name}'s exam results are now available. Please visit the school to collect the report card."},
            {"id": "class_reminder", "label": "📅 Class Reminder", "condition_field": "attendance", "condition_value": "Active", "message": "Dear {name}, reminder that {student_name}'s class is tomorrow at {time}. Please ensure timely attendance."},
            {"id": "holiday", "label": "🎉 Holiday Announcement", "condition_field": "status", "condition_value": "Active", "message": "Dear {name}, {school_name} will remain closed on {date} due to {reason}. Classes will resume on {resume_date}."},
            {"id": "meeting", "label": "👨‍👩‍👧 Parent Meeting", "condition_field": "status", "condition_value": "Active", "message": "Dear {name}, you are invited to the Parent-Teacher meeting on {date} at {time}. Your ward {student_name}'s progress will be discussed."},
        ],
        "fields": ["student_name", "class", "fee_amount", "fee_status", "due_date", "contact"]
    },
    "clinic": {
        "label": "🏥 Clinic / Hospital",
        "use_cases": [
            {"id": "appointment", "label": "📅 Appointment Reminder", "condition_field": "reminded", "condition_value": "No", "message": "Dear {name}, your appointment with Dr. {doctor} is scheduled on {date} at {time}. Please arrive 10 minutes early."},
            {"id": "followup", "label": "🔄 Follow-up Reminder", "condition_field": "followup_status", "condition_value": "Pending", "message": "Dear {name}, Dr. {doctor} recommends a follow-up visit. Please call {contact} to schedule your appointment."},
            {"id": "medicine", "label": "💊 Medicine Reminder", "condition_field": "status", "condition_value": "Active", "message": "Dear {name}, reminder to take your {medicine} at {time}. Please do not miss your dose."},
            {"id": "results", "label": "🧪 Test Results Ready", "condition_field": "result_ready", "condition_value": "Yes", "message": "Dear {name}, your test results are ready. Please visit {clinic_name} to collect them or call {contact}."},
        ],
        "fields": ["patient_name", "doctor", "appointment_date", "appointment_time", "reminded", "contact"]
    },
    "shop": {
        "label": "🛒 Shop / E-commerce",
        "use_cases": [
            {"id": "order_confirm", "label": "📦 Order Confirmation", "condition_field": "confirmed", "condition_value": "No", "message": "Dear {name}, your order #{order_id} for {product} has been confirmed! Total: ₹{amount}. Expected delivery: {delivery_date}."},
            {"id": "shipping", "label": "🚚 Shipping Update", "condition_field": "shipping_status", "condition_value": "Shipped", "message": "Dear {name}, your order #{order_id} has been shipped! Track it here: {tracking_link}. Expected by {delivery_date}."},
            {"id": "payment_reminder", "label": "💰 Payment Reminder", "condition_field": "payment_status", "condition_value": "Pending", "message": "Dear {name}, your payment of ₹{amount} for order #{order_id} is pending. Please pay to avoid cancellation."},
            {"id": "feedback", "label": "⭐ Feedback Request", "condition_field": "feedback_sent", "condition_value": "No", "message": "Dear {name}, thank you for your purchase! We'd love your feedback on {product}. Reply to this message with your rating."},
        ],
        "fields": ["customer_name", "order_id", "product", "amount", "payment_status", "delivery_date"]
    },
    "restaurant": {
        "label": "🍕 Restaurant / Food",
        "use_cases": [
            {"id": "order_ready", "label": "🍽️ Order Ready", "condition_field": "order_status", "condition_value": "Ready", "message": "Dear {name}, your order is ready! {items}. Total: ₹{amount}. Table: {table_no}."},
            {"id": "booking_confirm", "label": "📅 Booking Confirmation", "condition_field": "booking_status", "condition_value": "Confirmed", "message": "Dear {name}, your table booking at {restaurant_name} is confirmed for {date} at {time} for {guests} guests."},
            {"id": "offer", "label": "🎉 Special Offer", "condition_field": "status", "condition_value": "Active", "message": "Dear {name}, special offer today at {restaurant_name}! {offer_details}. Valid till {valid_till}. Book now: {contact}."},
        ],
        "fields": ["customer_name", "order_id", "items", "amount", "table_no", "booking_date"]
    },
    "realestate": {
        "label": "🏠 Real Estate",
        "use_cases": [
            {"id": "emi_reminder", "label": "💰 EMI Reminder", "condition_field": "emi_status", "condition_value": "Pending", "message": "Dear {name}, your EMI of ₹{amount} for {property} is due on {due_date}. Please ensure timely payment to avoid penalties."},
            {"id": "site_visit", "label": "🏗️ Site Visit Reminder", "condition_field": "visit_status", "condition_value": "Scheduled", "message": "Dear {name}, your site visit for {property} is scheduled on {date} at {time}. Our agent {agent_name} will guide you."},
            {"id": "document", "label": "📄 Document Reminder", "condition_field": "doc_status", "condition_value": "Pending", "message": "Dear {name}, please submit {document_name} for {property} by {deadline}. Contact {agent_name}: {contact}."},
        ],
        "fields": ["client_name", "property", "amount", "due_date", "agent_name", "contact"]
    },
    "gym": {
        "label": "🏋️ Gym / Fitness",
        "use_cases": [
            {"id": "membership", "label": "💳 Membership Expiry", "condition_field": "membership_status", "condition_value": "Expiring", "message": "Dear {name}, your gym membership expires on {expiry_date}. Renew now at ₹{amount} to continue your fitness journey!"},
            {"id": "class_reminder", "label": "🧘 Class Reminder", "condition_field": "status", "condition_value": "Active", "message": "Dear {name}, your {class_name} class is tomorrow at {time}. See you at {gym_name}!"},
            {"id": "attendance", "label": "📊 Attendance Alert", "condition_field": "days_absent", "condition_value": "3+", "message": "Dear {name}, we miss you at {gym_name}! You haven't visited in {days_absent} days. Come back and stay fit!"},
        ],
        "fields": ["member_name", "membership_type", "expiry_date", "amount", "class_name", "trainer"]
    },
    "company": {
        "label": "💼 Company / Office",
        "use_cases": [
            {"id": "meeting", "label": "📅 Meeting Reminder", "condition_field": "reminded", "condition_value": "No", "message": "Hi {name}, reminder for the meeting: {meeting_title} on {date} at {time} in {location}. Please be on time."},
            {"id": "deadline", "label": "⏰ Task Deadline", "condition_field": "task_status", "condition_value": "Pending", "message": "Hi {name}, the deadline for {task_name} is {deadline}. Current status: {task_status}. Please update your progress."},
            {"id": "salary", "label": "💰 Salary Notification", "condition_field": "salary_sent", "condition_value": "Yes", "message": "Hi {name}, your salary of ₹{amount} for {month} has been credited to your account. Regards, {company_name}."},
        ],
        "fields": ["employee_name", "department", "task_name", "deadline", "meeting_title", "amount"]
    },
    "custom": {
        "label": "✨ Custom Business",
        "use_cases": [
            {"id": "custom", "label": "⚡ Custom Message", "condition_field": "status", "condition_value": "Pending", "message": "Dear {name}, {custom_message}"},
        ],
        "fields": ["name", "phone", "status", "custom_message"]
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

# ─── CREATE DASHBOARD LIST ─────────────────────────────────────────────────────
@router.post("/lists")
def create_list(data: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Plan limits
    plan_limits = {"free": 1, "starter": 5, "pro": 20, "business": 999}
    limit = plan_limits.get(user.plan.lower(), 1)
    current = db.query(DashboardList).filter(DashboardList.user_id == user.id).count()
    if current >= limit:
        raise HTTPException(status_code=403, detail=f"List limit reached for {user.plan} plan. Upgrade to create more.")

    business_type = data.get("business_type", "custom")
    template = BUSINESS_TEMPLATES.get(business_type, BUSINESS_TEMPLATES["custom"])
    use_case_id = data.get("use_case_id", "custom")
    use_case = next((u for u in template["use_cases"] if u["id"] == use_case_id), template["use_cases"][0])

    new_list = DashboardList(
        user_id=user.id,
        workflow_id=data.get("workflow_id", 0),
        name=data.get("name", "My List"),
        business_type=business_type,
        message_template=data.get("message_template", use_case["message"]),
        condition_field=data.get("condition_field", use_case["condition_field"]),
        condition_value=data.get("condition_value", use_case["condition_value"]),
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

# ─── GET SINGLE LIST WITH RECORDS ─────────────────────────────────────────────
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

    # Plan row limits
    plan_limits = {"free": 10, "starter": 100, "pro": 1000, "business": 999999}
    limit = plan_limits.get(user.plan.lower(), 10)
    current = db.query(DashboardRecord).filter(DashboardRecord.list_id == list_id).count()
    if current >= limit:
        raise HTTPException(status_code=403, detail=f"Row limit reached ({limit}) for {user.plan} plan. Upgrade for more rows.")

    record = DashboardRecord(
        list_id=list_id,
        user_id=user.id,
        name=data.get("name", ""),
        phone=data.get("phone", ""),
        email=data.get("email", ""),
        fields=json.dumps({k: v for k, v in data.items() if k not in ["name", "phone", "email"]}),
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
    if "name" in data: record.name = data["name"]
    if "phone" in data: record.phone = data["phone"]
    if "email" in data: record.email = data["email"]
    if "status" in data: record.status = data["status"]
    existing_fields = json.loads(record.fields) if record.fields else {}
    for k, v in data.items():
        if k not in ["name", "phone", "email", "status"]:
            existing_fields[k] = v
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

# ─── MANUAL RUN — send messages now ───────────────────────────────────────────
@router.post("/lists/{list_id}/run")
async def run_list(list_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lst = db.query(DashboardList).filter(DashboardList.id == list_id, DashboardList.user_id == user.id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    # Get records matching condition
    records = db.query(DashboardRecord).filter(DashboardRecord.list_id == list_id).all()
    pending_records = []
    for r in records:
        fields = json.loads(r.fields) if r.fields else {}
        field_value = fields.get(lst.condition_field, r.status)
        if field_value == lst.condition_value or r.status == "pending":
            pending_records.append(r)

    if not pending_records:
        return {"message": "No pending records found!", "sent": 0, "skipped": len(records)}

    # Check token limit
    tokens_needed = len(pending_records) * 5
    if user.token_limit - user.tokens_used < tokens_needed:
        raise HTTPException(status_code=403, detail=f"Not enough tokens. Need {tokens_needed}, have {user.token_limit - user.tokens_used}")

    sent = 0
    failed = 0

    for record in pending_records:
        fields = json.loads(record.fields) if record.fields else {}
        all_fields = {"name": record.name, "phone": record.phone, "email": record.email, **fields}

        # Format message
        message = lst.message_template
        for key, value in all_fields.items():
            message = message.replace(f"{{{key}}}", str(value))

        success = False

        # Send WhatsApp
        if lst.whatsapp_enabled and record.phone:
            result = await send_whatsapp(record.phone, message)
            if "sent" in result:
                success = True

        # Send Email
        if lst.email_enabled and record.email:
            result = await send_email(record.email, f"Message from {lst.name}", message)
            if "sent" in result:
                success = True

        if success:
            sent += 1
            record.last_message_sent = datetime.utcnow()
            record.message_count += 1
            user.tokens_used += 5
        else:
            failed += 1

    lst.last_run = datetime.utcnow()
    db.commit()

    return {
        "message": f"Done! Sent {sent} messages",
        "sent": sent,
        "failed": failed,
        "skipped": len(records) - len(pending_records)
    }

# ─── SCHEDULED RUN — called by cron ───────────────────────────────────────────
async def run_scheduled_lists(db: Session):
    now = datetime.utcnow()
    current_time = now.strftime("%H:%M")

    # Get all active lists scheduled for this time
    lists = db.query(DashboardList).filter(
        DashboardList.is_active == True,
        DashboardList.schedule_time == current_time
    ).all()

    for lst in lists:
        user = db.query(User).filter(User.id == lst.user_id).first()
        if not user:
            continue

        records = db.query(DashboardRecord).filter(
            DashboardRecord.list_id == lst.id
        ).all()

        for record in records:
            fields = json.loads(record.fields) if record.fields else {}
            field_value = fields.get(lst.condition_field, "")

            # Only send if condition matches
            if field_value != lst.condition_value:
                continue

            # Don't send twice in same day
            if record.last_message_sent:
                last_sent_date = record.last_message_sent.date()
                if last_sent_date == now.date():
                    continue

            all_fields = {"name": record.name, "phone": record.phone, **fields}
            message = lst.message_template
            for key, value in all_fields.items():
                message = message.replace(f"{{{key}}}", str(value))

            if lst.whatsapp_enabled and record.phone:
                await send_whatsapp(record.phone, message)
                record.last_message_sent = datetime.utcnow()
                record.message_count += 1

        lst.last_run = datetime.utcnow()

    db.commit()
    print(f"✅ Scheduled run complete at {current_time} — processed {len(lists)} lists")

# ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────────
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
                data={"From": TWILIO_FROM, "To": f"whatsapp:{to}", "Body": message}
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
                      "html": f"<div style='font-family:sans-serif;padding:20px'><p>{body.replace(chr(10), '<br>')}</p></div>"}
            )
            return "sent" if res.status_code == 200 else f"error"
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