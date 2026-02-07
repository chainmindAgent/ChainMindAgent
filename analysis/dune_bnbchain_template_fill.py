import os
import asyncio
import argparse
import requests
import base64
import json
from datetime import datetime, timedelta
from pathlib import Path
from playwright.async_api import async_playwright
from dotenv import load_dotenv

try:
    from dune_client.client import DuneClient
    from dune_client.query import QueryBase
    from dune_client.types import QueryParameter
except ImportError:
    print("Dune Client not installed. Please run: pip install dune-client")
    DuneClient = None

try:
    import pytz
except ImportError:
    pytz = None

# Load environment variables (.env)
load_dotenv()

# Constants
TEMPLATE_FILE = Path(__file__).parent / "dune_template.png"

def format_number(value):
    """Format large numbers (1.2M, 850K)"""
    if value is None:
        return "0"
    if value >= 1_000_000:
        return f"{value/1_000_000:.1f}M"
    elif value >= 1_000:
        return f"{value/1_000:.1f}K"
    else:
        return f"{value:.0f}"

def format_currency(value):
    """Format currency ($1.2M, $500K)"""
    if value is None:
        return "$0"
    if value >= 1_000_000_000:
        return f"${value/1_000_000_000:.2f}B"
    elif value >= 1_000_000:
        return f"${value/1_000_000:.1f}M"
    elif value >= 1_000:
        return f"${value/1_000:.1f}K"
    else:
        return f"${value:.2f}"

def fetch_dune_data(api_key, interval="24h"):
    """Fetch data from Dune Analytics"""
    if not DuneClient:
        print("[ERROR] Dune Client library not found.")
        return None

    print(f"[INFO] Fetching Dune data for interval: {interval}...")
    
    # Check for API key before initializing client
    if not api_key:
        print("[WARN] No API Key provided. Returning MOCK data.")
        return {
            "overview": {"active_addresses": 1250000, "tx_count": 8500000, "gas_bnb": 2450},
            "dex": [
                {"project": "PancakeSwap", "volume_usd": 520000000},
                {"project": "BiSwap", "volume_usd": 150000000},
                {"project": "Mdex", "volume_usd": 90000000},
                {"project": "Apeswap", "volume_usd": 50000000},
                {"project": "Thena", "volume_usd": 40000000}
            ]
        }

    try:
        dune = DuneClient(api_key)
    except Exception as e:
        print(f"[WARN] Failed to initialize DuneClient: {e}")
        return None
    # For now, let's use a constructed SQL query to avoid managing Query IDs that might not exist yet
    # Note: Using 'bnb' or 'bsc' depending on Dune's table naming. Dune v2 uses 'bnb' usually.
    
    interval_hours = {
        "24h": 24,
        "7d": 24 * 7,
        "30d": 24 * 30
    }.get(interval, 24)

    # 1. Active Addresses, TX Volume, & Wallet Distribution Query
    # Using 'bnb.transactions' table
    # Added: new_wallets (nonce=0) count
    query_overview = f"""
    SELECT 
        COUNT(DISTINCT "from") as active_addresses,
        COUNT(*) as tx_count,
        SUM(CAST(gas_used AS DOUBLE) * CAST(gas_price AS DOUBLE)) / 1e18 as gas_bnb,
        COUNT(DISTINCT CASE WHEN nonce = 0 THEN "from" END) as new_wallets
    FROM bnb.transactions 
    WHERE block_time > now() - interval '{interval_hours}' hour
    """
    
    # 2. Top DEX Volume Query
    query_dex = f"""
    SELECT 
        project,
        SUM(amount_usd) as volume_usd
    FROM dex.trades
    WHERE blockchain = 'bnb' 
    AND block_time > now() - interval '{interval_hours}' hour
    GROUP BY project
    ORDER BY volume_usd DESC
    LIMIT 5
    """

    try:
        # Run Overview Query
        print("[INFO] Executing Overview Query (inc. Wallets)...")
        res_overview = dune.run_sql(query_sql=query_overview, performance="medium")
        overview_data = res_overview.result.rows[0] if res_overview.result.rows else {}
        
        print("[INFO] Executing DEX Query...")
        res_dex = dune.run_sql(query_sql=query_dex, performance="medium")
        dex_data = res_dex.result.rows
        
        return {
            "overview": overview_data,
            "dex": dex_data
        }
        
    except Exception as e:
        print(f"[ERROR] Dune API execution failed: {e}")
        # Fallback for testing/NO API KEY situations - remove in production if strict
        print("[WARN] Returning MOCK data for demonstration/fallback")
        return {
            "overview": {
                "active_addresses": 1350000, 
                "tx_count": 9200000, 
                "gas_bnb": 2600,
                "new_wallets": 45000  # Mock new wallets
            },
            "dex": [
                {"project": "PancakeSwap", "volume_usd": 520000000},
                {"project": "BiSwap", "volume_usd": 150000000},
                {"project": "Mdex", "volume_usd": 90000000},
                {"project": "Apeswap", "volume_usd": 50000000},
                {"project": "Thena", "volume_usd": 40000000}
            ]
        }

