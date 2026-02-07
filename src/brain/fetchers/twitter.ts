import { TwitterApi } from 'twitter-api-v2';
import { twitterConfig } from '../../config.js';

export interface Tweet {
    id: string;
    text: string;
    authorUsername: string;
    createdAt: string;
    metrics?: {
        likes: number;
        retweets: number;
        replies: number;
    };
}

/**
 * Twitter/X Data Fetcher
 * Monitors specific accounts for BNB Chain knowledge
 */
export class TwitterFetcher {
    private client: TwitterApi | null = null;
    private monitorAccounts: string[];

    constructor() {
        this.monitorAccounts = twitterConfig.monitorAccounts;
        this.initClient();
    }

    private initClient() {
        if (twitterConfig.apiKey && twitterConfig.apiSecret) {
            try {
                this.client = new TwitterApi({
                    appKey: twitterConfig.apiKey,
                    appSecret: twitterConfig.apiSecret,
                    accessToken: twitterConfig.accessToken,
                    accessSecret: twitterConfig.accessSecret
                });
            } catch (error) {
                console.warn('Twitter: Failed to initialize client', error);
            }
        }
    }

    /**
     * Check if Twitter client is configured
     */
    isConfigured(): boolean {
        return this.client !== null;
    }

    /**
     * Fetch via Bird (Cookie-based Fallback)
     */
    async fetchViaBird(limit: number): Promise<Tweet[]> {
        console.log('🦅 Twitter: Attempting fetch via Bird (Cookies)...');
        // Dynamic import to avoid circular dep
        const { bird } = await import('../../platforms/bird.js');
        const allTweets: Tweet[] = [];

        for (const username of this.monitorAccounts) {
            try {
                const result = await bird.userTweets(username, 5); // Bird limit is small to avoid rate limits
                if (result.success && result.output) {
                    try {
                        // Bird returns array of tweets
                        const tweets = JSON.parse(result.output);
                        if (Array.isArray(tweets)) {
                            console.log(`🦅 Bird: Fetched ${tweets.length} tweets for @${username}`);
                            tweets.forEach((t: any) => {
                                allTweets.push({
                                    id: t.id || `bird-${Date.now()}-${Math.random()}`,
                                    text: t.text || t.content || '',
                                    authorUsername: username,
                                    createdAt: t.createdAt || t.date || new Date().toISOString(),
                                    metrics: {
                                        likes: t.likes || 0,
                                        retweets: t.retweets || 0,
                                        replies: t.replies || 0
                                    }
                                });
                            });
                        }
                    } catch (e) {
                        console.error(`🦅 Bird: Failed to parse output for @${username}`, e);
                    }
                } else {
                    console.warn(`🦅 Bird: Failed for @${username}: ${result.error}`);
                }
            } catch (e) {
                console.error(`🦅 Bird: Error fetching @${username}`, e);
            }
        }
        return allTweets;
    }

    /**
     * Get recent tweets from monitored accounts
     */
    async getRecentTweets(limit: number = 50): Promise<Tweet[]> {
        // Try Official API first
        if (this.client) {
            try {
                const apiTweets = await this.fetchViaApi(limit);
                if (apiTweets.length > 0) return apiTweets;
            } catch (e) {
                console.warn('🦅 Twitter: API fetch failed, trying Bird...', e);
            }
        } else {
            console.log('🦅 Twitter: Client not configured, trying Bird...');
        }

        // Try Bird Fallback
        const birdTweets = await this.fetchViaBird(limit);
        if (birdTweets.length > 0) {
            return birdTweets.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        }

        return this.getFallbackTweets();
    }

