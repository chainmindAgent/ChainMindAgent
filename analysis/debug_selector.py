
import asyncio
from playwright.async_api import async_playwright
import os

DAPPBAY_RANKING_URL = "https://dappbay.bnbchain.org/ranking/activeusers?chains=56"

async def debug_selector():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        print(f"[INFO] Navigating to {DAPPBAY_RANKING_URL}")
        await page.goto(DAPPBAY_RANKING_URL, wait_until='networkidle')
        
        # Save HTML for inspection
        content = await page.content()
        with open("dapps_ranking_page.html", "w", encoding="utf-8") as f:
            f.write(content)
            
        print("[INFO] Saved dapps_ranking_page.html")
        
        # Try to find all elements with 7D and print them
        print("[INFO] Searching for '7D' elements...")
        elements = await page.locator("body").get_by_text("7D", exact=False).all()
        for i, el in enumerate(elements):
            tag = await el.evaluate("el => el.tagName")
            text = await el.inner_text()
            outer = await el.evaluate("el => el.outerHTML")
            visible = await el.is_visible()
            print(f"[{i}] {tag} Visible={visible}: {text.strip()} | Outer: {outer[:100]}...")
            
        await browser.close()
        
if __name__ == "__main__":
    asyncio.run(debug_selector())
