import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { webConfig, agentConfig } from '../config.js';
import { Brain } from '../brain/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const brain = new Brain();

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));
app.use('/memes', express.static(join(__dirname, '../../memes'))); // Serve memes directory statically

/**
 * List files in memes directory
 */
import { readdir } from 'fs/promises';

app.get('/api/memes', async (req, res) => {
    try {
        const memesDir = join(__dirname, '../../memes');
        const files = await readdir(memesDir);
        // Filter for image/video extensions if needed, for now just send all
        const mediaFiles = files.filter(f => /\.(jpg|jpeg|png|gif|mp4|webm)$/i.test(f));
        res.json(mediaFiles);
    } catch (error) {
        console.error('Failed to list memes:', error);
        res.status(500).json({ error: 'Failed to list memes' });
    }
});

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', agent: agentConfig.name });
});

/**
 * Get agent info
 */
app.get('/api/agent', (req, res) => {
    const stats = brain.getStats();
    res.json({
        name: agentConfig.name,
        version: agentConfig.version,
        description: agentConfig.description,
        persona: agentConfig.persona,
        stats
    });
});

/**
 * Chat endpoint
 */
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        const response = await brain.query(message);
        res.json({
            response,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process chat' });
    }
});

/**
 * Get brain stats
 */
app.get('/api/stats', (req, res) => {
    const stats = brain.getStats();
    res.json(stats);
});

/**
 * Get detailed analytics (TVL, Fees, Revenue, etc.)
 */
app.get('/api/analytics', (req, res) => {
    const stats = brain.getStats();

    // Fetch real metrics from storage
    const tvl = brain.storage.getMetric('tvl')?.value || 0;
    const fees = brain.storage.getMetric('fees_24h')?.value || 0;
    const revenue = brain.storage.getMetric('revenue_24h')?.value || 0;
    const hype = brain.storage.getMetric('social_hype')?.value || 0;

    res.json({
        total_knowledge: stats.total,
        last_training: stats.lastRun,
        sources: stats.sources,
        tvl,
        fees_24h: fees,
        revenue_24h: revenue,
        social_hype: hype,
        top_tokens: [], // Placeholder for now
        recent_events: [] // Placeholder for now
    });
});

/**
 * Search the web using Brave
 */
app.get('/api/search', async (req, res) => {
    const query = req.query.q as string;
    if (!query) return res.status(400).json({ error: 'Query required' });

    try {
        // Use the brave search fetcher directly or via brain
        const results = await brain.query(query); // brain.query handles search + LLM
        res.json({ answer: results });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Get market hype data
 */
app.get('/api/hype', (req, res) => {
    const hype = brain.storage.getMetric('social_hype')?.value || 0;
    const trending = brain.storage.getByCategory('trending', 5);
    res.json({
        score: hype,
        trending_topics: trending.map(t => t.title),
        status: hype > 70 ? 'CRITICAL' : hype > 40 ? 'ELEVATED' : 'STABLE'
    });
});

/**
 * Get crypto prices (BTC, ETH, BNB)
 */
app.get('/api/prices', async (req, res) => {
    try {
        // Fetch prices from Binance API
        // We can fetch multiple symbols if using the ticker/price endpoint with no symbol (returns all), 
        // but it's heavier. Better to fetch specific ones or use a lightweight public API.
        // Using Coingecko or Binance. Binance is reliable.
        const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
        const prices: Record<string, string> = {};

        // Parallel fetch
        await Promise.all(symbols.map(async (symbol) => {
            try {
                const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
                const data = await response.json();
                // Map BTCUSDT -> BTC, etc.
                const key = symbol.replace('USDT', '');
                // Format price: remove trailing zeros, keep 2 decimals for high value, more for low
                const price = parseFloat(data.price);
                prices[key] = price.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            } catch (e) {
                console.error(`Failed to fetch price for ${symbol}`, e);
            }
        }));

        res.json(prices);
    } catch (error) {
        console.error('Price fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch prices' });
    }
});

/**
 * Get knowledge feed (filtered by source or category)
 */
app.get('/api/knowledge/feed', (req, res) => {
    const source = req.query.source as string;
    const category = req.query.category as string;
    const limit = parseInt(req.query.limit as string) || 20;

    let results: any[] = [];

    if (source) {
        results = brain.storage.getBySource(source, limit);
    } else if (category) {
        results = brain.storage.getByCategory(category, limit);
    } else {
        results = brain.storage.getRecent(limit);
    }

    res.json(results);
});

app.get('/api/brain/memory', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = brain.storage.getRecent(limit);
    res.json(history);
});

/**
 * Trigger Python analytics scripts
 */
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

/**
 * Trigger Twitter Refresh
 * Must be defined BEFORE /api/fetch/:type
 */
app.get('/api/fetch/twitter', async (req, res) => {
    try {
        const count = await brain.refreshTwitter();
        res.json({ success: true, count, message: `Refreshed ${count} tweets` });
    } catch (error: any) {
        res.status(500).json({ error: 'Twitter refresh failed', details: error.message });
    }
});

/**
 * BNB Burn Data Endpoint
 * Must be defined BEFORE /api/fetch/:type
 */
app.get('/api/fetch/bnb-burn', async (req, res) => {
    try {
        const scriptPath = join(__dirname, '../../analysis', 'bnb_burn_scrape.py');
        console.log(`[INFO] Scraping BNB Burn Data...`);

        const cmd = `python "${scriptPath}" --json`;
        const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });

        const match = stdout.match(/---JSON_START---([\s\S]*?)---JSON_END---/);
        if (match) {
            const data = JSON.parse(match[1]);
            res.json(data);
        } else {
            res.status(500).json({ error: 'Failed to parse BNB Burn output', raw: stdout });
        }
    } catch (error: any) {
        console.error(`[ERROR] BNB Burn scrape failed: ${error.message}`);
        res.status(500).json({ error: 'Scrape failed', details: error.message });
    }
});