    /**
     * Internal API fetcher (Existing Logic)
     */
    private async fetchViaApi(limit: number): Promise<Tweet[]> {
        const allTweets: Tweet[] = [];

        for (const username of this.monitorAccounts) {
            try {
                console.log(`🦅 Twitter: Fetching for @${username}...`);
                const user = await this.client!.v2.userByUsername(username);
                if (!user.data) {
                    console.warn(`🦅 Twitter: User @${username} not found`);
                    continue;
                }

                console.log(`🦅 Twitter: User ID for @${username} is ${user.data.id}`);
                const tweets = await this.client!.v2.userTimeline(user.data.id, {
                    max_results: Math.min(limit, 100),
                    'tweet.fields': ['created_at', 'public_metrics'],
                    exclude: ['retweets', 'replies']
                });

                console.log(`🦅 Twitter: Fetched ${getTweetCount(tweets)} tweets for @${username}`);

                for await (const tweet of tweets) {
                    allTweets.push({
                        id: tweet.id,
                        text: tweet.text,
                        authorUsername: username,
                        createdAt: tweet.created_at || new Date().toISOString(),
                        metrics: tweet.public_metrics ? {
                            likes: tweet.public_metrics.like_count,
                            retweets: tweet.public_metrics.retweet_count,
                            replies: tweet.public_metrics.reply_count
                        } : undefined
                    });
                }
            } catch (error: any) {
                console.error(`🦅 Twitter: Failed to fetch tweets from @${username}`, error.message || error);
                if (error.data) {
                    // Check for 401/403 and re-throw to trigger fallback
                    if (error.code === 401 || error.code === 403 || (error.data && (error.data.status === 401 || error.data.status === 403))) {
                        throw error;
                    }
                    console.error('🦅 Twitter Error Data:', JSON.stringify(error.data));
                }
            }
        }

        // Helper to count async iterable
        function getTweetCount(tweets: any) {
            // Tweets is a paginator, we can't easily count without consuming, 
            // but 'tweets.meta.result_count' usually exists in v2 response wrapper
            return tweets.meta?.result_count || 'unknown';
        }

        // Sort by date, most recent first
        return allTweets.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    /**
     * Search for BNB Chain related tweets
     */
    async searchBNBChainTweets(limit: number = 20): Promise<Tweet[]> {
        if (!this.client) {
            return [];
        }

        try {
            const searchResult = await this.client.v2.search(
                '#BNBChain OR #BSC OR "BNB Chain" -is:retweet',
                {
                    max_results: Math.min(limit, 100),
                    'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
                    expansions: ['author_id']
                }
            );

            const tweets: Tweet[] = [];
            const users = searchResult.includes?.users || [];

            for await (const tweet of searchResult) {
                const author = users.find(u => u.id === tweet.author_id);
                tweets.push({
                    id: tweet.id,
                    text: tweet.text,
                    authorUsername: author?.username || 'unknown',
                    createdAt: tweet.created_at || new Date().toISOString(),
                    metrics: tweet.public_metrics ? {
                        likes: tweet.public_metrics.like_count,
                        retweets: tweet.public_metrics.retweet_count,
                        replies: tweet.public_metrics.reply_count
                    } : undefined
                });
            }

            return tweets;
        } catch (error) {
            console.error('Twitter: Search failed', error);
            return [];
        }
    }

    /**
     * Fallback tweet data for when API is unavailable
     */
    private getFallbackTweets(): Tweet[] {
        return [
            {
                id: 'fallback-1',
                text: 'BNB Chain continues to lead with innovative DeFi solutions and growing ecosystem.',
                authorUsername: 'BNBCHAIN',
                createdAt: new Date().toISOString()
            },
            {
                id: 'fallback-2',
                text: 'opBNB Layer 2 is processing millions of transactions with sub-second finality.',
                authorUsername: 'BNBCHAIN',
                createdAt: new Date().toISOString()
            }
        ];
    }

    /**
     * Get Twitter knowledge summary
     */
    async getTwitterSummary(): Promise<string> {
        const tweets = await this.getRecentTweets(10);

        if (tweets.length === 0) {
            return 'Twitter: Unable to fetch recent tweets (API may not be configured)';
        }

        let summary = `Recent BNB Chain Tweets:\n\n`;

        tweets.slice(0, 5).forEach((t, i) => {
            const text = t.text.slice(0, 150).replace(/\n/g, ' ');
            summary += `${i + 1}. @${t.authorUsername}: "${text}..."\n`;
            if (t.metrics) {
                summary += `   ❤️ ${t.metrics.likes} | 🔄 ${t.metrics.retweets}\n`;
            }
        });

        return summary;
    }
}

export const twitterFetcher = new TwitterFetcher();
