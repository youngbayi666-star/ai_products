"""Probe the published share page in mobile browser engines."""

import base64
import json
import os
from urllib.parse import quote

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout


payload = {
    "persona": "roam",
    "style": "neon",
    "nickname": "手机测试",
    "message": "今晚，和世界同频",
    "seed": 42,
    "echoId": 1,
}
token = base64.urlsafe_b64encode(json.dumps(payload, ensure_ascii=False).encode()).decode().rstrip("=")
base_url = os.environ.get("ECHO_BASE_URL", "https://youngbayi666-star.github.io/ai_products/music_festival/")
url = f"{base_url.rstrip('/')}/share.html?p={quote(token)}"

with sync_playwright() as playwright:
    outcomes = []
    for engine, device in ((playwright.chromium, "Pixel 7"), (playwright.webkit, "iPhone 13")):
        try:
            browser = engine.launch(headless=True)
            context = browser.new_context(**playwright.devices[device], accept_downloads=True)
            page = context.new_page()
            # Some phone environments suppress scripted anchor clicks. A real
            # user tap on a download link still activates its native action.
            page.add_init_script("HTMLAnchorElement.prototype.click = function() {}")
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(url, wait_until="networkidle")
            image_ready = page.locator("#phone-image").evaluate("img => img.complete && img.naturalWidth > 0")
            try:
                with page.expect_download(timeout=5000) as download_info:
                    page.locator("#save-phone").click()
                download = download_info.value
                outcome = f"download={download.suggested_filename}; failure={download.failure()}"
            except PlaywrightTimeout:
                outcome = "no download event"
            status = page.locator("#share-status").inner_text()
            print(f"{device}: image_ready={image_ready}; {outcome}; status={status}; errors={errors}")
            outcomes.append(image_ready and outcome.startswith("download=") and "failure=None" in outcome)
            browser.close()
        except Exception as error:
            print(f"{device}: test unavailable: {error}")
            outcomes.append(False)
    if not all(outcomes):
        raise SystemExit(1)
