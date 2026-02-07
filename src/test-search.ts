import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env'), override: true });

const { braveSearchFetcher } = await import('./brain/fetchers/brave-search.js');

console.log('🔍 Testing Brave Search Integration\n');
console.log('='.repeat(60));

// Check if configured
console.log(`\n📋 API Key Configured: ${braveSearchFetcher.isConfigured() ? '✅ Yes' : '❌ No'}`);

if (!braveSearchFetcher.isConfigured()) {
    console.log('❌ Brave Search API key not found in .env');
    process.exit(1);
}

// Test 1: General web search
console.log('\n📊 1. Web Search: "BNB Chain DeFi"');
console.log('-'.repeat(40));
try {
    const results = await braveSearchFetcher.search('BNB Chain DeFi news', 5);
    console.log(`✅ Found ${results.length} results`);
    results.slice(0, 3).forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.title.substring(0, 50)}...`);
    });
} catch (error) {
    console.log(`❌ Error: ${error}`);
}

// Test 2: News search
console.log('\n📰 2. News Search: "BNB Chain"');
console.log('-'.repeat(40));
try {
    const news = await braveSearchFetcher.searchNews('BNB Chain', 5);
    console.log(`✅ Found ${news.length} news articles`);
    news.slice(0, 3).forEach((n, i) => {
        console.log(`   ${i + 1}. ${n.title.substring(0, 50)}...`);
        console.log(`      Source: ${n.source}`);
    });
} catch (error) {
    console.log(`❌ Error: ${error}`);
}

// Test 3: BNB Chain specific search
console.log('\n🔶 3. BNB Chain Search: "opBNB"');
console.log('-'.repeat(40));
try {
    const response = await braveSearchFetcher.searchBNBChain('opBNB');
    console.log(`✅ Query: "${response.query}"`);
    console.log(`   Web Results: ${response.results.length}`);
    console.log(`   News Results: ${response.news.length}`);
} catch (error) {
    console.log(`❌ Error: ${error}`);
}

// Test 4: Topic research
console.log('\n📚 4. Research Topic: "PancakeSwap"');
console.log('-'.repeat(40));
try {
    const research = await braveSearchFetcher.researchTopic('PancakeSwap BNB Chain');
    console.log(research.substring(0, 300) + '...');
} catch (error) {
    console.log(`❌ Error: ${error}`);
}

console.log('\n' + '='.repeat(60));
console.log('🎉 Brave Search integration test complete!');
