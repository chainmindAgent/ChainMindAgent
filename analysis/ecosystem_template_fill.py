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
DAPPBAY_RANKING_URL = "https://dappbay.bnbchain.org/ranking/activeusers"
TEMPLATE_FILE = Path(__file__).parent / "ecosystem.png"

# Category configurations - map to DappBay filter button text
CATEGORIES = {
    "defi": {"name": "DeFi", "filter_text": "DeFi"},
    "ai": {"name": "AI", "filter_text": "AI"},
    "social": {"name": "Social", "filter_text": "Social"},
    "games": {"name": "Games", "filter_text": "GameFi"}
}

# Target projects defined by user
TARGET_DAPPS = {
    "defi": ["PancakeSwap", "Four Meme", "OPINION"],
    "social": ["Hooked", "Ads3", "FightID"],
    "games": ["The Landlord", "SERAPH In The Darkness", "Tatakai"],
    "ai": ["Revox", "Tearline", "Intelligence Cubed"]
}

async def fetch_ecosystem_data():
    """Fetch all rankings once and filter by category in Python for robustness"""
    print("[INFO] Fetching latest rankings from DappBay...")
    
    results = {k: [] for k in CATEGORIES.keys()}
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1920, 'height': 2000})
        page = await context.new_page()
        page.set_default_timeout(60000)
        
        print(f"[INFO] Accessing {DAPPBAY_RANKING_URL}")
        try:
            # Navigate with networkidle to be sure
            await page.goto(DAPPBAY_RANKING_URL, wait_until="networkidle", timeout=90000)
            
            # Click "7D" range button
            try:
                # Use specific class to avoid matching table headers/rows containing "7D"
                # The filter button is inside a container with class 'group-granularity'
                seven_d_btn = page.locator(".group-granularity").get_by_text("7D", exact=True).first
                if await seven_d_btn.is_visible():
                    print("[INFO] Clicking 7D filter button...")
                    await seven_d_btn.click()
                    await page.wait_for_timeout(5000) # Wait for table refresh
                else:
                    print("[WARN] 7D button not found, using default view.")
            except Exception as e:
                print(f"[WARN] Failed to click 7D button: {e}")

            # Wait for any row to appear
            print("[INFO] Waiting for ranking table rows...")
            try:
                await page.wait_for_selector(".rc-table-row", timeout=45000)
            except Exception as e:
                print(f"[ERROR] Timeout waiting for rows: {e}")
                # Save debug snapshot
                await page.screenshot(path="debug_timeout_snap.png")
                raise e

            # Scroll down multiple times to load more dapps
            print("[INFO] Scrolling to load more dapps...")
            for _ in range(3):
                await page.mouse.wheel(0, 2000)
                await page.wait_for_timeout(2000)
            
            await page.wait_for_timeout(2000)

            # Extract ALL rows
            print("[INFO] Extracting all table rows...")
            all_dapps = await page.evaluate("""
                () => {
                    const rows = Array.from(document.querySelectorAll('.rc-table-row'));
                    console.log("Found raw rows: " + rows.length);
                    return rows.map(row => {
                        const cells = Array.from(row.querySelectorAll('td'));
                        if (cells.length < 5) return null;
                        
                        // Extract Name and Logo (usually in cells[1] or [2])
                        let name = "";
                        let logo = "";
                        for (let i=1; i<4; i++) {
                            const p = cells[i]?.querySelector('p');
                            if (p && p.innerText.trim()) {
                                name = p.innerText.trim();
                                logo = cells[i]?.querySelector('img')?.src || "";
                                break;
                            }
                        }
                        
                        if (!name || name === "Name") return null;
                        
                        // Category is usually in cells[3] (index 4 in some versions, check several)
                        let category = "N/A";
                        for (let i=3; i<5; i++) {
                            const text = cells[i]?.innerText.trim();
                            if (text && text.length > 2 && text.length < 20 && isNaN(text)) {
                                category = text;
                                break;
                            }
                        }
                        
                        const users = cells[4]?.innerText.trim() || '-';
                        const uc = cells[5]?.innerText.trim() || '0.00%';
                        const txs = (cells.length > 6) ? cells[6]?.innerText.trim() : '-';
                        const tc = (cells.length > 7) ? cells[7]?.innerText.trim() : '0.00%';
                        
                        if (!logo) logo = row.querySelector('img')?.src || '';
                        
                        return { name, category, users, uc, txs, tc, logo };
                    }).filter(x => x !== null);
                }
            """)
            
            print(f"[INFO] Found {len(all_dapps)} valid dapps after parsing.")
            
            # Filter in Python
            for cat_key, cat_info in CATEGORIES.items():
                target_filter = cat_info["filter_text"].lower()
                
                filtered = []
                for dapp in all_dapps:
                    dapp_cat = dapp["category"].lower()
                    if target_filter == dapp_cat or (target_filter == "gamefi" and dapp_cat == "games") or (target_filter == "games" and dapp_cat == "gamefi"):
                        filtered.append(dapp)
                        if len(filtered) >= 3:
                            break
                
                # Try partial matching if needed
                if len(filtered) < 3:
                     for dapp in all_dapps:
                        if dapp in filtered: continue
                        dapp_cat = dapp["category"].lower()
                        if target_filter in dapp_cat:
                            filtered.append(dapp)
                            if len(filtered) >= 3: break
                
                # Process logos for the top 3
                for item in filtered:
                    name = item["name"]
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
                        "name": name, "users": item["users"], "uc": item["uc"],
                        "txs": item["txs"], "tc": item["tc"], "logoBase64": logo_b64
                    })
                    print(f"    [OK] {cat_key.upper()}: {name}")

                if not results[cat_key]:
                    print(f"    [WARN] No items found for category {cat_key}")
                    while len(results[cat_key]) < 3:
                        results[cat_key].append({"name": "N/A", "users": "N/A", "uc": "0.00%", "txs": "N/A", "tc": "0.00%", "logoBase64": ""})

        except Exception as e:
            print(f"[ERROR] Fetch failed: {e}")

        await browser.close()
    
    return results

