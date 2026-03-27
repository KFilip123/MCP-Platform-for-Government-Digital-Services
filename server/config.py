"""
server/config.py
────────────────────────────────────────────────────────────────────────────────
Central configuration module.

All environment variables are loaded here in ONE place.  Every other module
imports from this file rather than calling os.getenv() directly.  This keeps
secrets management tidy and makes it easy to swap .env for a secrets manager
later (e.g. AWS Secrets Manager, HashiCorp Vault).

IMPORTANT: credentials (username/password) are NEVER stored here.  They are
entered by the user at runtime in the browser and never touch Python code.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# ── Locate the project root (one level up from this file) ────────────────────
# This allows the app to resolve relative paths like "storage/session.enc"
# correctly regardless of which directory you run it from.
PROJECT_ROOT = Path(__file__).parent.parent.resolve()

# ── Load .env from the project root ──────────────────────────────────────────
# python-dotenv silently skips if the file doesn't exist, which is fine in CI.
load_dotenv(PROJECT_ROOT / ".env")


# ── Portal settings ───────────────────────────────────────────────────────────
PORTAL_BASE_URL: str = os.getenv("PORTAL_BASE_URL", "https://uslugi.gov.mk")

# ── Auth strategy ─────────────────────────────────────────────────────────────
# "browser" uses Playwright (recommended for portals with SSO / popups).
# "http" attempts a direct POST request (simple portals only).
AUTH_STRATEGY: str = os.getenv("AUTH_STRATEGY", "browser")

# ── Session / cookie storage ─────────────────────────────────────────────────
# Path to the encrypted cookie file, resolved relative to project root.
_session_file_rel = os.getenv("SESSION_FILE", "storage/session.enc")
SESSION_FILE: Path = PROJECT_ROOT / _session_file_rel

# ── Encryption key ────────────────────────────────────────────────────────────
# Raw string from .env; may be empty on first run.
# The SessionManager in auth/session.py handles key generation if missing.
COOKIE_ENCRYPTION_KEY: str = os.getenv("COOKIE_ENCRYPTION_KEY", "")

# ── Gemini ────────────────────────────────────────────────────────────────────
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "AIzaSyBl8R6DL0FJ4daUyNPkwVpwFHGAdMB0xYE")
GEMINI_MODEL: str = "gemini-2.5-flash"

# ── Login page URL ────────────────────────────────────────────────────────────
# Navigate to the portal homepage. It shows a "Најави се" (Login) button
# which redirects the browser to the eid.mk SSO provider automatically.
# We don't hardcode the eid.mk URL because it contains a dynamic wctx/timestamp
# that expires; letting the portal generate the redirect is more reliable.
LOGIN_URL: str = PORTAL_BASE_URL

# ── Post-login indicator URL ──────────────────────────────────────────────────
# After a successful eID login the SSO provider redirects back to:
#   https://uslugi.gov.mk/home.nspx
# We wait for any URL on uslugi.gov.mk that contains this path fragment.
POST_LOGIN_PATH: str = "uslugi.gov.mk"
