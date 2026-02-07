import axios from 'axios';

export interface NewsArticle {
    title: string;
    summary: string;
    url: string;
    date: string;
    category: string;
}

export interface DappBayProject {
    name: string;
    description: string;
    category: string;
    url: string;
    isNew: boolean;
    tags: string[];
}

/**
 * Web Browser Skill for ChainMindX
 * Fetches live data from BNB Chain websites
 */
export class WebBrowserFetcher {

    /**
     * Fetch latest news from BNB Chain blog API/RSS
     */
    async fetchBNBChainNews(): Promise<NewsArticle[]> {
        const articles: NewsArticle[] = [];

        try {
            // Try BNB Chain blog API
            const response = await axios.get('https://www.bnbchain.org/api/blog/posts', {
                timeout: 10000,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'ChainMindX/2.0 (BNB Chain Knowledge Agent)'
                }
            });

            const posts = response.data?.posts || response.data?.data || response.data || [];

            for (const post of posts.slice(0, 10)) {
                articles.push({
                    title: post.title || post.name,
                    summary: post.excerpt || post.description || post.summary || '',
                    url: post.url || `https://www.bnbchain.org/en/blog/${post.slug}`,
                    date: post.publishedAt || post.date || new Date().toISOString(),
                    category: post.category || post.tags?.[0] || 'News'
                });
            }
        } catch (error) {
            console.log('WebBrowser: BNB Chain API unavailable, using fallback...');
            return this.getFallbackNews();
        }