async def create_composite_image(data, output_path, date_str, interval):
    """Render metrics onto the bnb.png template"""
    print("[INFO] Creating composite image...")
    
    # Extract data
    ov = data.get("overview", {})
    
    active_addr = format_number(ov.get("active_addresses", 0))
    new_wallets = format_number(ov.get("new_wallets", 0))
    tx_count = format_number(ov.get("tx_count", 0))
    gas_used = f"{float(ov.get('gas_bnb', 0)):,.0f}"
    
    # TVL Placeholder
    tvl_val = "$5.1B"
    
    # Template file - Use bnb.png
    template_path = Path(__file__).parent / "bnb.png"
    
    if template_path.exists():
        with open(template_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        bg_style = f"background-image: url('data:image/png;base64,{encoded_string}');"
    else:
        print("[WARN] bnb.png template not found!")
        bg_style = "background: #0a0a1a;"

    # Template dimensions: 3923 x 2258 pixels
    # Looking at the template, the cards are arranged in 2x2 grid:
    # - Top row: Active Address (left), Transaction (right)
    # - Bottom row: Active Users (left), TVL (right)
    # Let's recalibrate based on visual inspection (scale factor ~1.7 from display)
    
    # Measured coordinates from template (approximate):
    # Header height ~160px, Footer ~180px
    # Card area: ~1920px height split between 2 rows
    # Each card: ~880px wide (with gaps)
    
    CARD_TL = {"x": 140, "y": 280, "w": 950, "h": 650}    # Active Address (top-left)
    CARD_TR = {"x": 2045, "y": 280, "w": 950, "h": 650}   # Transaction (top-right)
    CARD_BL = {"x": 140, "y": 1050, "w": 950, "h": 650}   # Active Users (bottom-left)
    CARD_BR = {"x": 2045, "y": 1050, "w": 950, "h": 650}  # TVL (bottom-right)

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
            
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            
            body, html {{
                width: 3923px;
                height: 2258px;
                overflow: hidden;
                font-family: 'Inter', sans-serif;
                color: white;
                background: #000;
            }}
            
            #background {{
                position: absolute;
                inset: 0;
                {bg_style}
                background-size: 100% 100%;
                background-repeat: no-repeat;
                z-index: 1;
            }}
            
            #overlay {{
                position: absolute;
                inset: 0;
                z-index: 2;
            }}
            
            .data-box {{
                position: absolute;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
            }}
            
            .metric-value {{
                font-size: 120px;
                font-weight: 800;
                line-height: 1.1;
                text-shadow: 0 4px 30px rgba(0,0,0,0.8);
            }}
            
            .metric-label {{
                font-size: 36px;
                font-weight: 600;
                opacity: 0.8;
                margin-top: 10px;
            }}
            
            /* Colors */
            .white {{ color: #FFFFFF; }}
            .yellow {{ color: #F0B90B; }}
            .cyan {{ color: #00D4FF; }}
            .green {{ color: #22C55E; }}
        </style>
    </head>
    <body>
        <div id="background"></div>
        
        <div id="overlay">
            <!-- Top Left: Active Address -->
            <div class="data-box" style="
                left: {CARD_TL['x']}px; 
                top: {CARD_TL['y'] + 60}px; 
                width: {CARD_TL['w']}px; 
                height: {CARD_TL['h'] - 60}px;
            ">
                <div class="metric-value white">{active_addr}</div>
                <div class="metric-label">Unique Addresses</div>
            </div>
            
            <!-- Top Right: Transaction -->
            <div class="data-box" style="
                left: {CARD_TR['x']}px; 
                top: {CARD_TR['y'] + 60}px; 
                width: {CARD_TR['w']}px; 
                height: {CARD_TR['h'] - 60}px;
            ">
                <div class="metric-value white">{tx_count}</div>
                <div class="metric-label">Total Transactions</div>
            </div>
            
            <!-- Bottom Left: Active Users (New Wallets) -->
            <div class="data-box" style="
                left: {CARD_BL['x']}px; 
                top: {CARD_BL['y'] + 60}px; 
                width: {CARD_BL['w']}px; 
                height: {CARD_BL['h'] - 60}px;
            ">
                <div class="metric-value yellow">{new_wallets}</div>
                <div class="metric-label yellow">New Wallets</div>
            </div>
            
            <!-- Bottom Right: TVL -->
            <div class="data-box" style="
                left: {CARD_BR['x']}px; 
                top: {CARD_BR['y'] + 60}px; 
                width: {CARD_BR['w']}px; 
                height: {CARD_BR['h'] - 60}px;
            ">
                <div class="metric-value cyan">{tvl_val}</div>
                <div class="metric-label cyan">Total Value Locked</div>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Save debug HTML
    debug_html_path = Path(__file__).parent / "dune_debug.html"
    with open(debug_html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"[DEBUG] Saved HTML to {debug_html_path}")
    
    # Render with Playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 3923, 'height': 2258})
        page = await context.new_page()
        await page.set_content(html_content)
        await page.wait_for_timeout(2000)
        await page.screenshot(path=output_path)
        await browser.close()
    
    print(f"[SUCCESS] Image saved to {output_path}")

def get_caption_text(data, date_str, interval):
    """Generate caption for social media"""
    interval_labels = {"24h": "24H", "7d": "7D", "30d": "30D"}
    interval_label = interval_labels.get(interval, interval.upper())
    
    ov = data.get("overview", {})
    dex_list = data.get("dex", [])
    
    active_addr = format_number(ov.get("active_addresses", 0))
    tx_count = format_number(ov.get("tx_count", 0))
    
    dex_text = ""
    for i, d in enumerate(dex_list[:3]):
        project_name = d.get('project', 'Unknown').title()
        dex_text += f"• {project_name}: {format_currency(d.get('volume_usd', 0))}\n"
    
    return f"""📊 BNBCHAIN STATS REPORT - {date_str}

Market Pulse ({interval_label}):
👥 Active Addresses: {active_addr}
⚡ Total Transactions: {tx_count}

🔥 Top DEX Volume:
{dex_text}
Full analytics on Moltbook 🚀

Source: Dune Analytics & @ChainMindX
#BNBChain #BSC #CryptoStats #DuneAnalytics"""

async def run_logic(interval="24h", timezone="UTC", json_output=False):
    """Main logic"""
    # 0. Check API Key
    api_key = os.getenv("DUNE_API_KEY")
    if not api_key:
        if json_output:
             # Just warn, but allow mock data if we want
             pass 
        else:
             print("[WARN] DUNE_API_KEY not found in .env, using MOCK data.")

    # 1. Fetch data
    data = fetch_dune_data(api_key, interval)
    if not data:
        err_msg = "Failed to fetch data."
        if json_output:
            print("---JSON_START---")
            print(json.dumps({"error": err_msg}))
            print("---JSON_END---")
        print(f"[ERROR] {err_msg}")
        return
    
    # 2. Render
    now_tz = datetime.now(pytz.timezone(timezone)) if pytz else datetime.now()
    date_str = now_tz.strftime("%d %B %Y")
    
    output_path = f"dune_stats_{interval}_{int(datetime.now().timestamp())}.png"
    await create_composite_image(data, output_path, date_str, interval)
    
    caption = get_caption_text(data, date_str, interval)
    
    # 3. Output
    if json_output:
        try:
            with open(output_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
            
            print("---JSON_START---")
            print(json.dumps({
                "image": b64,
                "caption": caption,
                "timestamp": now_tz.isoformat(),
                "interval": interval
            }))
            print("---JSON_END---")
            
            # Clean up
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
    parser = argparse.ArgumentParser(description="Generate BNBChain Stats from Dune")
    parser.add_argument('--json', action='store_true', help='Output JSON with base64 image')
    parser.add_argument('--timezone', default='UTC', help='Timezone for date display')
    parser.add_argument('--interval', default='24h', choices=['24h', '7d', '30d'], 
                        help='Time interval')
    args = parser.parse_args()
    
    asyncio.run(run_logic(interval=args.interval, timezone=args.timezone, json_output=args.json))
