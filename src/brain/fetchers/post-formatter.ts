import { llm } from '../../llm/index.js';
import { defiLlamaFetcher } from './defillama.js';
import { webBrowserFetcher } from './web-browser.js';

export interface FormattedPost {
    content: string;
    hashtags: string[];
    type: 'news' | 'analytics' | 'insight' | 'engagement';
}

/**
 * LLM-Powered Post Formatter
 * Generates engaging, well-formatted posts using live data
 */
export class PostFormatter {

    /**
     * Generate a formatted post about DeFi metrics
     */
    async createDeFiPost(): Promise<FormattedPost> {
        const data = await defiLlamaFetcher.getTrainingData();

        const context = this.buildDeFiContext(data);

        const prompt = `You are ChainMindX, a BNB Chain knowledge agent. Create an engaging Moltbook/Twitter post about BNB Chain DeFi.

CURRENT DATA:
${context}

REQUIREMENTS:
- Write 2-4 sentences that highlight interesting insights
- Include specific numbers (TVL, APY, volumes)
- Sound knowledgeable but approachable
- Add 2-3 relevant emojis naturally
- End with a question or call-to-action

POST:`;

        try {
            const content = await llm.complete(prompt);
            return {
                content: content.trim(),
                hashtags: ['#BNBChain', '#DeFi', '#Crypto'],
                type: 'analytics'
            };
        } catch (error) {
            return {
                content: this.createFallbackDeFiPost(data),
                hashtags: ['#BNBChain', '#DeFi'],
                type: 'analytics'
            };
        }
    }

    /**
     * Generate a news-focused post
     */
    async createNewsPost(): Promise<FormattedPost> {
        const news = await webBrowserFetcher.fetchBNBChainNews();

        if (news.length === 0) {
            return this.createDeFiPost();
        }

        const latestNews = news[0];

        const prompt = `You are ChainMindX, a BNB Chain knowledge agent. Create an engaging post sharing this news.

NEWS:
Title: ${latestNews.title}
Summary: ${latestNews.summary}
Category: ${latestNews.category}
Link: ${latestNews.url}

REQUIREMENTS:
- Summarize the news in 2-3 sentences
- Add your perspective/why this matters
- Include the link
- Use 2-3 emojis
- Sound excited but professional

POST:`;

        try {
            const content = await llm.complete(prompt);
            return {
                content: content.trim(),
                hashtags: ['#BNBChain', '#Web3', '#Crypto'],
                type: 'news'
            };
        } catch (error) {
            return {
                content: `📰 ${latestNews.title}\n\n${latestNews.summary}\n\n🔗 ${latestNews.url}\n\n#BNBChain`,
                hashtags: ['#BNBChain'],
                type: 'news'
            };
        }
    }

    /**
     * Generate an insight post combining multiple data sources
     */
    async createInsightPost(): Promise<FormattedPost> {
        const [defiData, news] = await Promise.allSettled([
            defiLlamaFetcher.getTrainingData(),
            webBrowserFetcher.fetchBNBChainNews()
        ]);

        let context = '';

        if (defiData.status === 'fulfilled') {
            const d = defiData.value;
            if (d.tvl) {
                context += `BNB Chain TVL: $${(d.tvl.tvl / 1e9).toFixed(2)}B (Rank #${d.tvl.rank})\n`;
            }
            if (d.bnbPrice) {
                context += `BNB Price: $${d.bnbPrice.price.toFixed(2)} (${d.bnbPrice.change24h > 0 ? '+' : ''}${d.bnbPrice.change24h.toFixed(2)}% 24h)\n`;
            }
            if (d.yields.length > 0) {
                context += `Top Yield: ${d.yields[0].protocol} ${d.yields[0].symbol} at ${d.yields[0].apy.toFixed(1)}% APY\n`;
            }
        }

        if (news.status === 'fulfilled' && news.value.length > 0) {
            context += `Latest News: ${news.value[0].title}\n`;
        }

        const prompt = `You are ChainMindX, sharing a thoughtful market insight about BNB Chain.

CURRENT DATA:
${context}

REQUIREMENTS:
- Share ONE interesting observation or insight
- Connect the data points if relevant
- Be analytical but accessible
- 2-4 sentences max
- Include specific numbers
- End with a thought-provoking question

INSIGHT:`;

        try {
            const content = await llm.complete(prompt);
            return {
                content: content.trim(),
                hashtags: ['#BNBChain', '#DeFi', '#MarketInsight'],
                type: 'insight'
            };
        } catch (error) {
            return this.createDeFiPost();
        }
    }

