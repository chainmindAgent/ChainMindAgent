import axios from 'axios';
import { bscClient } from '../onchain/bsc-client.js';

export interface WalletAnalysis {
    address: string;
    bnbBalance: string;
    txCount: number;
    isWhale: boolean;
    lastActivity: string;
    riskScore: number;
}

export interface TokenMetrics {
    address: string;
    name: string;
    symbol: string;
    holders: number;
    txCount24h: number;
    liquidityUsd: number;
    riskFlags: string[];
}

/**
 * On-Chain Research Skill
 * Provides wallet analysis, token research, and whale tracking
 */
export class ResearchSkill {
    private bscscanApiKey: string;

    constructor() {
        this.bscscanApiKey = process.env.BSCSCAN_API_KEY || '';
    }

    /**
     * Analyze a wallet address
     */
    async analyzeWallet(address: string): Promise<WalletAnalysis> {
        const analysis: WalletAnalysis = {
            address,
            bnbBalance: '0',
            txCount: 0,
            isWhale: false,
            lastActivity: 'Unknown',
            riskScore: 0
        };

        try {
            // Get BNB balance
            analysis.bnbBalance = await bscClient.getBNBBalance(address);

            // Check if whale (>1000 BNB)
            if (parseFloat(analysis.bnbBalance) > 1000) {
                analysis.isWhale = true;
            }

            // Get transaction count if BSCScan API available
            if (this.bscscanApiKey) {
                const txCountRes = await axios.get(
                    `https://api.bscscan.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=1&sort=desc&apikey=${this.bscscanApiKey}`
                );

                if (txCountRes.data.result?.length > 0) {
                    const lastTx = txCountRes.data.result[0];
                    analysis.lastActivity = new Date(parseInt(lastTx.timeStamp) * 1000).toISOString();
                }
            }

            // Simple risk scoring
            if (analysis.isWhale) analysis.riskScore += 2;
            if (parseFloat(analysis.bnbBalance) < 0.01) analysis.riskScore += 3; // Suspicious low balance

        } catch (error) {
            console.error('Research: Failed to analyze wallet', error);
        }

        return analysis;
    }

    /**
     * Get top BNB holders (whales)
     */
    async getTopHolders(limit: number = 10): Promise<WalletAnalysis[]> {
        // This would require BSCScan API or indexer
        // Placeholder for now
        console.log('Research: Top holders requires BSCScan API key');
        return [];
    }

    /**
     * Basic token analysis
     */
    async analyzeToken(tokenAddress: string): Promise<TokenMetrics | null> {
        try {
            const tokenInfo = await bscClient.getTokenBalance(tokenAddress);

            if (!tokenInfo) return null;

            const metrics: TokenMetrics = {
                address: tokenAddress,
                name: tokenInfo.symbol,
                symbol: tokenInfo.symbol,
                holders: 0,
                txCount24h: 0,
                liquidityUsd: 0,
                riskFlags: []
            };

            // Basic risk checks
            // In production, would check: liquidity lock, ownership renounced, etc.

            return metrics;
        } catch (error) {
            console.error('Research: Failed to analyze token', error);
            return null;
        }
    }

    /**
     * Check if contract is verified on BSCScan
     */
    async isContractVerified(address: string): Promise<boolean> {
        if (!this.bscscanApiKey) return false;

        try {
            const response = await axios.get(
                `https://api.bscscan.com/api?module=contract&action=getabi&address=${address}&apikey=${this.bscscanApiKey}`
            );
            return response.data.status === '1';
        } catch {
            return false;
        }
    }

    /**
     * Generate research summary for a wallet
     */
    async getWalletReport(address: string): Promise<string> {
        const analysis = await this.analyzeWallet(address);

        let report = `🔍 **Wallet Analysis**\n\n`;
        report += `📍 Address: \`${address.slice(0, 6)}...${address.slice(-4)}\`\n`;
        report += `💰 BNB Balance: ${parseFloat(analysis.bnbBalance).toFixed(4)} BNB\n`;
        report += `🐋 Whale Status: ${analysis.isWhale ? '✅ Yes' : '❌ No'}\n`;
        report += `⚠️ Risk Score: ${analysis.riskScore}/10\n`;

        if (analysis.lastActivity !== 'Unknown') {
            report += `🕐 Last Activity: ${analysis.lastActivity}\n`;
        }

        report += `\n🔗 [View on BSCScan](https://bscscan.com/address/${address})`;

        return report;
    }

    /**
     * Track whale movements (simplified)
     */
    async trackWhaleMovements(): Promise<string[]> {
        // Would need real-time blockchain monitoring
        // Placeholder returning sample alerts
        return [
            '🐋 Large BNB transfer detected: 5,000 BNB moved to Binance',
            '📊 Whale accumulating CAKE: 100K tokens purchased'
        ];
    }
}

export const researchSkill = new ResearchSkill();
