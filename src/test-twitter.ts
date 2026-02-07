import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env'), override: true });

const { braveSearchFetcher } = await import('./brain/fetchers/brave-search.js');

console.log('🐦 Testing X/Twitter Search & Discussion\n');
console.log('='.repeat(60));

// Check if configured
if (!braveSearchFetcher.isConfigured()) {
    console.log('❌ Brave Search API key not configured');
    process.exit(1);
}

// Test 1: Search BNBCHAIN account
console.log('\n📊 1. Search @BNBCHAIN Account Posts');
console.log('-'.repeat(40));
try {
    const posts = await braveSearchFetcher.searchTwitterAccount('BNBCHAIN', 3);
    console.log(`✅ Found ${posts.length} posts from @BNBCHAIN`);
    posts.forEach((p, i) => {
        console.log(`\n   ${i + 1}. ${p.title.substring(0, 60)}...`);
        console.log(`      ${p.description.substring(0, 80)}...`);
    });
} catch (error) {
    console.log(`❌ Error: ${error}`);
}

// Wait for rate limit
console.log('\n   ⏳ Waiting for rate limit...');
await new Promise(r => setTimeout(r, 2000));

// Test 2: Search BNB Chain discussions  
console.log('\n💬 2. Search BNB Chain Discussions on X');
console.log('-'.repeat(40));
try {
    const discussions = await braveSearchFetcher.searchTwitterDiscussions('DeFi');
    console.log(`✅ Found ${discussions.length} discussions about BNB Chain DeFi`);
    discussions.slice(0, 3).forEach((d, i) => {
        console.log(`\n   ${i + 1}. ${d.title.substring(0, 60)}...`);
    });
} catch (error) {
    console.log(`❌ Error: ${error}`);
}

// Wait for rate limit
console.log('\n   ⏳ Waiting for rate limit...');
await new Promise(r => setTimeout(r, 2000));

// Test 3: Generate discussion about a post
console.log('\n✍️ 3. Generate Discussion About a Post');
console.log('-'.repeat(40));
try {
    const posts = await braveSearchFetcher.searchTwitterAccount('cz_binance', 1);
    if (posts.length > 0) {
        console.log(`   Found post: "${posts[0].title.substring(0, 50)}..."`);
        console.log('\n   🤖 Generating AI discussion...\n');
        const discussion = await braveSearchFetcher.generateDiscussion(posts[0]);
        console.log(`   💬 "${discussion}"`);
    } else {
        console.log('   No posts found to discuss');
    }
} catch (error) {
    console.log(`❌ Error: ${error}`);
}

console.log('\n' + '='.repeat(60));
console.log('🎉 X/Twitter search & discussion test complete!');
console.log('\n📝 The agent can now:');
console.log('   • Search posts from any X/Twitter account');
console.log('   • Find BNB Chain discussions on X');
console.log('   • Generate thoughtful discussions about posts');
console.log('   • Format content for sharing on Moltbook');