        return articles;
    }

    /**
     * Fetch trending projects from DappsBay
     */
    async fetchDappsBayProjects(): Promise<DappBayProject[]> {
        const projects: DappBayProject[] = [];

        try {
            // DappsBay project list
            const response = await axios.get('https://dappbay.bnbchain.org/api/projects', {
                timeout: 10000,
                headers: {
                    'Accept': 'application/json'
                }
            });

            const data = response.data?.data || response.data?.projects || response.data || [];

            for (const project of data.slice(0, 20)) {
                projects.push({
                    name: project.name || project.title,
                    description: project.description || project.tagline || '',
                    category: project.category || project.type || 'DeFi',
                    url: project.website || project.url || '',
                    isNew: project.isNew || project.featured || false,
                    tags: project.tags || []
                });
            }
        } catch (error) {
            console.log('WebBrowser: DappsBay API unavailable, using fallback...');
            return this.getFallbackProjects();
        }

        return projects;
    }

    /**
     * Fetch ecosystem updates and announcements
     */
    async fetchEcosystemUpdates(): Promise<string> {
        const [news, projects] = await Promise.allSettled([
            this.fetchBNBChainNews(),
            this.fetchDappsBayProjects()
        ]);

        let updates = '📰 **BNB Chain Ecosystem Updates**\n\n';

        // News section
        if (news.status === 'fulfilled' && news.value.length > 0) {
            updates += '**Latest News:**\n';
            news.value.slice(0, 5).forEach((article, i) => {
                updates += `${i + 1}. ${article.title}\n`;
                if (article.summary) {
                    updates += `   ${article.summary.substring(0, 100)}...\n`;
                }
                updates += `   🔗 ${article.url}\n\n`;
            });
        }

        // New projects section
        if (projects.status === 'fulfilled' && projects.value.length > 0) {
            const newProjects = projects.value.filter(p => p.isNew);
            if (newProjects.length > 0) {
                updates += '\n**New Projects:**\n';
                newProjects.slice(0, 5).forEach(project => {
                    updates += `• ${project.name} - ${project.description.substring(0, 80)}...\n`;
                });
            }
        }

        return updates;
    }

    /**
     * Search for specific topic across BNB Chain resources
     */
    async searchTopic(query: string): Promise<string> {
        let results = `🔍 Search results for "${query}":\n\n`;

        // Search news
        const news = await this.fetchBNBChainNews();
        const relevantNews = news.filter(n =>
            n.title.toLowerCase().includes(query.toLowerCase()) ||
            n.summary.toLowerCase().includes(query.toLowerCase())
        );

        if (relevantNews.length > 0) {
            results += '**Related Articles:**\n';
            relevantNews.slice(0, 3).forEach(n => {
                results += `• ${n.title}\n  ${n.url}\n`;
            });
        }

        // Search projects
        const projects = await this.fetchDappsBayProjects();
        const relevantProjects = projects.filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.description.toLowerCase().includes(query.toLowerCase()) ||
            p.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
        );

        if (relevantProjects.length > 0) {
            results += '\n**Related Projects:**\n';
            relevantProjects.slice(0, 3).forEach(p => {
                results += `• ${p.name} (${p.category}) - ${p.description.substring(0, 50)}...\n`;
            });
        }

        return results;
    }

    /**
     * Fallback news when API is unavailable
     */
    private getFallbackNews(): NewsArticle[] {
        return [
            {
                title: 'Good Vibes Only: OpenClaw Edition - $100k Prize Pool',
                summary: 'Build fast using AI, prove it onchain with real transactions. AI-first vibe coding sprint.',
                url: 'https://www.bnbchain.org/en/blog/win-a-share-of-100k-with-good-vibes-only-openclaw-edition',
                date: '2026-02-05',
                category: 'Community'
            },
            {
                title: 'ERC-8004: Making Agent Identity Practical on BNB Chain',
                summary: 'Autonomous agents get verifiable, portable identity with behavior verified onchain.',
                url: 'https://www.bnbchain.org/en/blog/making-agent-identity-practical-with-erc-8004-on-bnb-chain',
                date: '2026-02-04',
                category: 'Infrastructure'
            },
            {
                title: 'Beyond the Monolith: Architecting the Autonomous Agent Economy',
                summary: 'BNB Chain Agentic Stack for trustless agent-to-agent coordination with BAP-578.',
                url: 'https://www.bnbchain.org/en/blog/beyond-the-monolith-architecting-the-autonomous-agent-economy',
                date: '2026-02-04',
                category: 'Infrastructure'
            },
            {
                title: 'BNB Chain Weekly Ecosystem Report',
                summary: 'Key metrics, DeFi updates, and ecosystem milestones. BSC: 2.5M+ daily active users.',
                url: 'https://www.bnbchain.org/en/blog',
                date: '2026-02-01',
                category: 'Ecosystem'
            }
        ];
    }

    /**
     * Fallback projects when API is unavailable
     */
    private getFallbackProjects(): DappBayProject[] {
        return [
            {
                name: 'PancakeSwap',
                description: 'Leading DEX on BNB Chain with AMM, farms, lottery, and perpetuals',
                category: 'DeFi',
                url: 'https://pancakeswap.finance',
                isNew: false,
                tags: ['DEX', 'AMM', 'Yield']
            },
            {
                name: 'Venus Protocol',
                description: 'Decentralized money market and stablecoin protocol',
                category: 'DeFi',
                url: 'https://venus.io',
                isNew: false,
                tags: ['Lending', 'Borrowing', 'Stablecoin']
            },
            {
                name: 'opBNB',
                description: 'Layer 2 scaling solution for BNB Chain using optimistic rollups',
                category: 'Infrastructure',
                url: 'https://opbnb.bnbchain.org',
                isNew: true,
                tags: ['L2', 'Scaling', 'Rollup']
            },
            {
                name: 'BNB Greenfield',
                description: 'Decentralized data storage network with data ownership',
                category: 'Infrastructure',
                url: 'https://greenfield.bnbchain.org',
                isNew: true,
                tags: ['Storage', 'Data', 'Web3']
            },
            {
                name: 'Lista DAO',
                description: 'Liquid staking and stablecoin protocol for BNB',
                category: 'DeFi',
                url: 'https://lista.org',
                isNew: true,
                tags: ['Staking', 'LSD', 'Stablecoin']
            }
        ];
    }
}

export const webBrowserFetcher = new WebBrowserFetcher();
