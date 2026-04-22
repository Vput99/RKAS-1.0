from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(
        record_video_dir="/home/jules/verification/videos"
    )
    page = context.new_page()
    page.goto("http://localhost:5173")
    page.wait_for_timeout(3000)
    page.screenshot(path="dashboard_ui.png")
    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
