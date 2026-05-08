"""
institutions/crm/tools/companies.py
────────────────────────────────────────────────────────────────────────────────
Tool functions for crm.com.mk company data.

These are intentionally thin — all browser/reCAPTCHA logic lives in
client/browser.py. Each function here just delegates to the shared
crm_browser singleton and bridges sync→async for FastMCP.

Why sync wrappers?
  FastMCP registers tool functions as regular synchronous callables.
  The browser client is async (Playwright requires it). We bridge with
  asyncio.get_event_loop().run_until_complete() so callers never need
  to think about async.
"""

import asyncio

from institutions.crm.client.browser import crm_browser


def _run(coro):
    """Run an async coroutine from synchronous tool code."""
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(coro)


def search_companies(name: str) -> list[dict]:
    """
    Search for registered companies by name (partial match supported).

    Uses a live Playwright browser so reCAPTCHA is handled automatically.

    Args:
        name: Full or partial company name in Cyrillic or Latin script.
              E.g. "Бисера" or "Bisera".

    Returns:
        List of matching company dicts, each containing:
            - fullName      (str)  Full legal name in Cyrillic
            - fullNameLat   (str)  Full legal name in Latin transliteration
            - leid          (int)  Unique company ID (use for all follow-up calls)
            - municipality  (str)  Municipality of registration
        Returns an empty list if no matches found.
    """
    return _run(crm_browser.search_companies(name))


def get_company_details(leid: int) -> dict | str:
    """
    Retrieve the full registration profile for a specific company.

    Call search_companies() first so the row is visible on the page,
    then pass its leid here to trigger and intercept the detail XHR.

    Args:
        leid: Unique company ID from search_companies().

    Returns:
        Dict with full registration details (address, registration number,
        status, legal form, business activity, etc.).
        Returns "Company not found" if the leid is invalid or times out.
    """
    return _run(crm_browser.get_company_details(leid))


def get_founders_and_directors(leid: int) -> list[dict] | str:
    """
    Retrieve founders, directors, and associated persons for a company.

    Args:
        leid: Unique company ID from search_companies().

    Returns:
        List of person dicts with role, name, and identification details.
        Returns "Company not found" if the leid is invalid or times out.
    """
    return _run(crm_browser.get_founders_and_directors(leid))


def get_annual_reports(leid: int) -> list[dict] | str:
    """
    Retrieve available annual reports and financial data for a company.

    Args:
        leid: Unique company ID from search_companies().

    Returns:
        List of annual report dicts (year, filing status, dates, links, etc.).
        Returns "Company not found" if the leid is invalid or times out.
    """
    return _run(crm_browser.get_annual_reports(leid))
