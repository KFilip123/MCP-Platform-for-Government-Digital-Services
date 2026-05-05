import re
import requests

BASE_URL = "https://uslugi.gov.mk/Services"
HEADERS = {"Content-Type": "application/json;charset=UTF-8", "from-angular": "true"}

def _clean_html(raw_html: str) -> str:
    if not raw_html: return ""
    return re.sub(r"<[^>]+>", "", raw_html).strip()

def search_portal(query: str) -> list[dict]:
    """Search for services or groups by keyword."""
    payload = {
        "searchModel": {
            "CurrentPage": 1, "MaxSize": 10, "ItemsPerPage": 10,
            "SearchTerm": query, "SearchByLuceeneSearchTearm": False,
            "CitizenCompany": {"Key": 0, "Value": ""}, "LifeEvents": [],
            "EidLevels": [], "SubCategories": [], "Tags": [],
            "PortalUserType": {"Key": 0, "Value": ""},
            "ServiceApplicationType": {"Key": 0, "Value": ""}
        }
    }
    r = requests.post(f"{BASE_URL}/GetServices", json=payload, headers=HEADERS)
    r.raise_for_status()
    items = r.json().get("Items", [])

    return [{
        "id": i.get("Id"),
        "name": i.get("AdministrativeProcedureServiceName"),
        "is_group": i.get("IsGroup"), # CRITICAL: If true, use get_group_contents
        "intro": _clean_html(i.get("AdministrativeProcedureServiceIntro"))[:200]
    } for i in items]

def get_group_contents(group_id: int) -> list[dict]:
    """If a search result is a group (is_group: true), use this to see its services."""
    payload = {"groupApsServiceId": str(group_id)}
    r = requests.post(f"{BASE_URL}/GetGroupServiceDetails", json=payload, headers=HEADERS)
    r.raise_for_status()
    services = r.json().get("AdministrativeProcedureServices", [])

    return [{
        "id": s.get("Id"),
        "name": s.get("AdministrativeProcedureServiceName"),
        "is_electronic": s.get("IsElectronicService"),
        "intro": _clean_html(s.get("AdministrativeProcedureServiceIntro"))
    } for s in services]
def get_service_details(service_id: int) -> dict:
    """Fetch full details for a specific service ID — requirements, conditions, prices, deadlines, etc."""
    payload = {"id": str(service_id), "serviceUniqueId": None}
    r = requests.post(f"{BASE_URL}/GetServiceDetails", json=payload, headers=HEADERS)
    r.raise_for_status()
    d = r.json()

    # Apply URL
    unique_name = d.get("ApsUniqueName")
    ext_link = d.get("ServiceExternalApplicationLink") or ""
    if not unique_name and "apsUniqueName=" in ext_link:
        unique_name = ext_link.split("apsUniqueName=")[-1]
    if not unique_name:
        unique_name = d.get("ApsNameAbbrivation")

    is_electronic = (d.get("ServiceApplicationType") or {}).get("Key") == 1

    # Documents
    first_group = (d.get("StateGroupDetails") or [{}])[0]
    process_docs = [doc["DocumentName"] for doc in first_group.get("InProcessDocuments", [])]
    proof_docs = [doc["DocumentName"] for doc in first_group.get("InProofDocuments", [])]
    requirements = process_docs + proof_docs

    # Conditions
    conditions = [
        c["EvidenceProofDocument"]["DocumentNameMK"]
        for c in d.get("ApsConditions", [])
        if c.get("EvidenceProofDocument")
    ]

    # Prices
    prices = [
        {
            "label": p["Value"],
            "amount": p["Price"],
            "currency": "MKD",
            "purpose": slip.get("PurposeOfPayment"),
        }
        for slip in d.get("ApsPaymentSlips", [])
        for p in slip.get("PriceList", [])
    ]

    # Deadline
    deadline_entry = next(
        (dl for dl in d.get("DeadLines", []) if dl.get("StateFromId") == 3), None
    )
    deadline_days = deadline_entry["DaysValue"] if deadline_entry else None

    return {
        "id": d.get("Id"),
        "name": d.get("AdministrativeProcedureServiceName"),
        "description": _clean_html(d.get("AdministrativeProcedureServiceDescription")),
        "intro": _clean_html(d.get("AdministrativeProcedureServiceIntro")),
        "is_electronic": is_electronic,
        "applyUrl": f"https://uslugi.gov.mk/apply-for-service.nspx?apsUniqueName={unique_name}" if unique_name else None,
        "note": None if is_electronic else "Само физичко поднесување",
        "eid_level": (d.get("ApsEidLevelType") or {}).get("Value"),
        "requirements": requirements,
        "conditions": conditions,
        "prices": prices,
        "deadline_days": deadline_days,
        "institution": (d.get("InstituionOwner") or {}).get("InstitutionName"),
        "regulations": [reg["RegulationName"] for reg in d.get("Regulations", [])],
    }
