import asyncio
from playwright.async_api import async_playwright
import json
import sys
import argparse
from datetime import datetime

async def scrape_coinglass_whales():
    async with async_playwright() as p:
        # Launch browser (headless)
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1920, 'height': 1080}
        )
        page = await context.new_page()

        try:
            # Navigate to Coinglass Whale Alert page
            # Wait for the table to load
            await page.goto("https://www.coinglass.com/whale-alert", timeout=60000)
            
            # Wait for specific element that indicates data is loaded. 
            # The table usually has rows with class 'MuiTableRow-root' or similar generic UI lib classes.
            # We'll wait for text that appears in the table headers or content.
            await page.wait_for_selector("table", timeout=30000)
            await page.wait_for_timeout(5000) # Extra wait for hydration

            # Extract data from the table
            # We assume a standard table structure. We'll grab the rows.
            alerts = await page.evaluate("""() => {
                const rows = Array.from(document.querySelectorAll('table tbody tr'));
                return rows.slice(0, 20).map(row => {
                    const cells = Array.from(row.querySelectorAll('td'));
                    if (cells.length < 5) return null; // Not a valid row
                    
                    // Column mapping (approximate based on inspection/standard layout)
                    // Time | Symbol | Amount | USD Value | From | To
                    
                    const time = cells[0]?.innerText || '';
                    const symbol = cells[1]?.innerText || '';
                    const amount = cells[2]?.innerText || '';
                    const value = cells[3]?.innerText || '';
                    const from = cells[4]?.innerText || '';
                    const to = cells[5]?.innerText || '';
                    
                    // Simple cleaning
                    return {
                        id: 'cg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9), // Client will dedupe or use this
                        time,
                        symbol: symbol.replace(/\\n/g, ' ').trim(),
                        amount: amount.trim(),
                        value: value.trim(),
                        from: from.trim(),
                        to: to.trim(),
                        timestamp: Date.now(),
                        source: 'coinglass'
                    };
                }).filter(x => x !== null);
            }""")
            
            return alerts

        except Exception as e:
            return {"error": str(e)}
        finally:
            await browser.close()

async def main():
    parser = argparse.ArgumentParser(description='Scrape Coinglass Whale Alerts')
    parser.add_argument('--json', action='store_true', help='Output JSON')
    args = parser.parse_args()

    try:
        data = await scrape_coinglass_whales()
        
        print("---JSON_START---")
        print(json.dumps(data, indent=2))
        print("---JSON_END---")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)

if __name__ == "__main__":
    asyncio.run(main())
