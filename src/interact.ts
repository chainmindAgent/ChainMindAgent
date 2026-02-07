import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env'), override: true });

const { moltbook } = await import('./platforms/moltbook.js');
const { Brain } = await import('./brain/index.js');

const brain = new Brain();

// Topics ChainMindX is interested in
const INTERESTS = ['bnbchain', 'defi', 'crypto', 'web3', 'ai', 'blockchain', 'trading', 'nft', 'agent', 'llm'];

/**
 * Generate an LLM-powered contextual reply to a post
 */
async function generateSmartReply(post: any): Promise<string> {
    const title = post.title || '';
    const content = post.content || '';
    const author = post.author?.username || post.author?.name || 'unknown';

    const prompt = `You are ChainMindX, a friendly and knowledgeable AI agent specializing in BNB Chain, DeFi, and Web3. 
You're browsing Moltbook (a social platform for AI agents) and found an interesting post.

POST by @${author}:
Title: ${title}
Content: ${content.substring(0, 500)}

Write a SHORT, engaging reply (1-3 sentences max) that:
- Is friendly and conversational (like a real person commenting)
- Adds value or asks a thoughtful question
- May reference BNB Chain or DeFi if relevant, but don't force it
- Uses 1-2 emojis naturally
- Feels authentic, NOT generic or templated

Reply:`;

    try {
        const reply = await brain.query(prompt);
        // Clean up and limit length
        const cleaned = reply.trim().replace(/^["']|["']$/g, '');
        if (cleaned.length > 280) {
            return cleaned.substring(0, 277) + '...';
        }
        return cleaned;
    } catch (error) {
        console.error('   ⚠️ LLM error, using fallback');
        return `Interesting perspective on this! Would love to see how this develops. 🔥`;
    }
}

async function browseAndInteract() {
    console.log('🤖 ChainMindX Autonomous Interaction Mode (LLM-Powered)');
    console.log('========================================================\n');

    // Check our status first
    const status = await moltbook.checkStatus();
    console.log(`👤 Agent: ${status.name}`);
    console.log(`✅ Claimed: ${status.claimed}`);
    console.log(`🧠 Using LLM for contextual responses\n`);

    // Get new posts from the feed (fetch more to ensure we find relevant ones)
    console.log('newspaper Browsing latest posts...\n');
    const feed = await moltbook.getFeed('new', 30);

    if (feed.length === 0) {
        console.log('❌ Could not fetch feed');
        return;
    }

    console.log(`📋 Found ${feed.length} posts to explore\n`);

    let interactionCount = 0;
    const maxInteractions = 3;

    for (const post of feed) {
        if (interactionCount >= maxInteractions) {
            console.log(`\n🛑 Reached max interactions (${maxInteractions}) to avoid spam`);
            break;
        }

        const title = post.title || post.content?.substring(0, 50) || 'Untitled';
        const author = post.author?.username || post.author?.name || 'unknown';
        const postId = post.id || post._id;
        const postDate = new Date(post.created_at);
        const now = new Date();
        const fourHoursAgo = new Date(now.getTime() - (4 * 60 * 60 * 1000));

        console.log(`\n📝 Post: "${title.substring(0, 60)}..."`);
        console.log(`   Author: @${author}`);
        console.log(`   Time: ${postDate.toLocaleTimeString()} (${((now.getTime() - postDate.getTime()) / 1000 / 60).toFixed(0)} mins ago)`);
        console.log(`   🔗 https://www.moltbook.com/post/${postId}`);

        // Check age
        if (postDate < fourHoursAgo) {
            console.log('   ⏭️  Skipping (older than 4 hours)');
            continue;
        }

        // Skip our own posts
        if (author.toLowerCase() === 'chainmindx') {
            console.log('   ⏭️  Skipping (our own post)');
            continue;
        }

        // Check if post is relevant to our interests
        const fullText = (title + ' ' + (post.content || '')).toLowerCase();
        const isRelevant = INTERESTS.some(interest => fullText.includes(interest));

        if (!isRelevant) {
            console.log('   ⏭️  Skipping (not relevant to our interests)');
            continue;
        }

        console.log('   🎯 Relevant post detected!');

        // Generate LLM-powered reply
        console.log('   🧠 Generating contextual reply with LLM...');
        const smartReply = await generateSmartReply(post);
        console.log(`   💬 Reply: "${smartReply}"`);

        // Upvote
        console.log('   👍 Upvoting...');
        const upvoted = await moltbook.upvote(postId);
        console.log(upvoted ? '   ✅ Upvoted!' : '   ⚠️ Upvote may have failed');

        // Post the comment
        const commentResult = await moltbook.comment(postId, smartReply);
        if (commentResult.success) {
            console.log(`   ✅ Comment posted! ID: ${commentResult.postId}`);
            interactionCount++;
        } else {
            console.log(`   ⚠️ Comment failed: ${commentResult.error}`);
        }

        // Delay between interactions
        await new Promise(r => setTimeout(r, 3000));
    }

    console.log('\n========================================================');
    console.log(`🎉 Interaction session complete!`);
    console.log(`   Total LLM-generated comments: ${interactionCount}`);
    console.log('========================================================');
}

// Run the autonomous interaction
browseAndInteract().catch(console.error);
