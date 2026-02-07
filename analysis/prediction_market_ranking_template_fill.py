import os
import asyncio
import argparse
import requests
import base64
import json
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright
from dotenv import load_dotenv

try:
    import pytz
except ImportError:
    pytz = None

# Load environment variables (.env)
load_dotenv()

# Constants
DEFILLAMA_PROTOCOLS_API = "https://api.llama.fi/protocols"
DAPPBAY_RANKING_URL = "https://dappbay.bnbchain.org/ranking/activeusers"
TEMPLATE_FILE = Path(__file__).parent / "tvl.png" 

def format_number(value, prefix="$"):
    """Format large numbers (e.g. 1.2M, 500K)"""
    if value is None or value == 0 or value == "N/A":
        return "N/A"
    
    # If it's already a string, try to parse
    if isinstance(value, str):
        return value
        
    if value >= 1_000_000_000:
        return f"{prefix}{value/1_000_000_000:.2f}B"
    elif value >= 1_000_000:
        return f"{prefix}{value/1_000_000:.2f}M"
    elif value >= 1_000:
        return f"{prefix}{value/1_000:.1f}K"
    else:
        return f"{prefix}{value:.0f}"

def fetch_prediction_market_data():
    """Fetch Prediction Market data from DefiLlama API"""
    print(f"[INFO] Fetching Prediction Market data from DefiLlama protocols API...")
    
    try:
        response = requests.get(DEFILLAMA_PROTOCOLS_API, timeout=30)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"[ERROR] Failed to fetch data: {e}")
        return []
    
    grouped_data = {}
    
    for p in data:
        category = p.get("category", "")
        # Filter for Prediction Market
        if category != "Prediction Market":
            continue

        chain_tvls = p.get("chainTvls", {})
        bsc_tvl = chain_tvls.get("Binance") or chain_tvls.get("BSC")
        
        # Approximate volume from mcap or check if they expose it
        # Unfortunately protocols endpoint usually doesn't have 24h volume for specific chains easily
        # We will use 'N/A' for volume unless we find a workaround or another endpoint
        # BUT: Some protocols have 'volume24h' field? Let's check... usually no.
        # We'll rely on TVL and try to scrape users.
        
        if bsc_tvl is not None and bsc_tvl > 100: 
            group_key = p.get("parentProtocol") or p.get("slug")
            
            if group_key not in grouped_data:
                grouped_data[group_key] = {
                    "name": p.get("name", "Unknown"),
                    "logo": p.get("logo", ""),
                    "category": category,
                    "tvl": 0,
                    "change": 0,
                    "max_tvl": -1,
                    "slug": p.get("slug")
                }
            
            grouped_data[group_key]["tvl"] += bsc_tvl
            
            if bsc_tvl > grouped_data[group_key]["max_tvl"]:
                grouped_data[group_key]["max_tvl"] = bsc_tvl
                grouped_data[group_key]["name"] = p.get("name", "Unknown")
                grouped_data[group_key]["logo"] = p.get("logo", "")
                grouped_data[group_key]["category"] = category
                grouped_data[group_key]["change"] = p.get("change_1d", 0)

    results = list(grouped_data.values())
    results.sort(key=lambda x: x["tvl"], reverse=True)
    return results

async def fetch_dappbay_users_map():
    """Scrape DappBay to get a map of {name: users}"""
    print(f"[INFO] Scraping DappBay for User stats...")
    dapp_map = {}
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        try:
            # We scrape the general 7D ranking page to catch everyone
            await page.goto(DAPPBAY_RANKING_URL, timeout=60000)
            
            # Select 7D
            try:
                seven_d_btn = page.locator("button, span, div").filter(has_text="7D").first
                await seven_d_btn.click(timeout=5000)
                await page.wait_for_timeout(2000)
            except:
                print("[WARN] Could not click 7D button")

            # Expand list nicely (scroll)
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(3000)
            await page.evaluate("window.scrollTo(0, 0)")
            
            # Extract data
            dapps = await page.evaluate('''() => {
                const rows = Array.from(document.querySelectorAll('tbody tr'));
                return rows.map(row => {
                    const nameEl = row.querySelector('td:nth-child(3) p') || row.querySelector('td:nth-child(3)');
                    const name = nameEl ? nameEl.innerText.trim() : "";
                    const users = row.querySelector('td:nth-child(5)')?.innerText?.trim();
                    const txns = row.querySelector('td:nth-child(7)')?.innerText?.trim();
                    return { name, users, txns };
                });
            }''')
            
            for d in dapps:
                if d['name']:
                    # Normalize name for matching
                    key = d['name'].lower().replace(" ", "")
                    dapp_map[key] = d
                    # Also map original name
                    dapp_map[d['name'].lower()] = d
            
            print(f"[INFO] DappBay Scraped: Found {len(dapps)} dapps")
            
        except Exception as e:
            print(f"[WARN] DappBay scrape failed: {e}")
        
        await browser.close()
        
    return dapp_map

