"""
institutions/mon/tools/competitions.py
────────────────────────────────────────────────────────────────────────────────
Tools for browsing MON competitions (Конкурси) from mon.gov.mk.

Available tools:
  • list_mon_competitions([page_url])        — list competitions, paginatable
  • get_mon_competition_details(url)         — full details for one competition
"""

from institutions.mon.tools._scraper import scrape_listing, scrape_detail

_COMPETITIONS_URL = "https://mon.gov.mk/mk-MK/konkursi-i-stipendii/konkursi-mon"
_SECTION = "konkursi-mon"


def list_mon_competitions(page_url: str | None = None) -> dict:
    """
    List MON competitions (Конкурси) scraped from mon.gov.mk.

    Args:
        page_url: Unused — kept for backwards compatibility. All pages are
                  fetched automatically.

    Returns:
        {
            "competitions": list of {
                "title":       str,
                "date":        str,   # DD/MM/YYYY
                "url":         str,   # detail page URL
                "description": str,   # short excerpt
            },
            "total": int,
        }
    """
    items = scrape_listing(page_url or _COMPETITIONS_URL, _SECTION)
    return {"competitions": items, "total": len(items)}


def get_mon_competition_details(url: str) -> dict:
    """
    Fetch full details for a specific MON competition.

    Args:
        url: Full URL of the competition detail page, as returned in the
             "url" field of list_mon_competitions().

    Returns:
        {
            "url":         str,
            "title":       str,
            "date":        str,         # DD/MM/YYYY publication date
            "body":        str,         # full competition text (up to 4000 chars)
            "attachments": list of {    # downloadable files (PDFs, docs, etc.)
                "name": str,
                "url":  str,
            },
        }
    """
    return scrape_detail(url)
