"""Check the result-page save action with scripted clicks suppressed."""

import os

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout


base_url = os.environ.get("ECHO_BASE_URL", "https://youngbayi666-star.github.io/ai_products/music_festival/")
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(**playwright.devices["Pixel 7"], accept_downloads=True)
    page = context.new_page()
    page.add_init_script("HTMLAnchorElement.prototype.click = function() {}")
    page.route("**/supabase.co/**", lambda route: route.abort())
    page.goto(base_url, wait_until="networkidle")
    page.locator("#attract-start").click()
    page.locator("#nickname").fill("手机测试")
    page.locator("#message").fill("今晚，和世界同频")
    page.locator("#generate").click()
    page.locator("#result-overlay").wait_for(state="visible", timeout=15000)
    try:
        with page.expect_download(timeout=5000) as download_info:
            page.locator("#download-btn").click()
        download = download_info.value
        print(f"result save: {download.suggested_filename}; failure={download.failure()}")
        assert download.failure() is None
    except PlaywrightTimeout:
        print("result save: no download event")
        raise SystemExit(1)
    finally:
        browser.close()
