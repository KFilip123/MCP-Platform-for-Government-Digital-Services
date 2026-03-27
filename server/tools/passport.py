"""
server/tools/passport.py
────────────────────────────────────────────────────────────────────────────────
MCP tool: info_passport_renewal

Fetches detailed information about the passport renewal service (ID 5200)
from the uslugi.gov.mk portal.

This endpoint is *publicly accessible* (no authentication required), so we
use a plain requests.post() instead of the authenticated client.  This makes
it a good "smoke test" tool — you can call it before logging in to verify the
portal API is reachable.

For endpoints that DO require authentication, swap the requests.post() call
with:
    from server.client.http_client import authenticated_client
    response = authenticated_client.post(url, json=payload, headers=headers)
"""

import re

import requests


def info_passport_renewal() -> dict:
    """
    Returns structured information about the passport renewal administrative
    procedure from uslugi.gov.mk.

    The raw API response contains HTML fragments, nested lists, and Macedonian
    text.  This function cleans and restructures the data into a flat dict
    that is easy for an LLM to summarise.

    Returns:
        {
            "serviceId":   int,
            "name":        str,   # Service name in Macedonian
            "description": str,   # HTML-stripped description
            "requirements": list[str],  # Required documents
            "conditions":  list[str],   # Eligibility conditions
            "deadlines":   list[str],   # Processing stage → duration
            "delivery_in": list[str],   # How to submit the request
            "delivery_out":list[str],   # How the result is delivered
            "contact":     str | None,  # Office phone
            "applyUrl":    str,         # Direct link to start the service
        }
    """

    # ── API endpoint and request structure ───────────────────────────────────
    # This is the internal JSON API used by the Angular front-end of the portal.
    url = "https://uslugi.gov.mk/Services/GetServiceDetails"

    headers = {
        # The portal expects JSON content and the Angular marker header.
        "Content-Type": "application/json;charset=UTF-8",
        "from-angular": "true",
    }

    payload = {
        "id": "5200",               # Passport renewal service ID
        "serviceUniqueId": None,    # Not needed when using numeric ID
    }

    response = requests.post(url, json=payload, headers=headers, timeout=15)
    response.raise_for_status()  # Raise HTTPError for 4xx / 5xx responses
    d = response.json()

    # ── Clean HTML from description ───────────────────────────────────────────
    # The description field contains inline HTML tags (<p>, <br>, <strong> …).
    # We strip them so the LLM receives clean prose.
    description = re.sub(
        r"<[^>]+>",
        "",
        d.get("AdministrativeProcedureServiceDescription", ""),
    ).strip()

    # ── Extract documents, delivery types from the first "state group" ────────
    # The service is split into StateGroupDetails (processing stages).
    # The first group usually represents the initial submission ("Барање").
    state_groups = d.get("StateGroupDetails", [])
    documents: list[str] = []
    delivery_in: list[str] = []
    delivery_out: list[str] = []

    if state_groups:
        first_group = state_groups[0]
        # Required input documents (what the citizen must bring / attach).
        documents = [
            doc["DocumentName"]
            for doc in first_group.get("InProofDocuments", [])
        ]
        # How the citizen can deliver the request (in person, by post, online…).
        delivery_in = [x["Value"] for x in first_group.get("InDeliveryTypes", [])]
        # How the institution will deliver the result back to the citizen.
        delivery_out = [x["Value"] for x in first_group.get("OutDeliveryTypes", [])]

    # ── Eligibility conditions ────────────────────────────────────────────────
    # ApsConditions lists prerequisites the citizen must meet.
    conditions = [
        c["EvidenceProofDocument"]["DocumentNameMK"]
        for c in d.get("ApsConditions", [])
        if c.get("EvidenceProofDocument")
    ]

    # ── Processing deadlines ──────────────────────────────────────────────────
    # Each DeadLine entry shows how long a specific stage takes.
    # Format: "Stage A → Stage B: N days/months"
    deadlines = [
        (
            f"{dl.get('StateFromName', '').strip()} → "
            f"{dl.get('StateToName', '').strip()}: "
            f"{dl.get('DaysValue')} {dl.get('PeriodTypeName')}"
        )
        for dl in d.get("DeadLines", [])
        if dl.get("DaysValue")
    ]

    return {
        "serviceId":    d.get("Id"),
        "name":         d.get("AdministrativeProcedureServiceName"),
        "description":  description,
        "requirements": documents,
        "conditions":   conditions,
        "deadlines":    deadlines,
        "delivery_in":  delivery_in,
        "delivery_out": delivery_out,
        "contact":      d.get("ApsContactInfo", {}).get("OfficePhone"),
        "applyUrl":     "https://uslugi.gov.mk/apply-for-service.nspx?apsUniqueName=MVR-5200",
    }
