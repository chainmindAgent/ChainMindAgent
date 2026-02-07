import axios from 'axios';
import { dataSources } from '../../config.js';

export interface YieldOpportunity {
    protocol: string;
    pool: string;
    apy: number;
    tvl: number;
    chain: string;
    token: string;
    riskLevel: 'low' | 'medium' | 'high';
}

export interface ProtocolFees {
    name: string;
    fees24h: number;
    fees7d: number;
    revenue24h: number;
    category: string;
}

export interface TokenPrice {
    symbol: string;
    price: number;
    change24h: number;
    volume24h: number;
}

export interface MarketInsight {
    type: 'bullish' | 'bearish' | 'neutral';
    signal: string;
    data: any;
    timestamp: Date;
}

/**
 * Advanced Analytics Module
 * Provides deep DeFi analysis, yield opportunities, and market insights
 */
export class AdvancedAnalytics {
    private baseUrl: string;
    private yieldsUrl: string = 'https://yields.llama.fi';
    private coinsUrl: string = 'https://coins.llama.fi';

    constructor() {
        this.baseUrl = dataSources.defiLlama.baseUrl;
    }

    /**
     * Get top yield opportunities on BNB Chain
     */
    async getYieldOpportunities(minApy: number = 5, limit: number = 20): Promise<YieldOpportunity[]> {
        try {
            const response = await axios.get(`${this.yieldsUrl}/pools`);
            const pools = response.data.data;

            // Filter for BNB Chain pools with good APY
            const bnbPools = pools
                .filter((p: any) =>
                    (p.chain === 'BSC' || p.chain === 'Binance') &&
                    p.apy > minApy &&
                    p.tvlUsd > 100000 // Min $100k TVL for safety
                )
                .sort((a: any, b: any) => b.apy - a.apy)
                .slice(0, limit);

            return bnbPools.map((p: any) => ({
                protocol: p.project,
                pool: p.symbol,
                apy: p.apy,
                tvl: p.tvlUsd,
                chain: 'BNB Chain',
                token: p.symbol.split('-')[0],
                riskLevel: this.assessRiskLevel(p)
            }));
        } catch (error) {
            console.error('Analytics: Failed to fetch yield opportunities', error);
            return [];
        }
    }

    /**
     * Assess risk level of a yield opportunity
     */
    private assessRiskLevel(pool: any): 'low' | 'medium' | 'high' {
        // High APY = Higher risk
        if (pool.apy > 100) return 'high';
        if (pool.apy > 30) return 'medium';

        // Low TVL = Higher risk
        if (pool.tvlUsd < 1000000) return 'medium';

        // Stablecoin pools are lower risk
        if (pool.stablecoin) return 'low';

        return 'medium';
    }

    /**
     * Get protocol fees and revenue
     */
    async getProtocolFees(limit: number = 10): Promise<ProtocolFees[]> {
        try {
            const response = await axios.get(`${this.baseUrl}/summary/fees?chain=BSC`);
            const protocols = response.data.protocols || [];

            return protocols
                .filter((p: any) => p.total24h > 0)
                .sort((a: any, b: any) => (b.total24h || 0) - (a.total24h || 0))
                .slice(0, limit)
                .map((p: any) => ({
                    name: p.name,
                    fees24h: p.total24h || 0,
                    fees7d: p.total7d || 0,
                    revenue24h: p.revenue24h || 0,
                    category: p.category || 'DeFi'
                }));
        } catch (error) {
            console.error('Analytics: Failed to fetch protocol fees', error);
            return [];
        }
    }

    /**
     * Get BNB token price and metrics
     */
    async getBNBPrice(): Promise<TokenPrice | null> {
        try {
            const response = await axios.get(
                `${this.coinsUrl}/prices/current/bsc:0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c`
            );
            const coin = response.data.coins?.['bsc:0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'];

            if (!coin) return null;

            return {
                symbol: 'BNB',
                price: coin.price,
                change24h: coin.change24h || 0,
                volume24h: 0 // Volume not available from this endpoint
            };
        } catch (error) {
            console.error('Analytics: Failed to fetch BNB price', error);
            return null;
        }
    }

    /**
     * Get stablecoin metrics on BNB Chain
     */
    async getStablecoinMetrics(): Promise<{
        total: number;
        breakdown: { name: string; amount: number }[];
    }> {
        try {
            const response = await axios.get(`${this.baseUrl}/stablecoins/chains`);
            const chains = response.data;

            const bsc = chains.find((c: any) => c.name === 'BSC');
            if (!bsc) return { total: 0, breakdown: [] };

            // Get stablecoin breakdown
            const stableResponse = await axios.get(`${this.baseUrl}/stablecoins`);
            const stables = stableResponse.data.stablecoins || [];

            const bnbStables = stables
                .filter((s: any) => s.chainBalances?.['BSC'])
                .map((s: any) => ({
                    name: s.name,
                    amount: s.chainBalances['BSC']?.current || 0
                }))
                .filter((s: any) => s.amount > 0)
                .sort((a: any, b: any) => b.amount - a.amount)
                .slice(0, 5);

            return {
                total: bsc.totalStable || 0,
                breakdown: bnbStables
            };
        } catch (error) {
            console.error('Analytics: Failed to fetch stablecoin metrics', error);
            return { total: 0, breakdown: [] };
        }
    }

