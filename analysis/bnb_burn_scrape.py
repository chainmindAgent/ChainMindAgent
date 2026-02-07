import asyncio
from playwright.async_api import async_playwright
import json
import sys
import argparse
from datetime import datetime

async def scrape_bnb_burn():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1920, 'height': 1080}
        )
        page = await context.new_page()

        try:
            # BNB Burn Info
            await page.goto("https://www.bnbburn.info/", timeout=60000)
            await page.wait_for_timeout(5000) # Wait for hydration

            # Extract Data
            # This relies on structure. We look for keywords like "Total Burned"
            data = await page.evaluate("""() => {
                const text = document.body.innerText;
                
                // Helper to find number after text
                const findValue = (label) => {
                    const regex = new RegExp(label + '[\\\\s\\\\S]*?([\\\\d,.]+\\\\s*BNB)', 'i');
                    const match = text.match(regex);
                    return match ? match[1] : null;
                };

                // Try to find specific elements if possible, or just parse text
                // bnbburn.info is a simple site.
                
                let totalBurned = 'Unknown';
                let realTimeBurn = 'Unknown';
                
                // Specific selectors might be safer if stable
                // Looking for "Total Burned" card
                
                const cards = Array.from(document.querySelectorAll('div'));
                
                // Simple text extraction for now
                // Example text: "Total BNB Burned: 54,123,456.78 BNB"
                
                const totalMatch = text.match(/Total.*?Burned[\\s\\S]*?([\\d,]+\\.[\\d]+)/i);
                if (totalMatch) totalBurned = totalMatch[1] + ' BNB';
                
                // Real-time burn (BEP-95)
                // "Auto-Burn" or "Real-time"
                const autoMatch = text.match(/Auto-Burn[\\s\\S]*?([\\d,]+\\.[\\d]+)/i);
                if (autoMatch) realTimeBurn = autoMatch[1] + ' BNB';

                return {
                    total_burned: totalBurned,
                    real_time_burn: realTimeBurn,
                    timestamp: Date.now()
                };
            }""")
            
            return data

        except Exception as e:
            return {"error": str(e)}
        finally:
            await browser.close()

async def main():
    parser = argparse.ArgumentParser(description='Scrape BNB Burn Data')
    parser.add_argument('--json', action='store_true', help='Output JSON')
    args = parser.parse_args()

    try:
        data = await scrape_bnb_burn()
        
        print("---JSON_START---")
        print(json.dumps(data, indent=2))
        print("---JSON_END---")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)

if __name__ == "__main__":
    asyncio.run(main())
