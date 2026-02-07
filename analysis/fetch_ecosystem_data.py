import asyncio
from playwright.async_api import async_playwright
import json

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        all_results = {}
        for cat in ['defi', 'ai', 'social', 'games']:
            url = f'https://dappbay.bnbchain.org/ranking/category/{cat}?range=7d'
            await page.goto(url)
            try:
                await page.wait_for_selector('tbody tr', timeout=15000)
                # Scroll to bottom and top to trigger images
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await asyncio.sleep(2)
                await page.evaluate("window.scrollTo(0, 0)")
                await asyncio.sleep(1)
                
                dapps = await page.evaluate('''() => {
                    const rows = Array.from(document.querySelectorAll('tbody tr'));
                    const results = [];
                    for (const row of rows) {
                        if (results.length >= 3) break;
                        const nameEl = row.querySelector('td:nth-child(3) p') || row.querySelector('td:nth-child(3)');
                        const name = nameEl?.innerText?.trim();
                        if (!name) continue;
                        
                        const users = row.querySelector('td:nth-child(5)')?.innerText?.trim();
                        const userChange = row.querySelector('td:nth-child(6)')?.innerText?.trim();
                        const txs = row.querySelector('td:nth-child(7)')?.innerText?.trim();
                        const txsChange = row.querySelector('td:nth-child(8)')?.innerText?.trim();
                        const logo = row.querySelector('td:nth-child(2) img')?.src;
                        
                        results.push({ 
                            n: name, 
                            u: users, 
                            uc: userChange, 
                            tx: txs, 
                            tc: txsChange, 
                            l: logo 
                        });
                    }
                    return results;
                }''')
                all_results[cat] = dapps
            except Exception as e:
                print(f"Error fetching {cat}: {e}")
        
        print("FINAL_DATA_START")
        print(json.dumps(all_results))
        print("FINAL_DATA_END")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
