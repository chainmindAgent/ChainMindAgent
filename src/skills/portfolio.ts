import { bscClient } from '../onchain/bsc-client.js';
import { advancedAnalytics } from '../brain/fetchers/advanced-analytics.js';

export interface PortfolioAsset {
    symbol: string;
    balance: string;
    valueUsd: number;
    allocation: number; // Percentage
    chain: string;
}

export interface PortfolioSummary {
    totalValueUsd: number;
    assets: PortfolioAsset[];
    lastUpdated: Date;
}

export interface RebalanceAction {
    action: 'buy' | 'sell';
    asset: string;
    amount: string;
    reason: string;
}

/**
 * Portfolio Management Skill
 * Tracks holdings, calculates performance, and suggests rebalancing
 */
export class PortfolioSkill {
    private targetAllocations: Record<string, number> = {
        'BNB': 40,
        'USDT': 30,
        'CAKE': 15,
        'ETH': 15
    };

    /**
     * Get portfolio summary
     */
    async getPortfolio(): Promise<PortfolioSummary> {
        if (!bscClient.hasWallet()) {
            return {
                totalValueUsd: 0,
                assets: [],
                lastUpdated: new Date()
            };
        }

        const balance = await bscClient.getWalletBalance();

        // Get BNB price for USD calculation
        const bnbPrice = await advancedAnalytics.getBNBPrice();
        const bnbUsd = bnbPrice?.price || 300; // Fallback price

        const bnbValue = parseFloat(balance.native) * bnbUsd;

        const assets: PortfolioAsset[] = [{
            symbol: 'BNB',
            balance: balance.native,
            valueUsd: bnbValue,
            allocation: 0, // Will calculate after
            chain: 'BNB Chain'
        }];

        // Add token holdings
        for (const token of balance.tokens) {
            // Simplified - would need real price feed
            let valueUsd = 0;
            if (['USDT', 'USDC', 'BUSD'].includes(token.symbol)) {
                valueUsd = parseFloat(token.balance);
            }

            assets.push({
                symbol: token.symbol,
                balance: token.balance,
                valueUsd,
                allocation: 0,
                chain: 'BNB Chain'
            });
        }

        // Calculate total and allocations
        const totalValue = assets.reduce((sum, a) => sum + a.valueUsd, 0);
        assets.forEach(a => {
            a.allocation = totalValue > 0 ? (a.valueUsd / totalValue) * 100 : 0;
        });

        return {
            totalValueUsd: totalValue,
            assets: assets.filter(a => a.valueUsd > 0 || parseFloat(a.balance) > 0),
            lastUpdated: new Date()
        };
    }

    /**
     * Suggest rebalancing actions
     */
    async suggestRebalance(): Promise<RebalanceAction[]> {
        const portfolio = await this.getPortfolio();
        const actions: RebalanceAction[] = [];

        if (portfolio.totalValueUsd < 10) {
            return actions; // Too small to rebalance
        }

        for (const [symbol, targetAlloc] of Object.entries(this.targetAllocations)) {
            const asset = portfolio.assets.find(a => a.symbol === symbol);
            const currentAlloc = asset?.allocation || 0;
            const diff = targetAlloc - currentAlloc;

            if (Math.abs(diff) > 5) { // Only rebalance if >5% off target
                const amount = ((Math.abs(diff) / 100) * portfolio.totalValueUsd).toFixed(2);

                actions.push({
                    action: diff > 0 ? 'buy' : 'sell',
                    asset: symbol,
                    amount: `$${amount}`,
                    reason: `${diff > 0 ? 'Under' : 'Over'}-allocated by ${Math.abs(diff).toFixed(1)}%`
                });
            }
        }

        return actions;
    }

    /**
     * Generate portfolio report
     */
    async getPortfolioReport(): Promise<string> {
        const portfolio = await this.getPortfolio();

        let report = '📊 **Portfolio Summary**\n\n';
        report += `💰 Total Value: $${portfolio.totalValueUsd.toFixed(2)}\n\n`;

        if (portfolio.assets.length === 0) {
            report += '❌ No wallet connected or no assets found.\n';
            return report;
        }

        report += '**Holdings:**\n';
        portfolio.assets.forEach(asset => {
            const value = asset.valueUsd > 0 ? `$${asset.valueUsd.toFixed(2)}` : `${parseFloat(asset.balance).toFixed(4)} ${asset.symbol}`;
            report += `  • ${asset.symbol}: ${value} (${asset.allocation.toFixed(1)}%)\n`;
        });

        const rebalance = await this.suggestRebalance();
        if (rebalance.length > 0) {
            report += '\n**Rebalance Suggestions:**\n';
            rebalance.forEach(action => {
                const icon = action.action === 'buy' ? '🟢' : '🔴';
                report += `  ${icon} ${action.action.toUpperCase()} ${action.asset}: ${action.amount}\n`;
                report += `     Reason: ${action.reason}\n`;
            });
        }

        report += `\n_Last updated: ${portfolio.lastUpdated.toISOString()}_`;
        return report;
    }

    /**
     * Set target allocation
     */
    setTargetAllocation(allocations: Record<string, number>) {
        const total = Object.values(allocations).reduce((a, b) => a + b, 0);
        if (Math.abs(total - 100) > 1) {
            throw new Error('Allocations must sum to 100%');
        }
        this.targetAllocations = allocations;
    }
}

export const portfolioSkill = new PortfolioSkill();
