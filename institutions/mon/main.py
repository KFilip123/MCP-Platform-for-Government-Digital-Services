"""
institutions/mon/main.py
────────────────────────────────────────────────────────────────────────────────
FastMCP server entry point for the Ministry of Education and Science (MON).
Scrapes public data from mon.gov.mk — no authentication required.

Run standalone for testing:
    python -m institutions.mon.main

Tools exposed (gateway will prefix them with "mon__"):
  Competitions:  list_mon_competitions, get_mon_competition_details
  Scholarships:  list_mon_scholarships, get_mon_scholarship_details
"""

from mcp.server.fastmcp import FastMCP

from institutions.mon.tools.competitions import (
    list_mon_competitions as _list_competitions,
    get_mon_competition_details as _competition_details,
)
from institutions.mon.tools.scholarships import (
    list_mon_scholarships as _list_scholarships,
    get_mon_scholarship_details as _scholarship_details,
)

mcp = FastMCP("mon-gov-mk")


# ═══════════════════════════════════════════════════════════════════════════════
# COMPETITION TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def list_mon_competitions(page_url: str | None = None) -> dict:
    """
    List MON competitions (Конкурси) from mon.gov.mk.

    Args:
        page_url: Omit to start from page 1. Pass next_page_url from a
                  previous response to paginate.

    Returns:
        {
            "competitions":   list of { title, date, url, description },
            "next_page_url":  str | None,
        }
    """
    return _list_competitions(page_url=page_url)


@mcp.tool()
def get_mon_competition_details(url: str) -> dict:
    """
    Get full details for a specific MON competition.

    Args:
        url: Detail page URL from list_mon_competitions().

    Returns:
        { url, title, date, body, attachments }
    """
    return _competition_details(url=url)


# ═══════════════════════════════════════════════════════════════════════════════
# SCHOLARSHIP TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def list_mon_scholarships(page_url: str | None = None) -> dict:
    """
    List MON scholarships (Стипендии) from mon.gov.mk.

    Args:
        page_url: Omit to start from page 1. Pass next_page_url from a
                  previous response to paginate.

    Returns:
        {
            "scholarships":  list of { title, date, url, description },
            "next_page_url": str | None,
        }
    """
    return _list_scholarships(page_url=page_url)


@mcp.tool()
def get_mon_scholarship_details(url: str) -> dict:
    """
    Get full details for a specific MON scholarship.

    Args:
        url: Detail page URL from list_mon_scholarships().

    Returns:
        { url, title, date, body, attachments }
    """
    return _scholarship_details(url=url)



# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    mcp.run()