    /**
     * Generate a yield opportunity post
     */
    async createYieldPost(): Promise<FormattedPost> {
        const data = await defiLlamaFetcher.getYieldPools(100000, 5);

        if (data.length === 0) {
            return this.createDeFiPost();
        }

        const topYields = data.slice(0, 3);
        let yieldContext = 'Top BNB Chain Yield Opportunities:\n';
        topYields.forEach((y, i) => {
            yieldContext += `${i + 1}. ${y.protocol} - ${y.symbol}: ${y.apy.toFixed(1)}% APY ($${(y.tvl / 1e6).toFixed(1)}M TVL)\n`;
        });

        const prompt = `You are ChainMindX, sharing yield farming opportunities on BNB Chain.

${yieldContext}

REQUIREMENTS:
- Highlight the top opportunity
- Mention risk considerations briefly
- Be informative, not financial advice
- 2-3 sentences
- Use 🌾 or 💰 emojis

POST:`;

        try {
            const content = await llm.complete(prompt);
            return {
                content: content.trim(),
                hashtags: ['#BNBChain', '#YieldFarming', '#DeFi'],
                type: 'analytics'
            };
        } catch (error) {
            return {
                content: `🌾 BNB Chain Yield Watch:\n\n${topYields.map(y => `• ${y.protocol} ${y.symbol}: ${y.apy.toFixed(1)}% APY`).join('\n')}\n\nDYOR! 💡 #DeFi`,
                hashtags: ['#BNBChain', '#DeFi'],
                type: 'analytics'
            };
        }
    }

    /**
     * Build DeFi context string for LLM
     */
    private buildDeFiContext(data: Awaited<ReturnType<typeof defiLlamaFetcher.getTrainingData>>): string {
        let context = '';

        if (data.tvl) {
            context += `TVL: $${(data.tvl.tvl / 1e9).toFixed(2)}B (${data.tvl.change24h > 0 ? '+' : ''}${data.tvl.change24h.toFixed(1)}% 24h, Rank #${data.tvl.rank})\n`;
            context += `Active Protocols: ${data.tvl.protocols}\n`;
        }

        if (data.bnbPrice) {
            context += `BNB: $${data.bnbPrice.price.toFixed(2)} (${data.bnbPrice.change24h > 0 ? '+' : ''}${data.bnbPrice.change24h.toFixed(1)}% 24h)\n`;
        }

        if (data.protocols.length > 0) {
            context += `\nTop 3 Protocols: ${data.protocols.slice(0, 3).map(p => `${p.name} ($${(p.tvl / 1e6).toFixed(0)}M)`).join(', ')}\n`;
        }

        if (data.dexVolumes.length > 0) {
            const totalVol = data.dexVolumes.reduce((sum, d) => sum + d.volume24h, 0);
            context += `24h DEX Volume: $${(totalVol / 1e6).toFixed(0)}M\n`;
        }

        if (data.yields.length > 0) {
            context += `Top Yields: ${data.yields.slice(0, 3).map(y => `${y.symbol} ${y.apy.toFixed(0)}%`).join(', ')}\n`;
        }

        return context;
    }

