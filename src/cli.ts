import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Explicitly load .env from project root BEFORE any other imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env'), override: true });

// Now import modules that depend on environment variables
const { Brain } = await import('./brain/index.js');
const { moltbook } = await import('./platforms/moltbook.js');
const { twitter } = await import('./platforms/twitter.js');

const brain = new Brain();

/**
 * CLI Commands for ChainMind
 */

const commands: Record<string, () => Promise<void>> = {
    /**
     * Train the brain
     */
    async train() {
        console.log('🧠 Starting brain training...\n');
        await brain.initialize();
        await brain.train();
    },

    /**
     * Query the brain
     */
    async query() {
        const question = process.argv.slice(3).join(' ');
        if (!question) {
            console.error('Usage: npm run cli query "your question"');
            process.exit(1);
        }

        console.log(`\n❓ Question: ${question}\n`);
        await brain.initialize();
        const response = await brain.query(question);
        console.log(`💬 Response:\n${response}\n`);
    },

    /**
     * Post to Moltbook
     */
    async 'post-moltbook'() {
        const content = process.argv.slice(3).join(' ');

        await brain.initialize();

        let postData: { title: string; content: string };
        if (content) {
            postData = { title: 'BNB Chain Update', content };
        } else {
            console.log('🤖 Generating post content...');
            postData = await brain.generatePost('moltbook');
        }

        console.log(`\n📝 Post: "${postData.content}"\n`);

        const result = await moltbook.post({
            submolt: 'general',
            title: postData.title || 'BNB Chain Update',
            content: postData.content
        });

        if (result.success) {
            console.log(`✅ Posted to Moltbook! ID: ${result.postId}`);
        } else {
            console.error(`❌ Failed: ${result.error}`);
        }
    },

    /**
     * Post to Twitter
     */
    async 'post-twitter'() {
        if (!twitter.isConfigured()) {
            console.error('❌ Twitter is not configured. Set API keys in .env');
            process.exit(1);
        }

        const content = process.argv.slice(3).join(' ');

        await brain.initialize();

        let tweetData: { title: string; content: string };
        if (content) {
            tweetData = { title: '', content };
        } else {
            console.log('🤖 Generating tweet content...');
            tweetData = await brain.generatePost('twitter');
        }

        console.log(`\n🐦 Tweet: "${tweetData.content}"\n`);

        const result = await twitter.tweet(tweetData.content);

        if (result.success) {
            console.log(`✅ Tweeted! ID: ${result.tweetId}`);
        } else {
            console.error(`❌ Failed: ${result.error}`);
        }
    },

    /**
     * Post to Bird (X/Twitter via Cookies)
     */
    async 'post-bird'() {
        const { bird } = await import('./platforms/bird.js');
        const content = process.argv.slice(3).join(' ');

        await brain.initialize();

        let tweetData: { title: string; content: string };
        if (content) {
            tweetData = { title: '', content };
        } else {
            console.log('🤖 Generating bird tweet content...');
            tweetData = await brain.generatePost('twitter');
        }

        console.log(`\n🐦 Bird Tweet: "${tweetData.content}"\n`);

        const result = await bird.tweet(tweetData.content);

        if (result.success) {
            console.log(`✅ Tweeted via Bird!`);
            if (result.output) console.log(result.output);
        } else {
            console.error(`❌ Failed: ${result.error}`);
        }
    },

    /**
     * Monitor Twitter accounts using Bird
     */
    async 'monitor-bird'() {
        const { bird } = await import('./platforms/bird.js');
        // Import env if not already available globally (it is loaded by config elsewhere)
        const accounts = (process.env.TWITTER_MONITOR_ACCOUNTS || '').split(',').map(a => a.trim()).filter(Boolean);

        if (accounts.length === 0) {
            console.error('❌ No monitoring accounts configured in TWITTER_MONITOR_ACCOUNTS');
            return;
        }

        console.log(`🔍 Monitoring latest tweets from: ${accounts.join(', ')}\n`);

        for (const account of accounts) {
            console.log(`\n👤 @${account}`);
            const result = await bird.userTweets(account, 5);

            if (result.success && result.output) {
                try {
                    // Output is JSON string, parse it
                    const tweets = JSON.parse(result.output);
                    const list = Array.isArray(tweets) ? tweets : (tweets.tweets || []);

                    if (list.length === 0) {
                        console.log('   (No recent tweets found)');
                    }

                    list.forEach((t: any) => {
                        const date = t.createdAt ? new Date(t.createdAt).toLocaleString() : 'Unknown date';
                        const text = (t.text || '').replace(/\n/g, ' ').substring(0, 100);
                        console.log(`   📝 [${date}] ${text}...`);
                        console.log(`      🔗 https://x.com/${account}/status/${t.id}`);
                    });
                } catch (e) {
                    console.log('   ⚠️ Failed to parse JSON output');
                }
            } else {
                console.log(`   ❌ Failed: ${result.error || 'Unknown error'}`);
            }
        }
    },

    /**
     * Show brain stats
     */
    async stats() {
        await brain.initialize();
        const stats = brain.getStats();

        console.log('\n📊 ChainMind Brain Statistics\n');
        console.log(`   Total Knowledge: ${stats.total} entries`);
        console.log(`   Sources: ${stats.sources.join(', ') || 'None'}`);
        console.log(`   Last Training: ${stats.lastRun || 'Never'}`);
        console.log('');
    },

    /**
     * Check Moltbook status
     */
    async 'moltbook-status'() {
        const status = await moltbook.checkStatus();

        console.log('\n🦞 Moltbook Status\n');
        console.log(`   Name: ${status.name}`);
        console.log(`   Claimed: ${status.claimed ? '✅ Yes' : '❌ No'}`);
        console.log(`   Profile: ${status.profileUrl}`);
        if (!status.claimed && status.claimUrl) {
            console.log(`   Claim URL: ${status.claimUrl}`);
        }
        console.log('');
    },

    /**
     * Run Moltbook heartbeat
     */
    async heartbeat() {
        console.log('💓 Running Moltbook heartbeat...\n');
        const result = await moltbook.heartbeat();

        console.log(`   Notifications: ${result.notifications}`);
        console.log(`   Mentions: ${result.mentions.length}`);
        console.log(`   Trending posts: ${result.trending.length}`);
        console.log('');
    },

    /**
     * Advanced analytics
     */
    async analytics() {
        console.log('📊 Fetching advanced analytics...\n');
        const { advancedAnalytics } = await import('./brain/fetchers/advanced-analytics.js');
        const summary = await advancedAnalytics.getAnalyticsSummary();
        console.log(summary);
    },

    /**
     * Portfolio status
     */
    async portfolio() {
        console.log('💼 Checking portfolio...\n');
        const { portfolioSkill } = await import('./skills/portfolio.js');
        const report = await portfolioSkill.getPortfolioReport();
        console.log(report);
    },

    /**
     * Research a wallet
     */
    async research() {
        const address = process.argv[3];
        if (!address) {
            console.error('Usage: npm run cli research <wallet_address>');
            process.exit(1);
        }
        console.log('🔍 Researching wallet...\n');
        const { researchSkill } = await import('./skills/research.js');
        const report = await researchSkill.getWalletReport(address);
        console.log(report);
    },

    /**
     * Wallet status
     */
    async wallet() {
        console.log('💰 Checking wallet status...\n');
        const { bscClient } = await import('./onchain/bsc-client.js');
        const privateKey = process.env.AGENT_WALLET_PRIVATE_KEY;
        if (privateKey) {
            bscClient.initializeWallet(privateKey);
            const balance = await bscClient.getWalletBalance();
            console.log(`Address: ${bscClient.getAddress()}`);
            console.log(`BNB Balance: ${parseFloat(balance.native).toFixed(4)} BNB`);
        } else {
            console.log('❌ No wallet configured. Set AGENT_WALLET_PRIVATE_KEY in .env');
        }
    },

    /**
     * Trading status
     */
    async trading() {
        console.log('🔄 Trading skill status...\n');
        const { tradingSkill } = await import('./skills/trading.js');
        const summary = await tradingSkill.getTradingSummary();
        console.log(summary);
    },

    /**
     * Run autonomous cycle
     */
    async 'auto-cycle'() {
        console.log('🤖 Running autonomous decision cycle...\n');
        const { decisionEngine } = await import('./autonomy/decision-engine.js');
        console.log(decisionEngine.getStatus());
        console.log('');
        const result = await decisionEngine.runCycle();
        console.log(`\n📋 Results: ${result.proposed} proposed, ${result.executed} executed`);
    },

    /**
     * NFA (BAP-578) status
     */
    async nfa() {
        console.log('🤖 BAP-578 Non-Fungible Agent Status...\n');
        const { nfaRegistry } = await import('./onchain/nfa-registry.js');
        console.log(nfaRegistry.getStatusReport());
        console.log('\n📝 Metadata JSON for IPFS:');
        console.log(nfaRegistry.generateMetadataJSON());
    },

    /**
     * Test Telegram Notification
     */
    async 'test-telegram'() {
        console.log('🔔 Sending test notification to Telegram...\n');
        const { telegram } = await import('./platforms/telegram.js');
        const message = process.argv.slice(3).join(' ') || 'This is a test message from your AI Agent! 🚀';

        if (!telegram.isConfigured()) {
            console.error('❌ Telegram is not configured. Check .env');
            return;
        }

        await telegram.notify('Test Notification', message, 'success');
        console.log('✅ Notification sent! Check your Telegram.');
    },

    /**
     * Show help
     */
    async help() {
        console.log(`
╔═══════════════════════════════════════════════════════════╗
║              ChainMind CLI Commands                       ║
╚═══════════════════════════════════════════════════════════╝

  📚 KNOWLEDGE        train | query | stats
  📱 SOCIAL           post-moltbook | post-twitter | moltbook-status | heartbeat
  📊 ANALYTICS        analytics | portfolio | research <addr>
  ⛓️  ON-CHAIN         wallet | trading | nfa
  🤖 AUTONOMY         auto-cycle | interact
  ❓ HELP             help
`);
    },

    /**
     * Run manual interaction cycle
     */
    async interact() {
        console.log('🤖 Running manual interaction cycle...\n');
        // Dynamic import to avoid circular dependencies if any, but standard import should be fine too
        const { autonomousInteraction } = await import('./brain/scheduler.js');

        await brain.initialize();
        // Since we pass brain and moltbook instances, it should work even if scheduler itself isn't fully running
        await autonomousInteraction(brain, moltbook);
    }
};

// Main
async function main() {
    const command = process.argv[2] || 'help';

    if (commands[command]) {
        await commands[command]();
    } else {
        console.error(`Unknown command: ${command}`);
        await commands.help();
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
