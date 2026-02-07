import asyncio
from playwright.async_api import async_playwright
import json

async def fetch_category_data(page, url):
    await page.goto(url, wait_until="networkidle")
    # Wait for the table to be visible and populated
    await page.wait_for_selector("tbody tr", timeout=10000)
    
    dapps = await page.evaluate('''() => {
        const rows = Array.from(document.querySelectorAll('tbody tr')).slice(0, 3);
        return rows.map(row => {
            const name = row.querySelector('td:nth-child(3) p')?.innerText || row.querySelector('td:nth-child(3)')?.innerText;
            const users = row.querySelector('td:nth-child(5)')?.innerText;
            const logo = row.querySelector('td:nth-child(2) img')?.src;
            return { name: name?.trim(), users: users?.trim(), logo: logo };
        });
    }''')
    return dapps

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        categories = {
            "defi": "https://dappbay.bnbchain.org/ranking/category/defi",
            "ai": "https://dappbay.bnbchain.org/ranking/category/ai",
            "social": "https://dappbay.bnbchain.org/ranking/category/social",
            "games": "https://dappbay.bnbchain.org/ranking/category/games"
        }
        
        results = {}
        for cat, url in categories.items():
            print(f"Fetching {cat}...")
            try:
                results[cat] = await fetch_category_data(page, url)
            except Exception as e:
                print(f"Error fetching {cat}: {e}")
                results[cat] = []
                
        print("DAPP_DATA_START")
        print(json.dumps(results))
        print("DAPP_DATA_END")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
