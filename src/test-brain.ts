import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env'), override: true });

const { defiLlamaFetcher } = await import('./brain/fetchers/defillama.js');
const { webBrowserFetcher } = await import('./brain/fetchers/web-browser.js');
const { postFormatter } = await import('./brain/fetchers/post-formatter.js');

console.log('🧪 Testing Enhanced Brain Data Fetchers\n');
console.log('='.repeat(60));

// Test DefiLlama comprehensive data
console.log('\n📊 1. DefiLlama Comprehensive Data');
console.log('-'.repeat(40));
try {
    const data = await defiLlamaFetcher.getTrainingData();

    if (data.tvl) {
        console.log(`✅ TVL: $${(data.tvl.tvl / 1e9).toFixed(2)}B (Rank #${data.tvl.rank})`);
        console.log(`   24h: ${data.tvl.change24h.toFixed(2)}%, 7d: ${data.tvl.change7d.toFixed(2)}%`);
    }

    if (data.bnbPrice) {
        console.log(`✅ BNB Price: $${data.bnbPrice.price.toFixed(2)} (${data.bnbPrice.change24h > 0 ? '+' : ''}${data.bnbPrice.change24h.toFixed(2)}%)`);
    }

    console.log(`✅ Protocols: ${data.protocols.length} fetched`);
    if (data.protocols.length > 0) {
        console.log(`   Top 3: ${data.protocols.slice(0, 3).map(p => p.name).join(', ')}`);
    }

    console.log(`✅ DEX Volumes: ${data.dexVolumes.length} DEXes`);
    if (data.dexVolumes.length > 0) {
        const totalVol = data.dexVolumes.reduce((sum, d) => sum + d.volume24h, 0);
        console.log(`   24h Total: $${(totalVol / 1e6).toFixed(0)}M`);
    }

    console.log(`✅ Yield Pools: ${data.yields.length} opportunities`);
    if (data.yields.length > 0) {
        console.log(`   Best: ${data.yields[0].protocol} ${data.yields[0].symbol} at ${data.yields[0].apy.toFixed(1)}% APY`);
    }

    console.log(`✅ Stablecoins: ${data.stables.length} tracked`);
    if (data.stables.length > 0) {
        const totalStables = data.stables.reduce((sum, s) => sum + s.peggedUSD, 0);
        console.log(`   Total Supply: $${(totalStables / 1e9).toFixed(2)}B`);
    }
} catch (error) {
    console.log(`❌ Error: ${error}`);
}

// Test Web Browser
console.log('\n🌐 2. Web Browser Fetcher');
console.log('-'.repeat(40));
try {
    const news = await webBrowserFetcher.fetchBNBChainNews();
    console.log(`✅ News Articles: ${news.length} fetched`);
    if (news.length > 0) {
        console.log(`   Latest: ${news[0].title.substring(0, 50)}...`);
    }

    const projects = await webBrowserFetcher.fetchDappsBayProjects();
    console.log(`✅ DappsBay Projects: ${projects.length} fetched`);
    if (projects.length > 0) {
        console.log(`   Featured: ${projects.slice(0, 3).map(p => p.name).join(', ')}`);
    }
} catch (error) {
    console.log(`❌ Error: ${error}`);
}

// Test LLM Post Formatter
console.log('\n✍️ 3. LLM Post Formatter');
console.log('-'.repeat(40));
try {
    console.log('   Generating DeFi post with live data...');
    const post = await postFormatter.createDeFiPost();
    console.log(`✅ Post Generated (${post.type}):`);
    console.log(`   "${post.content.substring(0, 100)}..."`);
    console.log(`   Tags: ${post.hashtags.join(' ')}`);
} catch (error) {
    console.log(`❌ Error: ${error}`);
}

console.log('\n' + '='.repeat(60));
console.log('🎉 Enhanced Brain testing complete!');
