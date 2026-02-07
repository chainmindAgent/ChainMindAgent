import axios from 'axios';
import { dataSources } from '../../config.js';

export interface ChainTVL {
    name: string;
    tvl: number;
    change24h: number;
    change7d: number;
    protocols: number;
    rank: number;
}

export interface ProtocolData {
    name: string;
    tvl: number;
    chain: string;
    category: string;
    change24h: number;
    change7d: number;
    url?: string;
    symbol?: string;
}

export interface DEXVolume {
    name: string;
    volume24h: number;
    volume7d: number;
    change24h: number;
}

export interface YieldPool {
    protocol: string;
    symbol: string;
    apy: number;
    tvl: number;
    chain: string;
    pool: string;
}

export interface StablecoinData {
    symbol: string;
    peggedUSD: number;
    change24h: number;
    chain: string;
}

export interface BNBPrice {
    price: number;
    change24h: number;
    marketCap: number;
}

/**
 * Enhanced DefiLlama Data Fetcher
 * Comprehensive DeFi metrics for BNB Chain
 */
export class DefiLlamaFetcher {
    private baseUrl: string;

    constructor() {
        this.baseUrl = dataSources.defiLlama.baseUrl;
    }

    /**
     * Get BNB Chain TVL with ranking
     */
    async getBNBChainTVL(): Promise<ChainTVL | null> {
        try {
            const response = await axios.get(`${this.baseUrl}/v2/chains`);
            const chains = response.data;

            const sortedChains = [...chains].sort((a: any, b: any) => (b.tvl || 0) - (a.tvl || 0));
            const bnbIndex = sortedChains.findIndex((c: any) =>
                c.name === 'BSC' || c.name === 'BNB' || c.name === 'BNB Chain' || c.gecko_id === 'binancecoin'
            );

            const bnbChain = sortedChains[bnbIndex];
            if (!bnbChain) return null;

            return {
                name: 'BNB Chain',
                tvl: bnbChain.tvl,
                change24h: bnbChain.change_1d || 0,
                change7d: bnbChain.change_7d || 0,
                protocols: bnbChain.protocols || 0,
                rank: bnbIndex + 1
            };
        } catch (error) {
            console.error('DefiLlama: Failed to fetch chain TVL', error);
            return null;
        }
    }

    /**
     * Get top protocols on BNB Chain with detailed info
     */
    async getTopProtocols(limit: number = 20): Promise<ProtocolData[]> {
        try {
            const response = await axios.get(`${this.baseUrl}/protocols`);
            const protocols = response.data;

            const bnbProtocols = protocols
                .filter((p: any) =>
                    p.chains?.includes('BSC') ||
                    p.chains?.includes('Binance') ||
                    p.chain === 'BSC'
                )
                .sort((a: any, b: any) => (b.tvl || 0) - (a.tvl || 0))
                .slice(0, limit);

            return bnbProtocols.map((p: any) => ({
                name: p.name,
                tvl: p.tvl || 0,
                chain: 'BNB Chain',
                category: p.category || 'Unknown',
                change24h: p.change_1d || 0,
                change7d: p.change_7d || 0,
                url: p.url,
                symbol: p.symbol
            }));
        } catch (error) {
            console.error('DefiLlama: Failed to fetch protocols', error);
            return [];
        }
    }

    /**
     * Get DEX trading volumes on BNB Chain
     */
    async getDEXVolumes(limit: number = 10): Promise<DEXVolume[]> {
        try {
            const response = await axios.get(`https://api.llama.fi/overview/dexs/BSC?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`);
            const data = response.data;

            const dexes = data.protocols || [];

            return dexes.slice(0, limit).map((d: any) => ({
                name: d.name || d.displayName,
                volume24h: d.total24h || d.dailyVolume || 0,
                volume7d: d.total7d || d.weeklyVolume || 0,
                change24h: d.change_1d || 0
            }));
        } catch (error) {
            console.error('DefiLlama: Failed to fetch DEX volumes', error);
            return this.getFallbackDEXVolumes();
        }
    }

