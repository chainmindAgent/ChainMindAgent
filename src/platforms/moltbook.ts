import axios, { AxiosInstance } from 'axios';
import { moltbookConfig } from '../config.js';

export interface MoltbookPost {
    submolt: string;
    title: string;
    content?: string;
    url?: string;
}

export interface PostResult {
    success: boolean;
    postId?: string;
    error?: string;
}

export interface AgentStatus {
    claimed: boolean;
    claimUrl?: string;
    name: string;
    profileUrl: string;
}

/**
 * Moltbook API Client
 * Integrates with Moltbook social network for AI agents
 */
export class MoltbookClient {
    private client: AxiosInstance;
    private postsToday: number = 0;
    private lastPostDate: string = '';

    constructor() {
        this.client = axios.create({
            baseURL: moltbookConfig.baseUrl,
            headers: {
                'Authorization': `Bearer ${moltbookConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });
    }

    /**
     * Check agent claim status
     */
    async checkStatus(): Promise<AgentStatus> {
        try {
            const response = await this.client.get('/agents/status');
            const data = response.data;

            // API returns: { status: "claimed", agent: { name: "...", ... }, ... }
            const isClaimed = data.status === 'claimed' || data.claimed === true;
            const agentName = data.agent?.name || data.name || moltbookConfig.agentName;

            return {
                claimed: isClaimed,
                claimUrl: data.claim_url || data.agent?.claim_url,
                name: agentName,
                profileUrl: data.agent?.profile_url || data.profile_url || moltbookConfig.profileUrl
            };
        } catch (error) {
            console.error('Moltbook: Failed to check status', error);
            return {
                claimed: false,
                name: moltbookConfig.agentName,
                profileUrl: moltbookConfig.profileUrl
            };
        }
    }

    /**
     * Heartbeat - check for notifications and engagement opportunities
     */
    async heartbeat(): Promise<{
        notifications: number;
        mentions: any[];
        trending: any[];
    }> {
        try {
            // Check for mentions/replies
            const notificationsRes = await this.client.get('/agents/notifications');
            const notifications = notificationsRes.data?.notifications || [];

            // Check trending posts
            const trendingRes = await this.client.get('/posts?sort=hot&limit=5');
            const trending = trendingRes.data?.posts || [];

            // Get mentions
            const mentions = notifications.filter((n: any) => n.type === 'mention' || n.type === 'reply');

            if (mentions.length > 0) {
                console.log(`   📬 ${mentions.length} new mentions`);
            }

            return {
                notifications: notifications.length,
                mentions,
                trending
            };
        } catch (error: any) {
            if (error.response?.status === 404) {
                // Silently ignore 404 (API not ready)
            } else {
                console.error('Moltbook: Heartbeat failed', error.message);
            }
            return { notifications: 0, mentions: [], trending: [] };
        }
    }

    /**
     * Create a text post
     */
    async post(postData: MoltbookPost): Promise<PostResult> {
        try {
            const response = await this.client.post('/posts', {
                submolt: postData.submolt,
                title: postData.title,
                content: postData.content,
                url: postData.url
            });

            this.trackPost();

            return {
                success: true,
                postId: response.data?.post?.id
            };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                return {
                    success: false,
                    error: error.response?.data?.message || error.message
                };
            }
            return { success: false, error: String(error) };
        }
    }

    /**
     * Create a link post
     */
    async postLink(submolt: string, title: string, url: string): Promise<PostResult> {
        return this.post({ submolt, title, url });
    }

    /**
     * Get the feed
     */
    async getFeed(sort: 'hot' | 'new' | 'top' | 'rising' = 'hot', limit: number = 25): Promise<any[]> {
        try {
            const response = await this.client.get(`/posts?sort=${sort}&limit=${limit}`);
            return response.data?.posts || [];
        } catch (error) {
            console.error('Moltbook: Failed to get feed', error);
            return [];
        }
    }

    /**
     * Get posts from a specific submolt
     */
    async getSubmoltPosts(submolt: string, sort: 'hot' | 'new' = 'hot'): Promise<any[]> {
        try {
            const response = await this.client.get(`/submolts/${submolt}/feed?sort=${sort}`);
            return response.data?.posts || [];
        } catch (error) {
            console.error(`Moltbook: Failed to get posts from ${submolt}`, error);
            return [];
        }
    }

    /**
     * Comment on a post
     */
    async comment(postId: string, content: string): Promise<PostResult> {
        try {
            const response = await this.client.post(`/posts/${postId}/comments`, { content });
            return {
                success: true,
                postId: response.data?.comment?.id
            };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                return {
                    success: false,
                    error: error.response?.data?.message || error.message
                };
            }
            return { success: false, error: String(error) };
        }
    }

    /**
     * Upvote a post
     */
    async upvote(postId: string): Promise<boolean> {
        try {
            await this.client.post(`/posts/${postId}/upvote`);
            return true;
        } catch (error) {
            console.error('Moltbook: Upvote failed', error);
            return false;
        }
    }

    /**
     * Search posts semantically
     */
    async search(query: string, type: 'all' | 'posts' | 'comments' = 'all'): Promise<any[]> {
        try {
            const response = await this.client.get('/search', {
                params: { q: query, type }
            });
            return response.data?.results || [];
        } catch (error) {
            console.error('Moltbook: Search failed', error);
            return [];
        }
    }

    /**
     * Get my profile
     */
    async getProfile(): Promise<any> {
        try {
            const response = await this.client.get('/agents/profile');
            return response.data;
        } catch (error) {
            console.error('Moltbook: Failed to get profile', error);
            return null;
        }
    }

    /**
     * Update profile
     */
    async updateProfile(bio: string): Promise<boolean> {
        try {
            await this.client.put('/agents/profile', { bio });
            return true;
        } catch (error) {
            console.error('Moltbook: Failed to update profile', error);
            return false;
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

export const moltbook = new MoltbookClient();
