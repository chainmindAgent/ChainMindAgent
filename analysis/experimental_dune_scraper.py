import asyncio
from playwright.async_api import async_playwright
import json

QUERY_ID = "9318883"
URL = f"https://dune.com/queries/{QUERY_ID}"

async def scrape_dune():
    print(f"[INFO] Launching local browser to scrape {URL}...")
    async with async_playwright() as p:
        # Launch non-headless sometimes helps avoid detection, but let's try headless first with user agent
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        page = await context.new_page()
        
        try:
            print("[INFO] Navigating...")
            await page.goto(URL, wait_until="domcontentloaded", timeout=60000)
            
            # Wait for potential Cloudflare challenge or loading
            print("[INFO] Waiting for page load...")
            await page.wait_for_timeout(5000)
            
            # Try to find the results table or any specific data marker
            # Dune structure changes, but we look for common visualization containers
            print("[INFO] checking content...")
            title = await page.title()
            print(f"[INFO] Page Title: {title}")
            
            content_dump = await page.evaluate("() => document.body.innerText")
            if "Cloudflare" in title or "Just a moment" in title:
                print("[WARN] Blocked by Cloudflare.")
            elif "404" in title or "Not Found" in content_dump:
                print("[WARN] Page returned 404 Not Found visible text.")
            else:
                print("[SUCCESS] Page loaded. Dumping first 500 chars of text:")
                print(content_dump[:500])
                
        except Exception as e:
            print(f"[ERROR] Scraping failed: {e}")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(scrape_dune())
