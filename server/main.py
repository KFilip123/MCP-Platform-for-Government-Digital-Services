"""
server/main.py
────────────────────────────────────────────────────────────────────────────────
MCP server entry point.

This file wires everything together:
  1. Creates a FastMCP server instance.
  2. Registers every tool function with @mcp.tool().
  3. Exposes the server via stdio transport (the standard MCP transport for
     subprocess-based clients).

Running the server:
  python -m server.main
  # or from the project root:
  python server/main.py

The server speaks the MCP protocol over stdin/stdout.  Clients (like the
Gemini agent in agent/gemini_agent.py) spawn this as a subprocess and
communicate via JSON-RPC messages.

Adding new tools:
  1. Create a function in server/tools/
  2. Import it here.
  3. Decorate it (or wrap it) with @mcp.tool() and add a clear docstring —
     the docstring becomes the tool description shown to the LLM.
"""

from mcp.server.fastmcp import FastMCP

# ── Import tool implementation functions ──────────────────────────────────────
from server.tools.passport import info_passport_renewal as _info_passport_renewal
from server.tools.session_tools import (
    login as _login,
    logout as _logout,
    check_session as _check_session,
)
from server.client.http_client import authenticated_client, SessionExpiredError

# ── Create the FastMCP server ─────────────────────────────────────────────────
# The name here is the identifier the MCP client uses to locate this server.
mcp = FastMCP("uslugi-gov-mk-demo")


# ═══════════════════════════════════════════════════════════════════════════════
# SESSION MANAGEMENT TOOLS
# These tools control the authentication lifecycle.
# The LLM can call them but NEVER sees credentials or raw cookie values.
# ═══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def login(strategy: str = "browser") -> dict:
    """
    Authenticate the user on uslugi.gov.mk and save the session.

    Args:
        strategy: Authentication method to use.
                  - "browser" (default and recommended): Opens a Chromium
                    browser window. The user logs in manually. Handles SSO,
                    eID, CAPTCHA, 2FA, and any popup-based flow.
                  - "http": Attempts a direct HTTP form POST. Only works for
                    portals with a simple login form. Will likely fail on
                    uslugi.gov.mk due to SSO.

    Returns:
        { "success": bool, "message": str, "strategy_used": str, "cookies_saved": int }
    """
    return _login(strategy=strategy)


@mcp.tool()
def logout() -> dict:
    """
    Log out by deleting the stored session cookies.

    Returns:
        { "success": bool, "message": str }
    """
    return _logout()


@mcp.tool()
def check_session() -> dict:
    """
    Check whether an active session exists (i.e., the user is logged in).

    Does NOT make a network request — only checks for a local session file.
    Call this before making authenticated requests to avoid unhelpful errors.

    Returns:
        { "active": bool, "saved_at": str | None, "message": str }
    """
    return _check_session()


# ═══════════════════════════════════════════════════════════════════════════════
# PUBLIC SERVICE INFORMATION TOOLS
# These tools query the uslugi.gov.mk API.
# info_passport_renewal is public (no auth needed).
# ═══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def info_passport_renewal() -> dict:
    """
    Fetch detailed information about the passport renewal service from
    uslugi.gov.mk (service ID 5200).

    This endpoint is publicly accessible — no login required.

    Returns a structured dict with:
        - name, description: Human-readable service info in Macedonian.
        - requirements: List of documents the citizen must provide.
        - conditions: Eligibility conditions.
        - deadlines: Processing time per stage (e.g., "2 working days").
        - delivery_in/out: How to submit and receive results.
        - contact: Office phone number.
        - applyUrl: Direct URL to start the online application.
    """
    return _info_passport_renewal()


# ═══════════════════════════════════════════════════════════════════════════════
# GENERIC AUTHENTICATED REQUEST TOOL
# Allows the LLM to query any protected endpoint without exposing cookies.
# The HTTP client layer injects cookies automatically.
# ═══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def authenticated_get(url: str) -> dict:
    """
    Perform an authenticated HTTP GET request to a uslugi.gov.mk endpoint.

    Session cookies are injected automatically from the saved session.
    Call 'check_session' or 'login' first if you're unsure whether the
    user is logged in.

    Args:
        url: The full URL to request (must be on uslugi.gov.mk).

    Returns:
        { "status_code": int, "body": str, "error": str | None }
    """
    try:
        resp = authenticated_client.get(url)
        return {
            "status_code": resp.status_code,
            "body": resp.text[:4000],  # Truncate large responses for the LLM
            "error": None,
        }
    except SessionExpiredError as exc:
        return {"status_code": None, "body": None, "error": str(exc)}
    except Exception as exc:
        return {"status_code": None, "body": None, "error": f"Request failed: {exc}"}


@mcp.tool()
def authenticated_post(url: str, payload: dict) -> dict:
    """
    Perform an authenticated HTTP POST request to a uslugi.gov.mk endpoint.

    Session cookies are injected automatically from the saved session.

    Args:
        url:     The full URL to POST to (must be on uslugi.gov.mk).
        payload: JSON body to send as the request body.

    Returns:
        { "status_code": int, "body": str, "error": str | None }
    """
    try:
        resp = authenticated_client.post(
            url,
            json=payload,
            headers={
                "Content-Type": "application/json;charset=UTF-8",
                "from-angular": "true",
            },
        )
        return {
            "status_code": resp.status_code,
            "body": resp.text[:4000],
            "error": None,
        }
    except SessionExpiredError as exc:
        return {"status_code": None, "body": None, "error": str(exc)}
    except Exception as exc:
        return {"status_code": None, "body": None, "error": f"Request failed: {exc}"}


# ── Run the server ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # mcp.run() starts the stdio transport loop.
    # The process will block here, reading MCP JSON-RPC messages from stdin
    # and writing responses to stdout.
    mcp.run()
