import fs from 'fs';
import path from 'path';
import { bird, moltbook } from '../platforms/index.js';
import { telegram } from '../platforms/telegram.js';
import { storage, KnowledgeEntry } from './storage.js';
import { logger } from '../utils/logger.js';
import { postQueue } from './queue.js';

const STATE_FILE = path.join(process.cwd(), 'data', 'monitor_state.json');

interface MonitorState {
    [username: string]: {
        lastId: string;
        lastCheck: string;
        postCount: number;
    }
}

/**
 * Run the monitoring cycle
 * Checks target accounts for new tweets, saves to brain, and reposts to Moltbook
 */
export async function runMonitoring() {
    if (!process.env.TWITTER_MONITOR_ACCOUNTS) {
        logger.info('🦅 Monitoring skipped: TWITTER_MONITOR_ACCOUNTS not set');
        return;
    }

    // Load state
    let state: MonitorState = {};
    try {
        if (fs.existsSync(STATE_FILE)) {
            state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
        }
    } catch (e) {
        console.error('⚠️ Failed to load monitor state:', e);
    }

    const accounts = process.env.TWITTER_MONITOR_ACCOUNTS.split(',').map(a => a.trim()).filter(Boolean);

    console.log(`🦅 Monitoring cycle: Checking ${accounts.length} accounts...`);

    let updatesFound = 0;

    for (const account of accounts) {
        const found = await processAccount(account, state);
        if (found) updatesFound++;
    }

    if (updatesFound > 0) {
        // Save state only if updates happened
        try {
            const stateDir = path.dirname(STATE_FILE);
            if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });
            fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
        } catch (e) {
            console.error('❌ Error saving monitor state', e);
        }
    } else {
        logger.info('   (No new tweets found)');
    }
}

async function processAccount(account: string, state: MonitorState): Promise<boolean> {
    const lastId = state[account]?.lastId;

    // Fetch latest 5 tweets
    const result = await bird.userTweets(account, 5);

    if (!result.success || !result.output) {
        logger.warn(`   ❌ Failed to fetch @${account}: ${result.error}`);
        return false;
    }

    let tweets: any[] = [];
    try {
        const parsed = JSON.parse(result.output);
        tweets = Array.isArray(parsed) ? parsed : (parsed.tweets || []);
    } catch {
        console.log(`   ⚠️ Failed to parse output for @${account}`);
        return false;
    }

    if (tweets.length === 0) return false;

    // Filter for new tweets
    // Tweet IDs are strings, lexicographically sortable (mostly)
    const newTweets = tweets.filter(t => !lastId || (t.id > lastId && t.id !== lastId));

    if (newTweets.length === 0) return false;

    // Sort descending (newest first) just in case
    newTweets.sort((a, b) => b.id.localeCompare(a.id));

    // Pick the newest one
    const t = newTweets[0];
    logger.success(`   ✨ New tweet from @${account}: ${t.id}`);

    // 1. Save to Brain (Storage)
    const entry: KnowledgeEntry = {
        source: 'twitter_monitor',
        category: 'social',
        title: `Tweet by @${account}`,
        content: t.text,
        metadata: JSON.stringify({
            id: t.id,
            author: account,
            url: `https://x.com/${account}/status/${t.id}`,
            date: t.createdAt
        }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    await storage.init(); // Ensure initialized
    const { added } = storage.bulkUpsert([entry]);
    if (added > 0) logger.info(`      🧠 Saved to Brain`);

    // 2. Post to Moltbook (via Queue)
    const postTitle = `Update from @${account}`;
    const postContent = `New tweet detected:\n\n${t.text}\n\n🔗 https://x.com/${account}/status/${t.id}`;

    // Notify Telegram
    await telegram.notify(
        '🦅 Twitter Monitor',
        `New Tweet from @${account}:\n\n"${t.text.slice(0, 100)}..."`,
        'info'
    );

    postQueue.enqueue({
        title: postTitle,
        content: postContent,
        platform: 'moltbook',
        priority: 10 // High priority for fresh news
    });

    logger.success(`      ✅ Enqueued for Moltbook (Priority 10)`);

    // Update state
    state[account] = {
        lastId: t.id,
        lastCheck: new Date().toISOString(),
        postCount: (state[account]?.postCount || 0) + 1
    };

    return true;
}
