from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from models.database import get_db, UserWebsite, User
from routes.auth import get_current_user
import os
import re
import json
import base64
from io import BytesIO

router = APIRouter(prefix="/websites", tags=["website-builder"])

TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "sites", "templates")

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
TEMPLATES_JSON_PATH = os.path.join(STATIC_DIR, "website_templates.json")

PLAN_TIERS = ["free", "starter", "starter_plus", "pro", "pro_plus"]

# Cached read of the website_templates.json catalog. We re-read if the file
# mtime changes so editors can hot-reload templates without restarting the app.
_TEMPLATES_CACHE = {"mtime": 0, "data": None}


def load_templates_catalog() -> list:
    """Read static/website_templates.json and return the list of templates."""
    try:
        mtime = os.path.getmtime(TEMPLATES_JSON_PATH)
    except OSError:
        return []
    if _TEMPLATES_CACHE["data"] is not None and _TEMPLATES_CACHE["mtime"] == mtime:
        return _TEMPLATES_CACHE["data"]
    try:
        with open(TEMPLATES_JSON_PATH, "r", encoding="utf-8") as f:
            payload = json.load(f)
        templates = payload.get("templates", []) if isinstance(payload, dict) else []
        if not isinstance(templates, list):
            templates = []
    except Exception:
        templates = []
    _TEMPLATES_CACHE["mtime"] = mtime
    _TEMPLATES_CACHE["data"] = templates
    return templates


def shape_template_for_api(t: dict, locked: bool) -> dict:
    """Map a raw JSON template entry to the API response shape."""
    return {
        "id": t.get("id"),
        "name": t.get("name"),
        "description": t.get("business_type", ""),
        "plan_tier": t.get("tier", "free"),
        "preview_color": t.get("preview_color", "#333"),
        "colors": t.get("colors", {}) or {},
        "tags": t.get("tags", []) or [],
        "popular": bool(t.get("popular", False)),
        "hero": t.get("hero", {}) or {},
        "services": t.get("services", []) or [],
        "locked": locked,
    }


def _build_ai_prompt(business_type: str, business_name: str, tagline: str,
                     phone: str, email: str, address: str,
                     services_list: list, brand_color: str) -> str:
    """Build the Claude prompt that asks for a unique, animated, business-specific website."""
    return f"""You are an expert web designer. Generate a complete, stunning, single-page HTML website for a {business_type} business.

BUSINESS DETAILS:
- Business Name: {business_name}
- Tagline: {tagline or f"The best {business_type} in town"}
- Phone: {phone}
- Email: {email or "contact@business.com"}
- Address: {address or "Chennai, Tamil Nadu"}
- Services: {", ".join(services_list) if services_list else "Our Services"}
- Brand Color: {brand_color}
- Business Type: {business_type}

DESIGN REQUIREMENTS:
1. Use {brand_color} as the primary brand color throughout
2. Create a UNIQUE design specifically for a {business_type} — not generic
3. Include CSS animations relevant to the business:
   - Restaurant: floating food particles, steam animation, fork/spoon SVG
   - Gym: pulsing energy rings, dumbbell SVG, progress bar animations
   - Clinic/Dental: heartbeat line animation, medical cross SVG, pulse effect
   - Jewellery: sparkling star animations, diamond SVG, shimmer effects
   - Salon/Beauty: floating petals, scissors SVG, color wave animations
   - Real Estate: building outline SVG, location pin pulse, house animation
   - Hotel: stars twinkling, key SVG, luxury shimmer
   - School/Coaching: floating books SVG, pencil animation, knowledge particles
   - Lawyer/CA: scales SVG animation, justice balance, professional pulse
   - Pharmacy: rotating medical cross, pill SVG, health pulse
   - Bakery: steam rising animation, bread/cake SVG, warm glow
   - Yoga/Spa: breathing circle animation, lotus SVG, zen ripple
   - Auto Service: rotating gear SVG, wrench animation, speedometer
   - Flower Shop: blooming flower SVG animation, petal fall
   - Event Planner: confetti animation, star burst, celebration SVG
   - For any other type: create a relevant SVG illustration and animation
4. Include these sections:
   - Hero section with business name, tagline, animated SVG illustration, CTA buttons (Call Now + WhatsApp)
   - Services section (show each service as a card with relevant emoji)
   - About section with business details
   - Contact section with phone, email, address, WhatsApp button
   - Footer with business name and "Powered by Nerum"
5. WhatsApp button must link to: https://wa.me/91{phone}
6. Call button must link to: tel:{phone}
7. Mobile responsive design
8. Use Google Fonts — pick a font that matches the business vibe
9. Add smooth scroll behavior
10. Hero background must use gradient with {brand_color}
11. All SVG illustrations must be inline (no external image URLs)
12. Make it look PROFESSIONAL enough that a real business owner would pay for it

Return ONLY the complete HTML document. No explanation, no markdown, no code blocks. Just raw HTML starting with <!DOCTYPE html>"""


