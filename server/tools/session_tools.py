"""
server/tools/session_tools.py
────────────────────────────────────────────────────────────────────────────────
MCP tools for session lifecycle management:

  • login()         – Trigger authentication (browser or http strategy).
  • logout()        – Delete the stored session.
  • check_session() – Report whether a valid session exists.

Security contract (crucial for LLM safety):
  ─────────────────────────────────────────
  • Credentials (username, password) are NEVER passed as tool parameters.
    The LLM can call login() but cannot see or handle credentials.
  • For the browser strategy: the user types credentials directly in the
    browser window — this process never touches Python.
  • For the http strategy: credentials are collected via getpass() (reads from
    the terminal without echoing), not from the LLM conversation.
  • Cookies are stored encrypted on disk and are NEVER returned to the LLM in
    any tool response.
"""

import getpass
from typing import Literal

from server.auth.browser_auth import BrowserAuthenticator
from server.auth.http_auth import HttpAuthenticator
from server.auth.session import session_manager
from server.config import AUTH_STRATEGY


def login(strategy: str = AUTH_STRATEGY) -> dict:
    """
    Authenticate the user and persist the session cookies.

    The strategy defaults to the AUTH_STRATEGY env var ("browser" or "http").
    The LLM can request a specific strategy by passing it explicitly, but
    credentials are NEVER handled by the LLM.

    Args:
        strategy: "browser" (default) or "http".

    Returns:
        {
            "success": bool,
            "message": str,
            "strategy_used": str,
            "cookies_saved": int,  # number of cookies stored
        }
    """
    if strategy == "browser":
        return _login_browser()
    elif strategy == "http":
        return _login_http()
    else:
        return {
            "success": False,
            "message": f"Unknown strategy '{strategy}'. Use 'browser' or 'http'.",
            "strategy_used": strategy,
            "cookies_saved": 0,
        }


def logout() -> dict:
    """
    Delete the stored session cookies (log out).

    Returns:
        { "success": bool, "message": str }
    """
    had_session = session_manager.is_present()
    session_manager.clear()

    if had_session:
        return {"success": True, "message": "Logged out. Session cookies deleted."}
    else:
        return {"success": True, "message": "No active session to log out from."}


def check_session() -> dict:
    """
    Report whether a valid session exists on disk.

    Note: This only checks for the *presence* of the session file.  It does
    NOT make a network request to verify whether the server still accepts the
    cookies.  For a deep check you would call a protected endpoint and handle
    SessionExpiredError.

    Returns:
        {
            "active": bool,
            "saved_at": str | None,  # ISO-8601 timestamp of last login
            "message": str,
        }
    """
    active = session_manager.is_present()
    saved_at = session_manager.saved_at() if active else None

    if active:
        message = f"Session is active (saved at {saved_at})."
    else:
        message = "No active session. Call 'login' first."

    return {
        "active": active,
        "saved_at": saved_at,
        "message": message,
    }


# ── Private helpers ───────────────────────────────────────────────────────────

def _login_browser() -> dict:
    """
    Launch a Playwright browser, wait for user to log in, save cookies.
    """
    authenticator = BrowserAuthenticator()
    cookies = authenticator.run()  # Blocks until the user logs in or times out.

    if not cookies:
        return {
            "success": False,
            "message": "Browser authentication failed or timed out.",
            "strategy_used": "browser",
            "cookies_saved": 0,
        }

    session_manager.save(cookies)
    return {
        "success": True,
        "message": "Browser authentication successful. Session saved.",
        "strategy_used": "browser",
        "cookies_saved": len(cookies),
    }


def _login_http() -> dict:
    """
    Collect credentials securely via getpass() and attempt HTTP login.

    IMPORTANT: getpass() reads from the terminal and does NOT echo the input.
    Credentials are used within this function scope only and are never stored.
    """
    print("\n[Login] HTTP strategy selected.")
    print("[Login] Enter your uslugi.gov.mk credentials.")
    print("[Login] These will NOT be stored or sent to the LLM.\n")

    # getpass() prompts in the terminal without echoing the password.
    username = input("Username / National ID: ").strip()
    password = getpass.getpass("Password: ")

    if not username or not password:
        return {
            "success": False,
            "message": "Username or password not provided.",
            "strategy_used": "http",
            "cookies_saved": 0,
        }

    authenticator = HttpAuthenticator()
    cookies = authenticator.authenticate(username, password)

    # Immediately clear credential variables from memory.
    # Python's GC will eventually reclaim them, but this is a good habit.
    username = ""
    password = ""

    if not cookies:
        return {
            "success": False,
            "message": (
                "HTTP authentication failed. The portal may require browser-based "
                "login (SSO / popup). Try strategy='browser' instead."
            ),
            "strategy_used": "http",
            "cookies_saved": 0,
        }

    session_manager.save(cookies)
    return {
        "success": True,
        "message": "HTTP authentication successful. Session saved.",
        "strategy_used": "http",
        "cookies_saved": len(cookies),
    }
