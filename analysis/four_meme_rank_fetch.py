import os
import asyncio
import argparse
from datetime import datetime, timedelta
from pathlib import Path
import base64
from playwright.async_api import async_playwright
import json
from dotenv import load_dotenv

# Load environment variables (.env)
load_dotenv()

# Constants
FOUR_MEME_RANK_URL = "https://four.meme/ranking"
API_BASE_URL = "https://four.meme/meme-api/v1"
TEMPLATE_FILE = Path(__file__).parent / "temp2.png"

async def fetch_four_meme_data(page_no=1, page_size=10, sort_field="marketCap", sort_order="desc"):
    """Fetch Top tokens from Four.meme using Playwright to bypass Cloudflare"""
    print(f"[INFO] Launching browser to fetch Four.meme data...")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        print(f"[INFO] Navigating to {FOUR_MEME_RANK_URL}")
        await page.goto(FOUR_MEME_RANK_URL, wait_until='domcontentloaded', timeout=120000)
        await page.wait_for_timeout(5000)  # Wait for Cloudflare/Initial Load
        
        print("[INFO] Calling Four.meme internal API via page.evaluate...")
        api_url = f"{API_BASE_URL}/private/token/list?page={page_no}&pageSize={page_size}&sortField={sort_field}&sortOrder={sort_order}"
        
        tokens_data = await page.evaluate(f"""async () => {{
            try {{
                const response = await fetch('{api_url}');
                if (!response.ok) return {{ error: 'API response was Not OK: ' + response.status }};
                return await response.json();
            }} catch (e) {{
                return {{ error: e.message }};
            }}
        }}""")
        
        await browser.close()
        
        if not tokens_data or "error" in tokens_data:
            print(f"[ERROR] API fetch failed: {tokens_data.get('error') if tokens_data else 'Unknown Error'}")
            return None
        
        if tokens_data.get("code") != 0:
            print(f"[ERROR] API returned error code: {tokens_data.get('code')} - {tokens_data.get('msg')}")
            return None
            
        raw_list = tokens_data.get("data", {}).get("list", [])
        processed_tokens = []
        
        for item in raw_list:
            processed_tokens.append({
                "name": item.get("name", "Unknown"),
                "symbol": item.get("symbol", "???"),
                "address": item.get("address", ""),
                "logoUrl": item.get("logo", ""),
                "mcap": f"${float(item.get('marketCap', 0)):,.0f}",
                "price": f"${float(item.get('price', 0)):.10f}" if float(item.get('price', 0)) < 0.01 else f"${float(item.get('price', 0)):.4f}",
                "priceChange24h": f"{float(item.get('priceChange24h', 0)) * 100:+.2f}%",
                "holders": f"{int(item.get('holders', 0)):,}",
                "score": f"{int(item.get('txCount24h', 0))}" # Using txCount as a proxy for score
            })
            
        print(f"[INFO] Successfully extracted {len(processed_tokens)} tokens.")
        return processed_tokens