# ============================
# IMAGE COMPOSITION
# ============================

async def create_composite_image(data, output_path, date_str):
    """Render protocols onto the ecosystem.png template with precise positioning"""
    print("[INFO] Creating composite image...")
    
    # Load template
    if TEMPLATE_FILE.exists():
        with open(TEMPLATE_FILE, "rb") as f:
            encoded_string = base64.b64encode(f.read()).decode('utf-8')
        bg_style = f"background-image: url('data:image/png;base64,{encoded_string}');"
    else:
        print("[WARN] ecosystem.png template not found!")
        bg_style = "background: #0a0a1a;"

    # Template dimensions: 3923 x 2258 pixels
    # PRECISELY MEASURED from template white circles (using find_circles.py):
    
    CIRCLE_SIZE = 160
    RADIUS = 80
    
    # Template dimensions: 3923 x 2258 pixels
    # PRECISELY MEASURED from template white circles (using find_circles.py):
    
    CIRCLE_SIZE = 160
    RADIUS = 80
    
    # Precise centers from image analysis
    CATEGORIES_CONFIG = {
        "defi": {
            "centers": [(495, 645), (695, 645), (895, 645)]
        },
        "ai": {
            "centers": [(465, 2526), (665, 2526), (855, 2526)]
        },
        "social": {
            "centers": [(1454, 645), (1654, 645), (1854, 645)]
        },
        "games": {
            "centers": [(1454, 2526), (1654, 2521), (1854, 2521)]
        }
    }
    
    # Build HTML
    items_html = ""
    
    for cat_key, config in CATEGORIES_CONFIG.items():
        protocols = data.get(cat_key, [])
        centers = config["centers"]
        
        for i, protocol in enumerate(protocols[:3]):
            if i >= len(centers):
                break
            
            cy, cx = centers[i]
            circle_x = cx - RADIUS
            circle_y = cy - RADIUS
            
            # Metric colors
            def get_color(change_str):
                if not change_str or change_str == "0.00%" or change_str == "-": return "#888"
                if "+" in change_str: return "#22C55E" # Green
                if "-" in change_str: return "#EF4444" # Red
                return "#888"

            uc_color = get_color(protocol.get("uc", ""))
            tc_color = get_color(protocol.get("tc", ""))
            
            # Text layout - Uniform Logo Left, Text Right
            text_x = circle_x + CIRCLE_SIZE + 40
            text_style = f"left: {text_x}px; top: {cy - 65}px; text-align: left;"
            
            # Logo HTML
            logo_src = protocol.get("logoBase64", "")
            if logo_src:
                logo_html = f'<img src="{logo_src}" class="logo" style="left: {circle_x}px; top: {circle_y}px; width: {CIRCLE_SIZE}px; height: {CIRCLE_SIZE}px;">'
            else:
                initial = protocol.get("name", "?")[0].upper()
                logo_html = f'''
                <div class="initial" style="left: {circle_x}px; top: {circle_y}px; width: {CIRCLE_SIZE}px; height: {CIRCLE_SIZE}px; font-size: 80px;">
                    {initial}
                </div>
                '''
            
            items_html += f'''
            {logo_html}
            <div class="info" style="{text_style}">
                <div class="name">{protocol.get("name", "Unknown")}</div>
                <div class="metrics">
                    <div class="m-group"><span class="label">Users:</span> {protocol.get("users", "N/A")} <span class="change" style="color: {uc_color}">{protocol.get("uc", "")}</span></div>
                    <div class="m-group"><span class="label">TXN:</span> {protocol.get("txs", "N/A")} <span class="change" style="color: {tc_color}">{protocol.get("tc", "")}</span></div>
                </div>
            </div>
            '''

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body, html {{
                width: 3923px;
                height: 2258px;
                overflow: hidden;
                font-family: 'Inter', sans-serif;
                color: white;
                background: #000;
            }}
            #bg {{
                position: absolute;
                inset: 0;
                {bg_style}
                background-size: 100% 100%;
                background-repeat: no-repeat;
                z-index: 1;
            }}
            #content {{
                position: absolute;
                inset: 0;
                z-index: 2;
            }}
            .logo {{
                position: absolute;
                border-radius: 50%;
                object-fit: cover;
            }}
            .initial {{
                position: absolute;
                border-radius: 50%;
                background: linear-gradient(135deg, #F0B90B 0%, #FFD700 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 800;
                color: #000;
            }}
            .info {{
                position: absolute;
                display: flex;
                flex-direction: column;
            }}
            .name {{
                font-size: 42px;
                font-weight: 700;
                color: #FFFFFF;
                text-shadow: 0 2px 8px rgba(0,0,0,0.9);
                margin-bottom: 4px;
                white-space: nowrap;
            }}
            .metrics {{
                display: flex;
                flex-direction: column;
                gap: 2px;
            }}
            .m-group {{
                font-size: 28px;
                font-weight: 600;
                color: #F0B90B;
            }}
            .label {{
                color: rgba(255,255,255,0.6);
                font-size: 24px;
                margin-right: 4px;
            }}
            .change {{
                font-size: 24px;
                font-weight: 700;
                margin-left: 8px;
            }}
        </style>
    </head>
    <body>
        <div id="bg"></div>
        <div id="content">
            {items_html}
        </div>
    </body>
    </html>
    """
    
    # Save debug HTML
    debug_path = Path(__file__).parent / "ecosystem_debug.html"
    with open(debug_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"[DEBUG] Saved HTML to {debug_path}")
    
    # Render with Playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 3923, 'height': 2258})
        page = await context.new_page()
        await page.set_content(html_content)
        await page.wait_for_timeout(3000)
        await page.screenshot(path=output_path)
        await browser.close()
    
    print(f"[SUCCESS] Image saved to {output_path}")

# ============================
# MAIN
# ============================

def get_caption_text(data, date_str):
    """Generate caption for social media"""
    caption = f"🔥 BNBCHAIN ECOSYSTEM TOP DAPPS - {date_str}\n\n"
    
    emojis = {"defi": "💰 DeFi", "ai": "🤖 AI", "social": "👥 Social", "games": "🎮 Games"}
    
    for cat_key, label in emojis.items():
        protocols = data.get(cat_key, [])[:3]
        if protocols:
            names = ", ".join([p["name"] for p in protocols])
            caption += f"{label}: {names}\n"
    
    caption += "\n🚀 Full analytics on Moltbook\n\n"
    caption += "Source: DappBay & @ChainMindX\n"
    caption += "#BNBChain #BSC #DeFi #GameFi #SocialFi #AI"
    
    return caption

async def run_logic(timezone="UTC", json_output=False):
    """Main logic"""
    # 1. Fetch
    data = await fetch_ecosystem_data()
    if not data:
        if json_output:
            print("---JSON_START---")
            print(json.dumps({"error": "Failed to fetch data"}))
            print("---JSON_END---")
        else:
            print("[ERROR] Failed to fetch data.")
        return
    
    # 2. Render
    now_tz = datetime.now(pytz.timezone(timezone)) if pytz else datetime.now()
    date_str = now_tz.strftime("%d %B %Y")
    
    output_path = f"ecosystem_{int(datetime.now().timestamp())}.png"
    await create_composite_image(data, output_path, date_str)
    
    caption = get_caption_text(data, date_str)
    
    # 3. Output
    if json_output:
        try:
            with open(output_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
            
            print("---JSON_START---")
            print(json.dumps({
                "image": b64,
                "caption": caption,
                "timestamp": now_tz.isoformat()
            }))
            print("---JSON_END---")
            
            if os.path.exists(output_path):
                os.remove(output_path)
        except Exception as e:
            print("---JSON_START---")
            print(json.dumps({"error": str(e)}))
            print("---JSON_END---")
    else:
        print(f"[INFO] Done. Image saved to {output_path}")
        print("\nCAPTION:")
        print(caption)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate BNBChain Ecosystem Top DApps poster")
    parser.add_argument('--json', action='store_true', help='Output JSON with base64 image')
    parser.add_argument('--timezone', default='UTC', help='Timezone for date display')
    parser.add_argument('--interval', default='24', help='Time interval (ignored for DappBay)')
    args = parser.parse_args()
    
    asyncio.run(run_logic(timezone=args.timezone, json_output=args.json))
