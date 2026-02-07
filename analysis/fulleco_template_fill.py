import os
import asyncio
import argparse
from datetime import datetime
from pathlib import Path
import base64
from playwright.async_api import async_playwright
from dotenv import load_dotenv
import json

try:
    import pytz
except ImportError:
    pytz = None

# Load environment variables (.env)
load_dotenv()

# Constants
TEMPLATE_FILE = Path(__file__).parent / "fulleco.png"

# Mapping for the script
CATEGORIES_CONFIG = {
    "defi":   {"url": "https://dappbay.bnbchain.org/ranking/category/defi", "count": 6, "match": "DeFi"},
    "games":  {"url": "https://dappbay.bnbchain.org/ranking/category/games", "count": 3, "match": "Games"},
    "social": {"url": "https://dappbay.bnbchain.org/ranking/category/social", "count": 3, "match": "Social"},
    "nfts":   {"url": "https://dappbay.bnbchain.org/ranking/category/nfts", "count": 3, "match": "NFTs"},
    "ai":     {"url": "https://dappbay.bnbchain.org/ranking/category/ai", "count": 3, "match": "AI"},
    "infra":  {"url": "https://dappbay.bnbchain.org/ranking/category/infra-and-tools", "count": 3, "match": "Infra"},
    "rwa":    {"url": "https://dappbay.bnbchain.org/ranking/category/rwa", "count": 3, "match": "RWA"}
}

async def fetch_fulleco_data():
    """Fetch top rankings for 7 categories from DappBay using direct URLs with verification"""
    print("[INFO] Fetching latest ecosystem data from DappBay...")
    
    results = {}
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
        # Use a fresh context for each run to avoid state bleeding
        context = await browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36")
        page = await context.new_page()
        page.set_default_timeout(60000)
        
        for cat_key, config in CATEGORIES_CONFIG.items():
            cat_url = config["url"]
            limit = config["count"]
            match_text = config["match"]
            results[cat_key] = []
            
            print(f"\n[INFO] Fetching {cat_key.upper()} from {cat_url}...")
            
            try:
                # 1. Navigate and Wait for content
                await page.goto(cat_url, wait_until="networkidle", timeout=60000)
                await page.wait_for_timeout(3000) # Basic safety wait for React hydration

                # 2. Re-apply 7D filter if not active (Default check)
                is_7d_active = await page.evaluate('''() => {
                    const btn = Array.from(document.querySelectorAll('button, span, div')).find(el => el.innerText === '7D');
                    return btn && (btn.classList.contains('active') || btn.getAttribute('data-active') === 'true' || getComputedStyle(btn).color === 'rgb(240, 185, 11)');
                }''')
                
                if not is_7d_active:
                    print(f"    [INFO] Applying 7D filter...")
                    seven_d_btn = page.locator("button, span, div").filter(has_text="7D").first
                    await seven_d_btn.click()
                    await page.wait_for_timeout(4000) # Wait for table refresh after click

                # 3. VERIFY DATA MATCHES CATEGORY (CRITICAL FIX FOR REPLICATION)
                # We wait until the table contains at least one row where the category column (usually 4th or 5th) matches
                print(f"    [INFO] Verifying category content contains '{match_text}'...")
                try:
                    await page.wait_for_function(f'''(text) => {{
                        const rows = Array.from(document.querySelectorAll('table tbody tr'));
                        return rows.some(r => r.innerText.includes(text));
                    }}''', match_text, timeout=15000)
                except:
                    print(f"    [WARN] Category verification timeout for {cat_key}. Proceeding with best-effort.")

                # 4. Extract Top rows
                data_list = await page.evaluate('''(limit) => {
                    const extracted = [];
                    const rows = Array.from(document.querySelectorAll('table tbody tr'));
                    
                    for (let i = 0; i < rows.length; i++) {
                        if (extracted.length >= limit) break;
                        const row = rows[i];
                        const cells = Array.from(row.querySelectorAll('td'));
                        if (cells.length < 8) continue;
                        
                        const name = cells[2]?.innerText.trim().split('\\n')[0] || '';
                        // Skip loading skeletons or "Unknown"
                        if (!name || name === 'Unknown' || name === '---') continue;
                        
                        const users = cells[4]?.innerText.trim() || '-';
                        const uc = cells[5]?.innerText.trim() || '0.00%';
                        const txs = cells[6]?.innerText.trim() || '-';
                        const tc = cells[7]?.innerText.trim() || '0.00%';
                        const logo = row.querySelector('img')?.src || '';
                        
                        extracted.push({ name, users, uc, txs, tc, logo });
                    }
                    return extracted;
                }''', limit)

                for item in data_list:
                    # Download logo and convert to B64
                    logo_b64 = ""
                    logo_url = item["logo"]
                    if logo_url:
                        try:
                            if logo_url.startswith("//"): logo_url = "https:" + logo_url
                            elif logo_url.startswith("/"): logo_url = "https://dappbay.bnbchain.org" + logo_url
                            response = await page.request.get(logo_url)
                            if response.status == 200:
                                buffer = await response.body()
                                logo_b64 = f"data:image/png;base64,{base64.b64encode(buffer).decode('utf-8')}"
                        except: pass
                    
                    results[cat_key].append({
                        "name": item["name"], "users": item["users"], "uc": item["uc"],
                        "txs": item["txs"], "tc": item["tc"], "logoBase64": logo_b64
                    })
                    print(f"    [OK] Captured: {item['name']}")

            except Exception as e:
                print(f"    [ERROR] Failed to fetch {cat_key}: {e}")

        await browser.close()
    return results

