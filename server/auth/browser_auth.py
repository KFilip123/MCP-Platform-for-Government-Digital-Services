"""
server/auth/browser_auth.py
────────────────────────────────────────────────────────────────────────────────
Playwright-based authentication strategy.

Why this approach?
  uslugi.gov.mk (and most modern government portals) use SSO, federated
  identity providers, or dynamic JavaScript flows that cannot be replicated
  with a simple HTTP POST.  Rather than trying to reverse-engineer those flows,
  we launch a *real* Chromium browser so the user can:
    • See the actual login page.
    • Handle CAPTCHA / 2-FA / eID prompts manually.
    • Never expose their password to this Python process.

Flow:
  1. Open Chromium (headed / visible) at LOGIN_URL.
  2. Print a message asking the user to log in.
  3. Wait (up to TIMEOUT_SECONDS) for the browser to navigate to a URL that
     contains POST_LOGIN_PATH, which indicates a successful login.
  4. Capture all browser cookies for the portal domain.
  5. Return them as a plain dict.

The returned dict is then handed to SessionManager.save() by the caller.
"""

import asyncio
from typing import Optional

from playwright.async_api import async_playwright, Page, BrowserContext, TimeoutError as PlaywrightTimeout

from server.config import LOGIN_URL, PORTAL_BASE_URL

# How long (in milliseconds) to wait for the user to complete login.
# 3 minutes should be generous enough for SSO flows.
TIMEOUT_MS = 3 * 60 * 1000  # 180 000 ms


class BrowserAuthenticator:
    """
    Opens a real browser for the user to log in and captures the resulting
    session cookies.

    This is the PRIMARY authentication strategy for uslugi.gov.mk because
    the portal uses a dynamic, popup-based login flow that cannot be driven
    by raw HTTP requests alone.
    """

    async def authenticate(self) -> Optional[dict]:
        """
        Launch a browser, wait for the user to log in, then return cookies.

        Returns:
            A dict of { cookie_name: cookie_value } if login succeeds.
            None if the timeout is reached or an error occurs.
        """
        async with async_playwright() as pw:
            # ── Launch Chromium in HEADED (visible) mode ──────────────────────
            # headless=False is intentional: the user must interact with it.
            browser = await pw.chromium.launch(headless=False)

            # Create a fresh browser context (isolated from any previous state).
            context: BrowserContext = await browser.new_context()
            page: Page = await context.new_page()

            print(
                "\n╔══════════════════════════════════════════════════════════╗\n"
                "║  BROWSER LOGIN REQUIRED                                  ║\n"
                "║                                                          ║\n"
                "║  Steps:                                                  ║\n"
                "║  1. The browser will open uslugi.gov.mk.                 ║\n"
                "║  2. Click the 'Најави се' (Login) button.               ║\n"
                "║  3. You will be redirected to eid.mk — log in there.    ║\n"
                "║  4. After login, the browser returns to the portal.      ║\n"
                "║  5. This window then closes automatically.               ║\n"
                "╚══════════════════════════════════════════════════════════╝\n"
            )

            # Navigate to the portal homepage.
            # The portal will show a login button that redirects to eid.mk SSO.
            # We don't navigate directly to eid.mk because its URL contains a
            # short-lived wctx timestamp; the portal generates a fresh one.
            await page.goto(LOGIN_URL)

            # ── Wait for the browser to return to uslugi.gov.mk ───────────────
            # The full SSO round-trip looks like:
            #   uslugi.gov.mk  →  (user clicks login)
            #   →  eid.mk/EId/signin?ReturnUrl=...  (user authenticates)
            #   →  uslugi.gov.mk/home.nspx  (success — we detect this)
            #
            # POST_LOGIN_PATH is "uslugi.gov.mk", so we wait for the browser
            # to land on ANY page under that domain after leaving eid.mk.
            # We use wait_for_function instead of wait_for_url because the
            # SSO redirect chain involves multiple domains.
            try:
                await page.wait_for_function(
                    # JavaScript expression evaluated in the browser context.
                    # Returns true once the URL is back on the portal AND
                    # the path is not just "/" (i.e., some post-login page).
                    "() => window.location.hostname.includes('uslugi.gov.mk') "
                    "    && window.location.pathname !== '/'",
                    timeout=TIMEOUT_MS,
                )
            except PlaywrightTimeout:
                print(
                    "[BrowserAuth] Timeout: user did not complete login within "
                    f"{TIMEOUT_MS // 1000} seconds."
                )
                await browser.close()
                return None

            print(f"[BrowserAuth] Detected post-login URL: {page.url}")

            # ── Extract cookies ────────────────────────────────────────────────
            # After SSO, the session cookie is issued by uslugi.gov.mk.
            # We capture cookies for the portal domain only — those are what
            # subsequent API calls need.
            all_cookies = await context.cookies(PORTAL_BASE_URL)

            # Convert the Playwright cookie list to a simple name→value dict.
            cookies: dict = {c["name"]: c["value"] for c in all_cookies}

            print(
                f"[BrowserAuth] Login successful. "
                f"Captured {len(cookies)} cookie(s): {list(cookies.keys())}"
            )

            await browser.close()
            return cookies

    def run(self) -> Optional[dict]:
        """
        Synchronous wrapper around the async authenticate() method.

        WHY a thread instead of asyncio.run()?
        ────────────────────────────────────────
        The FastMCP server runs its own asyncio event loop.  When an MCP tool
        handler calls this method, we are already *inside* that running loop.
        Calling asyncio.run() from inside a running loop raises:
            "RuntimeError: asyncio.run() cannot be called from a running event loop"

        The fix: submit the coroutine to a *brand-new thread* that has no
        existing event loop.  asyncio.run() in that thread creates a fresh
        loop, runs Playwright there, and returns the result safely back to the
        calling (MCP server) thread.
        """
        import concurrent.futures

        def _run_in_new_loop():
            # This function executes in a worker thread — no existing event loop.
            return asyncio.run(self.authenticate())

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_run_in_new_loop)
            # Wait with a generous timeout (slightly more than TIMEOUT_MS).
            return future.result(timeout=(TIMEOUT_MS / 1000) + 30)
