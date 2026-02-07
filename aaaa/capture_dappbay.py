"""
DappsBay Ranking Data Scraper
Scrapes dApp data from https://dappbay.bnbchain.org/ranking

Based on HTML DOM analysis:
- Table structure: <table><tbody><tr data-row-key="...">
- Cell 0 (td): Rank number (<div class="css-1x8n4sb">16</div>)
- Cell 1 (td): Logo image only
- Cell 2 (td): dApp name in <p class="ui-text ... css-riomj5">Name</p>
- Cell 3 (td): Category in <p class="ui-text css-2o2uaw">Games</p>
- Cell 4 (td): Users in <p class="ui-text css-1vnn5i6">111.89K</p>
- Cell 5 (td): 7D % change
- Cell 6 (td): TXN count
- Cell 7 (td): TXN 7D %
- Cell 8 (td): Sparkline chart
"""

import asyncio
import json
import os
from datetime import datetime
from playwright.async_api import async_playwright

# Output directory for scraped data
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
OUTPUT_FILE = os.path.join(DATA_DIR, 'dappbay_ranking.json')


async def scrape_ranking_page(page) -> list:
    """Scrape dApps from ranking page using JavaScript evaluation"""
    url = "https://dappbay.bnbchain.org/ranking/activeusers?chains=56"
    print(f"📊 Scraping from {url}...")
    
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(5)  # Wait for dynamic content
        
        # Wait for table to appear
        await page.wait_for_selector('table tbody tr[data-row-key]', timeout=20000)
        await asyncio.sleep(2)  # Extra wait for content to fully render
        
        # Use JavaScript to extract data directly from the DOM
        # Based on actual HTML structure analysis
        dapps = await page.evaluate("""
        () => {
            const results = [];
            const rows = document.querySelectorAll('table tbody tr[data-row-key]');
            
            rows.forEach((row, index) => {
                try {
                    const cells = row.querySelectorAll('td');
                    if (cells.length < 5) return;
                    
                    // Cell 0: Rank number
                    const rankEl = cells[0]?.querySelector('div');
                    const rank = rankEl?.innerText?.trim() || String(index + 1);
                    
                    // Cell 2: dApp name (cell 1 is just the logo)
                    // Name is in: <a><div><div><p class="ui-text ...css-riomj5">Name</p>
                    const nameCell = cells[2];
                    const nameEl = nameCell?.querySelector('p.ui-text');
                    const name = nameEl?.innerText?.trim() || '';
                    
                    if (!name || name.length < 2) return;
                    
                    // Also get the detail URL from the link
                    const linkEl = nameCell?.querySelector('a[href]');
                    let detailUrl = '';
                    if (linkEl) {
                        detailUrl = linkEl.getAttribute('href') || '';
                        if (detailUrl && !detailUrl.startsWith('http')) {
                            detailUrl = 'https://dappbay.bnbchain.org' + detailUrl;
                        }
                    }
                    
                    // Cell 3: Category
                    const catEl = cells[3]?.querySelector('p.ui-text');
                    const category = catEl?.innerText?.trim() || 'Unknown';
                    
                    // Cell 4: Users count
                    const usersEl = cells[4]?.querySelector('p.ui-text');
                    const users = usersEl?.innerText?.trim() || '';
                    
                    // Cell 5: 7D % change
                    const changeEl = cells[5]?.querySelector('p.ui-text');
                    let change7d = changeEl?.innerText?.trim() || '';
                    // Clean up the change text
                    change7d = change7d.replace(/\\s+/g, '');
                    
                    // Cell 6: TXN count
                    const txnEl = cells[6]?.querySelector('p.ui-text');
                    const txn = txnEl?.innerText?.trim() || '';
                    
                    results.push({
                        rank: parseInt(rank) || (index + 1),
                        name: name,
                        category: category,
                        users: users,
                        change7d: change7d,
                        transactions: txn,
                        url: detailUrl,
                        verified: true
                    });
                } catch (e) {
                    // Skip problematic rows
                }
            });
            
            return results;
        }
        """)
        
        print(f"   ✅ Extracted {len(dapps)} dApps")
        
        # Add metadata
        for dapp in dapps:
            dapp['scrapedAt'] = datetime.now().isoformat()
        
        return dapps
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return []


