"""
institutions/crm/config.py
────────────────────────────────────────────────────────────────────────────────
Configuration constants for crm.com.mk.

reCAPTCHA note:
  Unlike uslugi (one-time SSO login → saved cookies), crm.com.mk requires a
  live reCAPTCHA token on every API call. We solve this by keeping a single
  persistent Playwright browser open for the lifetime of the MCP server process
  and routing all tool calls through it. No cookies are saved to disk.
"""

from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

# ── URLs ──────────────────────────────────────────────────────────────────────

BASE_URL = "https://www.crm.com.mk"

# The Angular page that initialises reCAPTCHA and hosts the search widget.
SEARCH_PAGE_URL = (
    f"{BASE_URL}/mk/otvoreni-podatotsi/osnoven-profil-na-registriran-subjekt"
)

# All data calls go through this prefix.
API_BASE = f"{BASE_URL}/CRMPublicPortalApi/api"

# ── Browser settings ──────────────────────────────────────────────────────────

# Set to False to watch the browser window (useful for debugging selector issues).
HEADLESS = True

# Milliseconds to wait for an intercepted API response before raising TimeoutError.
RESPONSE_TIMEOUT_MS = 15_000

# Milliseconds between keystrokes when typing into the search box.
# A small delay makes the input look human to reCAPTCHA.
TYPING_DELAY_MS = 80

# Milliseconds to wait after typing before assuming the API call has been made.
# Angular debounces the search input; 1 second is enough for any debounce + round-trip.
POST_TYPE_SETTLE_MS = 1_000
