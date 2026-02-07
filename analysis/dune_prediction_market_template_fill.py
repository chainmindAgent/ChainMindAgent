import os
import asyncio
import argparse
import base64
import json
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright
from dotenv import load_dotenv

try:
    from dune_client.client import DuneClient
    from dune_client.query import QueryBase
except ImportError:
    DuneClient = None

try:
    import pytz
except ImportError:
    pytz = None

load_dotenv()

# ==========================================
# 🔧 CONFIGURATION (USER TO FILL QUERY IDs)
# ==========================================
# Query ID provided by user
QUERY_ID_MAIN = 9318883 

# We will try to extract all metrics from this single query or use it for specific parts
QUERY_ID_VOLUME = QUERY_ID_MAIN 
QUERY_ID_USERS = QUERY_ID_MAIN 
QUERY_ID_TOP_MARKETS = QUERY_ID_MAIN 

TEMPLATE_FILE = Path(__file__).parent / "prediction_bg.png" 

def format_number(value, prefix=""):
    try:
        value = float(value)
    except:
        return "0"
        
    if value is None: return "0"
    if value >= 1_000_000_000:
        return f"{prefix}{value/1_000_000_000:.2f}B"
    elif value >= 1_000_000:
        return f"{prefix}{value/1_000_000:.2f}M"
    elif value >= 1_000:
        return f"{prefix}{value/1_000:.1f}K"
    else:
        return f"{prefix}{value:,.0f}"

def fetch_dune_data(api_key):
    if not DuneClient or not api_key:
        print("[WARN] Dune Client not ready or no API Key. Returning MOCK DATA.")
        return get_mock_data()
    
    client = DuneClient(api_key)
    data = {"metrics": {}, "markets": []}
    
    try:
        print(f"[INFO] Fetching Query {QUERY_ID_MAIN}...")
        try:
            res = client.get_latest_result(QUERY_ID_MAIN)
            rows = res.result.rows
        except Exception as e:
            print(f"[WARN] Failed to fetch Query {QUERY_ID_MAIN}: {e}")
            print("[INFO] Falling back to MOCK DATA due to API error.")
            return get_mock_data()
            
        if not rows:
            print("[WARN] Query returned no rows. Using Mock Data.")
            return get_mock_data()
            
        print(f"[INFO] Fetched {len(rows)} rows. Columns: {rows[0].keys()}")
        
        # ----------------------------------------------------
        # AUTO-MAPPER: Attempt to guess columns from schema
        # ----------------------------------------------------
        # We need: Volume, Users, Markets List
        
        total_vol = 0
        total_users = 0
        
        # Heuristic: Look for aggregation row vs list of markets
        # If many rows, likely markets.
        
        for row in rows:
            # Flexible Key Matching
            keys = {k.lower(): v for k, v in row.items()}
            
            # 1. Volume
            vol_val = keys.get('volume') or keys.get('vol') or keys.get('amount') or keys.get('usd') or 0
            try: vol_val = float(vol_val)
            except: vol_val = 0
            
            # 2. Users
            users_val = keys.get('users') or keys.get('active_users') or keys.get('traders') or keys.get('count') or 0
            try: users_val = float(users_val)
            except: users_val = 0
            
            # 3. Market Name / Question
            name_val = keys.get('project') or keys.get('market') or keys.get('question') or keys.get('name') or "Unknown Market"
            
            # 4. Category
            cat_val = keys.get('category') or keys.get('type') or "General"
            
            # Accumulate totals (if this is a breakdown)
            total_vol += vol_val
            total_users += users_val
            
            data["markets"].append({
                "question": name_val,
                "volume": vol_val,
                "category": cat_val,
                "users": users_val
            })
            
        # Top level metrics (override if query has specific single-row aggregates)
        # Assuming the query returns a list of markets
        data["metrics"]["total_vol_24h"] = total_vol
        data["metrics"]["total_users_24h"] = total_users # Sum might be wrong if users overlap, but best effort
        data["metrics"]["active_markets"] = len(rows)
        
        # Sort markets by volume
        data["markets"].sort(key=lambda x: x["volume"], reverse=True)
            
    except Exception as e:
        print(f"[ERROR] Logic failed: {e}")
        return get_mock_data()
        
    return data

