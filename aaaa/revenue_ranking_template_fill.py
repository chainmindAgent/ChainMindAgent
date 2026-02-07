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
# Use dataType=dailyRevenue to get actual Revenue data, not Fees
# Fees = total fees paid by users, Revenue = protocol's share of fees
DEFILLAMA_API_URL = "https://api.llama.fi/overview/fees/bsc?dataType=dailyRevenue&excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true"
TEMPLATE_FILE = Path(__file__).parent / "rev.png"

def format_revenue(value):
    """Format revenue value to human readable string (e.g., $1.2M, $500K)"""
    if value is None or value == 0:
        return "$0"
    
    if value >= 1_000_000:
        return f"${value/1_000_000:.2f}M"
    elif value >= 1_000:
        return f"${value/1_000:.1f}K"
    else:
        return f"${value:.0f}"

def fetch_revenue_data(interval="24h"):
    """Fetch revenue data from DefiLlama API"""
    print(f"[INFO] Fetching revenue data for BSC chain (interval: {interval})...")
    
    try:
        response = requests.get(DEFILLAMA_API_URL, timeout=30)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"[ERROR] Failed to fetch data: {e}")
        return []
    
    protocols = data.get("protocols", [])
    
    # Map interval to API field
    interval_map = {
        "24h": "total24h",
        "7d": "total7d",
        "30d": "total30d"
    }
    
    field = interval_map.get(interval, "total24h")
    
    # Filter and group protocols by parentProtocol or slug
    grouped_data = {}
    for p in protocols:
        revenue = p.get(field)
        if revenue is not None and revenue > 0:
            # Grouping key: parentProtocol if exists, else slug
            group_key = p.get("parentProtocol") or p.get("slug")
            
            if group_key not in grouped_data:
                grouped_data[group_key] = {
                    "name": p.get("displayName") or p.get("name", "Unknown"),
                    "logo": p.get("logo", ""),
                    "category": p.get("category", "N/A"),
                    "revenue": 0,
                    "change": 0,
                    # Track max revenue component to keep best metadata
                    "max_revenue": -1 
                }
            
            # Sum revenue
            grouped_data[group_key]["revenue"] += revenue
            
            # Update metadata if this component has higher revenue
            if revenue > grouped_data[group_key]["max_revenue"]:
                grouped_data[group_key]["max_revenue"] = revenue
                grouped_data[group_key]["name"] = p.get("displayName") or p.get("name", "Unknown")
                grouped_data[group_key]["logo"] = p.get("logo", "")
                grouped_data[group_key]["category"] = p.get("category", "N/A")
                grouped_data[group_key]["change"] = p.get(f"change_{interval.replace('d', 'over' + interval.replace('d', 'd'))}", 0)

    # Convert back to list
    valid_protocols = list(grouped_data.values())
    
    # Sort by revenue (descending)
    valid_protocols.sort(key=lambda x: x["revenue"], reverse=True)
    
    # Take top 10
    top_protocols = valid_protocols[:10]
    
    print("\n" + "=" * 80)
    print(f"🚀 TOP 10 REVENUE PROTOCOLS ON BSC ({interval.upper()})")
    print("=" * 80)
    print(f"{'#':<3} | {'NAME':<25} | {'CATEGORY':<15} | {'REVENUE'}")
    print("-" * 80)
    for i, p in enumerate(top_protocols):
        print(f"{i+1:<3} | {p['name'][:23]:<25} | {p['category']:<15} | {format_revenue(p['revenue'])}")
    print("=" * 80 + "\n")
    
    return top_protocols

def fetch_logo_as_base64(url):
    """Download logo and convert to base64"""
    if not url:
        return ""
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            content_type = response.headers.get('content-type', 'image/png')
            b64 = base64.b64encode(response.content).decode()
            return f"data:{content_type};base64,{b64}"
    except Exception as e:
        print(f"[WARN] Failed to fetch logo: {e}")
    return ""

