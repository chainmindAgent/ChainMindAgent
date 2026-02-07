import asyncio
from playwright.async_api import async_playwright
import os

async def capture_category(page, category, filename):
    url = f"https://dappbay.bnbchain.org/ranking/activeusers?chains=56&categories={category}"
    print(f"Capturing {category}...")
    await page.goto(url, wait_until="networkidle")
    await asyncio.sleep(8)  # Wait longer
    await page.screenshot(path=filename)
    
    # Try to see if clicking works if URL doesn't
    # (Optional: implement click logic here if needed)

async def main():
    if not os.path.exists("debug_screenshots"):
        os.makedirs("debug_screenshots")
        
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1920, 'height': 1200})
        
        categories = ["DeFi", "AI", "Social", "GameFi"]
        for cat in categories:
            await capture_category(page, cat, f"debug_screenshots/{cat}.png")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