def _ai_generate_site_html(template_id: str, business_name: str, tagline: str,
                           phone: str, email: str, address: str,
                           brand_color: str, services, logo_url: str = "") -> str:
    """Call Claude to generate a unique HTML website. Returns raw HTML (no markdown).

    Raises on API failure so callers can decide whether to fall back to a static template.
    """
    import anthropic

    # Pull template metadata from the JSON catalog for business_type context.
    template = next((t for t in load_templates_catalog() if t.get("id") == template_id), None)
    business_type = template["business_type"] if template else "Business"

    try:
        services_list = json.loads(services) if isinstance(services, str) and services.strip() else (services or [])
    except Exception:
        services_list = [s.strip() for s in str(services).split(",") if s.strip()]
    if not isinstance(services_list, list):
        services_list = []

    prompt = _build_ai_prompt(
        business_type=business_type,
        business_name=business_name or "Your Business",
        tagline=tagline or "",
        phone=phone or "",
        email=email or "",
        address=address or "",
        services_list=services_list,
        brand_color=brand_color or "#C50022",
    )

    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    message = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )

    html = message.content[0].text.strip()
    # Strip ``` fences if the model wrapped the HTML despite instructions.
    if html.startswith("```"):
        html = html.split("\n", 1)[1] if "\n" in html else html[3:]
        html = html.rsplit("```", 1)[0]
        html = html.strip()
    return html

TEMPLATE_CATALOG = {
    "free": [
        {"id": f"free_{i}", "name": f"Free Template {i}", "plan_tier": "free",
         "preview_css_class": f"preview-free-{i}",
         "description": "Clean static layout, ideal for basic info pages."}
        for i in range(1, 11)
    ],
    "starter": [
        {"id": f"starter_{i}", "name": f"Starter Template {i}", "plan_tier": "starter",
         "preview_css_class": f"preview-starter-{i}",
         "description": "Animated layout with smooth scroll effects."}
        for i in range(1, 11)
    ],
    "starter_plus": [
        {"id": f"starter_plus_{i}", "name": f"Starter+ Template {i}", "plan_tier": "starter_plus",
         "preview_css_class": f"preview-starter-plus-{i}",
         "description": "Animated layout with built-in chatbot integration."}
        for i in range(1, 11)
    ],
    "pro": [
        {"id": f"pro_{i}", "name": f"Pro Template {i}", "plan_tier": "pro",
         "preview_css_class": f"preview-pro-{i}",
         "description": "Cinematic 3D experience with GSAP animations."}
        for i in range(1, 11)
    ],
    "pro_plus": [
        {"id": f"pro_plus_{i}", "name": f"Pro+ Template {i}", "plan_tier": "pro_plus",
         "preview_css_class": f"preview-pro-plus-{i}",
         "description": "Premium cinematic experience with chatbot."}
        for i in range(1, 11)
    ],
}


