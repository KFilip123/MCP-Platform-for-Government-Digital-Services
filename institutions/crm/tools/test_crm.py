"""
institutions/crm/tools/test_crm.py
────────────────────────────────────────────────────────────────────────────────
Interactive test script for crm.com.mk using the Playwright browser client.

Run from your machine (not Claude's sandbox):
    python -m institutions.crm.tools.test_crm

What this does:
  STEP 1 — Starts the browser (headless=False so you can watch it).
  STEP 2 — Searches for "Бисера" and prints the first 3 results.
  STEP 3 — Prints ALL XHR URLs intercepted during the search so you
            can identify every API endpoint the Angular app uses.
  STEP 4 — Clicks the first result and prints every XHR that fires,
            so you know the exact url_fragment values to put in
            browser.py (get_founders_and_directors, get_annual_reports).

After running this, update the url_fragment strings in:
    institutions/crm/client/browser.py
      → get_founders_and_directors()   "persons"     ← update this
      → get_annual_reports()           "annualReport" ← update this
"""

import asyncio
from playwright.async_api import async_playwright, Response
from institutions.crm.config import SEARCH_PAGE_URL, TYPING_DELAY_MS

SEARCH_QUERY = "Бисера"


async def main():
    print("Starting browser (headless=False so you can watch)...")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=["--no-sandbox", "--disable-blink-features=AutomationControlled"],
        )
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            locale="mk-MK",
            viewport={"width": 1280, "height": 800},
        )
        page = await context.new_page()

        # Log every CRM API call.
        all_urls: list[str] = []
        async def log_all(r: Response):
            if "CRMPublicPortalApi" in r.url:
                all_urls.append(r.url)
        page.on("response", log_all)

        # ── STEP 1: Load the search page ──────────────────────────────────────
        print(f"\nNavigating to search page...")
        await page.goto(SEARCH_PAGE_URL, wait_until="networkidle")
        print("✓ Page loaded. reCAPTCHA initialised.")

        # ── STEP 2: Search ────────────────────────────────────────────────────
        print(f"\nSearching for '{SEARCH_QUERY}'...")
        loop = asyncio.get_event_loop()
        search_future = loop.create_future()

        async def capture_search(r: Response):
            if "basicProfile" in r.url and not search_future.done():
                try:
                    search_future.set_result(await r.json())
                except Exception as e:
                    search_future.set_exception(e)
        page.on("response", capture_search)

        try:
            box = page.locator("input[placeholder*='Внесете']").first
            await box.wait_for(state="visible", timeout=5_000)
        except Exception:
            box = page.locator("input[type='text']:visible").first

        await box.click()
        await box.press("Control+a")
        await box.type(SEARCH_QUERY, delay=TYPING_DELAY_MS)

        companies = []
        try:
            data = await asyncio.wait_for(search_future, timeout=15)
            companies = data.get("companies", [])
            print(f"✓ Search returned {len(companies)} companies.")
            for c in companies[:3]:
                print(f"  leid={c['leid']}  {c['fullNameLat']}  [{c['municipality']}]")
        except asyncio.TimeoutError:
            print("✗ Search timed out — check the input selector in _fill_search_box().")
        page.remove_listener("response", capture_search)

        # ── STEP 3: All URLs intercepted so far ───────────────────────────────
        print("\n── All CRM API URLs seen during search ─────────────────────────")
        for url in all_urls:
            print(f"  {url}")

        # ── STEP 3b: Dump row HTML (for reference) ───────────────────────────
        if companies:
            row_html = await page.evaluate("""() => {
                return Array.from(document.querySelectorAll('tr[tabindex="0"]'))
                    .slice(0, 3).map(el => el.outerHTML.slice(0, 300));
            }""")
            print("\n── First 3 result rows ──────────────────────────────────────")
            for i, h in enumerate(row_html):
                print(f"\n[{i}] {h}")

        # ── STEP 4: Navigate directly to ?embs={leid} ─────────────────────────
        if companies:
            first_leid = companies[0]["leid"]
            print(f"\nNavigating to ?embs={first_leid} ...")
            all_urls.clear()

            import base64, pathlib
            detail_future = asyncio.get_event_loop().create_future()
            async def capture_detail(r: Response):
                if f"basicProfile/{first_leid}" in r.url and not detail_future.done():
                    raw = await r.body()
                    ct = r.headers.get("content-type", "")
                    print(f"  basicProfile/{first_leid} → status={r.status}  content-type={ct!r}  body_len={len(raw)}")
                    # Body may be raw PNG bytes or base64-encoded PNG text
                    if raw[:4] == b'\x89PNG':
                        png_bytes = raw
                    else:
                        try:
                            png_bytes = base64.b64decode(raw)
                        except Exception:
                            png_bytes = raw
                    out = pathlib.Path("crm_detail.png")
                    out.write_bytes(png_bytes)
                    print(f"  Saved → {out.resolve()}")
                    detail_future.set_result({"saved": str(out.resolve()), "size": len(png_bytes)})
            page.on("response", capture_detail)

            await page.goto(
                f"{SEARCH_PAGE_URL}?embs={first_leid}",
                wait_until="domcontentloaded",
            )

            try:
                detail = await asyncio.wait_for(detail_future, timeout=15)
                content_type = detail.get("_raw", "")[:20] if "_raw" in detail else "JSON"
                print(f"  basicProfile/{first_leid} returned: {content_type}")
            except asyncio.TimeoutError:
                print("✗ basicProfile/{leid} never fired")
                detail = None
            page.remove_listener("response", capture_detail)

            await page.wait_for_timeout(3_000)

            print("\n── ALL CRM API URLs captured after ?embs navigation ─────────")
            for url in all_urls:
                print(f"  {url}")

            # Probe: fetch basicProfile/{leid} without sci, requesting JSON
            print(f"\n── Direct fetch basicProfile/{first_leid} (no sci, Accept: application/json) ──")
            fetch_result = await page.evaluate(f"""async () => {{
                const r = await fetch('/CRMPublicPortalApi/api/freeservice/basicProfile/{first_leid}', {{
                    headers: {{ 'Accept': 'application/json, text/plain, */*' }}
                }});
                const ct = r.headers.get('content-type') || '';
                const text = await r.text();
                return {{ status: r.status, ct, body: text.slice(0, 500) }};
            }}""")
            print(f"  status={fetch_result['status']}  content-type={fetch_result['ct']!r}")
            print(f"  body[:500]={fetch_result['body']}")

            # Probe: what does freeservice/1?idL=1 return?
            print(f"\n── Direct fetch freeservice/1?idL=1 ─────────────────────────")
            fs1_result = await page.evaluate("""async () => {
                const r = await fetch('/CRMPublicPortalApi/api/freeservice/1?idL=1', {
                    headers: { 'Accept': 'application/json' }
                });
                const text = await r.text();
                return { status: r.status, body: text.slice(0, 800) };
            }""")
            print(f"  status={fs1_result['status']}")
            print(f"  body={fs1_result['body']}")

        print("\nLeaving browser open 10 s for inspection...")
        await page.wait_for_timeout(10_000)
        await browser.close()

    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
