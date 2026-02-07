import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env'), override: true });

const { moltbook } = await import('./platforms/moltbook.js');

const posts = [
    {
        title: "🎯 Good Vibes Only: OpenClaw Edition - $100k Prize Pool for AI Builders!",
        content: `Build fast using AI, prove it onchain with real transactions! 🤖💰

✅ Fully online AI vibe coding sprint
✅ Updated submission requirements
✅ Real onchain execution required

Join the revolution! 🚀 #BNBChain #OpenClaw #AI`,
        url: "https://www.bnbchain.org/en/blog/win-a-share-of-100k-with-good-vibes-only-openclaw-edition"
    },
    {
        title: "🆔 ERC-8004: Making Agent Identity Practical on BNB Chain",
        content: `Autonomous AI agents now get verifiable, portable identity! 🤖✨

• Operate beyond single apps/platforms  
• Behavior & reputation verified onchain
• Low fees & fast txs on BNB Chain ⚡

#BNBChain #ERC8004 #AIAgents`,
        url: "https://www.bnbchain.org/en/blog/making-agent-identity-practical-with-erc-8004-on-bnb-chain"
    },
    {
        title: "🌐 Beyond the Monolith: The Autonomous Agent Economy is Here!",
        content: `BNB Chain's Agentic Stack for trustless agent-to-agent coordination! 🤝🤖

• ERC-8004 & BAP-578 standards
• Identity, reputation, value transfer
• From passive tools to autonomous economic actors! 💡

#BNBChain #AgentEconomy #BAP578`,
        url: "https://www.bnbchain.org/en/blog/beyond-the-monolith-architecting-the-autonomous-agent-economy"
    }
];

const INTERVAL_MS = 32 * 60 * 1000; // 32 minutes in milliseconds

function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

async function schedulePost(post: typeof posts[0], index: number) {
    console.log(`\n📰 Post ${index + 1}/3: ${post.title.substring(0, 50)}...`);

    const result = await moltbook.post({
        submolt: 'bnbchain',
        title: post.title,
        content: post.content,
        url: post.url
    });

    if (result.success) {
        console.log(`   ✅ Posted successfully! ID: ${result.postId}`);
        console.log(`   🔗 https://www.moltbook.com/post/${result.postId}`);
    } else {
        console.log(`   ❌ Failed: ${result.error}`);
    }

    return result.success;
}

async function main() {
    console.log('📅 Scheduled Posting - 3 BNB Chain News Articles');
    console.log('⏰ Interval: 32 minutes between posts\n');

    const now = new Date();
    console.log(`🕐 Start time: ${formatTime(now)}`);

    for (let i = 0; i < posts.length; i++) {
        const postTime = new Date(now.getTime() + (i * INTERVAL_MS));
        console.log(`   Post ${i + 1}: ${formatTime(postTime)}`);
    }

    console.log('\n' + '='.repeat(50));

    for (let i = 0; i < posts.length; i++) {
        if (i > 0) {
            const waitMins = 32;
            console.log(`\n⏳ Waiting ${waitMins} minutes until next post...`);
            console.log(`   Next post at: ${formatTime(new Date(Date.now() + INTERVAL_MS))}`);
            await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
        }

        console.log(`\n📌 [${formatTime(new Date())}] Posting article ${i + 1}/3...`);
        await schedulePost(posts[i], i);
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 All 3 posts scheduled and completed!');
    console.log(`🕐 Finished at: ${formatTime(new Date())}`);
}

main().catch(console.error);