def get_plan_tier_from_template(template_id: str) -> str:
    if template_id.startswith("pro_plus_"):
        return "pro_plus"
    if template_id.startswith("pro_"):
        return "pro"
    if template_id.startswith("starter_plus_"):
        return "starter_plus"
    if template_id.startswith("starter_"):
        return "starter"
    if template_id.startswith("free_"):
        return "free"
    return "free"


def normalize_user_plan(plan: str) -> str:
    if not plan:
        return "free"
    p = plan.lower().strip()
    aliases = {
        "starter+": "starter_plus",
        "starterplus": "starter_plus",
        "starter_plus": "starter_plus",
        "pro+": "pro_plus",
        "proplus": "pro_plus",
        "pro_plus": "pro_plus",
        "agency": "pro_plus",
        "business": "pro_plus",
    }
    if p in aliases:
        return aliases[p]
    if p in PLAN_TIERS:
        return p
    return "free"


def user_can_use_tier(user_plan: str, template_tier: str) -> bool:
    user_tier = normalize_user_plan(user_plan)
    return user_tier == template_tier


def render_template(template_id: str, site: dict) -> str:
    template_path = os.path.join(TEMPLATES_DIR, f"{template_id}.html")
    if not os.path.exists(template_path):
        fallback = template_id.split("_")[0] + "_1.html"
        template_path = os.path.join(TEMPLATES_DIR, fallback)
        if not os.path.exists(template_path):
            template_path = os.path.join(TEMPLATES_DIR, "free_1.html")
    with open(template_path, "r", encoding="utf-8") as f:
        html = f.read()

    business_name = site.get("business_name", "") or ""
    tagline = site.get("tagline", "") or ""
    phone = site.get("phone", "") or ""
    email = site.get("email", "") or ""
    address = site.get("address", "") or ""
    brand_color = site.get("brand_color", "#C50022") or "#C50022"
    logo_url = site.get("logo_url", "") or ""
    logo_data = site.get("logo_data", "") or ""
    chatbot_embed_id = site.get("chatbot_embed_id", "") or ""
    plan_tier = site.get("plan_tier", "free") or "free"
    services_raw = site.get("services", "") or ""

    try:
        services_arr = json.loads(services_raw) if services_raw else []
        if not isinstance(services_arr, list):
            services_arr = []
    except Exception:
        services_arr = [s.strip() for s in str(services_raw).split(",") if s.strip()]

    logo_src = logo_data if logo_data else logo_url

    phone_clean = re.sub(r"[^0-9]", "", phone)
    if phone_clean.startswith("0"):
        phone_clean = phone_clean[1:]
    whatsapp_link = f"https://wa.me/91{phone_clean}" if phone_clean else "#"

    brand_color_light = (brand_color + "22") if brand_color.startswith("#") else "#C5002222"

    services_list_html = "".join(
        f'<li>{_escape_html(s)}</li>' for s in services_arr if s
    )
    services_cards_html = "".join(
        f'<div class="service-card"><h3>{_escape_html(s)}</h3><p>Professional service tailored for you.</p></div>'
        for s in services_arr if s
    )

    chatbot_script = f'<script src="https://nerum.in/widget/{chatbot_embed_id}.js"></script>' if chatbot_embed_id else ""

    if plan_tier in ("free", "starter", "starter_plus"):
        nerum_branding = '<a href="https://nerum.in" target="_blank" style="display:inline-block;margin-top:12px;padding:6px 14px;background:rgba(197,0,34,0.12);color:#C50022;text-decoration:none;border-radius:14px;font-size:11px;font-weight:600;letter-spacing:0.4px">Made with Nerum</a>'
    else:
        nerum_branding = ""

    year = str(datetime.utcnow().year)

    replacements = {
        "{{business_name}}": _escape_html(business_name) or "Your Business",
        "{{tagline}}": _escape_html(tagline) or "Welcome to our website",
        "{{phone}}": _escape_html(phone),
        "{{email}}": _escape_html(email),
        "{{address}}": _escape_html(address),
        "{{brand_color}}": brand_color,
        "{{brand_color_light}}": brand_color_light,
        "{{logo_url}}": logo_src,
        "{{services_list}}": services_list_html,
        "{{services_cards}}": services_cards_html,
        "{{year}}": year,
        "{{whatsapp_link}}": whatsapp_link,
        "{{chatbot_script}}": chatbot_script,
        "{{nerum_branding}}": nerum_branding,
    }

    for k, v in replacements.items():
        html = html.replace(k, v)

    return html