/**
 * Coinglass Whale Alerts Endpoint
 * Must be defined BEFORE /api/fetch/:type
 */
app.get('/api/fetch/coinglass-whales', async (req, res) => {
    try {
        const scriptPath = join(__dirname, '../../analysis', 'coinglass_whale_scrape.py');
        console.log(`[INFO] Scraping Coinglass Whale Alerts...`);

        const cmd = `python "${scriptPath}" --json`;
        // Increase buffer for potential large HTML if something goes wrong, though we filter in python
        const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });

        const match = stdout.match(/---JSON_START---([\s\S]*?)---JSON_END---/);
        if (match) {
            const data = JSON.parse(match[1]);
            res.json(data);
        } else {
            res.status(500).json({ error: 'Failed to parse Coinglass output', raw: stdout });
        }
    } catch (error: any) {
        console.error(`[ERROR] Coinglass scrape failed: ${error.message}`);
        res.status(500).json({ error: 'Scrape failed', details: error.message });
    }
});

/**
 * BNB Best Dapps Ranking Endpoint
 * Must be defined BEFORE /api/fetch/:type
 */
app.get('/api/dapps/ranking', async (req, res) => {
    try {
        const scriptPath = join(__dirname, '../../analysis', 'dapps_ranking_template_fill.py');
        console.log(`[INFO] Fetching Dapps Ranking...`);

        const cmd = `python "${scriptPath}" --json`;
        const { stdout } = await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024 });

        const match = stdout.match(/---JSON_START---([\s\S]*?)---JSON_END---/);
        if (match) {
            const data = JSON.parse(match[1]);
            res.json(data);
        } else {
            res.status(500).json({ error: 'Failed to parse Dapps output', raw: stdout });
        }
    } catch (error: any) {
        console.error(`[ERROR] Dapps fetch failed: ${error.message}`);
        res.status(500).json({ error: 'Fetch failed', details: error.message });
    }
});

app.get('/api/fetch/:type', async (req, res) => {
    const { type } = req.params;
    const interval = (req.query.interval as string) || '24h';

    const scriptMap: Record<string, string> = {
        tvl: 'tvl_ranking_template_fill.py',
        hype: 'social_hype_template_fill.py',
        fees: 'fees_ranking_template_fill.py',
        revenue: 'revenue_ranking_template_fill.py',
        memerank: 'memerank_ranking_template_fill.py',
        'top-dapps': 'dapps_ranking_template_fill.py',
        prediction: 'prediction_market_ranking_template_fill.py',
        fulleco: 'fulleco_template_fill.py'
    };

    const scriptName = scriptMap[type];
    if (!scriptName) {
        return res.status(400).json({ error: 'Invalid fetch type' });
    }

    try {
        const scriptPath = join(__dirname, '../../analysis', scriptName);
        console.log(`[INFO] Running script: ${scriptName} with interval ${interval}`);

        // Use --json flag for machine-readable output
        const cmd = `python "${scriptPath}" --json --interval ${interval}`;
        const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024 });

        if (stderr && !stdout.includes('---JSON_START---')) {
            console.error(`[ERROR] Script stderr: ${stderr}`);
        }

        // Extract JSON from output
        const match = stdout.match(/---JSON_START---([\s\S]*?)---JSON_END---/);
        if (match) {
            const data = JSON.parse(match[1]);

            // SAVE TO BRAIN: If we have a caption or summary, save it to memory
            if (data.caption || data.summary) {
                try {
                    const content = data.caption || data.summary;
                    brain.storage.upsertKnowledge({
                        source: 'manual_trigger',
                        category: 'analysis',
                        title: `Manual Analysis: ${type.toUpperCase()}`,
                        content: content,
                        metadata: JSON.stringify({ type, interval, timestamp: new Date().toISOString() }),
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                    console.log(`[BRAIN] Saved manual analysis result for ${type} to memory.`);
                } catch (e) {
                    console.error('[BRAIN] Failed to save manual analysis to memory', e);
                }
            }

            res.json(data);
        } else {
            res.status(500).json({ error: 'Failed to parse script output', raw: stdout });
        }
    } catch (error: any) {
        console.error(`[ERROR] Script execution failed: ${error.message}`);
        res.status(500).json({ error: 'Execution failed', details: error.message });
    }
});





/**
 * Trigger brain training
 */
app.post('/api/train', async (req, res) => {
    try {
        const results = await brain.train();
        res.json({ success: true, results });
    } catch (error) {
        console.error('Training error:', error);
        res.status(500).json({ error: 'Training failed' });
    }
});


import { moltbook } from '../platforms/moltbook.js';

/**
 * Start the server
 */
async function start() {
    await brain.initialize();

    // Start Autonomous Scheduler (Posting, Monitoring, Training)
    // console.log('🚀 Starting Autonomous Scheduler...');
    // startScheduler(brain, moltbook);

    // SPA Fallback: Serve index.html for any unknown routes (so React Router can handle them if used, or just to serve the app)
    app.get('*', (req, res) => {
        // Don't intercept API routes (though they are defined above, express matches in order)
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ error: 'Not Found' });
        }
        res.sendFile(join(__dirname, 'public', 'index.html'));
    });

    app.listen(webConfig.port, webConfig.host, () => {
        console.log(`
╔═══════════════════════════════════════════════════╗
║       ChainMind Web Interface                     ║
╚═══════════════════════════════════════════════════╝

🌐 Server running at: http://${webConfig.host}:${webConfig.port}

Open in your browser to chat with ChainMind!
    `);
    });
}

start().catch(console.error);

export { app };
