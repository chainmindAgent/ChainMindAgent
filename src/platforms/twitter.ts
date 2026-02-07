import { TwitterApi, TweetV2PostTweetResult } from 'twitter-api-v2';
import { twitterConfig } from '../config.js';

export interface TweetResult {
    success: boolean;
    tweetId?: string;
    error?: string;
}

/**
 * Twitter/X Platform Client
 * Handles posting and interaction on X
 */
export class TwitterClient {
    private client: TwitterApi | null = null;
    private postsToday: number = 0;
    private lastPostDate: string = '';

    constructor() {
        this.initClient();
    }

    private initClient() {
        if (twitterConfig.apiKey && twitterConfig.accessToken) {
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
     * Check if client is configured
     */
    isConfigured(): boolean {
        return this.client !== null;
    }

    /**
     * Post a tweet
     */
    async tweet(text: string): Promise<TweetResult> {
        if (!this.client) {
            return { success: false, error: 'Twitter client not configured' };
        }

        // Ensure text is within limit
        const tweetText = text.slice(0, 280);

        try {
            const result: TweetV2PostTweetResult = await this.client.v2.tweet(tweetText);
            this.trackPost();

            return {
                success: true,
                tweetId: result.data.id
            };
        } catch (error: any) {
            console.error('Twitter: Failed to post', error);
            return {
                success: false,
                error: error.message || String(error)
            };
        }
    }

    /**
     * Reply to a tweet
     */
    async reply(tweetId: string, text: string): Promise<TweetResult> {
        if (!this.client) {
            return { success: false, error: 'Twitter client not configured' };
        }

        const replyText = text.slice(0, 280);

        try {
            const result = await this.client.v2.reply(replyText, tweetId);
            this.trackPost();

            return {
                success: true,
                tweetId: result.data.id
            };
        } catch (error: any) {
            console.error('Twitter: Failed to reply', error);
            return {
                success: false,
                error: error.message || String(error)
            };
        }
    }

    /**
     * Like a tweet
     */
    async like(tweetId: string): Promise<boolean> {
        if (!this.client) return false;

        try {
            const me = await this.client.v2.me();
            await this.client.v2.like(me.data.id, tweetId);
            return true;
        } catch (error) {
            console.error('Twitter: Failed to like', error);
            return false;
        }
    }

    /**
     * Retweet
     */
    async retweet(tweetId: string): Promise<boolean> {
        if (!this.client) return false;

        try {
            const me = await this.client.v2.me();
            await this.client.v2.retweet(me.data.id, tweetId);
            return true;
        } catch (error) {
            console.error('Twitter: Failed to retweet', error);
            return false;
        }
    }

    /**
     * Get mentions
     */
    async getMentions(limit: number = 10): Promise<any[]> {
        if (!this.client) return [];

        try {
            const me = await this.client.v2.me();
            const mentions = await this.client.v2.userMentionTimeline(me.data.id, {
                max_results: Math.min(limit, 100),
                'tweet.fields': ['created_at', 'public_metrics', 'conversation_id']
            });

            const tweets = [];
            for await (const tweet of mentions) {
                tweets.push(tweet);
                if (tweets.length >= limit) break;
            }

            return tweets;
        } catch (error) {
            console.error('Twitter: Failed to get mentions', error);
            return [];
        }
    }

    /**
     * Get authenticated user info
     */
    async getMe(): Promise<{ id: string; username: string; name: string } | null> {
        if (!this.client) return null;

        try {
            const me = await this.client.v2.me();
            return {
                id: me.data.id,
                username: me.data.username,
                name: me.data.name
            };
        } catch (error) {
            console.error('Twitter: Failed to get user info', error);
            return null;
        }
    }

    /**
     * Track daily posts for rate limiting
     */
    private trackPost() {
        const today = new Date().toISOString().split('T')[0];
        if (this.lastPostDate !== today) {
            this.postsToday = 0;
            this.lastPostDate = today;
        }
        this.postsToday++;
    }

    /**
     * Get posts made today
     */
    getPostsToday(): number {
        const today = new Date().toISOString().split('T')[0];
        if (this.lastPostDate !== today) {
            return 0;
        }
        return this.postsToday;
    }
}

export const twitter = new TwitterClient();