def _escape_html(s: str) -> str:
    if not s:
        return ""
    return (
        str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        .replace('"', "&quot;").replace("'", "&#39;")
    )


def validate_slug(slug: str) -> bool:
    if not slug:
        return False
    if not (3 <= len(slug) <= 50):
        return False
    return bool(re.match(r"^[a-z0-9][a-z0-9\-]*[a-z0-9]$", slug))


def site_to_dict(s: UserWebsite) -> dict:
    return {
        "id": s.id,
        "slug": s.slug,
        "plan_tier": s.plan_tier,
        "template_id": s.template_id,
        "business_name": s.business_name,
        "tagline": s.tagline,
        "phone": s.phone,
        "email": s.email,
        "address": s.address,
        "services": s.services,
        "brand_color": s.brand_color,
        "logo_url": s.logo_url,
        "logo_data": s.logo_data,
        "chatbot_embed_id": s.chatbot_embed_id,
        "is_published": bool(s.is_published),
        "is_active": bool(s.is_active),
        "views": s.views or 0,
        "expires_at": s.expires_at.isoformat() if s.expires_at else None,
        "url": f"https://nerum.in/s/{s.slug}",
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }


@router.get("/templates")
def list_templates(current_user: User = Depends(get_current_user)):
    """Return the real template catalog from static/website_templates.json,
    split into `available` (at or below user's plan tier) and `locked` (above)."""
    user_tier = normalize_user_plan(current_user.plan)
    user_idx = PLAN_TIERS.index(user_tier) if user_tier in PLAN_TIERS else 0

    catalog = load_templates_catalog()
    available, locked = [], []
    for t in catalog:
        tier = t.get("tier", "free")
        tier_idx = PLAN_TIERS.index(tier) if tier in PLAN_TIERS else 0
        is_locked = tier_idx > user_idx
        shaped = shape_template_for_api(t, locked=is_locked)
        (locked if is_locked else available).append(shaped)

    return {
        "user_plan": user_tier,
        "available": available,
        "locked": locked,
    }


@router.get("/check-slug/{slug}")
def check_slug(slug: str, db: Session = Depends(get_db)):
    slug = (slug or "").lower().strip()
    if not validate_slug(slug):
        return {"available": False, "reason": "invalid"}
    existing = db.query(UserWebsite).filter(UserWebsite.slug == slug).first()
    return {"available": existing is None}

@router.get("/website-builder")
async def website_builder_page():
    return FileResponse("static/website_builder.html")