async def create_composite_image(protocols, output_path, date_str, interval):
    """Render protocols onto the template"""
    print("[INFO] Creating composite image...")
    
    # Fetch logos as base64
    for p in protocols:
        print(f"[INFO] Fetching logo for {p['name']}...")
        p["logoBase64"] = fetch_logo_as_base64(p["logo"])
    
    # Load template as base64
    if TEMPLATE_FILE.exists():
        with open(TEMPLATE_FILE, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        bg_style = f"background-image: url('data:image/png;base64,{encoded_string}');"
    else:
        print("[WARN] Template file not found, using gradient background")
        bg_style = "background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);"

    # Template dimensions (based on dapps template - assuming similar 4K)
    # Measured coordinates from rev.png template
    LEFT_LOGO_X = 718
    RIGHT_LOGO_X = 2473
    
    LOGO_SIZE = 195
    RADIUS = LOGO_SIZE / 2
    
    # Y positions for left and right columns (measured from template)
    Y_CENTERS_LEFT = [395, 738, 1078, 1418, 1775]
    Y_CENTERS_RIGHT = [378, 718, 1063, 1398, 1758]
    
    Y_POSITIONS_LEFT = [y - RADIUS for y in Y_CENTERS_LEFT]
    Y_POSITIONS_RIGHT = [y - RADIUS for y in Y_CENTERS_RIGHT]
    
    interval_labels = {"24h": "24 HOURS", "7d": "7 DAYS", "30d": "30 DAYS"}
    interval_label = interval_labels.get(interval, interval.upper())
    
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
                font-size: {15 * 5.4}px;
                font-weight: 800;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: {200 * 5.4}px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.9);
                margin-bottom: {4 * 5.4}px;
            }}
            .protocol-stats {{
                font-size: {11 * 5.4}px;
                font-weight: 600;
                display: flex;
                gap: {10 * 5.4}px;
                color: #ccc;
                align-items: center;
            }}
            .stat-cat {{ color: #A855F7; font-weight: 700; }}
            .stat-revenue {{ color: #22C55E; font-weight: 700; }}
            
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
            
            #interval-badge {{
                position: absolute;
                top: 120px;
                right: 140px;
                background: linear-gradient(135deg, #F0B90B, #F8D33A);
                color: #0B0E11;
                padding: 20px 50px;
                border-radius: 50px;
                font-size: 48px;
                font-weight: 800;
                z-index: 10;
            }}
        </style>
    </head>
    <body>
        <div id="background"></div>
        <div id="container">
            <div id="interval-badge">{interval_label}</div>
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
        
        revenue_formatted = format_revenue(protocol["revenue"])
        
        stats_html = f'''
        <div class="protocol-stats">
            <span class="stat-cat">{protocol.get("category", "N/A")}</span>
            <span class="stat-revenue">{revenue_formatted}</span>
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
    
    # Save debug HTML
    debug_html_path = Path(__file__).parent / "revenue_debug.html"
    with open(debug_html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"[INFO] Saved debug HTML to {debug_html_path}")
    
    # Render with Playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 3825, 'height': 2160})
        page = await context.new_page()
        await page.set_content(html_content)
        await page.wait_for_timeout(3000)
        await page.screenshot(path=output_path, full_page=True)
        await browser.close()
    
    print(f"[SUCCESS] Image saved to {output_path}")

def get_caption_text(protocols, date_str, interval):
    """Generate caption for social media"""
    interval_labels = {"24h": "24H", "7d": "7 Days", "30d": "30 Days"}
    interval_label = interval_labels.get(interval, interval.upper())
    
    # Category emojis
    cat_emoji = {
        "Dexs": "🔄", "DEX": "🔄",
        "Lending": "🏦",
        "CDP": "💰",
        "Chain": "⛓️",
        "Launchpad": "🚀",
        "Telegram Bot": "🤖",
        "Yield": "🌾",
        "Liquid Staking": "💎"
    }
    
    # Format list with emojis
    lines = []
    for i, p in enumerate(protocols[:10]):
        emoji = cat_emoji.get(p['category'], "📊")
        lines.append(f"{emoji} {i+1}. {p['name']} → {format_revenue(p['revenue'])}")
    
    list_text = "\n".join(lines)
    
    # Calculate total revenue
    total = sum(p['revenue'] for p in protocols[:10])
    
    return f"""💰 BNB Chain Revenue Leaders | {interval_label}

Which protocols are earning the most on @BNBCHAIN? Top performers:

{list_text}

💵 Total Top 10: {format_revenue(total)}
📅 {date_str}

Data via DefiLlama
#BNBChain #DeFi #Web3"""

async def run_logic(interval="24h", timezone="UTC", json_output=False):
    """Main logic"""
    # 1. Fetch data
    protocols = fetch_revenue_data(interval)
    if not protocols:
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
    
    output_path = f"revenue_rank_{interval}_{int(datetime.now().timestamp())}.png"
    await create_composite_image(protocols, output_path, date_str, interval)
    
    caption = get_caption_text(protocols, date_str, interval)
    
    # 3. Output
    if json_output:
        try:
            with open(output_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
            
            # Clean JSON output
            # Clean JSON output
            print("---JSON_START---")
            print(json.dumps({
                "image": b64,
                "caption": caption,
                "timestamp": now_tz.isoformat(),
                "interval": interval,
                "protocols": [
                    {
                        "name": p["name"],
                        "category": p["category"],
                        "revenue": p["revenue"],
                        "change": p["change"]
                    } for p in protocols[:10]
                ]
            }))
            }))
            print("---JSON_END---")
            
            # Auto cleanup
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
    parser = argparse.ArgumentParser(description="Generate Top Revenue Protocols on BNB Chain poster")
    parser.add_argument('--json', action='store_true', help='Output JSON with base64 image')
    parser.add_argument('--timezone', default='UTC', help='Timezone for date display')
    parser.add_argument('--interval', default='24h', choices=['24h', '7d', '30d'], 
                        help='Time interval for revenue (24h, 7d, 30d)')
    args = parser.parse_args()
    
    asyncio.run(run_logic(interval=args.interval, timezone=args.timezone, json_output=args.json))
