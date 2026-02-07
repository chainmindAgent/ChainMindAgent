import os
import asyncio
import argparse
from datetime import datetime, timedelta
from pathlib import Path
import json
import base64
from playwright.async_api import async_playwright
import tweepy
from dotenv import load_dotenv
try:
    import pytz
except ImportError:
    pytz = None

# Load environment variables (.env)
load_dotenv()

# Constants
BINANCE_HYPE_URL = "https://web3.binance.com/en/markets/social-hype?chain=bsc&timeRange=24&hideBlueChip=true&newTokensOnly=true"
TEMPLATE_FILE = Path(__file__).parent / "temp1.png"

async def fetch_hype_data(interval="24"):
    """Fetch Top 10 tokens with ultra-robust filter verification and refined extraction"""
    print(f"[INFO] Launching browser to fetch data for {interval}h interval...")
    
    # Adjust URL with interval
    hype_url = f"https://web3.binance.com/en/markets/social-hype?chain=bsc&timeRange={interval}&hideBlueChip=true&newTokensOnly=true"
    
    # Symbols to manually exclude (fallback safety)
    BLUECHIPS = {
        'BTC', 'ETH', 'BNB', 'XRP', 'SOL', 'ADA', 'DOGE', 'TRX', 'DOT', 'MATIC', 
        'LTC', 'BCH', 'SHIB', 'AVAX', 'LINK', 'WBNB', 'USDT', 'USDC', 'STETH', 
        'TWT', 'WETH', 'FDUSD', 'DAI', 'TON', 'POL', 'NEAR', 'SUI', 'PEPE', 'FLOKI', 'BONK'
    }

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1920, 'height': 1200})
        page = await context.new_page()
        
        # Pipe console logs for debugging
        page.on("console", lambda msg: print(f"[BROWSER] {msg.text}"))
        
        print(f"[INFO] Navigating to {hype_url}")
        await page.goto(hype_url, wait_until='domcontentloaded', timeout=120000)
        await page.wait_for_timeout(8000)  # Wait for JS to process URL filters
        await page.evaluate('console.log("--- BROWSER CONSOLE ACTIVE ---")')
        
        # 1. Dismiss Modals aggressively
        print("[INFO] Handling modals...")
        for _ in range(5):
            try:
                # Target common Binance modal close buttons and background masks
                close_selectors = [
                    'button:has-text("Next")', 'button:has-text("Got it")', 
                    'button:has-text("Close")', '.ant-modal-close',
                    '.bn-modal-close', '[aria-label="Close"]', '.bn-mask'
                ]
                for selector in close_selectors:
                    btn = page.locator(selector).first
                    if await btn.is_visible():
                        await btn.click(force=True)
                        await page.wait_for_timeout(500)
            except: break
        
        # 2. Force Filter Application with Verification
        print("[INFO] Applying filters (Hide Bluechip, New Tokens Only)...")
        for label in ["Hide Bluechip", "New Tokens Only"]:
            try:
                checkbox = page.locator(f'div[role="checkbox"]:has-text("{label}")').first
                if await checkbox.is_visible():
                    for _ in range(3):
                        is_checked = "checked" in (await checkbox.get_attribute("class") or "")
                        if not is_checked:
                            print(f"[INFO] Clicking filter: {label}")
                            await checkbox.click(force=True)
                            await page.wait_for_timeout(2000)
                            is_checked = "checked" in (await checkbox.get_attribute("class") or "")
                        if is_checked: break
            except: pass

        # 3. Verify Refresh and Stability
        print("[INFO] Verifying list refresh and stability...")
        await page.wait_for_timeout(5000)

        # 4. Incremental Scrolling to hydrate lazy-loaded data
        print("[INFO] Hydrating Hype Scores row-by-row...")
        try:
            # Short timeout hover to avoid blocking on persistent but invisible overlays
            await page.hover('section:has-text("Hype Leaderboard")', timeout=5000)
        except: 
            print("[WARN] Leaderboard hover timed out, proceeding with mouse wheel anyway.")

        # Use more deliberate scrolling to trigger data-fetch for lower slots
        for _ in range(25):
            await page.mouse.wheel(0, 150)
            await page.wait_for_timeout(300)
        
        # Reset to top slowly
        for _ in range(8):
            await page.mouse.wheel(0, -1000)
            await page.wait_for_timeout(200)
        await page.wait_for_timeout(2000)

        print("[INFO] Extracting token details...")
        tokens = await page.evaluate(f'''async () => {{
            const bluechips = {list(BLUECHIPS)};
            const results = [];
            const seenSymbols = new Set();
            
            console.log("Extraction Logic Start");
            const container = document.querySelector('.hide-scrollbar');
            console.log("Container .hide-scrollbar found: " + !!container);
            
            // Fallback to searching the entire body if specific container is missing
            const root = container || document.body;
            const rows = Array.from(root.querySelectorAll('.group, .flex')).filter(el => el.querySelector('a[href*="/token/"]'));
            console.log("Potential rows found: " + rows.length);
            
            for (const row of rows) {{
                // Try multiple ways to find the symbol link
                const link = row.querySelector('a[href*="/token/"]');
                if (!link) continue;

                // Try to get token symbol from .t-subtitle1 or the link's first span or direct text
                const symbolEl = link.querySelector('.t-subtitle1') || link.querySelector('span') || link;
                if (!symbolEl) continue;

                const rawSymbol = symbolEl.innerText.trim().split('\\n')[0];
                const symbol = rawSymbol.toUpperCase();
                
                if (!symbol || seenSymbols.has(symbol) || symbol.length > 20 || bluechips.includes(symbol)) {{
                    continue;
                }}
                
                console.log("Processing token candidate: " + symbol);

                // Find sentiment: Look for the sentiment container with icon
                const sentimentContainer = row.querySelector('.line-clamp-2');
                const sentimentText = sentimentContainer ? sentimentContainer.innerText.trim() : "";
                
                // Determine sentiment type from SVG icon href
                const useEl = row.querySelector('use');
                let sentimentType = "neutral";
                if (useEl) {{
                    const href = useEl.getAttribute('href') || useEl.getAttribute('xlink:href') || "";
                    if (href.includes('Bull')) sentimentType = "bullish";
                    else if (href.includes('Bear')) sentimentType = "bearish";
                }}
                
                // Find Market Cap (MC) - usually near "MC" text with $ prefix
                let mcap = "";
                const allSpans = Array.from(row.querySelectorAll('span, div'));
                const mcSpan = allSpans.find(s => s.innerText.startsWith('$') && s.parentElement && s.parentElement.innerText.includes('MC'));
                if (mcSpan) mcap = mcSpan.innerText.trim();
                
                // Find Hype Score - number with K/M suffix, search more broadly
                let hypeScore = "";
                // Try t-headline class first (most reliable)
                let scoreEl = allSpans.find(s => {{
                    const text = s.innerText.trim();
                    return /^[0-9.]+[KM]$/.test(text) && s.className && s.className.includes('t-headline');
                }});
                // Fallback: any element with K/M that's not the MC value
                if (!scoreEl) {{
                    scoreEl = allSpans.find(s => {{
                        const text = s.innerText.trim();
                        return /^[0-9.]+[KM]$/.test(text) && !text.startsWith('$') && s.children.length === 0;
                    }});
                }}
                if (scoreEl) hypeScore = scoreEl.innerText.trim();
                
                if (!sentimentText) {{
                    console.log("Sentiment not found for " + symbol + ", skipping.");
                    continue;
                }}

                const logoImg = row.querySelector('img');

                seenSymbols.add(symbol);
                results.push({{
                    symbol: symbol,
                    name: symbol,
                    logoUrl: logoImg ? logoImg.src : "",
                    sentiment: sentimentText,
                    sentimentType: sentimentType,
                    mcap: mcap,
                    hypeScore: hypeScore
                }});
                if (results.length >= 10) break;
            }}
            console.log("Final tokens extracted: " + results.length);
            return results;
        }}''')
        
        await browser.close()
        
        # Terminal Logging for 1:1 Verification
        if tokens:
            print("\n" + "="*60)
            print("🚀 FETCHED TOKENS (FOR VERIFICATION)")
            print("="*60)
            print(f"{'RANK':<5} | {'SYMBOL':<15} | {'SENTIMENT TYPE':<12}")
            print("-" * 60)
            for i, t in enumerate(tokens):
                print(f"#{i+1:<4} | {t['symbol']:15} | {t['sentimentType']}")
            print("="*60 + "\n")
        else:
            print("[ERROR] No tokens matched extraction criteria.")
        
        return tokens

