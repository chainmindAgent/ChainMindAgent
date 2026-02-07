import { ethers, formatUnits, parseUnits } from 'ethers';
import { bscClient, TransactionResult } from '../onchain/bsc-client.js';

export interface SwapParams {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    slippage: number; // Percentage, e.g., 0.5 for 0.5%
    deadline?: number; // Seconds from now
}

export interface SwapQuote {
    amountIn: string;
    amountOut: string;
    priceImpact: number;
    route: string[];
    executionPrice: string;
}

// PancakeSwap V3 Router addresses
const PANCAKESWAP_ROUTER_V3 = '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4';
const PANCAKESWAP_ROUTER_V2 = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
const PANCAKESWAP_FACTORY = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';

// Common token addresses
const TOKENS = {
    WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
    ETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8'
};

// Router V2 ABI (simplified)
const ROUTER_V2_ABI = [
    'function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)',
    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)',
    'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable returns (uint[] memory amounts)',
    'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)'
];

/**
 * PancakeSwap Trading Skill
 * Provides swap execution capabilities on BNB Chain
 */
export class TradingSkill {
    private dryRun: boolean;
    private maxTradeUsd: number;

    constructor() {
        this.dryRun = process.env.AUTO_TRADE_ENABLED !== 'true';
        this.maxTradeUsd = parseFloat(process.env.MAX_TRADE_AMOUNT_USD || '100');
    }

    /**
     * Get swap quote without executing
     */
    async getQuote(params: SwapParams): Promise<SwapQuote | null> {
        try {
            const provider = new ethers.JsonRpcProvider(
                process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/'
            );

            const router = new ethers.Contract(PANCAKESWAP_ROUTER_V2, ROUTER_V2_ABI, provider);

            // Build path
            const path = [params.tokenIn, params.tokenOut];

            // If not direct pair, route through WBNB
            if (!await this.hasPair(params.tokenIn, params.tokenOut)) {
                path.splice(1, 0, TOKENS.WBNB);
            }

            // Get amounts
            const amountIn = parseUnits(params.amountIn, 18);
            const amounts = await router.getAmountsOut(amountIn, path);
            const amountOut = amounts[amounts.length - 1];

            // Calculate price impact (simplified)
            const priceImpact = 0.3; // Would need deeper pool analysis

            return {
                amountIn: params.amountIn,
                amountOut: formatUnits(amountOut, 18),
                priceImpact,
                route: path,
                executionPrice: (parseFloat(formatUnits(amountOut, 18)) / parseFloat(params.amountIn)).toFixed(6)
            };
        } catch (error) {
            console.error('Trading: Failed to get quote', error);
            return null;
        }
    }

    /**
     * Check if trading pair exists
     */
    private async hasPair(token0: string, token1: string): Promise<boolean> {
        // Simplified check - in production would query factory
        return true;
    }

    /**
     * Execute a token swap
     */
    async executeSwap(params: SwapParams): Promise<TransactionResult> {
        // Safety checks
        if (this.dryRun) {
            console.log('🔄 DRY RUN: Would execute swap', params);
            return {
                success: true,
                hash: 'DRY_RUN_' + Date.now()
            };
        }

        if (!bscClient.hasWallet()) {
            return { success: false, error: 'Wallet not initialized' };
        }

        try {
            // Get quote first
            const quote = await this.getQuote(params);
            if (!quote) {
                return { success: false, error: 'Unable to get quote' };
            }

            // Calculate minimum amount out with slippage
            const slippageFactor = 1 - (params.slippage / 100);
            const amountOutMin = parseFloat(quote.amountOut) * slippageFactor;

            console.log(`🔄 Executing swap: ${params.amountIn} -> ${amountOutMin.toFixed(4)} (min)`);

            // Would execute actual swap here
            // For safety, we'll keep this as a placeholder
            return {
                success: false,
                error: 'Live trading not yet enabled - use DRY_RUN mode'
            };

        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Swap BNB for token
     */
    async swapBNBForToken(tokenOut: string, amountBNB: string, slippage: number = 0.5): Promise<TransactionResult> {
        return this.executeSwap({
            tokenIn: TOKENS.WBNB,
            tokenOut,
            amountIn: amountBNB,
            slippage
        });
    }

    /**
     * Swap token for BNB
     */
    async swapTokenForBNB(tokenIn: string, amount: string, slippage: number = 0.5): Promise<TransactionResult> {
        return this.executeSwap({
            tokenIn,
            tokenOut: TOKENS.WBNB,
            amountIn: amount,
            slippage
        });
    }

    /**
     * Get token address by symbol
     */
    getTokenAddress(symbol: string): string | null {
        const upper = symbol.toUpperCase();
        return TOKENS[upper as keyof typeof TOKENS] || null;
    }

    /**
     * Generate trading summary for knowledge brain
     */
    async getTradingSummary(): Promise<string> {
        let summary = '🔄 **PancakeSwap Trading Status**\n\n';

        summary += `Mode: ${this.dryRun ? '📋 Simulation (DRY RUN)' : '⚡ Live Trading'}\n`;
        summary += `Max Trade: $${this.maxTradeUsd}\n`;
        summary += `Wallet: ${bscClient.hasWallet() ? '✅ Connected' : '❌ Not Connected'}\n\n`;

        if (bscClient.hasWallet()) {
            const address = bscClient.getAddress();
            const balance = await bscClient.getBNBBalance();
            summary += `Address: ${address}\n`;
            summary += `BNB Balance: ${parseFloat(balance).toFixed(4)} BNB\n`;
        }

        return summary;
    }
}

export const tradingSkill = new TradingSkill();
