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
DAPPBAY_RANKING_URL = "https://dappbay.bnbchain.org/ranking/activeusers?chains=56"
TEMPLATE_FILE = Path(__file__).parent / "dapps.png"

async def fetch_dapps_ranking_data():
    """Fetch Top 10 DApps from DappBay Ranking with 7d filter (Fulleco Style)"""
    print(f"[INFO] Launching browser to fetch DappBay ranking data...")
    
    dapps_list = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
        # Use the same User-Agent as fulleco (which works)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1200},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        page.set_default_timeout(60000)
        
        print(f"[INFO] Navigating to {DAPPBAY_RANKING_URL}")
        try:
            # 1. Navigate and Wait for content (NetworkIdle is key)
            await page.goto(DAPPBAY_RANKING_URL, wait_until='networkidle', timeout=60000)
            await page.wait_for_timeout(3000) 
            
            # Wait for initial table load BEFORE clicking anything
            print("[INFO] Waiting for initial table data...")
            try:
                await page.wait_for_selector('table tbody tr', timeout=15000)
                print("[INFO] Initial table data loaded.")
            except:
                print("[WARN] Initial table check timed out, proceeding anyway...")

            # 2. Check/Apply 7D Filter
            # Wait for content to stabilize
            await page.wait_for_timeout(3000)

            # Check if 7D is active
            print("[INFO] Checking 7D filter status...")
            is_7d_active = await page.evaluate('''() => {
                const elements = Array.from(document.querySelectorAll('div, button, span'));
                const btn = elements.find(el => el.innerText.trim() === '7D' && (el.classList.contains('group-item') || el.classList.contains('group-button-selected')));
                if (!btn) return false;
                return (btn.classList.contains('active') || btn.classList.contains('group-button-selected') || btn.getAttribute('data-active') === 'true');
            }''')
            
            if not is_7d_active:
                print(f"[INFO] Applying 7D filter...")
                try:
                    # Safer selector: Target the group item explicitly
                    seven_d_btn = page.locator("div.group-item, button, div").filter(has_text="7D").first
                    await seven_d_btn.click()
                    # Wait for table to refresh/reload
                    await page.wait_for_timeout(5000) 
                except Exception as e:
                    print(f"[WARN] Failed to click 7D button: {e}")
            else:
                print("[INFO] 7D filter already active.")

            # 3. Wait for rows to appear (ROBUST WAIT)
            print("[INFO] Waiting for table rows to be populated...")
            try:
                # Wait until we have at least 1 row with legitimate data
                await page.wait_for_function('''() => {
                    const rows = document.querySelectorAll('table tbody tr');
                    return rows.length > 0 && rows[0].innerText.length > 10;
                }''', timeout=20000)
                print("[INFO] Table rows populated.")
            except Exception as e:
                print(f"[WARN] Timeout waiting for rows: {e}")
                # Debug dump if failed
                content = await page.content()
                print(f"[DEBUG] Page content length: {len(content)}")
                with open("dapps_debug.html", "w", encoding="utf-8") as f:
                    f.write(content)
                print("[INFO] Saved dapps_debug.html for debugging")

            # 4. Extract Data (Using Fulleco's robust extraction logic)
            print("[INFO] Extracting DApps data...")
            dapps_list = await page.evaluate('''() => {
                const extracted = [];
                const rows = Array.from(document.querySelectorAll('table tbody tr'));
                
                for (let i = 0; i < rows.length; i++) {
                    if (extracted.length >= 10) break;
                    const row = rows[i];
                    const cells = Array.from(row.querySelectorAll('td'));
                    if (cells.length < 5) continue;
                    
                    // Name usually in 3rd cell (index 2) but verify content
                    let name = cells[2]?.innerText.trim().split('\\n')[0] || '';
                    if (!name) name = row.querySelector('a p')?.innerText.trim() || '';
                    
                    const category = cells[3]?.innerText.trim() || 'N/A';
                    const users = cells[4]?.innerText.trim() || 'N/A';
                    const change7d = cells[5]?.innerText.trim() || '0%';
                    const txn = cells[6]?.innerText.trim() || 'N/A';
                    
                    // Logo from img in row
                    const img = row.querySelector('img');
                    let logoUrl = img ? (img.src || img.getAttribute('data-src')) : '';
                    
                    if (name && name !== 'Unknown' && name !== '---') {
                        extracted.push({
                            name: name,
                            logoUrl: logoUrl,
                            category: category,
                            users: users,
                            txn: txn,
                            change7d: change7d
                        });
                    }
                }
                return extracted;
            }''')

            # 5. Fetch Logos as Base64 (Using Page Request Context)
            print(f"[INFO] Found {len(dapps_list)} dapps. Fetching logos...")
            for dapp in dapps_list:
                logo_b64 = ""
                logo_url = dapp["logoUrl"]
                if logo_url:
                    try:
                        if logo_url.startswith("//"): logo_url = "https:" + logo_url
                        elif logo_url.startswith("/"): logo_url = "https://dappbay.bnbchain.org" + logo_url
                        
                        response = await page.request.get(logo_url)
                        if response.status == 200:
                            buffer = await response.body()
                            logo_b64 = f"data:image/png;base64,{base64.b64encode(buffer).decode('utf-8')}"
                    except Exception as e: 
                        # print(f"Logo fetch failed: {e}")
                        pass
                dapp["logoBase64"] = logo_b64

        except Exception as e:
            print(f"[ERROR] Logic failed: {e}")
            
        await browser.close()
        
    print("\n" + "="*90)
    print("🚀 FETCHED DAPPS (FOR VERIFICATION)")
    print("="*90)
    print(f"{'#':<3} | {'NAME':<25} | {'CATEGORY':<15} | {'USERS':<12} | {'TXN':<12} | {'7D %'}")
    print("-" * 90)
    for i, d in enumerate(dapps_list):
        print(f"{i+1:<3} | {d['name'][:23]:<25} | {d['category']:<15} | {d['users']:<12} | {d['txn']:<12} | {d['change7d']}")
    print("="*90 + "\n")

    return dapps_list

