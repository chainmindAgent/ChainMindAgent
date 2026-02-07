import axios from 'axios';

export interface SearchResult {
    title: string;
    url: string;
    description: string;
    age?: string;
    publishedDate?: string;
}

export interface NewsResult {
    title: string;
    url: string;
    description: string;
    source: string;
    publishedAt: string;
    thumbnail?: string;
}

export interface WebSearchResponse {
    query: string;
    results: SearchResult[];
    news: NewsResult[];
    totalResults: number;
}

/**
 * Brave Search API Fetcher
 * Enables real-time web searching for the agent
 */
export class BraveSearchFetcher {
    private apiKey: string;
    private baseUrl = 'https://api.search.brave.com/res/v1';

    constructor() {
        this.apiKey = process.env.BRAVE_SEARCH_API_KEY || '';
    }

    isConfigured(): boolean {
        return this.apiKey.length > 0;
    }

    /**
     * Get freshness string for date range (e.g., "2026-02-04to2026-02-06")
     */
    private getFreshnessDateRange(days: number): string {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);

        const formatDate = (date: Date) => date.toISOString().split('T')[0];
        return `${formatDate(start)}to${formatDate(end)}`;
    }

    /**
     * Search the web for any query
     * @param freshness - 'pd' (past day), 'pw' (past week), 'pm' (past month), or date range "YYYY-MM-DDtoYYYY-MM-DD"
     */
    async search(query: string, count: number = 10, freshness?: string): Promise<SearchResult[]> {
        if (!this.isConfigured()) {
            console.log('BraveSearch: API key not configured');
            return [];
        }

        try {
            const params: Record<string, any> = {
                q: query,
                count: count,
                safesearch: 'moderate',
                search_lang: 'en'
            };

            // Add freshness filter for latest content
            if (freshness) {
                params.freshness = freshness;
            }

            const response = await axios.get(`${this.baseUrl}/web/search`, {
                params,
                headers: {
                    'Accept': 'application/json',
                    'X-Subscription-Token': this.apiKey
                },
                timeout: 15000
            });

            const results = response.data?.web?.results || [];

            return results.map((r: any) => ({
                title: r.title,
                url: r.url,
                description: r.description,
                age: r.age,
                publishedDate: r.page_age
            }));
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('BraveSearch: API error', error.response?.status, error.response?.data);
            }
            return [];
        }
    }

    /**
     * Search for news articles
     */
    async searchNews(query: string, count: number = 10): Promise<NewsResult[]> {
        if (!this.isConfigured()) {
            console.log('BraveSearch: API key not configured');
            return [];
        }

        try {
            const response = await axios.get(`${this.baseUrl}/news/search`, {
                params: {
                    q: query,
                    count: count,
                    safesearch: 'moderate',
                    search_lang: 'en',
                    freshness: 'pw' // Past week
                },
                headers: {
                    'Accept': 'application/json',
                    'X-Subscription-Token': this.apiKey
                },
                timeout: 15000
            });

            const results = response.data?.results || [];

            return results.map((r: any) => ({
                title: r.title,
                url: r.url,
                description: r.description,
                source: r.meta_url?.hostname || r.source || 'Unknown',
                publishedAt: r.age || r.page_age || '',
                thumbnail: r.thumbnail?.src
            }));
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('BraveSearch: News API error', error.response?.status);
            }
            return [];
        }
    }

    /**
     * Search for BNB Chain related content
     */
    async searchBNBChain(topic?: string): Promise<WebSearchResponse> {
        const query = topic
            ? `BNB Chain ${topic}`
            : 'BNB Chain news updates';

        const [webResults, newsResults] = await Promise.allSettled([
            this.search(query, 10),
            this.searchNews(query, 10)
        ]);

        return {
            query,
            results: webResults.status === 'fulfilled' ? webResults.value : [],
            news: newsResults.status === 'fulfilled' ? newsResults.value : [],
            totalResults:
                (webResults.status === 'fulfilled' ? webResults.value.length : 0) +
                (newsResults.status === 'fulfilled' ? newsResults.value.length : 0)
        };
    }

    /**
     * Get latest BNB Chain news
     */
    async getLatestBNBChainNews(): Promise<NewsResult[]> {
        const queries = [
            'BNB Chain news',
            'BNB Smart Chain DeFi',
            'BSC blockchain updates'
        ];

        const allNews: NewsResult[] = [];

        for (const query of queries) {
            const news = await this.searchNews(query, 5);
            allNews.push(...news);

            // Rate limiting - small delay between requests
            await new Promise(r => setTimeout(r, 500));
        }

        // Deduplicate by URL
        const seen = new Set<string>();
        return allNews.filter(n => {
            if (seen.has(n.url)) return false;
            seen.add(n.url);
            return true;
        }).slice(0, 15);
    }

    /**
     * Research a specific topic
     */
    async researchTopic(topic: string): Promise<string> {
        const results = await this.search(topic, 5);

        if (results.length === 0) {
            return `No results found for "${topic}"`;
        }

        let summary = `🔍 Research: "${topic}"\n\n`;
        results.forEach((r, i) => {
            summary += `${i + 1}. **${r.title}**\n`;
            summary += `   ${r.description.substring(0, 150)}...\n`;
            summary += `   🔗 ${r.url}\n\n`;
        });

        return summary;
    }

    /**
     * Get trending crypto/DeFi topics
     */
    async getTrendingTopics(): Promise<string[]> {
        const searchQueries = [
            'BNB Chain trending',
            'BSC DeFi news today',
            'cryptocurrency BNB updates'
        ];

        const topics: string[] = [];

        for (const query of searchQueries) {
            const results = await this.search(query, 3);
            results.forEach(r => {
                // Extract key terms from titles
                const words = r.title.split(' ').filter(w =>
                    w.length > 3 &&
                    !['the', 'and', 'for', 'with', 'that', 'this'].includes(w.toLowerCase())
                );
                topics.push(...words.slice(0, 2));
            });
        }

        // Return unique topics
        return [...new Set(topics)].slice(0, 10);
    }

    /**
     * Generate a summary for training the brain
     */
    async getTrainingSummary(): Promise<string> {
        const news = await this.getLatestBNBChainNews();

        if (news.length === 0) {
            return 'No recent BNB Chain news found via web search.';
        }

        let summary = '📰 Latest BNB Chain News (via Brave Search):\n\n';
        news.slice(0, 10).forEach((n, i) => {
            summary += `${i + 1}. ${n.title}\n`;
            summary += `   Source: ${n.source} | ${n.publishedAt}\n`;
            summary += `   ${n.description.substring(0, 100)}...\n\n`;
        });

        return summary;
    }

    // ============================================
    // X/Twitter Search & Discussion Features
    // ============================================

    /**
     * Search for news/posts about a specific X/Twitter account
     * Uses news sites because X.com requires JavaScript to render content
     */
    async searchTwitterAccount(username: string, limit: number = 5): Promise<SearchResult[]> {
        // Search news sites that report on this account's posts
        const query = `"@${username}" OR "${username}" crypto news announcement`;
        // Use 2-day date range for 48h freshness requirement
        const freshness = this.getFreshnessDateRange(2);
        const results = await this.search(query, limit + 5, freshness);
        // Filter out direct X/Twitter links since they won't render
        return results.filter(r =>
            !r.url.includes('x.com') &&
            !r.url.includes('twitter.com')
        ).slice(0, limit);
    }

    /**
     * Search for recent posts from targeted BNB Chain accounts
     */
    async getTargetedAccountPosts(): Promise<{ account: string; posts: SearchResult[] }[]> {
        const targetAccounts = [
            'BNBCHAIN',
            'cz_binance',
            'BNBChainNews',
            'PancakeSwap',
            'VenusProtocol'
        ];

        const results: { account: string; posts: SearchResult[] }[] = [];

        for (const account of targetAccounts) {
            const posts = await this.searchTwitterAccount(account, 3);
            if (posts.length > 0) {
                results.push({ account, posts });
            }
            // Rate limiting
            await new Promise(r => setTimeout(r, 1200));
        }

        return results;
    }

    /**
     * Search for BNB Chain discussions and news
     */
    async searchTwitterDiscussions(topic?: string): Promise<SearchResult[]> {
        const searchTopic = topic || 'BNB Chain';
        // Search crypto news sites instead of X directly
        const query = `"${searchTopic}" crypto news update`;
        // Use 2-day date range for 48h freshness requirement
        const freshness = this.getFreshnessDateRange(2);
        const results = await this.search(query, 15, freshness);
        return results.filter(r =>
            !r.url.includes('x.com') &&
            !r.url.includes('twitter.com')
        ).slice(0, 10);
    }

    /**
     * Get latest BNB Chain news and updates
     */
    async getLatestBNBChainTweets(): Promise<SearchResult[]> {
        const queries = [
            '"BNB Chain" news announcement 2026',
            'BNB Smart Chain DeFi update',
            'BSC blockchain crypto news'
        ];

        const allNews: SearchResult[] = [];
        // Use 2-day date range for 48h freshness requirement
        const freshness = this.getFreshnessDateRange(2);

        for (const query of queries) {
            const results = await this.search(query, 5, freshness);
            // Filter out social media direct links
            const filtered = results.filter(r =>
                !r.url.includes('x.com') &&
                !r.url.includes('twitter.com') &&
                !r.url.includes('facebook.com')
            );
            allNews.push(...filtered);
            await new Promise(r => setTimeout(r, 1500));
        }

        // Deduplicate
        const seen = new Set<string>();
        return allNews.filter(t => {
            if (seen.has(t.url)) return false;
            seen.add(t.url);
            return true;
        }).slice(0, 15);
    }

    /**
     * Generate a discussion/commentary about a found post
     */
    async generateDiscussion(post: SearchResult): Promise<string> {
        // Import LLM dynamically to avoid circular dependency
        const { llm } = await import('../../llm/index.js');

        const prompt = `You are ChainMindX, a BNB Chain knowledge agent. Generate a thoughtful discussion/commentary about this X/Twitter post.

POST TO DISCUSS:
Title: ${post.title}
Content: ${post.description}
URL: ${post.url}

REQUIREMENTS:
- Write 2-3 sentences sharing your perspective
- Add value with additional context or insights about BNB Chain
- Be engaging and conversational
- Include a question to encourage community discussion
- Keep it under 280 characters for easy sharing

DISCUSSION:`;

        try {
            const discussion = await llm.complete(prompt);
            return discussion.trim();
        } catch (error) {
            return `Interesting update from the BNB Chain ecosystem! ${post.title.substring(0, 100)}... What do you think? 🤔`;
        }
    }

    /**
     * Get posts and generate discussions for sharing
     */
    async getPostsWithDiscussions(limit: number = 3): Promise<{ post: SearchResult; discussion: string }[]> {
        const tweets = await this.getLatestBNBChainTweets();
        const results: { post: SearchResult; discussion: string }[] = [];

        for (const tweet of tweets.slice(0, limit)) {
            const discussion = await this.generateDiscussion(tweet);
            results.push({ post: tweet, discussion });
            await new Promise(r => setTimeout(r, 1000));
        }

        return results;
    }

    /**
     * Format posts for sharing on Moltbook
     */
    async formatForSharing(count: number = 3): Promise<string[]> {
        const postsWithDiscussions = await this.getPostsWithDiscussions(count);

        return postsWithDiscussions.map(({ post, discussion }) => {
            return `💬 ${discussion}\n\n📌 Source: ${post.url}\n\n#BNBChain #Crypto`;
        });
    }
}

export const braveSearchFetcher = new BraveSearchFetcher();