@router.post("/create")
def create_website(data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    template_id = (data.get("template_id") or "").strip()
    slug = (data.get("slug") or "").lower().strip()

    if not template_id:
        raise HTTPException(status_code=400, detail="template_id is required")
    if not validate_slug(slug):
        raise HTTPException(status_code=400, detail="Invalid slug. Use lowercase letters, numbers and hyphens (3-50 chars).")

    existing = db.query(UserWebsite).filter(UserWebsite.slug == slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="This slug is already taken. Please choose another.")

    tier = get_plan_tier_from_template(template_id)
    if not user_can_use_tier(current_user.plan, tier):
        raise HTTPException(
            status_code=403,
            detail=f"Your current plan does not allow {tier} templates. Please upgrade."
        )

    services_val = data.get("services", "")
    if isinstance(services_val, list):
        services_val = json.dumps(services_val)

    expires_at = None
    if tier == "free":
        expires_at = datetime.utcnow() + timedelta(days=30)

    site = UserWebsite(
        user_id=current_user.id,
        slug=slug,
        plan_tier=tier,
        template_id=template_id,
        business_name=(data.get("business_name") or "").strip(),
        tagline=(data.get("tagline") or "").strip(),
        phone=(data.get("phone") or "").strip(),
        email=(data.get("email") or "").strip(),
        address=(data.get("address") or "").strip(),
        services=services_val or "",
        brand_color=(data.get("brand_color") or "#C50022").strip(),
        logo_url=(data.get("logo_url") or "").strip(),
        logo_data=data.get("logo_data") or "",
        chatbot_embed_id=(data.get("chatbot_embed_id") or "").strip(),
        is_published=True,
        is_active=True,
        expires_at=expires_at,
        views=0,
    )

    # Always keep a static-template render as a safety net.
    rendered = render_template(template_id, {
        "business_name": site.business_name,
        "tagline": site.tagline,
        "phone": site.phone,
        "email": site.email,
        "address": site.address,
        "services": site.services,
        "brand_color": site.brand_color,
        "logo_url": site.logo_url,
        "logo_data": site.logo_data,
        "chatbot_embed_id": site.chatbot_embed_id,
        "plan_tier": site.plan_tier,
    })
    site.published_html = rendered

    # Generate the unique, animated, business-specific website via Claude and
    # store it on the record so /s/{slug} can serve it instantly.
    try:
        ai_html = _ai_generate_site_html(
            template_id=site.template_id,
            business_name=site.business_name,
            tagline=site.tagline,
            phone=site.phone,
            email=site.email,
            address=site.address,
            brand_color=site.brand_color,
            services=site.services,
            logo_url=site.logo_url,
        )
        site.generated_html = ai_html
    except Exception as e:
        print(f"[create] AI generation failed for slug={slug}, using static template: {e}")
        site.generated_html = rendered

    db.add(site)
    db.commit()
    db.refresh(site)

    embed_code = f'<iframe src="https://nerum.in/s/{slug}" style="width:100%;height:100vh;border:0"></iframe>'

    return {
        "id": site.id,
        "slug": site.slug,
        "url": f"https://nerum.in/s/{site.slug}",
        "embed_code": embed_code,
        "expires_at": site.expires_at.isoformat() if site.expires_at else None,
    }


@router.get("/my-websites")
def my_websites(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sites = db.query(UserWebsite).filter(
        UserWebsite.user_id == current_user.id,
        UserWebsite.is_active == True,
    ).order_by(UserWebsite.created_at.desc()).all()
    return {"websites": [site_to_dict(s) for s in sites]}


@router.get("/{website_id}")
def get_website(website_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    site = db.query(UserWebsite).filter(
        UserWebsite.id == website_id,
        UserWebsite.user_id == current_user.id,
    ).first()
    if not site:
        raise HTTPException(status_code=404, detail="Website not found")
    return site_to_dict(site)


@router.put("/{website_id}")
def update_website(website_id: int, data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    site = db.query(UserWebsite).filter(
        UserWebsite.id == website_id,
        UserWebsite.user_id == current_user.id,
    ).first()
    if not site:
        raise HTTPException(status_code=404, detail="Website not found")

    new_slug = data.get("slug")
    if new_slug and new_slug != site.slug:
        new_slug = new_slug.lower().strip()
        if not validate_slug(new_slug):
            raise HTTPException(status_code=400, detail="Invalid slug")
        clash = db.query(UserWebsite).filter(UserWebsite.slug == new_slug, UserWebsite.id != site.id).first()
        if clash:
            raise HTTPException(status_code=400, detail="Slug is already taken.")
        site.slug = new_slug

    new_template = data.get("template_id")
    if new_template and new_template != site.template_id:
        tier = get_plan_tier_from_template(new_template)
        if not user_can_use_tier(current_user.plan, tier):
            raise HTTPException(status_code=403, detail="Plan does not allow this template tier.")
        site.template_id = new_template
        site.plan_tier = tier

    for field in ["business_name", "tagline", "phone", "email", "address", "brand_color", "logo_url", "logo_data", "chatbot_embed_id"]:
        if field in data and data[field] is not None:
            setattr(site, field, str(data[field]).strip() if isinstance(data[field], str) else data[field])

    if "services" in data:
        s = data["services"]
        site.services = json.dumps(s) if isinstance(s, list) else (s or "")

    rendered = render_template(site.template_id, {
        "business_name": site.business_name,
        "tagline": site.tagline,
        "phone": site.phone,
        "email": site.email,
        "address": site.address,
        "services": site.services,
        "brand_color": site.brand_color,
        "logo_url": site.logo_url,
        "logo_data": site.logo_data,
        "chatbot_embed_id": site.chatbot_embed_id,
        "plan_tier": site.plan_tier,
    })
    site.published_html = rendered

    # Regenerate the AI version so edits show up on the live site.
    try:
        site.generated_html = _ai_generate_site_html(
            template_id=site.template_id,
            business_name=site.business_name,
            tagline=site.tagline,
            phone=site.phone,
            email=site.email,
            address=site.address,
            brand_color=site.brand_color,
            services=site.services,
            logo_url=site.logo_url,
        )
    except Exception as e:
        print(f"[update] AI generation failed for site_id={site.id}, keeping static: {e}")
        if not site.generated_html:
            site.generated_html = rendered

    site.is_published = True
    site.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(site)
    return site_to_dict(site)


@router.delete("/{website_id}")
def delete_website(website_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    site = db.query(UserWebsite).filter(
        UserWebsite.id == website_id,
        UserWebsite.user_id == current_user.id,
    ).first()
    if not site:
        raise HTTPException(status_code=404, detail="Website not found")
    site.is_active = False
    db.commit()
    return {"message": "Website deleted"}


@router.post("/generate-qr/{website_id}")
def generate_qr(website_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    site = db.query(UserWebsite).filter(
        UserWebsite.id == website_id,
        UserWebsite.user_id == current_user.id,
    ).first()
    if not site:
        raise HTTPException(status_code=404, detail="Website not found")

    url = f"https://nerum.in/s/{site.slug}"
    try:
        import qrcode
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = BytesIO()
        img.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode("ascii")
        return {"qr": f"data:image/png;base64,{b64}", "url": url}
    except ImportError:
        # qrcode not installed — return Google Charts fallback
        from urllib.parse import quote
        return {
            "qr": f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={quote(url)}",
            "url": url,
            "fallback": True,
        }


def _expired_page_html(business_name: str) -> str:
    name = _escape_html(business_name or "Your Website")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Website Expired · Nerum</title>
<style>
  *{{margin:0;padding:0;box-sizing:border-box}}
  body{{background:#0a0010;color:#fff;font-family:system-ui,-apple-system,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}}
  .card{{max-width:520px;width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(197,0,34,0.3);border-radius:24px;padding:48px 32px;text-align:center}}
  .logo{{font-size:36px;font-weight:800;color:#C50022;letter-spacing:1px;margin-bottom:20px}}
  .icon{{font-size:64px;margin-bottom:16px}}
  h1{{font-size:24px;font-weight:700;margin-bottom:12px}}
  .biz{{font-size:14px;color:rgba(255,255,255,0.6);margin-bottom:24px;padding:10px 14px;background:rgba(255,255,255,0.04);border-radius:10px;display:inline-block}}
  p{{color:rgba(255,255,255,0.65);line-height:1.6;margin-bottom:28px;font-size:14px}}
  a.cta{{display:inline-block;padding:14px 32px;background:#C50022;color:#fff;text-decoration:none;border-radius:30px;font-weight:700;font-size:14px;box-shadow:0 0 24px rgba(197,0,34,0.4);transition:transform 0.2s}}
  a.cta:hover{{transform:translateY(-2px)}}
  .foot{{margin-top:24px;font-size:11px;color:rgba(255,255,255,0.3)}}
</style>
</head>
<body>
  <div class="card">
    <div class="logo">NERUM</div>
    <div class="icon">⏱️</div>
    <h1>This website has expired</h1>
    <div class="biz">{name}</div>
    <p>The free plan is valid for 30 days. Upgrade your plan to keep this site live and remove expiry.</p>
    <a class="cta" href="https://nerum.in/billing">Upgrade to keep your site live →</a>
    <div class="foot">© {datetime.utcnow().year} Nerum</div>
  </div>
</body>
</html>"""


async def serve_site(slug: str, db: Session = Depends(get_db)):
    site = db.query(UserWebsite).filter(UserWebsite.slug == slug).first()
    if not site or not site.is_active or not site.is_published:
        return HTMLResponse(
            content="<h1 style='font-family:sans-serif;text-align:center;padding:60px;background:#0a0010;color:#fff;margin:0;min-height:100vh'>404 — Website not found</h1>",
            status_code=404,
        )

    if site.plan_tier == "free" and site.expires_at and site.expires_at < datetime.utcnow():
        return HTMLResponse(content=_expired_page_html(site.business_name), status_code=410)

    site.views = (site.views or 0) + 1
    db.commit()

    # Prefer the AI-generated HTML; fall back to the cached static render,
    # and finally to a fresh static render if both are missing.
    html = (
        getattr(site, "generated_html", None)
        or site.published_html
        or render_template(site.template_id, {
            "business_name": site.business_name,
            "tagline": site.tagline,
            "phone": site.phone,
            "email": site.email,
            "address": site.address,
            "services": site.services,
            "brand_color": site.brand_color,
            "logo_url": site.logo_url,
            "logo_data": site.logo_data,
            "chatbot_embed_id": site.chatbot_embed_id,
            "plan_tier": site.plan_tier,
        })
    )
    return HTMLResponse(content=html, status_code=200)


@router.post("/preview")
async def preview_website(data: dict, current_user: User = Depends(get_current_user)):
    """AI-generated preview using Claude. Returns {html: str}."""
    template_id = (data.get("template_id") or "").strip()
    business_name = data.get("business_name", "Your Business") or "Your Business"
    tagline = data.get("tagline", "") or ""
    phone = data.get("phone", "") or ""
    email = data.get("email", "") or ""
    address = data.get("address", "") or ""
    brand_color = data.get("brand_color", "#C50022") or "#C50022"
    services = data.get("services", "[]")
    logo_url = data.get("logo_url", "") or ""

    try:
        html = _ai_generate_site_html(
            template_id=template_id,
            business_name=business_name,
            tagline=tagline,
            phone=phone,
            email=email,
            address=address,
            brand_color=brand_color,
            services=services,
            logo_url=logo_url,
        )
        return {"html": html}
    except Exception as e:
        # Fallback to the existing static template renderer so the UI is never blank.
        print(f"[preview] AI generation failed, falling back to static template: {e}")
        fallback_id = template_id or "free_1"
        rendered = render_template(fallback_id, {
            "business_name": business_name,
            "tagline": tagline,
            "phone": phone,
            "email": email,
            "address": address,
            "services": services,
            "brand_color": brand_color,
            "logo_url": logo_url,
            "logo_data": data.get("logo_data", ""),
            "chatbot_embed_id": data.get("chatbot_embed_id", ""),
            "plan_tier": get_plan_tier_from_template(fallback_id),
        })
        return {"html": rendered, "ai_error": str(e)}