# ============================
# IMAGE COMPOSITION
# ============================

async def create_composite_image(tokens, output_path, date_str, time_str, timezone_str, interval):
    """Render tokens onto the template and capture screenshot"""
    print("[INFO] Creating composite image...")
    
    interval_display = f"{interval}h" if str(interval).isdigit() else interval
    
    # Load template or use fallback gradient
    if TEMPLATE_FILE.exists():
        with open(TEMPLATE_FILE, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        bg_style = f"background-image: url('data:image/png;base64,{encoded_string}'); background-size: 3825px 2160px;"
    else:
        print("[WARN] Template file not found, using gradient background")
        bg_style = "background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);"
    
    # Slot position mapping (coordinates for 3825x2160 resolution)
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
                background-color: black;
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
            .footer-divider {{
                color: rgba(255, 255, 255, 0.3);
                margin: 0 10px;
            }}
            .footer-handle {{
                color: #A855F7; /* Purple to match branding */
                font-weight: 700;
            }}
            .footer-interval {{
                color: #2EBD85; /* Green for interval */
                font-weight: 600;
            }}
            .token-logo {{
                position: absolute;
                width: 199px;
                height: 199px;
                border-radius: 50%;
                object-fit: cover;
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
                gap: 30px;
            }}
            .stat-mcap {{ color: #9C9C9C; }}
            .stat-hype {{ color: #F0B90B; }}
            .token-sentiment {{
                font-size: 28px;
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
            }}
            .sentiment-bullish {{ color: #2EBD85; }}
            .sentiment-bearish {{ color: #F6465D; }}
            .sentiment-neutral {{ color: #9C9C9C; }}
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
        
        # Get stats
        mcap = token.get("mcap", "")
        hype_score = token.get("hypeScore", "")
        sentiment_text = token.get("sentiment", "")
        sentiment_class = f"sentiment-{token.get('sentimentType', 'neutral')}"
        
        # Build stats line
        stats_html = ""
        if mcap or hype_score:
            stats_parts = []
            if mcap:
                stats_parts.append(f'<span class="stat-mcap">MC: {mcap}</span>')
            if hype_score:
                stats_parts.append(f'<span class="stat-hype">🔥 {hype_score}</span>')
            stats_html = f'<div class="token-stats">{"".join(stats_parts)}</div>'
        
        text_group = f"""
        <div class="text-group" style="left: {x_text}px; top: {y}px;">
            <div class="token-name">{token["name"]}</div>
            {stats_html}
            <div class="token-sentiment {sentiment_class}">{sentiment_text}</div>
        </div>
        """
        
        html_content += f"{logo_html}{text_group}"
    
    html_content += f"""
        </div>
        <div id="footer">
            <span class="footer-date">{date_str} UTC</span>
            <span class="footer-divider">|</span>
            <span class="footer-interval">Interval: {interval_display}</span>
            <span class="footer-divider">|</span>
            <span class="footer-handle">@ChainMindAgent</span>
        </div>
    </body>
    </html>
    """
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 3825, 'height': 2160},
            device_scale_factor=1
        )
        page = await context.new_page()
        await page.set_content(html_content)
        await page.wait_for_timeout(3000)
        await page.screenshot(path=output_path, full_page=True)
        await browser.close()
    print(f"[SUCCESS] Composite image saved: {output_path}")

# ============================
# PERSISTENCE & POSTING
# ============================

LAST_POST_FILE = Path(__file__).parent / "last_post_template.txt"

def get_last_post_time():
    if not LAST_POST_FILE.exists(): return None
    try:
        return datetime.fromisoformat(LAST_POST_FILE.read_text().strip())
    except: return None

def get_now(timezone_str="UTC"):
    """Get current time in specific timezone"""
    now = datetime.now()
    if pytz and timezone_str:
        try:
            tz = pytz.timezone(timezone_str)
            return datetime.now(tz)
        except Exception as e:
            print(f"[WARN] Invalid timezone {timezone_str}, using UTC. Error: {e}")
    return now

def get_caption_text(tokens, timestamp_str):
    # Build token list with sentiment emojis
    sentiment_emoji = {"bullish": "🟢", "bearish": "🔴", "neutral": "⚪"}
    token_lines = []
    for i, t in enumerate(tokens[:10]):
        emoji = sentiment_emoji.get(t.get('sentimentType', 'neutral'), "⚪")
        symbol = t['symbol']
        hype = t.get('hypeScore', '')
        hype_str = f" 🔥{hype}" if hype else ""
        # Only add $ for alphanumeric symbols
        cashtag = f"${symbol}" if symbol.isalnum() else symbol
        token_lines.append(f"{emoji} {i+1}. {cashtag}{hype_str}")
    
    token_list = "\n".join(token_lines)
    
    tweet_text = f"""🔥 BNB Chain Social Hype Leaders | {timestamp_str}

Which tokens are dominating social conversations on @BNBCHAIN? Here's the top 10:

{token_list}

🟢 Bullish | 🔴 Bearish | ⚪ Neutral

Data: Binance Web3
#BNBChain #SocialFi #Web3"""
    return tweet_text

# ============================
# RUNNER
# ============================

async def run_logic(post=False, force=False, timezone="UTC", interval="24", json_output=False):
    if post and not force:
        last = get_last_post_time()
        if last and datetime.now() - last < timedelta(hours=24):
            print(f"[INFO] 24h interval check: Skipping post. Last post was {last.strftime('%H:%M:%S')}")
            return False

    # 1. Fetch
    tokens = await fetch_hype_data(interval)
    if not tokens:
        if json_output:
            print(json.dumps({"error": "No data fetched"}))
        else:
            print("[ERROR] No data fetched.")
        return False
    
    # 2. Render
    now_tz = get_now(timezone)
    date_str = now_tz.strftime("%d %B %Y")
    caption_date = now_tz.strftime("%d %B")  # Short date for caption
    time_str = now_tz.strftime("%H:%M")
    
    output_path = f"hype_update_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
    await create_composite_image(tokens, output_path, date_str, time_str, timezone, interval)
    
    caption = get_caption_text(tokens, caption_date)

    # 3. Output
    if json_output:
        try:
            with open(output_path, "rb") as img_file:
                b64_data = base64.b64encode(img_file.read()).decode('utf-8')
            
            print("---JSON_START---")
            print(json.dumps({
                "image": b64_data,
                "caption": caption,
                "timestamp": now_tz.isoformat()
            }))
            print("---JSON_END---")
            
            # Clean up temporary file
            if os.path.exists(output_path):
                os.remove(output_path)
            return True
        except Exception as e:
            print(json.dumps({"error": f"JSON output failed: {str(e)}"}))
            return False
            
    if post:
        v1, v2 = setup_twitter()
        if v1 and post_to_twitter(output_path, v1, v2, tokens):
            update_last_post_time()
            return True
        return False
    else:
        print(f"[INFO] Dry run complete. Saved to {output_path}")
        print("\nCAPTION:")
        print(caption)
        return True

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--post', action='store_true')
    parser.add_argument('--force', action='store_true')
    parser.add_argument('--loop', action='store_true', help='Run in background loop')
    parser.add_argument('--timezone', type=str, default='UTC', help='Timezone for caption')
    parser.add_argument('--interval', type=str, default='24', help='Time interval (1, 4, 24)')
    parser.add_argument('--json', action='store_true', help='Output results as JSON')
    args = parser.parse_args()
    
    if args.loop:
        print("[INFO] Background loop started. Checking every 4 hours...")
        while True:
            await run_logic(post=True, force=False, interval=args.interval)
            print("[INFO] Sleeping for 4 hours...")
            await asyncio.sleep(3600 * 4)
    else:
        await run_logic(
            post=args.post, 
            force=args.force, 
            timezone=args.timezone, 
            interval=args.interval,
            json_output=args.json
        )

if __name__ == "__main__":
    asyncio.run(main())