    /**
     * Get yield opportunities on BNB Chain
     */
    async getYieldPools(minTVL: number = 1000000, limit: number = 15): Promise<YieldPool[]> {
        try {
            const response = await axios.get(`https://yields.llama.fi/pools`);
            const pools = response.data.data;

            const bnbPools = pools
                .filter((p: any) =>
                    (p.chain === 'BSC' || p.chain === 'Binance') &&
                    p.tvlUsd >= minTVL &&
                    p.apy > 0 &&
                    p.apy < 1000 // Filter unrealistic APYs
                )
                .sort((a: any, b: any) => b.apy - a.apy)
                .slice(0, limit);

            return bnbPools.map((p: any) => ({
                protocol: p.project,
                symbol: p.symbol,
                apy: p.apy,
                tvl: p.tvlUsd,
                chain: 'BNB Chain',
                pool: p.pool
            }));
        } catch (error) {
            console.error('DefiLlama: Failed to fetch yield pools', error);
            return [];
        }
    }

    /**
     * Get stablecoin metrics on BNB Chain
     */
    async getStablecoins(): Promise<StablecoinData[]> {
        try {
            const response = await axios.get(`https://stablecoins.llama.fi/stablecoinchains`);
            const chains = response.data;

            const bnbData = chains.find((c: any) => c.name === 'BSC' || c.gecko_id === 'binancecoin');
            if (!bnbData) return [];

            // Get detailed stablecoin breakdown
            const detailResponse = await axios.get(`https://stablecoins.llama.fi/stablecoins?includePrices=true`);
            const stablecoins = detailResponse.data.peggedAssets || [];

            return stablecoins
                .filter((s: any) => s.chains?.includes('BSC'))
                .slice(0, 10)
                .map((s: any) => ({
                    symbol: s.symbol,
                    peggedUSD: s.circulating?.peggedUSD || 0,
                    change24h: s.change_1d || 0,
                    chain: 'BNB Chain'
                }));
        } catch (error) {
            console.error('DefiLlama: Failed to fetch stablecoins', error);
            return [];
        }
    }

    /**
     * Get BNB token price
     */
    async getBNBPrice(): Promise<BNBPrice | null> {
        try {
            const response = await axios.get(`https://coins.llama.fi/prices/current/bsc:0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c`);
            const data = response.data.coins['bsc:0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'];

            return {
                price: data.price,
                change24h: data.change24h || 0,
                marketCap: data.mcap || 0
            };
        } catch (error) {
            // Fallback to CoinGecko-style endpoint
            try {
                const fallback = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd&include_24hr_change=true');
                return {
                    price: fallback.data.binancecoin.usd,
                    change24h: fallback.data.binancecoin.usd_24h_change || 0,
                    marketCap: 0
                };
            } catch {
                return null;
            }
        }
    }

    /**
     * Get historical TVL for BNB Chain
     */
    async getTVLHistory(days: number = 30): Promise<{ date: string; tvl: number }[]> {
        try {
            const response = await axios.get(`${this.baseUrl}/v2/historicalChainTvl/BSC`);
            const history = response.data;
            const recent = history.slice(-days);

            return recent.map((item: any) => ({
                date: new Date(item.date * 1000).toISOString().split('T')[0],
                tvl: item.tvl
            }));
        } catch (error) {
            console.error('DefiLlama: Failed to fetch TVL history', error);
            return [];
        }
    }