def merge_data(llama_data, dappbay_map):
    """Merge datasets based on name matching"""
    merged = []
    for item in llama_data:
        # Defaults
        item['users'] = "N/A"
        item['vol'] = "N/A" # Default volume
        
        # Try finding in DappBay
        name = item['name'].lower()
        key1 = name.replace(" ", "")
        
        match = dappbay_map.get(name) or dappbay_map.get(key1)
        
        if match:
            item['users'] = match.get('users', 'N/A')
            # Use Txns as a proxy for Volume/Activity if needed, or just display Users
            # item['vol'] = match.get('txns', 'N/A') # Vol column could show Txns? 
            # Actually user asked for "Trading Volume", "TVL", "Users".
            # DappBay gives "Txn". DeFi Llama doesn't give vol easily.
            # Let's check if we can simulate "Vol" or just leave it blank/N/A.
            pass
            
        merged.append(item)
    return merged

def fetch_logo_as_base64(url):
    """Download logo and convert to base64"""
    if not url: return ""
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            content_type = response.headers.get('content-type', 'image/png')
            b64 = base64.b64encode(response.content).decode()
            return f"data:{content_type};base64,{b64}"
    except:
        pass
    return ""

async def create_composite_image(protocols, output_path, date_str):
    print("[INFO] Creating composite image...")
    
    # Fetch logos as base64
    for p in protocols[:10]:
        print(f"[INFO] Fetching logo for {p['name']}...")
        p["logoBase64"] = fetch_logo_as_base64(p["logo"])
    
    if TEMPLATE_FILE.exists():
        with open(TEMPLATE_FILE, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        bg_style = f"background-image: url('data:image/png;base64,{encoded_string}');"
    else:
        bg_style = "background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);"

    LOGO_SIZE = 195
    RADIUS = LOGO_SIZE / 2
    LEFT_LOGO_X = 718
    RIGHT_LOGO_X = 2473
    
    Y_CENTERS_LEFT = [395, 738, 1078, 1418, 1775]
    Y_CENTERS_RIGHT = [378, 718, 1063, 1398, 1758]
    
    Y_POSITIONS_LEFT = [y - RADIUS for y in Y_CENTERS_LEFT]
    Y_POSITIONS_RIGHT = [y - RADIUS for y in Y_CENTERS_RIGHT]
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body, html {{
                width: 3825px;
                height: 2160px;
                overflow: hidden;
                background-color: black;
                font-family: 'Inter', sans-serif;
                color: white;
            }}
            #background {{
                position: absolute;
                inset: 0;
                {bg_style}
                background-size: 3825px 2160px;
                z-index: 1;
            }}
            #container {{
                position: absolute;
                inset: 0;
                z-index: 2;
            }}
            .protocol-logo {{
                position: absolute;
                width: {LOGO_SIZE}px;
                height: {LOGO_SIZE}px;
                border-radius: 50%;
                background-color: #222;
                object-fit: cover;
                border: 2px solid rgba(255,255,255,0.2);
            }}
            .text-group {{
                position: absolute;
                display: flex;
                flex-direction: column;
                justify-content: center;
                height: {LOGO_SIZE}px;
            }}
            .protocol-name {{
                font-size: {13 * 5.4}px;
                font-weight: 800;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: {220 * 5.4}px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.9);
                margin-bottom: {2 * 5.4}px;
            }}
            .stats-row {{
                font-size: {10 * 5.4}px;
                font-weight: 600;
                display: flex;
                gap: 40px;
                color: #ccc;
                align-items: center;
                margin-top: 10px;
            }}
            .stat-item {{ display: flex; flex-direction: row; gap: 15px; align-items: baseline; }}
            .stat-label {{ font-size: 0.8em; text-transform: uppercase; color: #9CA3AF; letter-spacing: 1px; }}
            .stat-val {{ color: white; font-weight: 700; }}
            .stat-tvl {{ color: #F0B90B; }}
            .stat-users {{ color: #3B82F6; }}
            
            #footer {{
                position: absolute;
                bottom: 80px;
                left: 140px;
                color: rgba(255, 255, 255, 0.85);
                font-size: 44px;
                font-weight: 600;
                display: flex;
                gap: 25px;
                align-items: center;
                z-index: 10;
                letter-spacing: 0.5px;
            }}
            
            #label-badge {{
                position: absolute;
                top: 120px;
                right: 140px;
                background: linear-gradient(135deg, #ec4899, #8b5cf6);
                color: white;
                padding: 20px 50px;
                border-radius: 50px;
                font-size: 48px;
                font-weight: 800;
                z-index: 10;
                box-shadow: 0 10px 30px rgba(236, 72, 153, 0.3);
            }}
        </style>
    </head>
    <body>
        <div id="background"></div>
        <div id="container">
            <div id="label-badge">PREDICTION MARKETS</div>
    """
    
    for i, protocol in enumerate(protocols):
        if i >= 10: break
        
        is_left = i < 5
        row_idx = i if is_left else i - 5
        
        center_x = LEFT_LOGO_X if is_left else RIGHT_LOGO_X
        logo_left = center_x - RADIUS
        logo_top = Y_POSITIONS_LEFT[row_idx] if is_left else Y_POSITIONS_RIGHT[row_idx]
        text_left = center_x + (LOGO_SIZE / 2) + 50
        
        img_src = protocol.get("logoBase64") or protocol.get("logo") or ""
        logo_html = f'<img src="{img_src}" class="protocol-logo" style="left: {logo_left}px; top: {logo_top}px;">' if img_src else ""
        
        tvl_fmt = format_number(protocol["tvl"])
        users_fmt = protocol.get("users", "N/A")
        
        stats_html = f'''
        <div class="stats-row">
            <div class="stat-item">
                <span class="stat-label">Users</span>
                <span class="stat-val stat-users">{users_fmt}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">TVL</span>
                <span class="stat-val stat-tvl">{tvl_fmt}</span>
            </div>
        </div>
        '''
        
        text_group = f"""
        <div class="text-group" style="left: {text_left}px; top: {logo_top}px;">
            <div class="protocol-name">{protocol["name"]}</div>
            {stats_html}
        </div>
        """
        
        html_content += f"{logo_html}{text_group}"
    
    html_content += f"""
        </div>
        <div id="footer">
            <span>{date_str}</span>
            <span>|</span>
            <span style="color: #F0B90B;">@ChainMindX</span>
        </div>
    </body>
    </html>
    """
    
    debug_html_path = Path(__file__).parent / "prediction_debug.html"
    with open(debug_html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 3825, 'height': 2160})
        page = await context.new_page()
        await page.set_content(html_content)
        await page.wait_for_timeout(3000)
        await page.screenshot(path=output_path, full_page=True)
        await browser.close()
    
    print(f"[SUCCESS] Image saved to {output_path}")

def get_caption_text(protocols, date_str):
    names = []
    for i, p in enumerate(protocols[:10]):
        tvl = format_number(p['tvl'])
        users = p.get('users', 'N/A')
        names.append(f"{i+1}. {p['name']} (TVL: {tvl}, Users: {users})")
        
    list_text = "\n".join(names)
    
    return f"""🔮 TOP PREDICTION MARKETS ON BNBCHAIN - {date_str}

Top @BNBCHAIN Prediction Markets by TVL & Users 👇

{list_text}

Source: DefiLlama, DappBay & @ChainMindX
#BNBChain #PredictionMarkets #DeFi #ChainMind"""

async def run_logic(timezone="UTC", json_output=False, text_only=True):
    # 1. Fetch TVL
    llama_data = fetch_prediction_market_data()
    if not llama_data:
        if json_output:
            print("---JSON_START---")
            print(json.dumps({"error": "Failed to fetch data"}))
            print("---JSON_END---")
        else:
            print("[ERROR] Failed to fetch data.")
        return
    
    # 2. Fetch Users (Scrape)
    dappbay_map = await fetch_dappbay_users_map()
    
    # 3. Merge
    protocols = merge_data(llama_data, dappbay_map)
    
    # 4. Render (Skipped for text-only)
    now_tz = datetime.now(pytz.timezone(timezone)) if pytz else datetime.now()
    date_str = now_tz.strftime("%d %B %Y")
    
    # output_path = f"prediction_rank_{int(datetime.now().timestamp())}.png"
    # if not text_only:
    #     await create_composite_image(protocols, output_path, date_str)
    
    caption = get_caption_text(protocols, date_str)
    
    if json_output:
        try:
            # Clean JSON output
            print("---JSON_START---")
            print(json.dumps({
                "image": None,
                "caption": caption,
                "timestamp": now_tz.isoformat(),
                "data": protocols
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
    parser.add_argument('--interval', default='24h')
    parser.add_argument('--text-only', action='store_true', default=True)
    args = parser.parse_args()
    
    asyncio.run(run_logic(timezone=args.timezone, json_output=args.json, text_only=args.text_only))