async def create_composite_image(tokens, output_path, date_str, time_str, interval):
    """Render tokens onto the template - mirroring existing implementation"""
    print("[INFO] Creating composite image...")
    
    # We'll use the same rendering logic as meme_rank_template_fill.py for consistency
    if TEMPLATE_FILE.exists():
        with open(TEMPLATE_FILE, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        bg_style = f"background-image: url('data:image/png;base64,{encoded_string}');"
    else:
        bg_style = "background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);"
    
    Y_START = 446
    Y_DELTA = 265
    Y_COORDS = [Y_START + (i * Y_DELTA) for i in range(5)]
    LEFT_X_LOGO = 352
    LEFT_X_TEXT = 600
    RIGHT_X_LOGO = 2346
    RIGHT_X_TEXT = 600 + 1994
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body, html {{
                width: 3825px;
                height: 2160px;
                overflow: hidden;
                background-color: #0a0a0a;
                font-family: 'Inter', sans-serif;
                color: white;
            }}
            #background {{
                position: absolute;
                top: 0;
                left: 0;
                width: 3825px;
                height: 2160px;
                {bg_style}
                background-size: 3825px 2160px;
                background-repeat: no-repeat;
                z-index: 1;
            }}
            #container {{
                position: absolute;
                top: 0;
                left: 0;
                width: 3825px;
                height: 2160px;
                z-index: 2;
            }}
            #footer {{
                position: absolute;
                bottom: 80px;
                left: 140px;
                color: rgba(255, 255, 255, 0.85);
                font-size: 44px;
                font-weight: 500;
                display: flex;
                gap: 25px;
                align-items: center;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.6);
                z-index: 10;
                letter-spacing: 0.5px;
            }}
            .footer-divider {{ color: rgba(255, 255, 255, 0.3); margin: 0 10px; }}
            .footer-handle {{ color: #A855F7; font-weight: 700; }}
            .footer-interval {{ color: #2EBD85; font-weight: 600; }}
            .token-logo {{
                position: absolute;
                width: 199px;
                height: 199px;
                border-radius: 50%;
                object-fit: cover;
                border: 4px solid rgba(255,255,255,0.1);
            }}
            .text-group {{
                position: absolute;
                display: flex;
                flex-direction: column;
                justify-content: center;
                height: 199px;
                width: 1000px;
            }}
            .token-name {{
                font-size: 72px;
                font-weight: 700;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-bottom: 4px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            }}
            .token-stats {{
                font-size: 36px;
                font-weight: 600;
                margin-bottom: 6px;
                display: flex;
                gap: 25px;
            }}
            .stat-score {{ color: #F0B90B; }}
            .stat-mcap {{ color: #9C9C9C; }}
            .stat-holders {{ color: #2EBD85; }}
        </style>
    </head>
    <body>
        <div id="background"></div>
        <div id="container">
    """
    
    for i, token in enumerate(tokens):
        if i >= 10: break
        col = 0 if i < 5 else 1
        rank_in_col = i if i < 5 else i - 5
        
        y = Y_COORDS[rank_in_col]
        x_logo = LEFT_X_LOGO if col == 0 else RIGHT_X_LOGO
        x_text = LEFT_X_TEXT if col == 0 else RIGHT_X_TEXT
        
        logo_html = f'<img src="{token["logoUrl"]}" class="token-logo" style="left: {x_logo}px; top: {y}px;">' if token["logoUrl"] else ""
        
        stats_parts = []
        if token.get("score"):
            stats_parts.append(f'<span class="stat-score">TXs: {token["score"]}</span>')
        if token.get("mcap"):
            stats_parts.append(f'<span class="stat-mcap">MC: {token["mcap"]}</span>')
        if token.get("holders"):
            stats_parts.append(f'<span class="stat-holders">Holders: {token["holders"]}</span>')
        
        stats_html = f'<div class="token-stats">{"".join(stats_parts)}</div>' if stats_parts else ""
        
        text_group = f"""
        <div class="text-group" style="left: {x_text}px; top: {y}px;">
            <div class="token-name">{token["name"]} ({token["symbol"]})</div>
            {stats_html}
        </div>
        """
        html_content += f"{logo_html}{text_group}"
    
    html_content += f"""
        </div>
        <div id="footer">
            <span class="footer-date">{date_str} UTC</span>
            <span class="footer-divider">|</span>
            <span class="footer-interval">Four.meme Rankings</span>
            <span class="footer-divider">|</span>
            <span class="footer-handle">@ChainMindX</span>
        </div>
    </body>
    </html>
    """
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 3825, 'height': 2160})
        await page.set_content(html_content)
        await page.wait_for_timeout(3000)
        await page.screenshot(path=output_path, full_page=True)
        await browser.close()
    print(f"[SUCCESS] Composite image saved: {output_path}")

async def run_logic(timezone="UTC", json_output=False):
    # 1. Fetch
    tokens = await fetch_four_meme_data(page_size=10)
    if not tokens:
        if json_output: print(json.dumps({"error": "No data fetched"}))
        return False
    
    # 2. Render
    now = datetime.now()
    date_str = now.strftime("%d %B %Y")
    time_str = now.strftime("%H:%M")
    output_path = f"four_meme_rank_{now.strftime('%Y%m%d_%H%M%S')}.png"
    
    await create_composite_image(tokens, output_path, date_str, time_str, timezone, "Ranking")
    
    # 3. Caption
    token_list = "\n".join([f"{i+1}. {t['name']} ({t['symbol']}) - {t['mcap']}" for i, t in enumerate(tokens)])
    caption = f"""🚀 FOUR.MEME TOP RANKINGS - {date_str}\n\nTop 10 Meme Tokens by Market Cap 👇\n\n{token_list}\n\nSource: @ChainMindX\n#FourMeme #BNBChain #MemeCoins"""

    # 4. JSON Output
    if json_output:
        with open(output_path, "rb") as img_file:
            b64_data = base64.b64encode(img_file.read()).decode('utf-8')
        
        print("---JSON_START---")
        print(json.dumps({
            "image": b64_data,
            "caption": caption,
            "timestamp": now.isoformat()
        }))
        print("---JSON_END---")
        if os.path.exists(output_path): os.remove(output_path)
    else:
        print(f"[INFO] Dry run complete. Saved to {output_path}")

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--timezone', type=str, default='UTC')
    parser.add_argument('--json', action='store_true')
    args = parser.parse_args()
    await run_logic(timezone=args.timezone, json_output=args.json)

if __name__ == "__main__":
    asyncio.run(main())