    /**
     * Get comprehensive DeFi metrics summary
     */
    async getMetricsSummary(): Promise<string> {
        const [chainTVL, protocols, history] = await Promise.all([
            this.getBNBChainTVL(),
            this.getTopProtocols(5),
            this.getTVLHistory(7)
        ]);

        if (!chainTVL) {
            return 'Unable to fetch BNB Chain metrics';
        }

        const tvlBillions = (chainTVL.tvl / 1e9).toFixed(2);
        const change24h = chainTVL.change24h > 0 ? `+${chainTVL.change24h.toFixed(2)}%` : `${chainTVL.change24h.toFixed(2)}%`;
        const change7d = chainTVL.change7d > 0 ? `+${chainTVL.change7d.toFixed(2)}%` : `${chainTVL.change7d.toFixed(2)}%`;

        let summary = `📊 BNB Chain DeFi Metrics:\n`;
        summary += `- TVL: $${tvlBillions}B (${change24h} 24h, ${change7d} 7d)\n`;
        summary += `- Rank: #${chainTVL.rank} by TVL\n`;
        summary += `- Active Protocols: ${chainTVL.protocols}\n\n`;

        if (protocols.length > 0) {
            summary += `🏆 Top Protocols:\n`;
            protocols.forEach((p, i) => {
                const tvlM = (p.tvl / 1e6).toFixed(1);
                const pChange = p.change24h > 0 ? `+${p.change24h.toFixed(1)}%` : `${p.change24h.toFixed(1)}%`;
                summary += `${i + 1}. ${p.name} - $${tvlM}M (${pChange}) [${p.category}]\n`;
            });
        }

        return summary;
    }

    /**
     * Get comprehensive data for AI training
     */
    async getTrainingData(): Promise<{
        tvl: ChainTVL | null;
        protocols: ProtocolData[];
        dexVolumes: DEXVolume[];
        yields: YieldPool[];
        stables: StablecoinData[];
        bnbPrice: BNBPrice | null;
    }> {
        console.log('📡 Fetching comprehensive DeFi data from DefiLlama...');

        const [tvl, protocols, dexVolumes, yields, stables, bnbPrice] = await Promise.allSettled([
            this.getBNBChainTVL(),
            this.getTopProtocols(20),
            this.getDEXVolumes(10),
            this.getYieldPools(100000, 15),
            this.getStablecoins(),
            this.getBNBPrice()
        ]);

        return {
            tvl: tvl.status === 'fulfilled' ? tvl.value : null,
            protocols: protocols.status === 'fulfilled' ? protocols.value : [],
            dexVolumes: dexVolumes.status === 'fulfilled' ? dexVolumes.value : [],
            yields: yields.status === 'fulfilled' ? yields.value : [],
            stables: stables.status === 'fulfilled' ? stables.value : [],
            bnbPrice: bnbPrice.status === 'fulfilled' ? bnbPrice.value : null
        };
    }

    /**
     * Get simplifed TVL string for content generation
     */
    async getTVL(): Promise<string> {
        const data = await this.getBNBChainTVL();
        if (!data) return "Data Unavailable";
        return `$${(data.tvl / 1e9).toFixed(2)}B (Rank #${data.rank})`;
    }

    /**
     * Get revenue data
     */
    async getRevenue(): Promise<string> {
        try {
            // Using dailyFees as a proxy for activity/revenue if specific revenue endpoint is complex
            // or fetch from /overview/fees/bsc
            const response = await axios.get('https://api.llama.fi/overview/fees/bsc?dataType=dailyFees&excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true');
            const data = response.data;
            if (data && data.total24h) {
                return `$${(data.total24h / 1000).toFixed(1)}K (24h Fees)`;
            }
            return "Data Unavailable";
        } catch (e) {
            return "Data Unavailable";
        }
    }

    /**
     * Fallback DEX volumes
     */
    private getFallbackDEXVolumes(): DEXVolume[] {
        return [
            { name: 'PancakeSwap', volume24h: 500000000, volume7d: 3500000000, change24h: 5.2 },
            { name: 'Uniswap', volume24h: 50000000, volume7d: 350000000, change24h: 2.1 },
            { name: 'DODO', volume24h: 30000000, volume7d: 210000000, change24h: -1.5 }
        ];
    }
}

export const defiLlamaFetcher = new DefiLlamaFetcher();
