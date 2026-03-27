"""
server/client/http_client.py
────────────────────────────────────────────────────────────────────────────────
Authenticated HTTP client layer.

This module sits BETWEEN the MCP tools and the raw internet.  Its sole job is:
  1. Load the saved session cookies from SessionManager.
  2. Inject those cookies as headers / a requests.Session on every request.
  3. Detect expired sessions (HTTP 401/403 or redirect to login page) and
     raise SessionExpiredError so the tool can return a helpful message to
     the LLM / user.
  4. Provide simple get() / post() wrappers so tool code stays clean.

This means tool code never touches cookies directly — it just calls
  client.get("https://uslugi.gov.mk/...")
and gets a response back.

Session re-injection flow:
  Every call to get() or post() rebuilds the requests.Session from the
  *latest* cookies on disk.  This means if a re-login happened in one tool,
  the next tool automatically picks up the fresh cookies.
"""

import requests

from server.auth.session import session_manager
from server.config import LOGIN_URL, PORTAL_BASE_URL


class SessionExpiredError(Exception):
    """
    Raised when the server responds in a way that indicates the session
    has expired (401, 403, or a redirect to the login page).
    """


class AuthenticatedClient:
    """
    A thin wrapper around requests.Session that automatically injects the
    persisted session cookies on every request.

    All MCP tool functions should use this client instead of calling
    requests directly.

    Example:
        client = AuthenticatedClient()
        resp = client.post(
            "https://uslugi.gov.mk/Services/GetServiceDetails",
            json={"id": "5200"},
        )
    """

    # Standard browser-like headers to avoid being blocked by bot detection.
    _BASE_HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "mk-MK,mk;q=0.9,en;q=0.8",
        "Origin": PORTAL_BASE_URL,
        "Referer": PORTAL_BASE_URL + "/",
    }

    def _build_session(self) -> requests.Session:
        """
        Create a requests.Session pre-loaded with saved cookies.

        Raises:
            SessionExpiredError: If no session cookies are found on disk,
                                  which means the user hasn't logged in yet.
        """
        cookies = session_manager.load()

        if not cookies:
            raise SessionExpiredError(
                "No active session found. Please call the 'login' tool first."
            )

        session = requests.Session()
        session.headers.update(self._BASE_HEADERS)

        # Inject every saved cookie into the session.
        for name, value in cookies.items():
            session.cookies.set(name, value, domain="uslugi.gov.mk")

        return session

    def _check_response(self, response: requests.Response) -> None:
        """
        Inspect the response for signs of an expired / invalid session.

        Signs of expiry:
          • HTTP 401 Unauthorized
          • HTTP 403 Forbidden
          • A redirect (after following) whose final URL contains "/Login"

        Raises:
            SessionExpiredError: If any of the above conditions are met.
        """
        if response.status_code in (401, 403):
            raise SessionExpiredError(
                f"Session expired (HTTP {response.status_code}). "
                "Please call the 'login' tool to re-authenticate."
            )

        # Check if we were silently redirected to the login page.
        if LOGIN_URL.rstrip("/") in response.url:
            raise SessionExpiredError(
                "Session expired (redirected to login page). "
                "Please call the 'login' tool to re-authenticate."
            )

    # ── Public API ────────────────────────────────────────────────────────────

    def get(self, url: str, **kwargs) -> requests.Response:
        """
        Perform an authenticated GET request.

        Args:
            url:    Absolute URL to request.
            **kwargs: Forwarded to requests.Session.get()
                      (params, headers, timeout, etc.)

        Returns:
            requests.Response

        Raises:
            SessionExpiredError: If no session exists or the server rejects it.
        """
        session = self._build_session()
        response = session.get(url, allow_redirects=True, timeout=20, **kwargs)
        self._check_response(response)
        return response

    def post(self, url: str, **kwargs) -> requests.Response:
        """
        Perform an authenticated POST request.

        Args:
            url:    Absolute URL to POST to.
            **kwargs: Forwarded to requests.Session.post()
                      (json=, data=, headers=, timeout=, etc.)

        Returns:
            requests.Response

        Raises:
            SessionExpiredError: If no session exists or the server rejects it.
        """
        session = self._build_session()
        response = session.post(url, allow_redirects=True, timeout=20, **kwargs)
        self._check_response(response)
        return response


# ── Module-level singleton ────────────────────────────────────────────────────
# Shared instance used by all tool modules.
authenticated_client = AuthenticatedClient()
