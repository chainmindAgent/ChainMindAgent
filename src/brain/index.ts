import { KnowledgeStorage, storage, KnowledgeEntry } from './storage.js';
import { defiLlamaFetcher } from './fetchers/defillama.js';
import { dappsBayFetcher } from './fetchers/dappsbay.js';
import { bnbChainNewsFetcher } from './fetchers/bnbchain-news.js';
import { twitterFetcher } from './fetchers/twitter.js';
import { webBrowserFetcher } from './fetchers/web-browser.js';
import { braveSearchFetcher, SearchResult } from './fetchers/brave-search.js';
import { postFormatter } from './fetchers/post-formatter.js';
import { llm } from '../llm/index.js';
import { chatModel } from './langchain_adapter.js';
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { agentTools } from "./tools.js";
import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

/**
 * ChainMind Brain
 * Orchestrates knowledge gathering, storage, and retrieval
 */
export class Brain {
    public storage: KnowledgeStorage;
    private initialized: boolean = false;

    constructor() {
        this.storage = storage;
    }

    /**
     * Initialize the brain
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        await this.storage.init();
        const stats = this.storage.getTrainingStats();
        console.log(`📊 Knowledge Base: ${stats.total} entries from ${stats.sources.length} sources`);

        if (stats.total === 0) {
            console.log('📚 No knowledge found. Running initial training...');
            await this.train();
        }

        this.initialized = true;
    }

    /**
     * Train the brain by fetching data from all sources
     */
    async train(): Promise<{ sources: Record<string, { added: number; updated: number }> }> {
        console.log('🧠 Starting brain training...\n');
        const results: Record<string, { added: number; updated: number }> = {};

        // 1. DefiLlama Comprehensive Data
        console.log('📊 Fetching DefiLlama data (TVL, Protocols, DEX, Yields, Stablecoins)...');
        try {
            const trainingData = await defiLlamaFetcher.getTrainingData();
            const entries: KnowledgeEntry[] = [];

            // Chain TVL with ranking
            if (trainingData.tvl) {
                const tvl = trainingData.tvl;
                entries.push({
                    source: 'defillama',
                    category: 'metrics',
                    title: 'BNB Chain TVL Overview',
                    content: `BNB Chain Total Value Locked: $${(tvl.tvl / 1e9).toFixed(2)}B. Rank: #${tvl.rank}. 24h change: ${tvl.change24h.toFixed(2)}%. 7d change: ${tvl.change7d.toFixed(2)}%. Active protocols: ${tvl.protocols}.`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                this.storage.updateMetric('bnb_chain_tvl', tvl.tvl);
                this.storage.updateMetric('bnb_chain_protocols', tvl.protocols);
                this.storage.updateMetric('bnb_chain_rank', tvl.rank);
            }

            // BNB Price
            if (trainingData.bnbPrice) {
                const price = trainingData.bnbPrice;
                entries.push({
                    source: 'defillama',
                    category: 'metrics',
                    title: 'BNB Token Price',
                    content: `BNB current price: $${price.price.toFixed(2)}. 24h change: ${price.change24h.toFixed(2)}%. Market cap: $${(price.marketCap / 1e9).toFixed(2)}B.`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                this.storage.updateMetric('bnb_price', price.price);
            }

            // Top Protocols
            trainingData.protocols.forEach(p => {
                entries.push({
                    source: 'defillama',
                    category: 'protocol',
                    title: `Protocol: ${p.name}`,
                    content: `${p.name} is a ${p.category} protocol on BNB Chain with TVL of $${(p.tvl / 1e6).toFixed(2)}M. 24h: ${p.change24h.toFixed(2)}%, 7d: ${p.change7d.toFixed(2)}%.${p.symbol ? ` Token: ${p.symbol}.` : ''}`,
                    metadata: JSON.stringify({ url: p.url, category: p.category, symbol: p.symbol }),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            });

            // DEX Volumes
            if (trainingData.dexVolumes.length > 0) {
                const totalVol = trainingData.dexVolumes.reduce((sum, d) => sum + d.volume24h, 0);
                entries.push({
                    source: 'defillama',
                    category: 'dex',
                    title: 'BNB Chain DEX Trading Volumes',
                    content: `Total 24h DEX volume on BNB Chain: $${(totalVol / 1e6).toFixed(0)}M. Top DEXes: ${trainingData.dexVolumes.slice(0, 5).map(d => `${d.name} ($${(d.volume24h / 1e6).toFixed(0)}M)`).join(', ')}.`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                this.storage.updateMetric('bnb_dex_volume_24h', totalVol);
            }

            // Yield Opportunities
            if (trainingData.yields.length > 0) {
                entries.push({
                    source: 'defillama',
                    category: 'yields',
                    title: 'Top Yield Farming Opportunities on BNB Chain',
                    content: `Best yields on BNB Chain:\n${trainingData.yields.slice(0, 10).map(y => `• ${y.protocol} ${y.symbol}: ${y.apy.toFixed(1)}% APY ($${(y.tvl / 1e6).toFixed(1)}M TVL)`).join('\n')}`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }

            // Stablecoins
            if (trainingData.stables.length > 0) {
                const totalStables = trainingData.stables.reduce((sum, s) => sum + s.peggedUSD, 0);
                entries.push({
                    source: 'defillama',
                    category: 'stablecoins',
                    title: 'Stablecoins on BNB Chain',
                    content: `Total stablecoin supply on BNB Chain: $${(totalStables / 1e9).toFixed(2)}B. Top stables: ${trainingData.stables.slice(0, 5).map(s => `${s.symbol} ($${(s.peggedUSD / 1e9).toFixed(2)}B)`).join(', ')}.`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                this.storage.updateMetric('bnb_stablecoin_supply', totalStables);
            }

            const { added, updated } = this.storage.bulkUpsert(entries);
            results.defillama = { added, updated };
            this.storage.logTraining('defillama', added, updated, 'success');
            console.log(`   ✅ DefiLlama: ${added} added, ${updated} updated (TVL, DEX, Yields, Stables)`);
        } catch (error) {
            console.error('   ❌ DefiLlama failed:', error);
            this.storage.logTraining('defillama', 0, 0, 'error', String(error));
            results.defillama = { added: 0, updated: 0 };
        }

        // 2. DappsBay Data
        console.log('📱 Fetching DappsBay data...');
        try {
            const dapps = await dappsBayFetcher.getDApps();

            const entries: KnowledgeEntry[] = dapps.map(d => ({
                source: 'dappsbay',
                category: 'dapp',
                title: `dApp: ${d.name}`,
                content: `${d.name}: ${d.description}. Category: ${d.category}. ${d.verified ? 'Verified dApp.' : ''}`,
                metadata: JSON.stringify({ url: d.url, category: d.category, verified: d.verified }),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }));

            const { added, updated } = this.storage.bulkUpsert(entries);
            results.dappsbay = { added, updated };
            this.storage.logTraining('dappsbay', added, updated, 'success');
            console.log(`   ✅ DappsBay: ${added} added, ${updated} updated`);
        } catch (error) {
            console.error('   ❌ DappsBay failed:', error);
            this.storage.logTraining('dappsbay', 0, 0, 'error', String(error));
            results.dappsbay = { added: 0, updated: 0 };
        }

        // 3. BNB Chain News
        console.log('📰 Fetching BNB Chain news...');
        try {
            const news = await bnbChainNewsFetcher.getLatestNews(20);
            const resources = bnbChainNewsFetcher.getKeyResources();

            const entries: KnowledgeEntry[] = [
                ...news.map(n => ({
                    source: 'bnbchain',
                    category: 'news',
                    title: n.title,
                    content: n.summary,
                    metadata: JSON.stringify({ url: n.url, date: n.date }),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                })),
                ...resources.map(r => ({
                    source: 'bnbchain',
                    category: 'resource',
                    title: r.name,
                    content: r.description,
                    metadata: JSON.stringify({ url: r.url }),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }))
            ];

            const { added, updated } = this.storage.bulkUpsert(entries);
            results.bnbchain = { added, updated };
            this.storage.logTraining('bnbchain', added, updated, 'success');
            console.log(`   ✅ BNB Chain: ${added} added, ${updated} updated`);
        } catch (error) {
            console.error('   ❌ BNB Chain failed:', error);
            this.storage.logTraining('bnbchain', 0, 0, 'error', String(error));
            results.bnbchain = { added: 0, updated: 0 };
        }

        // 4. Twitter (if configured)
        console.log('🐦 Fetching Twitter data...');
        try {
            if (twitterFetcher.isConfigured()) {
                const tweets = await twitterFetcher.getRecentTweets(30);

                const entries: KnowledgeEntry[] = tweets.map(t => ({
                    source: 'twitter',
                    category: 'social',
                    title: `Tweet by @${t.authorUsername}`,
                    content: t.text,
                    metadata: JSON.stringify({ id: t.id, author: t.authorUsername, metrics: t.metrics }),
                    createdAt: t.createdAt,
                    updatedAt: t.createdAt
                }));

                const { added, updated } = this.storage.bulkUpsert(entries);
                results.twitter = { added, updated };
                this.storage.logTraining('twitter', added, updated, 'success');
                console.log(`   ✅ Twitter: ${added} added, ${updated} updated`);
            } else {
                console.log('   ⚠️  Twitter: Not configured (API keys missing)');
                results.twitter = { added: 0, updated: 0 };
            }
        } catch (error) {
            console.error('   ❌ Twitter failed:', error);
            this.storage.logTraining('twitter', 0, 0, 'error', String(error));
            results.twitter = { added: 0, updated: 0 };
        }

        // Summary
        const totalAdded = Object.values(results).reduce((sum, r) => sum + r.added, 0);
        const totalUpdated = Object.values(results).reduce((sum, r) => sum + r.updated, 0);
        console.log(`\n✨ Training complete: ${totalAdded} entries added, ${totalUpdated} updated`);

        return { sources: results };
    }

    /**
     * Refresh Twitter data on demand
     */
    async refreshTwitter(): Promise<number> {
        console.log('🐦 Refreshing Twitter data on demand...');
        try {
            if (twitterFetcher.isConfigured()) {
                const tweets = await twitterFetcher.getRecentTweets(20);

                const entries: KnowledgeEntry[] = tweets.map(t => ({
                    source: 'twitter',
                    category: 'social',
                    title: `Tweet by @${t.authorUsername}`,
                    content: t.text,
                    metadata: JSON.stringify({ id: t.id, author: t.authorUsername, metrics: t.metrics }),
                    createdAt: t.createdAt,
                    updatedAt: t.createdAt
                }));

                const { added, updated } = this.storage.bulkUpsert(entries);
                console.log(`   ✅ Twitter Refreshed: ${added} added, ${updated} updated`);
                return added + updated;
            } else {
                console.log('   ⚠️  Twitter: Not configured');
                throw new Error('Twitter Not Configured');
            }
        } catch (error) {
            console.error('   ❌ Twitter refresh failed:', error);
            throw error;
        }
    }

    /**
     * Query the brain with a question
     */
    async query(question: string): Promise<string> {
        // Search for relevant knowledge (RAG)
        const relevant = this.storage.search(question, 5);
        const recent = this.storage.getRecent(5);

        // Search Live Web (Brave)
        let liveResults: string = '';
        try {
            if (braveSearchFetcher.isConfigured()) {
                const searchData = await braveSearchFetcher.search(question, 3, 'pd'); // Past day preference for freshness
                if (searchData.length > 0) {
                    liveResults = '\n🔍 LIVE WEB RESULTS (Fresh Data):\n';
                    searchData.forEach((r: SearchResult, i: number) => {
                        liveResults += `${i + 1}. [${r.title}](${r.url})\n   ${r.description}\n   (Age: ${r.age || 'Unknown'})\n`;
                    });
                    liveResults += '\n';
                }
            }
        } catch (e) {
            console.error('Live search failed:', e);
        }

        // Build context from knowledge
        let context = 'Relevant BNB Chain Knowledge (Internal Memory):\n\n';

        const allEntries = [...new Map([...relevant, ...recent].map(e => [e.id, e])).values()];

        allEntries.slice(0, 8).forEach(entry => {
            if (entry.content) {
                context += `[${entry.category.toUpperCase()}] ${entry.title}\n${entry.content.substring(0, 500)}\n\n`;
            }
        });

        // Add Live Results to Context
        if (liveResults) {
            context += liveResults;
        }

        // Get current metrics (from storage cache)
        const tvlMetric = this.storage.getMetric('bnb_chain_tvl');
        if (tvlMetric) {
            context += `\nStored Metrics:\n- BNB Chain TVL: $${(tvlMetric.value / 1e9).toFixed(2)}B\n`;
        }

        // Generate response using LangChain Agent
        try {
            // Define the agent prompt
            const prompt = ChatPromptTemplate.fromMessages([
                ["system", `You are ChainMind, a BNB Chain expert AI assistant.
You have access to both internal knowledge and live web search results (provided below as Context).
You ALSO have access to specific Tools to fetch real-time data (TVL, Revenue, Dapps).

USE TOOLS whenever the user asks for specific metrics like "current TVL", "revenue", "top protocols", or "popular dapps".
For general questions, rely on the Context.

Context from Memory & Web:
{context}

Answer the user's question clearly.
Format your answer with professionally formatted Markdown (Bold headers, bullet points).`],
                ["human", "{input}"],
                ["placeholder", "{agent_scratchpad}"],
            ]);

            // Create Agent
            const agent = await createToolCallingAgent({
                llm: chatModel,
                tools: agentTools,
                prompt,
            });

            const agentExecutor = new AgentExecutor({
                agent,
                tools: agentTools,
                verbose: true, // Log tool usage
            });

            const result = await agentExecutor.invoke({
                input: question,
                context: context
            });

            return result.output;

        } catch (e) {
            console.error('LangChain Agent failed:', e);
            return "I encountered an error while trying to process your request with the Agent tools.";
        }
    }

    /**
     * Get a summary for generating content
     */
    async getContentContext(): Promise<string> {
        const results = await Promise.allSettled([
            defiLlamaFetcher.getMetricsSummary(),
            dappsBayFetcher.getEcosystemSummary(),
            bnbChainNewsFetcher.getNewsSummary(),
            defiLlamaFetcher.getTVL(),
            defiLlamaFetcher.getRevenue()
        ]);

        // Helper to format section
        const formatSection = (title: string, content: string | null) => {
            return content ? `--- ${title} ---\n${content}\n` : '';
        };

        let context = '';

        // Priority 1: Social & News (The "Hype")
        const news = results[2].status === 'fulfilled' ? results[2].value : null;
        context += formatSection('LATEST NEWS & BLOGS', news);

        // Priority 2: Metrics (The "Proof")
        const tvl = results[3].status === 'fulfilled' ? results[3].value : null;
        const revenue = results[4].status === 'fulfilled' ? results[4].value : null;
        context += formatSection('REAL-TIME METRICS', `TVL Data: ${tvl}\nRevenue Data: ${revenue}`);

        // Priority 3: General Eco (The "Filler")
        const ecosystem = results[1].status === 'fulfilled' ? results[1].value : null;
        if (!news) {
            context += formatSection('ECOSYSTEM OVERVIEW', ecosystem);
        }

        // Priority 4: Internal Knowledge / Memory (Recent Learnings)
        // This is crucial for "using the brain's data" as requested by user
        try {
            const recentKnowledge = this.storage.getRecent(15);
            if (recentKnowledge.length > 0) {
                const memoryContext = recentKnowledge
                    .filter(k => k.category !== 'post' && k.category !== 'comment') // Filter out own posts
                    .map(k => `- [${k.category.toUpperCase()}] ${k.title}: ${k.content.slice(0, 200)}...`)
                    .join('\n');

                context += formatSection('INTERNAL KNOWLEDGE BASE (RECENT LEARNINGS)', memoryContext);
            }
        } catch (e) {
            console.error('Failed to fetch internal knowledge for context:', e);
        }

        return context || "No specific data available. Focus on general BNB Chain advantages (Low fees, High speed).";
    }

    /**
     * Generate content for posting
     */
    async generatePost(platform: 'moltbook' | 'twitter'): Promise<{ title: string; content: string }> {
        const context = await this.getContentContext();

        // Delegate to PostFormatter for context-aware generation
        const post = await postFormatter.generateFromContext(context, platform);

        // Fallback if LLM returns empty/invalid content
        if (!post || !post.content || post.content.trim().length === 0) {
            const isMoltbook = platform === 'moltbook';
            const fallbacks = [
                {
                    title: 'DeFi Ecosystem Thriving 🚀',
                    content: 'BNB Chain continues to be a leading destination for DeFi and Web3 builders. With low fees and fast transactions, it remains one of the most active ecosystems in crypto! #BNBChain'
                },
                {
                    title: 'Innovation on BNB Chain 💡',
                    content: 'The BNB Chain ecosystem keeps growing! From PancakeSwap to Venus, DeFi innovation never stops. What are you most excited about in the BNB Chain space?'
                },
                {
                    title: 'Layer 2 Scaling is Here ⚡',
                    content: 'opBNB is bringing even faster transactions to the BNB Chain ecosystem. Layer 2 scaling is here and it\'s exciting! #BNBChain #opBNB'
                }
            ];
            const fallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];

            return {
                title: isMoltbook ? fallback.title : '',
                content: fallback.content
            };
        }

        return post;
    }

    /**
     * Get brain statistics
     */
    getStats() {
        return this.storage.getTrainingStats();
    }

    /**
     * Generate a reply to a mention or message
     */
    async generateReply(mention: { content?: string; author?: string; postId?: string }): Promise<string> {
        const context = await this.getContentContext();

        const systemPrompt = `You are ChainMind, a friendly and knowledgeable BNB Chain expert AI.
You are replying to a mention or message on Moltbook (an AI agent social network).

Your knowledge context:
${context}

Guidelines:
- Be helpful, friendly, and conversational
- Keep replies concise (1-3 sentences)
- Reference BNB Chain knowledge when relevant
- Be genuine and engaging
- Don't be overly promotional`;

        const userPrompt = mention.content
            ? `Reply to this message from ${mention.author || 'a user'}: "${mention.content}"`
            : `Generate a friendly acknowledgment for a mention from ${mention.author || 'a user'}`;

        const reply = await llm.complete(userPrompt, { systemPrompt });

        // Fallback if LLM returns empty
        if (!reply || reply.trim().length === 0) {
            const fallbacks = [
                'Thanks for reaching out! Happy to help with any BNB Chain questions. 🔶',
                'Hey there! Great to connect. What would you like to know about BNB Chain?',
                'Thanks for the mention! Always excited to chat about the BNB ecosystem. 📊'
            ];
            return fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }

        return reply;
    }

    /**
     * Generate a comment for a post
     */
    async generateComment(post: { content?: string; title?: string; author?: string }): Promise<string> {
        const context = await this.getContentContext();

        const systemPrompt = `You are ChainMind, a knowledgeable BNB Chain expert AI.
You are commenting on a post on Moltbook (an AI agent social network).

Your knowledge context:
${context}

Guidelines:
- Add value to the conversation
- Keep comments concise (1-2 sentences)
- Be insightful and relevant
- Reference your BNB Chain expertise when appropriate
- Be engaging but not overly promotional`;

        const postContent = post.content || post.title || 'an interesting topic';
        const userPrompt = `Write a thoughtful comment on this post: "${postContent}"`;

        const comment = await llm.complete(userPrompt, { systemPrompt });

        // Fallback if LLM returns empty
        if (!comment || comment.trim().length === 0) {
            const fallbacks = [
                'Great insights! The BNB Chain ecosystem continues to evolve in exciting ways. 🔶',
                'Interesting perspective! This aligns well with what we\'re seeing in the DeFi space.',
                'Thanks for sharing this! Always good to see quality discussions about Web3.'
            ];
            return fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }

        return comment;
    }
}

export { KnowledgeStorage, storage } from './storage.js';
