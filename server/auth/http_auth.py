"""
server/auth/http_auth.py
────────────────────────────────────────────────────────────────────────────────
HTTP-based authentication fallback strategy.

IMPORTANT: This approach ONLY works for portals that accept a simple
form POST to a login endpoint.  uslugi.gov.mk uses a dynamic, JavaScript-
driven SSO flow, so this module is provided as a *fallback skeleton* for
portals that do support direct HTTP login.

Security note:
  Credentials (username / password) are accepted as parameters at call time,
  never stored in this module or in config.  The caller (session_tools.py) is
  responsible for obtaining them securely (e.g. getpass).  They are NEVER
  forwarded to the LLM.

How to extend this for another portal:
  1. Inspect the login form in DevTools → Network tab.
  2. Find the POST endpoint and all required form fields.
  3. Adjust LOGIN_ENDPOINT, FORM_FIELD_USERNAME, FORM_FIELD_PASSWORD, and
     SUCCESS_INDICATOR below.
"""

from typing import Optional

import requests

from server.config import PORTAL_BASE_URL

# ── Portal-specific constants (adjust for each target portal) ─────────────────

# The endpoint that accepts the login POST.
LOGIN_ENDPOINT = f"{PORTAL_BASE_URL}/Account/Login"

# HTML form field names (inspect the login form in your browser's DevTools).
FORM_FIELD_USERNAME = "UserName"
FORM_FIELD_PASSWORD = "Password"

# A substring present in the response body ONLY after a successful login.
# If empty, we fall back to checking the redirect URL.
SUCCESS_INDICATOR = ""


class HttpAuthenticator:
    """
    Attempts to log in via a direct HTTP POST request.

    This is the FALLBACK strategy.  Prefer BrowserAuthenticator for portals
    with dynamic auth flows.
    """

    def authenticate(self, username: str, password: str) -> Optional[dict]:
        """
        Perform HTTP form-based login and return session cookies.

        Args:
            username: The portal username / national ID.
            password: The portal password.

        Returns:
            A dict of { cookie_name: cookie_value } on success, or None.

        NOTE: Credentials are used only within this function scope and are
        never logged, stored, or returned.
        """
        # Use a requests.Session so cookies are automatically tracked across
        # the GET (to fetch the CSRF token) and the POST (to submit the form).
        session = requests.Session()

        # ── Step 1: GET the login page to collect CSRF token ──────────────────
        # Many portals embed a hidden anti-forgery token in the login form.
        # We need to scrape it before submitting credentials.
        try:
            get_resp = session.get(LOGIN_ENDPOINT, timeout=15)
            get_resp.raise_for_status()
        except requests.RequestException as exc:
            print(f"[HttpAuth] Failed to fetch login page: {exc}")
            return None

        csrf_token = self._extract_csrf_token(get_resp.text)

        # ── Step 2: POST credentials ──────────────────────────────────────────
        payload = {
            FORM_FIELD_USERNAME: username,
            FORM_FIELD_PASSWORD: password,
        }
        if csrf_token:
            # Common ASP.NET / Django / Rails anti-forgery field names.
            payload["__RequestVerificationToken"] = csrf_token

        try:
            post_resp = session.post(
                LOGIN_ENDPOINT,
                data=payload,
                timeout=15,
                allow_redirects=True,
            )
            post_resp.raise_for_status()
        except requests.RequestException as exc:
            print(f"[HttpAuth] Login POST failed: {exc}")
            return None

        # ── Step 3: Verify success ────────────────────────────────────────────
        success = self._check_success(post_resp)
        if not success:
            print("[HttpAuth] Login failed: portal did not indicate success.")
            return None

        # Extract cookies from the requests session as a plain dict.
        cookies = dict(session.cookies)
        print(
            f"[HttpAuth] Login successful. "
            f"Captured {len(cookies)} cookie(s): {list(cookies.keys())}"
        )
        return cookies

    # ── Private helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _extract_csrf_token(html: str) -> Optional[str]:
        """
        Try to scrape an anti-forgery / CSRF token from the login page HTML.
        Returns the token string, or None if not found.
        """
        import re

        # Pattern for ASP.NET __RequestVerificationToken hidden input.
        match = re.search(
            r'<input[^>]+name="__RequestVerificationToken"[^>]+value="([^"]+)"',
            html,
        )
        if match:
            return match.group(1)
        return None

    @staticmethod
    def _check_success(response: requests.Response) -> bool:
        """
        Heuristic to determine whether the login was successful.

        Checks (in order):
          1. A configured SUCCESS_INDICATOR substring in the response body.
          2. The final URL after redirects is NOT the login page (i.e. we
             were redirected away, which usually means success).
        """
        if SUCCESS_INDICATOR and SUCCESS_INDICATOR in response.text:
            return True

        # If no indicator is configured, assume success when we're no longer
        # on the login page after POST + redirect.
        if "/Login" not in response.url and "/login" not in response.url:
            return True

        return False
