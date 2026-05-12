"""
institutions/crm/main.py
────────────────────────────────────────────────────────────────────────────────
FastMCP server entry point for crm.com.mk (Central Registry of North Macedonia).

Architecture in context:
  gateway/main.py
    └── spawns this as a subprocess
    └── connects via MCP stdio
    └── exposes tools to the agent under the "crm__" namespace

Key difference from uslugi:
  uslugi uses Playwright once for a manual SSO login and saves cookies to disk.
  CRM requires a live browser for every request because reCAPTCHA fires on each
  API call. We start ONE persistent Chromium instance on server startup (via the
  FastMCP lifespan hook) and reuse it for the entire lifetime of this process.
  No cookies are saved to disk — no login flow is needed.

Standalone test:
    python -m institutions.crm.main
"""

from contextlib import asynccontextmanager

from mcp.server.fastmcp import FastMCP

from institutions.crm.client.browser import crm_browser


# ── Lifespan: start and stop the persistent browser ───────────────────────────

@asynccontextmanager
async def lifespan(server: FastMCP):
    """
    Start the Playwright browser when the MCP server starts,
    and close it cleanly when the server shuts down.

    This runs once per process — the browser is shared across all tool calls.
    """
    await crm_browser.start()
    try:
        yield
    finally:
        await crm_browser.stop()


# ── Create the FastMCP server instance ───────────────────────────────────────

mcp = FastMCP("crm-com-mk", lifespan=lifespan)


# ═══════════════════════════════════════════════════════════════════════════════
# COMPANY TOOLS
# All public — no login required.
# reCAPTCHA is handled transparently by the Playwright browser.
# ═══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
async def search_companies(name: str) -> list[dict]:
    """
    Search for registered companies in the Central Registry by name.

    Supports partial name matching in both Cyrillic and Latin script.
    Uses a real browser internally so reCAPTCHA is handled automatically.

    Args:
        name: Full or partial company name. E.g. "Бисера" or "Bisera".

    Returns:
        List of matching companies, each with:
            - fullName      Full legal name (Cyrillic)
            - fullNameLat   Full legal name (Latin transliteration)
            - leid          Unique company ID — pass this to all follow-up tools
            - municipality  Municipality of registration
    """
    return await crm_browser.search_companies(name)


@mcp.tool()
async def get_company_details(leid: int) -> dict | str:
    """
    Get the full registration profile for a specific company.

    Call search_companies() first to get the leid, then pass it here.

    Args:
        leid: Unique company ID from search_companies().

    Returns:
        Dict with full registration details: address, status, registration
        number, legal form, and business activity.
        Returns "Company not found" if the ID is invalid.
    """
    return await crm_browser.get_company_details(leid)


@mcp.tool()
async def get_founders_and_directors(leid: int) -> list[dict] | str:
    """
    Get the founders, directors, and other associated persons for a company.

    Args:
        leid: Unique company ID from search_companies().

    Returns:
        List of associated persons with their role and identification details.
        Returns a message if data is not available on the free public tier.
    """
    return await crm_browser.get_founders_and_directors(leid)


@mcp.tool()
async def get_annual_reports(leid: int) -> list[dict] | str:
    """
    Get available annual reports and financial data for a company.

    Args:
        leid: Unique company ID from search_companies().

    Returns:
        List of annual reports with year, filing status, dates, and links.
        Returns a message if data is not available on the free public tier.
    """
    return await crm_browser.get_annual_reports(leid)


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    mcp.run()
