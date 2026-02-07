import axios from 'axios';
import { dataSources } from '../../config.js';

export interface NewsItem {
    title: string;
    summary: string;
    url: string;
    date: string;
    category?: string;
}

/**
 * BNB Chain News Fetcher
 * Fetches news and announcements from official BNB Chain sources
 */
export class BNBChainNewsFetcher {
    private baseUrl: string;
    private blogUrl: string;

    constructor() {
        this.baseUrl = dataSources.bnbChainNews.baseUrl;
        this.blogUrl = dataSources.bnbChainNews.blogUrl;
    }

    /**
     * Fetch latest news from BNB Chain blog
     */
    async getLatestNews(limit: number = 10): Promise<NewsItem[]> {
        try {
            // Try to fetch from blog RSS or API
            const response = await axios.get(`${this.baseUrl}/api/blog/posts`, {
                timeout: 10000,
                params: { limit }
            });

            const posts = response.data?.posts || response.data || [];

            return posts.map((p: any) => ({
                title: p.title,
                summary: p.excerpt || p.summary || p.description,
                url: p.url || `${this.blogUrl}/${p.slug}`,
                date: p.publishedAt || p.date || new Date().toISOString(),
                category: p.category || 'News'
            }));
        } catch (error) {
            console.error('BNBChain News: API unavailable, using fallback sources');
            return this.getFallbackNews();
        }
    }

    /**
     * Get announcements (high priority news)
     */
    async getAnnouncements(): Promise<NewsItem[]> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/announcements`, {
                timeout: 10000
            });

            return response.data?.announcements || [];
        } catch (error) {
            return [];
        }
    }

    /**
     * Fallback news data
     */
    private getFallbackNews(): NewsItem[] {
        return [
            {
                title: 'BNB Chain Ecosystem Growth',
                summary: 'BNB Chain continues to lead in DeFi and dApp adoption with innovative solutions.',
                url: 'https://www.bnbchain.org/en/blog',
                date: new Date().toISOString(),
                category: 'Ecosystem'
            },
            {
                title: 'opBNB Layer 2 Updates',
                summary: 'opBNB continues scaling BNB Chain with enhanced throughput and lower fees.',
                url: 'https://www.bnbchain.org/en/opbnb',
                date: new Date().toISOString(),
                category: 'Technology'
            },
            {
                title: 'BNB Greenfield for Decentralized Storage',
                summary: 'BNB Greenfield brings decentralized storage to the BNB Chain ecosystem.',
                url: 'https://www.bnbchain.org/en/greenfield',
                date: new Date().toISOString(),
                category: 'Technology'
            }
        ];
    }

    /**
     * Get curated list of important BNB Chain resources
     */
    getKeyResources(): { name: string; url: string; description: string }[] {
        return [
            {
                name: 'BNB Chain Documentation',
                url: 'https://docs.bnbchain.org',
                description: 'Official developer documentation'
            },
            {
                name: 'BNBScan',
                url: 'https://bscscan.com',
                description: 'BNB Chain block explorer'
            },
            {
                name: 'opBNB',
                url: 'https://opbnb.bnbchain.org',
                description: 'Layer 2 scaling solution'
            },
            {
                name: 'BNB Greenfield',
                url: 'https://greenfield.bnbchain.org',
                description: 'Decentralized storage network'
            },
            {
                name: 'DappBay',
                url: 'https://dappbay.bnbchain.org',
                description: 'Official dApp discovery platform'
            }
        ];
    }

    /**
     * Get news summary
     */
    async getNewsSummary(): Promise<string> {
        const news = await this.getLatestNews(5);
        const resources = this.getKeyResources();

        let summary = `BNB Chain Updates:\n\n`;

        if (news.length > 0) {
            summary += `Recent News:\n`;
            news.forEach((n, i) => {
                summary += `${i + 1}. ${n.title}\n   ${n.summary?.slice(0, 100)}...\n`;
            });
            summary += '\n';
        }

        summary += `Key Resources:\n`;
        resources.slice(0, 3).forEach(r => {
            summary += `- ${r.name}: ${r.description}\n`;
        });

        return summary;
    }
}

export const bnbChainNewsFetcher = new BNBChainNewsFetcher();