async def create_composite_image(data, output_path, date_str):
    """Render data onto the fulleco.png template with refined coordinates"""
    print("[INFO] Creating composite image...")
    
    if TEMPLATE_FILE.exists():
        with open(TEMPLATE_FILE, "rb") as f:
            encoded_string = base64.b64encode(f.read()).decode('utf-8')
        bg_style = f"background-image: url('data:image/png;base64,{encoded_string}');"
    else:
        bg_style = "background: #0a0a1a;"

    CIRCLE_SIZE = 160
    RADIUS = 80
    
    # RECALIBRATED COORDINATES FOR FULLECO.PNG
    # Perfect Box Centers for a 3923px width template
    DEFI_X = 560
    DEFI_Y_START = 630
    DEFI_GAP = 230
    DEFI_CENTERS = [(DEFI_Y_START + i*DEFI_GAP, DEFI_X) for i in range(6)]
    
    # SMALL BOXES: Balanced vertical/horizontal positions
    Y_GAP = 215
    Y_TOP_START = 630
    Y_BOTTOM_START = 1580
    
    # X CENTERS RE-CALIBRATED FOR MATHEMATICAL CENTERING
    GAMES_X = 1500
    SOCIAL_X = 2440
    NFT_X = 3380
    
    def get_grid_centers(x, y_start):
        return [(y_start, x), (y_start + Y_GAP, x), (y_start + 2*Y_GAP, x)]

    LAYOUT = {
        "defi":   {"centers": DEFI_CENTERS},
        "games":  {"centers": get_grid_centers(GAMES_X, Y_TOP_START)},
        "social": {"centers": get_grid_centers(SOCIAL_X, Y_TOP_START)},
        "nfts":   {"centers": get_grid_centers(NFT_X, Y_TOP_START)},
        "ai":     {"centers": get_grid_centers(AI_X := 1500, Y_BOTTOM_START)},
        "infra":  {"centers": get_grid_centers(INFRA_X := 2440, Y_BOTTOM_START)},
        "rwa":    {"centers": get_grid_centers(RWA_X := 3380, Y_BOTTOM_START)}
    }
    
    items_html = ""
    for cat_key, config in LAYOUT.items():
        protocols = data.get(cat_key, [])
        for i, p in enumerate(protocols):
            if i >= len(config["centers"]): break
            cy, cx = config["centers"][i]
            
            # BLOCK CENTERING LOGIC: Allow enough width for long names
            BLOCK_WIDTH = 750
            circle_x = cx - (BLOCK_WIDTH // 2)
            circle_y = cy - RADIUS
            text_x = circle_x + CIRCLE_SIZE + 40
            
            # Metric colors
            uc_color = "#22C55E" if "+" in p["uc"] else ("#EF4444" if "-" in p["uc"] else "#888")
            tc_color = "#22C55E" if "+" in p["tc"] else ("#EF4444" if "-" in p["tc"] else "#888")
            
            logo_html = f'<img src="{p["logoBase64"]}" class="logo" style="left:{circle_x}px;top:{circle_y}px;width:{CIRCLE_SIZE}px;height:{CIRCLE_SIZE}px;">' if p["logoBase64"] else f'<div class="initial" style="left:{circle_x}px;top:{circle_y}px;width:{CIRCLE_SIZE}px;height:{CIRCLE_SIZE}px;font-size:60px;">{p["name"][0]}</div>'
            
            items_html += f'''
            <div class="item">
                {logo_html}
                <div class="info" style="left:{text_x}px; top:{cy - 65}px;">
                    <div class="name">{p["name"]}</div>
                    <div class="metrics">
                        <div class="m-group">Users: {p["users"]} <span style="color:{uc_color}">{p["uc"]}</span></div>
                        <div class="m-group">TXN: {p["txs"]} <span style="color:{tc_color}">{p["tc"]}</span></div>
                    </div>
                </div>
            </div>
            '''

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            * {{ margin:0; padding:0; box-sizing:border-box; }}
            body, html {{ width:3923px; height:2258px; overflow:hidden; font-family:'Inter',sans-serif; color:white; background:#000; }}
            #bg {{ position:absolute; inset:0; {bg_style} background-size: 100% 100%; z-index: 1; }}
            #content {{ position:absolute; inset:0; z-index: 2; }}
            .logo, .initial {{ position:absolute; border-radius:50%; object-fit:cover; border: 4px solid rgba(240, 185, 11, 0.5); box-shadow: 0 8px 30px rgba(0,0,0,0.8); }}
            .initial {{ background:#F0B90B; display:flex; align-items:center; justify-content:center; font-weight:800; color:#000; }}
            .info {{ position:absolute; display:flex; flex-direction:column; padding-right: 20px; }}
            .name {{ font-size:44px; font-weight:800; color:#FFFFFF; margin-bottom:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:580px; text-shadow: 0 4px 12px rgba(0,0,0,1); }}
            .metrics {{ display:flex; flex-direction:column; gap:6px; }}
            .m-group {{ font-size:30px; font-weight:700; color:#F0B90B; text-shadow: 0 2px 8px rgba(0,0,0,0.8); }}
            .m-group span {{ font-size:26px; margin-left:12px; font-weight:800; }}
        </style>
    </head>
    <body>
        <div id="bg"></div>
        <div id="content">{items_html}</div>
    </body>
    </html>
    """
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
        page = await browser.new_page(viewport={'width': 3923, 'height': 2258})
        await page.set_content(html_content)
        await page.wait_for_timeout(3000)
        await page.screenshot(path=output_path)
        await browser.close()
    
    print(f"[SUCCESS] Image saved to {output_path}")

def get_caption_text(data, date_str):
    caption = f"🌐 BNB CHAIN ECOSYSTEM UPDATE - {date_str}\n\n"
    
    for cat, items in data.items():
        if not items: continue
        caption += f"📌 {cat.upper()}\n"
        for i, item in enumerate(items[:3]):
            caption += f"{i+1}. {item['name']} ({item['users']} Users)\n"
        caption += "\n"
        
    caption += "Source: DappBay & @ChainMindX\n#BNBChain #Web3 #ChainMind"
    return caption

async def run_logic(timezone="UTC", json_output=False, text_only=True):
    data = await fetch_fulleco_data()
    
    if not data:
        if json_output:
            print("---JSON_START---")
            print(json.dumps({"error": "Failed to fetch data"}))
            print("---JSON_END---")
        else:
            print("[ERROR] Failed to fetch data.")
        return

    now_tz = datetime.now(pytz.timezone(timezone)) if pytz else datetime.now()
    date_str = now_tz.strftime("%d %B %Y")
    
    # output_path = f"fulleco_{int(now_tz.timestamp())}.png"
    # if not text_only:
    #     await create_composite_image(data, output_path, date_str)
        
    caption = get_caption_text(data, date_str)
    
    if json_output:
        try:
            print("---JSON_START---")
            print(json.dumps({
                "image": None,
                "caption": caption,
                "timestamp": now_tz.isoformat(),
                "data": data
            }))
            print("---JSON_END---")
        except Exception as e:
            print("---JSON_START---")
            print(json.dumps({"error": str(e)}))
            print("---JSON_END---")
    else:
        print(f"[INFO] Done (Text Only).")
        print("\nCAPTION:")
        print(caption)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--json', action='store_true')
    parser.add_argument('--timezone', default='UTC')
    parser.add_argument('--interval', default='24h', help='Time interval (ignored for ecosystem)')
    parser.add_argument('--text-only', action='store_true', default=True)
    args = parser.parse_args()
    
    asyncio.run(run_logic(timezone=args.timezone, json_output=args.json, text_only=args.text_only))