def get_mock_data():
    """High-fidelity mock data for visualization testing"""
    return {
        "metrics": {
            "total_vol_24h": 4500000,
            "total_users_24h": 12500,
            "active_markets": 84
        },
        "markets": [
            {"question": "Will BTC break $100k in 2026?", "volume": 1200000, "category": "Crypto"},
            {"question": "US Fed Interest Rate Decision (Feb)", "volume": 850000, "category": "Macro"},
            {"question": "Super Bowl LIX Winner", "volume": 620000, "category": "Sports"},
            {"question": "Next Airdrop on BNB Chain", "volume": 410000, "category": "Crypto"},
            {"question": "ETH/BTC Ratio > 0.05", "volume": 320000, "category": "Crypto"},
            {"question": "Oscars 2026 Best Picture", "volume": 150000, "category": "Ent."}
        ],
        "trend": [
            {"date": "2026-01-20", "vol": 3200000},
            {"date": "2026-01-21", "vol": 3800000},
            {"date": "2026-01-22", "vol": 4100000},
            {"date": "2026-01-23", "vol": 3500000},
            {"date": "2026-01-24", "vol": 4800000},
            {"date": "2026-01-25", "vol": 5200000},
            {"date": "2026-01-26", "vol": 4500000}
        ]
    }

async def create_infographic(data, output_path, date_str):
    print("[INFO] Rendering infographic...")
    
    # Process Metrics
    metrics = data.get("metrics", {})
    # If using real data, you'd calculate these from rows. For now using mock structure or direct mapping.
    vol_24h = format_number(metrics.get("total_vol_24h", 0), "$")
    users_24h = format_number(metrics.get("total_users_24h", 0))
    markets_count = format_number(metrics.get("active_markets", 0))
    
    # Process Markets (Top 6)
    markets = data.get("markets", [])[:6]
    market_html = ""
    for m in markets:
        vol = format_number(m.get("volume", 0), "$")
        q = m.get("question", "Unknown Market")
        cat = m.get("category", "General")
        
        # Color coding by category
        cat_colors = {
            "Crypto": "text-blue-400 bg-blue-400/10",
            "Macro": "text-green-400 bg-green-400/10",
            "Sports": "text-orange-400 bg-orange-400/10",
            "Ent.": "text-purple-400 bg-purple-400/10"
        }
        color_class = cat_colors.get(cat, "text-gray-400 bg-gray-400/10")
        
        market_html += f"""
        <div class="market-card">
            <div class="market-header">
                <span class="category-badge {color_class}">{cat}</span>
                <span class="volume-badge">{vol} Vol</span>
            </div>
            <div class="market-question">{q}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: {min(100, m.get('volume',0)/15000)*100}%"></div>
            </div>
        </div>
        """

    # Background
    if TEMPLATE_FILE.exists():
        with open(TEMPLATE_FILE, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        bg_css = f"background-image: url('data:image/png;base64,{b64}');"
    else:
        bg_css = "background: radial-gradient(circle at 50% 0%, #2e1065 0%, #000000 100%);"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');
            body {{
                width: 1920px;
                height: 1080px;
                overflow: hidden;
                font-family: 'Outfit', sans-serif;
                color: white;
                {bg_css}
                background-size: cover;
            }}
            .glass-panel {{
                background: rgba(15, 23, 42, 0.6);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 24px;
            }}
            .market-card {{
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-radius: 16px;
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }}
            .category-badge {{
                padding: 4px 12px;
                border-radius: 100px;
                font-size: 14px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 1px;
            }}
            .volume-badge {{
                font-family: monospace;
                color: #94a3b8;
                font-size: 16px;
                font-weight: 600;
            }}
            .market-header {{ display: flex; justify-content: space-between; align-items: center; }}
            .market-question {{ font-size: 20px; font-weight: 600; line-height: 1.3; min-height: 52px; }}
            .progress-bar {{ height: 4px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; }}
            .progress-fill {{ height: 100%; background: linear-gradient(90deg, #ec4899, #8b5cf6); }}
            
            .metric-box {{ display: flex; flex-direction: column; gap: 5px; }}
            .metric-val {{ font-size: 56px; font-weight: 800; background: linear-gradient(to right, #fff, #cbd5e1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
            .metric-label {{ font-size: 18px; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 1.5px; }}
            
            /* Grid Layout */
            .main-grid {{
                display: grid;
                grid-template-columns: 350px 1fr;
                gap: 40px;
                padding: 60px;
                height: 100%;
            }}
            .left-col {{ display: flex; flex-direction: column; gap: 40px; justify-content: center; }}
            .right-col {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px; align-content: center; }}
        </style>
    </head>
    <body class="flex items-center justify-center">
        <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80 z-0"></div>
        
        <div class="relative z-10 w-full h-full p-16 flex flex-col">
            <!-- Header -->
            <div class="flex items-center justify-between mb-12">
                <div>
                    <div class="flex items-center gap-4 mb-2">
                        <span class="px-4 py-2 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 text-sm font-bold uppercase tracking-widest">
                            {format_datetime_now(date_str)}
                        </span>
                        <div class="h-px w-20 bg-white/20"></div>
                    </div>
                    <h1 class="text-7xl font-black tracking-tight text-white mb-2">
                        MARKET PULSE
                    </h1>
                    <p class="text-xl text-slate-400 font-light tracking-wide">
                        Real-time insights from BNBChain Prediction Markets
                    </p>
                </div>
                <!-- Branding -->
                <div class="text-right">
                    <h2 class="text-3xl font-bold text-yellow-400">BNBCHAIN</h2>
                    <p class="text-sm text-slate-500 tracking-[0.3em] font-mono mt-1">POWERED BY DUNE</p>
                </div>
            </div>

            <div class="grid grid-cols-12 gap-8 h-full">
                <!-- Sidebar Metrics -->
                <div class="col-span-3 flex flex-col gap-6">
                    <div class="glass-panel p-8 flex-1 flex flex-col justify-center">
                        <div class="metric-box">
                            <span class="metric-val">{vol_24h}</span>
                            <span class="metric-label">24h Volume</span>
                        </div>
                    </div>
                    <div class="glass-panel p-8 flex-1 flex flex-col justify-center">
                        <div class="metric-box">
                            <span class="metric-val text-blue-300">{users_24h}</span>
                            <span class="metric-label">Active Traders</span>
                        </div>
                    </div>
                    <div class="glass-panel p-8 flex-1 flex flex-col justify-center">
                        <div class="metric-box">
                            <span class="metric-val text-pink-300">{markets_count}</span>
                            <span class="metric-label">Active Markets</span>
                        </div>
                    </div>
                </div>

                <!-- Main Content: Top Markets Grid -->
                <div class="col-span-9 glass-panel p-10">
                    <div class="flex items-center justify-between mb-8">
                        <h3 class="text-2xl font-bold flex items-center gap-3">
                            <span class="w-2 h-8 bg-purple-500 rounded-full"></span>
                            Trending Markets
                        </h3>
                        <span class="text-slate-400 text-sm font-mono">SORTED BY 24H VOLUME</span>
                    </div>
                    <div class="grid grid-cols-2 gap-6 h-full pb-8">
                        {market_html}
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="absolute bottom-10 right-16 flex items-center gap-4 text-slate-500 font-mono text-sm opacity-60">
                <span>GENERATED BY CHAINMIND</span>
                <span>•</span>
                <span>DATA: DUNE ANALYTICS</span>
            </div>
        </div>
    </body>
    </html>
    """

    with open("dune_pred_debug.html", "w") as f:
        f.write(html)
        
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1920, "height": 1080})
        await page.set_content(html)
        await page.wait_for_timeout(1000)
        await page.screenshot(path=output_path)
        await browser.close()
        
    print(f"[SUCCESS] Infographic saved to {output_path}")

def format_datetime_now(date_str):
    return date_str.upper()

async def run_logic(json_output=False):
    api_key = os.getenv("DUNE_API_KEY")
    
    # 1. Fetch
    data = fetch_dune_data(api_key)
    
    # 2. Render
    now_tz = datetime.now(pytz.timezone("UTC")) if pytz else datetime.now()
    output_path = f"dune_pred_{int(now_tz.timestamp())}.png"
    
    await create_infographic(data, output_path, now_tz.strftime("%d %b %Y"))
    
    # 3. Output
    if json_output:
        try:
            with open(output_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
            print("---JSON_START---")
            print(json.dumps({"image": b64, "caption": "Dune Prediction Market Analysis"}))
            print("---JSON_END---")
            if os.path.exists(output_path): os.remove(output_path)
        except Exception as e:
            print(json.dumps({"error": str(e)}))
    else:
        print(f"Saved to {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--json', action='store_true')
    args = parser.parse_args()
    asyncio.run(run_logic(args.json))