    /**
     * Generate market insights based on data analysis
     */
    async generateInsights(): Promise<MarketInsight[]> {
        const insights: MarketInsight[] = [];

        try {
            // TVL trend analysis
            const tvlResponse = await axios.get(
                `${this.baseUrl}/v2/historicalChainTvl/BSC`
            );
            const history = tvlResponse.data;

            if (history.length >= 7) {
                const recent = history.slice(-7);
                const weekAgo = recent[0].tvl;
                const now = recent[recent.length - 1].tvl;
                const change = ((now - weekAgo) / weekAgo) * 100;

                if (change > 5) {
                    insights.push({
                        type: 'bullish',
                        signal: `BNB Chain TVL up ${change.toFixed(1)}% this week`,
                        data: { weeklyChange: change },
                        timestamp: new Date()
                    });
                } else if (change < -5) {
                    insights.push({
                        type: 'bearish',
                        signal: `BNB Chain TVL down ${Math.abs(change).toFixed(1)}% this week`,
                        data: { weeklyChange: change },
                        timestamp: new Date()
                    });
                }
            }

            // Yield opportunity alert
            const yields = await this.getYieldOpportunities(20, 5);
            const highYield = yields.filter(y => y.apy > 50 && y.riskLevel !== 'high');
            if (highYield.length > 0) {
                insights.push({
                    type: 'neutral',
                    signal: `${highYield.length} yield opportunities above 50% APY with moderate risk`,
                    data: { opportunities: highYield },
                    timestamp: new Date()
                });
            }

        } catch (error) {
            console.error('Analytics: Failed to generate insights', error);
        }

        return insights;
    }

    /**
     * Get comprehensive analytics summary for posting
     */
    async getAnalyticsSummary(): Promise<string> {
        const [yields, fees, bnbPrice, stables, insights] = await Promise.allSettled([
            this.getYieldOpportunities(10, 5),
            this.getProtocolFees(5),
            this.getBNBPrice(),
            this.getStablecoinMetrics(),
            this.generateInsights()
        ]);

        let summary = '📊 **BNB Chain Advanced Analytics**\n\n';

        // BNB Price
        if (bnbPrice.status === 'fulfilled' && bnbPrice.value) {
            const p = bnbPrice.value;
            const change = p.change24h > 0 ? `+${p.change24h.toFixed(2)}%` : `${p.change24h.toFixed(2)}%`;
            summary += `💰 **BNB:** $${p.price.toFixed(2)} (${change})\n\n`;
        }

        // Stablecoin metrics
        if (stables.status === 'fulfilled' && stables.value.total > 0) {
            const s = stables.value;
            summary += `🪙 **Stablecoins:** $${(s.total / 1e9).toFixed(2)}B total\n`;
            s.breakdown.slice(0, 3).forEach(stable => {
                summary += `   • ${stable.name}: $${(stable.amount / 1e6).toFixed(0)}M\n`;
            });
            summary += '\n';
        }

        // Top yield opportunities
        if (yields.status === 'fulfilled' && yields.value.length > 0) {
            summary += `🌾 **Top Yield Opportunities:**\n`;
            yields.value.slice(0, 3).forEach(y => {
                const risk = y.riskLevel === 'low' ? '🟢' : y.riskLevel === 'medium' ? '🟡' : '🔴';
                summary += `   ${risk} ${y.protocol} (${y.pool}): ${y.apy.toFixed(1)}% APY\n`;
            });
            summary += '\n';
        }

        // Protocol fees
        if (fees.status === 'fulfilled' && fees.value.length > 0) {
            summary += `💸 **Top Protocols by Fees (24h):**\n`;
            fees.value.slice(0, 3).forEach(f => {
                summary += `   • ${f.name}: $${(f.fees24h / 1000).toFixed(1)}K\n`;
            });
            summary += '\n';
        }

        // Insights
        if (insights.status === 'fulfilled' && insights.value.length > 0) {
            summary += `📈 **Market Insights:**\n`;
            insights.value.forEach(i => {
                const icon = i.type === 'bullish' ? '🟢' : i.type === 'bearish' ? '🔴' : '🟡';
                summary += `   ${icon} ${i.signal}\n`;
            });
        }

        return summary;
    }
}

export const advancedAnalytics = new AdvancedAnalytics();
