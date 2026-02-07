import asyncio
from playwright.async_api import async_playwright
import json

async def scrape_category(page, category):
    url = f"https://dappbay.bnbchain.org/ranking/activeusers?chains=56&categories={category}"
    print(f"Scraping {category}...")
    await page.goto(url, wait_until="networkidle")
    await asyncio.sleep(5)  # Wait for content to load
    
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
        
        results = {}
        # Categories might need exact naming from the site
        categories = ["DeFi", "AI", "Social", "GameFi"]
        
        for cat in categories:
            try:
                results[cat] = await scrape_category(page, cat)
            except Exception as e:
                print(f"Error scraping {cat}: {e}")
                results[cat] = []
        
        print("RESULTS_JSON:" + json.dumps(results))
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
