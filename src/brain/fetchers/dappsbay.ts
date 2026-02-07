import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runAnalysis } from '../analysis-runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface DApp {
    name: string;
    description: string;
    category: string;
    url: string;
    verified: boolean;
    riskLevel?: string;
    activeUsers?: string;
}

interface ScrapedData {
    dapps: Array<{
        name: string;
        description: string;
        category: string;
        url: string;
        activeUsers?: string;
        verified: boolean;
        scrapedAt: string;
    }>;
    totalCount: number;
    categories: string[];
    lastUpdated: string;
    source: string;
}

// Path to scraped data JSON
const DATA_FILE = join(__dirname, '..', '..', '..', 'data', 'dappbay_ranking.json');

/**
 * DappsBay Data Fetcher
 * Fetches dApp listings from scraped DappsBay ranking data
 * Uses Python/Playwright to scrape https://dappbay.bnbchain.org/ranking
 */
export class DappsBayFetcher {
    private cachedData: ScrapedData | null = null;
    private cacheTime: Date | null = null;
    private readonly CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

    /**
     * Load scraped data from JSON file
     */
    private loadScrapedData(): ScrapedData | null {
        try {
            if (existsSync(DATA_FILE)) {
                const content = readFileSync(DATA_FILE, 'utf-8');
                const data = JSON.parse(content) as ScrapedData;

                // Check if data is stale (older than 24 hours)
                const lastUpdated = new Date(data.lastUpdated);
                const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);

                if (hoursSinceUpdate > 24) {
                    console.log('   ⚠️ DappsBay data is stale (>24h old)');
                }

                return data;
            }
        } catch (error) {
            console.error('DappsBay: Failed to load scraped data', error);
        }
        return null;
    }



    // ...

    /**
     * Run the Python scraper to refresh data
     */
    async refreshData(): Promise<boolean> {
        console.log('   🔄 Running DappsBay scraper via runner...');

        try {
            const result = await runAnalysis('dappbay');
            if (result.success) {
                console.log('   ✅ DappsBay data refreshed');
                this.cachedData = null; // Clear cache to reload
                return true;
            } else {
                console.error(`   ❌ Scraper failed: ${result.error}`);
                return false;
            }
        } catch (error) {
            console.error('   ❌ Failed to run scraper:', error);
            return false;
        }
    }

    /**
     * Get cached or fresh data
     */
    private getData(): ScrapedData | null {
        // Return cached data if still valid
        if (this.cachedData && this.cacheTime) {
            const elapsed = Date.now() - this.cacheTime.getTime();
            if (elapsed < this.CACHE_DURATION_MS) {
                return this.cachedData;
            }
        }

        // Load from file
        this.cachedData = this.loadScrapedData();
        this.cacheTime = new Date();
        return this.cachedData;
    }

    /**
     * Get all dApps on BNB Chain
     */
    async getDApps(category?: string): Promise<DApp[]> {
        const data = this.getData();

        if (!data || !data.dapps || data.dapps.length === 0) {
            console.log('   ⚠️ No scraped data available, using fallback');
            return this.getFallbackDApps();
        }

        let dapps = data.dapps;

        if (category) {
            dapps = dapps.filter(d => d.category.toLowerCase() === category.toLowerCase());
        }

        return dapps.map(d => ({
            name: d.name,
            description: d.description || '',
            category: d.category,
            url: d.url || '',
            verified: d.verified,
            activeUsers: d.activeUsers
        }));
    }

    /**
     * Get dApp categories
     */
    async getCategories(): Promise<string[]> {
        const data = this.getData();

        if (data && data.categories) {
            return data.categories;
        }

        return ['DeFi', 'NFT', 'GameFi', 'Social', 'AI', 'Tools', 'Infrastructure'];
    }

    /**
     * Get trending dApps (top by each category)
     */
    async getTrendingDApps(limit: number = 10): Promise<DApp[]> {
        const data = this.getData();

        if (!data || !data.dapps) {
            return this.getFallbackDApps().slice(0, limit);
        }

        // Return top dApps (first entries from scraped ranking)
        return data.dapps.slice(0, limit).map(d => ({
            name: d.name,
            description: d.description || '',
            category: d.category,
            url: d.url || '',
            verified: d.verified,
            activeUsers: d.activeUsers
        }));
    }

    /**
     * Fallback dApp data for when scraping hasn't been done
     */
    private getFallbackDApps(): DApp[] {
        return [
            {
                name: 'PancakeSwap',
                description: 'Leading DEX on BNB Chain with AMM, farms, and lottery',
                category: 'DeFi',
                url: 'https://pancakeswap.finance',
                verified: true
            },
            {
                name: 'Venus',
                description: 'Decentralized lending and borrowing protocol',
                category: 'DeFi',
                url: 'https://venus.io',
                verified: true
            },
            {
                name: 'Binance NFT',
                description: 'Official Binance NFT marketplace',
                category: 'NFT',
                url: 'https://www.binance.com/en/nft',
                verified: true
            },
            {
                name: 'Alpaca Finance',
                description: 'Leveraged yield farming protocol',
                category: 'DeFi',
                url: 'https://alpacafinance.org',
                verified: true
            },
            {
                name: 'BNB Chain Bridge',
                description: 'Official cross-chain bridge',
                category: 'Infrastructure',
                url: 'https://www.bnbchain.org/en/bridge',
                verified: true
            },
            {
                name: 'Thena',
                description: 'Ve(3,3) DEX and liquidity layer',
                category: 'DeFi',
                url: 'https://thena.fi',
                verified: true
            },
            {
                name: 'Lista DAO',
                description: 'Liquid staking and CDP protocol',
                category: 'DeFi',
                url: 'https://lista.org',
                verified: true
            }
        ];
    }

    /**
     * Get dApp ecosystem summary
     */
    async getEcosystemSummary(): Promise<string> {
        const data = this.getData();

        if (!data || !data.dapps || data.dapps.length === 0) {
            // Use fallback
            const fallback = this.getFallbackDApps();
            return `BNB Chain dApp Ecosystem:\n- Known verified dApps: ${fallback.length}\n- Top projects: ${fallback.slice(0, 3).map(d => d.name).join(', ')}`;
        }

        let summary = `BNB Chain dApp Ecosystem (from DappsBay Ranking):\n`;
        summary += `- Total dApps tracked: ${data.totalCount}\n`;
        summary += `- Data source: ${data.source}\n`;
        summary += `- Last updated: ${new Date(data.lastUpdated).toLocaleString()}\n\n`;

        // Group by category
        const byCategory: Record<string, typeof data.dapps> = {};
        data.dapps.forEach(d => {
            if (!byCategory[d.category]) byCategory[d.category] = [];
            byCategory[d.category].push(d);
        });

        summary += `Top dApps by Category:\n`;
        for (const [cat, apps] of Object.entries(byCategory).slice(0, 6)) {
            const topApps = apps.slice(0, 3).map(a => {
                const users = a.activeUsers ? ` (${a.activeUsers} users)` : '';
                return `${a.name}${users}`;
            }).join(', ');
            summary += `- ${cat}: ${topApps}\n`;
        }

        return summary;
    }

    /**
     * Get data freshness info
     */
    getDataInfo(): { hasData: boolean; lastUpdated: string | null; count: number } {
        const data = this.getData();
        return {
            hasData: !!data && data.dapps.length > 0,
            lastUpdated: data?.lastUpdated || null,
            count: data?.totalCount || 0
        };
    }
}

export const dappsBayFetcher = new DappsBayFetcher();