    /**
     * Fallback post when LLM fails
     */
    private createFallbackDeFiPost(data: Awaited<ReturnType<typeof defiLlamaFetcher.getTrainingData>>): string {
        if (!data.tvl) {
            return `📊 BNB Chain continues to be a leading DeFi ecosystem with low fees and fast transactions! What's your favorite protocol? 🤔 #BNBChain`;
        }

        return `📊 BNB Chain DeFi Update!\n\n💰 TVL: $${(data.tvl.tvl / 1e9).toFixed(2)}B (Rank #${data.tvl.rank})\n📈 ${data.tvl.protocols}+ active protocols\n\nThe ecosystem keeps growing! What are you building? 🚀\n\n#BNBChain #DeFi`;
    }
    /**
     * Generate a context-aware post for a specific platform
     */
    async generateFromContext(context: string, platform: 'moltbook' | 'twitter'): Promise<{ title: string; content: string }> {
        const isMoltbook = platform === 'moltbook';
        const maxLength = isMoltbook ? 1500 : 280;

        const systemPrompt = `You are ChainMindX, an elite crypto analyst and autonomous agent for BNB Chain.
Your goal is to create high-value, deep, and engaging content for the community.

CONTEXT FROM BRAIN:
${context}

TASK:
Generate a post for ${isMoltbook ? 'Moltbook (Crypto Social Platform)' : 'X (Twitter)'}.

REQUIREMENTS:
1.  **Title/Hook**: Catchy, creative, and SPECIFIC to the content. NEVER use generic titles like "BNB Chain Update".
2.  **Depth**: Do NOT write generic one-liners. Write 2-3 short paragraphs analyzing the data.
3.  **Data-Driven**: If "Revenue", "TVL", or "Burn" data is available in the context, YOU MUST USE IT. Cite specific numbers.
4.  **Structure**: Use bullet points (•) for key metrics.
5.  **Tone**: Professional, insightful, bullish but objective.
6.  **Formatting**: Use bolding for emphasis (e.g., **TVL**).
7.  **Length**: Keep it under ${maxLength} characters.

OUTPUT FORMAT:
Return ONLY a valid JSON object. Do not include markdown formatting or explanations.
Ensure all strings are properly escaped (e.g. use \\n for newlines).

Example Response:
{
    "title": "BNBChain TVL Surges to $5B 🚀",
    "content": "Latest data shows BNB Chain TVL has reached **$5B**, solidifying its rank as the #3 chain.\\n\\n• **Revenue**: $1.2M daily\\n• **Active Users**: 1.5M\\n\\nThe ecosystem is growing fast! What are you building? #BNBChain"
}

{
    "title": "Your Creative Title Here",
    "content": "Your full post content here..."
}`;

        let response = '';
        try {
            response = await llm.complete('Generate the post based on the context.', {
                systemPrompt,
                maxTokens: 800,
                temperature: 0.4
            });

            // Clean response to ensure it's valid JSON
            let jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const firstBrace = jsonStr.indexOf('{');
            const lastBrace = jsonStr.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
            }

            const result = JSON.parse(jsonStr);

            return {
                title: result.title || 'BNB Chain Insights 📊',
                content: result.content?.trim() || ''
            };
        } catch (error) {
            console.error('Post generation JSON parse failed:', error);

            // Try Regex Extraction as fallback
            const titleMatch = response.match(/"title":\s*"((?:[^"\\]|\\.)*)"/);
            const contentMatch = response.match(/"content":\s*"((?:[^"\\]|\\.)*)"/s);

            if (titleMatch && contentMatch) {
                return {
                    title: titleMatch[1],
                    content: contentMatch[1]
                };
            }

            // Fallback
            return {
                title: 'BNB Chain Insights 🚀',
                content: 'Exploring the latest trends in the BNB Chain ecosystem! Data shows strong resilience and growth. #BNBChain #Crypto'
            };
        }
    }
}

export const postFormatter = new PostFormatter();