# ============================
# IMAGE COMPOSITION
# ============================

async def fetch_image_as_base64(url):
    """Fetch image from URL and convert to base64"""
    if not url: return ""
    try:
        async with async_playwright() as p:
            # We can't use request context easily without a browser/context usually, 
            # but we can use a simple aiohttp or python requests if available.
            # Since we have playwright open in the main loop, let's just use standard library for simplicity 
            # or reuse the browser context if possible. 
            # Actually, let's use a simple urllib for minimal dependencies if requests isn't guaranteed,
            # but requests is usually there. Let's try requests.
            import requests
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                return f"data:image/png;base64,{base64.b64encode(resp.content).decode('utf-8')}"
    except Exception as e:
        print(f"[WARN] Failed to download logo {url}: {e}")
    return ""

async def create_composite_image(dapps, output_path, date_str):
    """Render dapps onto the template with correct logo positions"""
    print("[INFO] Creating composite image...")
    
    # Validation: warnings for missing base64
    for d in dapps[:10]:
        if not d.get("logoBase64"):
            print(f"[WARN] No base64 logo for {d['name']}, falling back to URL")

    if TEMPLATE_FILE.exists():
        with open(TEMPLATE_FILE, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        bg_style = f"background-image: url('data:image/png;base64,{encoded_string}');"
    else:
        print("[WARN] Template file not found, using gradient background")
        bg_style = "background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);"

    
    # Coordinates Precisely Measured from 4K template (3825x2160):
    LEFT_LOGO_X = 718
    RIGHT_LOGO_X = 2473
    
    # Measured diameter is ~195px
    LOGO_SIZE = 195
    RADIUS = LOGO_SIZE / 2
    
    # Precisely measured Y Centers
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
            .dapp-logo {{
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
            .dapp-name {{
                font-size: {15 * 5.4}px;
                font-weight: 800;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: {200 * 5.4}px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.9);
                margin-bottom: {4 * 5.4}px;
            }}
            .dapp-stats {{
                font-size: {11 * 5.4}px;
                font-weight: 600;
                display: flex;
                gap: {10 * 5.4}px;
                color: #ccc;
                align-items: center;
            }}
            .stat-cat {{ color: #A855F7; font-weight: 700; }}
            .stat-users-label {{ color: #9CA3AF; font-size: {9 * 5.4}px; }}
            .stat-users-value {{ color: #F0B90B; }}
            .stat-change {{ color: #2EBD85; }}
            .stat-change.negative {{ color: #FF4D4D; }}
            
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
        </style>
    </head>
    <body>
        <div id="background"></div>
        <div id="container">
    """

    
    for i, dapp in enumerate(dapps):
        if i >= 10: break
        
        is_left = i < 5
        row_idx = i if is_left else i - 5
        
        # Calculate X - Center alignment
        center_x = LEFT_LOGO_X if is_left else RIGHT_LOGO_X
        # Convert to Top-Left for CSS
        logo_left = center_x - RADIUS
        logo_top = Y_POSITIONS_LEFT[row_idx] if is_left else Y_POSITIONS_RIGHT[row_idx]
        
        text_left = center_x + (LOGO_SIZE / 2) + (50) # Increased gap for 4K
        
        # Use Base64 logo if available, else URL, else empty
        img_src = dapp.get("logoBase64") or dapp.get("logoUrl") or ""
        if img_src.startswith("data:"):
            print(f"[DEBUG] {dapp['name']} logo source: Base64 ({len(img_src)} chars)")
        else:
            print(f"[DEBUG] {dapp['name']} logo source: URL")
            
        # Use Base64 logo if available, else URL, else empty
        img_src = dapp.get("logoBase64") or dapp.get("logoUrl") or ""
        if img_src and img_src.startswith("data:"):
            print(f"[DEBUG] {dapp['name']} logo source: Base64 ({len(img_src)} chars)")
        elif img_src:
            print(f"[DEBUG] {dapp['name']} logo source: URL {img_src[:30]}...")
            
        logo_html = f'<img src="{img_src}" class="dapp-logo" style="left: {logo_left}px; top: {logo_top}px;">' if img_src else ""
        
        # Determine color for change
        change_str = dapp.get('change7d', '0%').replace('%', '').replace('+', '').replace('−', '-').replace(',', '').strip()
        try:
            is_neg = float(change_str) < 0
        except:
            is_neg = '-' in dapp.get('change7d', '')
            
        change_class = "negative" if is_neg else ""
        
        stats_parts = []
        if dapp.get("category") and dapp["category"] != "N/A":
            stats_parts.append(f'<span class="stat-cat">{dapp["category"]}</span>')
        
        # Combine Users and Change
        user_val = dapp.get("users", "N/A")
        change_val = dapp.get("change7d", "0%")
        stats_parts.append(f'<span class="stat-users-label">Users</span> <span class="stat-users-value">{user_val}</span>')
        stats_parts.append(f'<span class="stat-change {change_class}">{change_val}</span>')

        stats_html = f'<div class="dapp-stats">{" ".join(stats_parts)}</div>' if stats_parts else ""
        
        text_group = f"""
        <div class="text-group" style="left: {text_left}px; top: {logo_top}px;">
            <div class="dapp-name">{dapp["name"]}</div>
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

    # Save debug HTML
    with open("dapps_debug.html", "w", encoding="utf-8") as f:
        f.write(html_content)
    print("[INFO] Saved dapps_debug.html")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 3825, 'height': 2160})
        page = await context.new_page()
        await page.set_content(html_content)
        await page.wait_for_timeout(3000)
        await page.screenshot(path=output_path, full_page=True)
        await browser.close()
    
    print(f"[SUCCESS] Image saved to {output_path}")

# ============================
# MAIN
# ============================

def get_caption_text(dapps, date_str):
    names = [f"{i+1}. {d['name']}" for i, d in enumerate(dapps[:10])]
    list_text = "\n".join(names)
    return f"""🏆 TOP BNBCHAIN DAPPS - {date_str}

Top @BNBCHAIN Ecosystem Projects by Active Users (7d) 👇

{list_text}

Source: DappBay & @ChainMindX
#BNBChain #Dapps #ChainMind"""

async def run_logic(timezone="UTC", json_output=False, text_only=True):
    # 1. Fetch
    dapps = await fetch_dapps_ranking_data()
    if not dapps:
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
    
    # output_path = f"dapps_rank_{int(datetime.now().timestamp())}.png"
    # if not text_only:
    #     await create_composite_image(dapps, output_path, date_str)
    
    caption = get_caption_text(dapps, date_str)

    # 3. Output
    if json_output:
        try:
            # Clean JSON output
            print("---JSON_START---")
            print(json.dumps({
                "image": None,
                "caption": caption,
                "timestamp": now_tz.isoformat(),
                "data": dapps[:15]
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
    parser.add_argument('--interval', default='7d', help='Time interval (fixed to 7D for DApps ranking)')
    parser.add_argument('--text-only', action='store_true', default=True)
    args = parser.parse_args()
    
    asyncio.run(run_logic(timezone=args.timezone, json_output=args.json, text_only=args.text_only))