async def scrape_all_pages(page, max_pages: int = 3) -> list:
    """Scrape multiple pages of rankings"""
    all_dapps = []
    
    # First page
    dapps = await scrape_ranking_page(page)
    all_dapps.extend(dapps)
    
    # Navigate to additional pages if we have good data
    if len(dapps) > 0 and max_pages > 1:
        for page_num in range(2, max_pages + 1):
            print(f"   📄 Loading page {page_num}...")
            try:
                # Click next page button
                next_btn = await page.query_selector('button.ui-pagination-next-button:not([disabled])')
                if next_btn:
                    await next_btn.click()
                    await asyncio.sleep(3)
                    
                    # Extract from new page
                    more_dapps = await page.evaluate("""
                    () => {
                        const results = [];
                        const rows = document.querySelectorAll('table tbody tr[data-row-key]');
                        
                        rows.forEach((row, index) => {
                            try {
                                const cells = row.querySelectorAll('td');
                                if (cells.length < 5) return;
                                
                                const rankEl = cells[0]?.querySelector('div');
                                const rank = rankEl?.innerText?.trim() || '';
                                
                                const nameEl = cells[2]?.querySelector('p.ui-text');
                                const name = nameEl?.innerText?.trim() || '';
                                if (!name || name.length < 2) return;
                                
                                const linkEl = cells[2]?.querySelector('a[href]');
                                let detailUrl = linkEl?.getAttribute('href') || '';
                                if (detailUrl && !detailUrl.startsWith('http')) {
                                    detailUrl = 'https://dappbay.bnbchain.org' + detailUrl;
                                }
                                
                                const catEl = cells[3]?.querySelector('p.ui-text');
                                const category = catEl?.innerText?.trim() || 'Unknown';
                                
                                const usersEl = cells[4]?.querySelector('p.ui-text');
                                const users = usersEl?.innerText?.trim() || '';
                                
                                const changeEl = cells[5]?.querySelector('p.ui-text');
                                let change7d = changeEl?.innerText?.trim() || '';
                                change7d = change7d.replace(/\\s+/g, '');
                                
                                const txnEl = cells[6]?.querySelector('p.ui-text');
                                const txn = txnEl?.innerText?.trim() || '';
                                
                                results.push({
                                    rank: parseInt(rank) || 0,
                                    name, category, users, change7d,
                                    transactions: txn, url: detailUrl, verified: true
                                });
                            } catch (e) {}
                        });
                        return results;
                    }
                    """)
                    
                    for dapp in more_dapps:
                        dapp['scrapedAt'] = datetime.now().isoformat()
                    
                    all_dapps.extend(more_dapps)
                    print(f"   ✅ Page {page_num}: {len(more_dapps)} dApps")
                else:
                    break
            except Exception as e:
                print(f"   ⚠️ Failed to load page {page_num}: {e}")
                break
    
    return all_dapps


async def scrape_all_rankings() -> dict:
    """Scrape all rankings"""
    all_dapps = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1200},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        page = await context.new_page()
        
        # Scrape first 3 pages
        all_dapps = await scrape_all_pages(page, max_pages=3)
        
        # Save debug screenshot
        screenshot_path = os.path.join(DATA_DIR, 'dappbay_debug.png')
        await page.screenshot(path=screenshot_path)
        
        await browser.close()
    
    # Remove duplicates
    seen = set()
    unique_dapps = []
    for dapp in all_dapps:
        if dapp['name'] not in seen:
            seen.add(dapp['name'])
            unique_dapps.append(dapp)
    
    # Sort by rank
    unique_dapps.sort(key=lambda x: x.get('rank', 999))
    
    # Get categories
    categories = list(set(d['category'] for d in unique_dapps if d.get('category') and d['category'] != 'Unknown'))
    
    return {
        'dapps': unique_dapps,
        'totalCount': len(unique_dapps),
        'categories': sorted(categories),
        'lastUpdated': datetime.now().isoformat(),
        'source': 'dappbay.bnbchain.org/ranking'
    }


async def main():
    print("🚀 Starting DappsBay Ranking Scraper...")
    print(f"   Output: {OUTPUT_FILE}\n")
    
    os.makedirs(DATA_DIR, exist_ok=True)
    
    data = await scrape_all_rankings()
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✨ Done! Scraped {data['totalCount']} dApps")
    print(f"   Data saved to: {OUTPUT_FILE}")
    
    if data['dapps']:
        print("\n📋 Top 15 dApps:")
        for i, d in enumerate(data['dapps'][:15], 1):
            users = d.get('users', 'N/A')
            cat = d.get('category', 'Unknown')
            change = d.get('change7d', '')
            print(f"   {i:2}. {d['name'][:25]:<25} ({cat:<10}) {users:>10} users {change}")
    else:
        print("\n⚠️ No dApps extracted.")


if __name__ == "__main__":
    asyncio.run(main())
