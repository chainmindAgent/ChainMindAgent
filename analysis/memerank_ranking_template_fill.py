import os
import asyncio
import argparse
from datetime import datetime, timedelta
from pathlib import Path
import base64
from playwright.async_api import async_playwright
import tweepy
from dotenv import load_dotenv
import json
try:
    import pytz
except ImportError:
    pytz = None

# Load environment variables (.env)
load_dotenv()

# Constants
BINANCE_MEME_RANK_URL = "https://web3.binance.com/en/trenches/rank?chain=bsc"
TEMPLATE_FILE = Path(__file__).parent / "temp2.png"

async def fetch_meme_rank_data(interval="24"):
    """Fetch Top 10 meme tokens from Binance Trenches Rank"""
    print(f"[INFO] Launching browser to fetch meme rank data for {interval}h interval...")
    
    # Adjust URL with interval if possible
    meme_url = f"https://web3.binance.com/en/trenches/rank?chain=bsc&timeRange={interval}"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1920, 'height': 1200})
        page = await context.new_page()
        
        # Pipe console logs for debugging
        page.on("console", lambda msg: print(f"[BROWSER] {msg.text}"))
        
        print(f"[INFO] Navigating to {meme_url}")
        await page.goto(meme_url, wait_until='domcontentloaded', timeout=120000)
        await page.wait_for_timeout(10000)  # Wait for table to load
        
        # Dismiss any modals
        print("[INFO] Handling modals...")
        for _ in range(3):
            try:
                close_btns = page.locator('button:has-text("Got it"), button:has-text("Close"), .ant-modal-close')
                if await close_btns.first.is_visible():
                    await close_btns.first.click(force=True)
                    await page.wait_for_timeout(500)
            except: break
        
        await page.wait_for_timeout(3000)
        
        print("[INFO] Extracting meme rank data...")
        tokens = await page.evaluate('''async () => {
            const results = [];
            const seenNames = new Set();
            
            // Find all data rows (rows with table-token-link)
            const rows = Array.from(document.querySelectorAll('tr')).filter(row => row.querySelector('.table-token-link'));
            console.log("Found data rows: " + rows.length);
            
            for (const row of rows) {
                try {
                    const cells = row.querySelectorAll('.table-token-link');
                    if (cells.length < 5) continue;
                    
                    const col1 = cells[0]; // Rank, Score, Name, Logo
                    const col2 = cells[1]; // MCap
                    const col5 = cells[4]; // B. Holders
                    
                    // Extract Score: .table-token-link > span > span:nth-child(2) > span:nth-child(2)
                    const scoreEl = col1.querySelector('span > span:nth-child(2) > span:nth-child(2)');
                    const score = scoreEl ? scoreEl.innerText.trim() : "";
                    
                    // Extract Name: .table-token-link > span > span:nth-child(3) > span:nth-child(2) > span:nth-child(1) > span:nth-child(1)
                    const nameEl = col1.querySelector('span > span:nth-child(3) > span:nth-child(2) > span:nth-child(1) > span:nth-child(1)');
                    const name = nameEl ? nameEl.innerText.trim() : "";
                    
                    // Extract Logo
                    const logoImg = col1.querySelector('img');
                    const logoUrl = logoImg ? logoImg.src : "";
                    
                    // Extract MCap from column 2 (first span with $)
                    const mcapSpans = Array.from(col2.querySelectorAll('span'));
                    const mcapEl = mcapSpans.find(s => s.innerText.startsWith('$') && s.children.length === 0);
                    const mcap = mcapEl ? mcapEl.innerText.trim() : "";
                    
                    // Extract B. Holders from column 5
                    const holderSpans = Array.from(col5.querySelectorAll('span'));
                    const holderEl = holderSpans.find(s => s.children.length === 0 && /^[0-9,.]+[KMB]?$/.test(s.innerText.trim()));
                    const bHolders = holderEl ? holderEl.innerText.trim() : "";
                    
                    if (!name || seenNames.has(name)) continue;
                    seenNames.add(name);
                    
                    results.push({
                        name: name,
                        symbol: name,
                        logoUrl: logoUrl,
                        score: score,
                        mcap: mcap,
                        bHolders: bHolders
                    });
                    
                    console.log("Extracted: " + name + " | " + score + " | " + mcap + " | " + bHolders);
                    
                    if (results.length >= 10) break;
                } catch (e) {
                    console.log("Error processing row: " + e.message);
                }
            }
            
            console.log("Total extracted: " + results.length);
            return results;
        }''')
        
        await browser.close()
        
        # Terminal Logging for verification
        if tokens:
            print("\n" + "="*70)
            print("🚀 FETCHED MEME TOKENS (FOR VERIFICATION)")
            print("="*70)
            print(f"{'RANK':<5} | {'NAME':<20} | {'SCORE':<8} | {'MCAP':<12} | {'B.HOLDERS':<10}")
            print("-" * 70)
            for i, t in enumerate(tokens):
                print(f"#{i+1:<4} | {t['name'][:18]:20} | {t['score']:8} | {t['mcap']:12} | {t['bHolders']}")
            print("="*70 + "\n")
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
    
    # Check if template exists, use placeholder if not
    if TEMPLATE_FILE.exists():
        with open(TEMPLATE_FILE, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        bg_style = f"background-image: url('data:image/png;base64,{encoded_string}');"
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
        
        # Build stats line: Score first, then MC, then B.Holder
        stats_parts = []
        if token.get("score"):
            stats_parts.append(f'<span class="stat-score">{token["score"]}</span>')
        if token.get("mcap"):
            stats_parts.append(f'<span class="stat-mcap">MC: {token["mcap"]}</span>')
        if token.get("bHolders"):
            stats_parts.append(f'<span class="stat-holders">B.Holder: {token["bHolders"]}</span>')
        
        stats_html = f'<div class="token-stats">{"".join(stats_parts)}</div>' if stats_parts else ""
        
        text_group = f"""
        <div class="text-group" style="left: {x_text}px; top: {y}px;">
            <div class="token-name">{token["name"]}</div>
            {stats_html}
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
            <span class="footer-handle">@ChainMindX</span>
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
    # Build simple token list (just rank and name)
    token_lines = []
    for i, t in enumerate(tokens[:10]):
        name = t['name'][:20]  # Allow longer names
        token_lines.append(f"{i+1}. {name}")
    
    token_list = "\n".join(token_lines)
    
    tweet_text = f"""🎯 BNBCHAIN TOKEN MEME RANK/SCORE - {timestamp_str}

Top 10 Meme Tokens 👇

{token_list}

Source: @ChainMindX
#BNBChain #Meme #SocialFi"""
    return tweet_text

# ============================
# RUNNER
# ============================

async def run_logic(post=False, force=False, timezone="UTC", interval="24", json_output=False, text_only=True):
    if post and not force:
        last = get_last_post_time()
        if last and datetime.now() - last < timedelta(hours=24):
            print(f"[INFO] 24h interval check: Skipping post. Last post was {last.strftime('%H:%M:%S')}")
            return False

    # 1. Fetch
    tokens = await fetch_meme_rank_data(interval)
    if not tokens:
        if json_output:
            print(json.dumps({"error": "No data fetched"}))
        else:
            print("[ERROR] No data fetched.")
        return False
    
    # 2. Render (Skipped for text-only optimization)
    now_tz = get_now(timezone)
    timestamp_str = now_tz.strftime("%d %B %Y")
    
    # 3. Output
    caption = get_caption_text(tokens, timestamp_str)

    if json_output:
        try:
            print("---JSON_START---")
            print(json.dumps({
                "image": None,
                "caption": caption,
                "timestamp": now_tz.isoformat(),
                "data": tokens
            }))
            print("---JSON_END---")
            return True
        except Exception as e:
            print(json.dumps({"error": f"JSON output failed: {str(e)}"}))
            return False

    if post:
        # Posting logic would need to be updated for text-only tweets if image is missing
        # For now, we assume user just wants data
        print(f"[INFO] Text-only mode. Post skipped (requires image).")
        print("\nCAPTION:")
        print(caption)
        return True
    else:
        print(f"[INFO] Dry run complete.")
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
    parser.add_argument('--text-only', action='store_true', default=True, help='Skip image generation')
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
            json_output=args.json,
            text_only=args.text_only
        )

if __name__ == "__main__":
    asyncio.run(main())
