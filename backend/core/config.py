"""Typed settings — single source of truth for env. Never read os.environ directly."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Database (REQUIRED — no fallback) ──────────────────────────────
    DATABASE_URL: str

    # ── Security (REQUIRED — missing key crashes startup, never defaults) ─
    SECRET_KEY: str
    ENCRYPTION_KEY: str

    # ── Services (optional — empty means "not configured", surfaced at call time) ─
    RESEND_API_KEY: str = ""
    META_WHATSAPP_TOKEN: str = ""
    META_PHONE_NUMBER_ID: str = ""
    META_WABA_ID: str = ""
    META_VERIFY_TOKEN: str = "nerum_verify_2026"
    TELEGRAM_BOT_TOKEN: str = ""  # ONE canonical name, used everywhere
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""
    ADMIN_SECRET: str = ""
    FRONTEND_URL: str = "http://localhost:3000"  # CORS dev origin only
    # Public site origin the BROWSER is redirected to (OAuth callback, password
    # reset, email links). Defaults to prod so a stale/missing .env still works.
    APP_URL: str = "https://nerum.in"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # tolerate extra/legacy keys in .env
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
