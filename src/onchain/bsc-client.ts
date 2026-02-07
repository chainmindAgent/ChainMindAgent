import { ethers, JsonRpcProvider, Wallet, formatEther, parseEther, formatUnits } from 'ethers';

export interface ChainConfig {
    name: string;
    chainId: number;
    rpcUrl: string;
    explorerUrl: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
}

export interface WalletBalance {
    native: string;
    nativeUsd: number;
    tokens: TokenBalance[];
}

export interface TokenBalance {
    symbol: string;
    address: string;
    balance: string;
    decimals: number;
}

export interface TransactionResult {
    success: boolean;
    hash?: string;
    error?: string;
    gasUsed?: string;
}

// ERC20 ABI for token interactions
const ERC20_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function name() view returns (string)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)'
];

// Popular tokens on BNB Chain
const BNB_TOKENS: Record<string, string> = {
    'WBNB': '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    'BUSD': '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    'USDT': '0x55d398326f99059fF775485246999027B3197955',
    'USDC': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    'CAKE': '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
    'ETH': '0x2170Ed0880ac9A755fd29B2688956BD959F933F8'
};

/**
 * BSC Client for on-chain interactions
 */
export class BSCClient {
    private provider: JsonRpcProvider;
    private wallet: Wallet | null = null;
    private chainConfig: ChainConfig;

    constructor() {
        const rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';

        this.chainConfig = {
            name: 'BNB Smart Chain',
            chainId: 56,
            rpcUrl,
            explorerUrl: 'https://bscscan.com',
            nativeCurrency: {
                name: 'BNB',
                symbol: 'BNB',
                decimals: 18
            }
        };

        this.provider = new JsonRpcProvider(rpcUrl);
    }

    /**
     * Initialize wallet from private key (for on-chain actions)
     */
    initializeWallet(privateKey: string): boolean {
        try {
            this.wallet = new Wallet(privateKey, this.provider);
            console.log(`🔐 Wallet initialized: ${this.wallet.address}`);
            return true;
        } catch (error) {
            console.error('Failed to initialize wallet:', error);
            return false;
        }
    }

    /**
     * Check if wallet is initialized
     */
    hasWallet(): boolean {
        return this.wallet !== null;
    }

    /**
     * Get wallet address
     */
    getAddress(): string | null {
        return this.wallet?.address || null;
    }

    /**
     * Get BNB balance for an address
     */
    async getBNBBalance(address?: string): Promise<string> {
        try {
            const addr = address || this.wallet?.address;
            if (!addr) throw new Error('No address provided');

            const balance = await this.provider.getBalance(addr);
            return formatEther(balance);
        } catch (error) {
            console.error('Failed to get BNB balance:', error);
            return '0';
        }
    }

    /**
     * Get token balance
     */
    async getTokenBalance(tokenAddress: string, holderAddress?: string): Promise<TokenBalance | null> {
        try {
            const addr = holderAddress || this.wallet?.address;
            if (!addr) throw new Error('No address provided');

            const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);

            const [balance, decimals, symbol] = await Promise.all([
                contract.balanceOf(addr),
                contract.decimals(),
                contract.symbol()
            ]);

            return {
                symbol,
                address: tokenAddress,
                balance: formatUnits(balance, decimals),
                decimals
            };
        } catch (error) {
            console.error('Failed to get token balance:', error);
            return null;
        }
    }

    /**
     * Get full wallet balance including tokens
     */
    async getWalletBalance(address?: string): Promise<WalletBalance> {
        const addr = address || this.wallet?.address;
        if (!addr) {
            return { native: '0', nativeUsd: 0, tokens: [] };
        }

        const nativeBalance = await this.getBNBBalance(addr);

        // Get balances for popular tokens
        const tokenBalances: TokenBalance[] = [];
        for (const [symbol, tokenAddr] of Object.entries(BNB_TOKENS)) {
            const balance = await this.getTokenBalance(tokenAddr, addr);
            if (balance && parseFloat(balance.balance) > 0) {
                tokenBalances.push(balance);
            }
        }

        return {
            native: nativeBalance,
            nativeUsd: 0, // Would need price feed
            tokens: tokenBalances
        };
    }

    /**
     * Get current gas price
     */
    async getGasPrice(): Promise<{ gwei: string; usd?: number }> {
        try {
            const feeData = await this.provider.getFeeData();
            const gasPrice = feeData.gasPrice || 0n;
            return {
                gwei: formatUnits(gasPrice, 'gwei')
            };
        } catch (error) {
            console.error('Failed to get gas price:', error);
            return { gwei: '5' }; // Default BSC gas
        }
    }

    /**
     * Send BNB to an address
     */
    async sendBNB(to: string, amount: string): Promise<TransactionResult> {
        if (!this.wallet) {
            return { success: false, error: 'Wallet not initialized' };
        }

        try {
            // Safety check
            const maxAmount = parseFloat(process.env.MAX_TRADE_AMOUNT_USD || '100');
            // Would need BNB price to properly check, for now just check amount
            if (parseFloat(amount) > maxAmount / 300) { // Rough BNB price estimate
                return { success: false, error: `Amount exceeds safety limit` };
            }

            const tx = await this.wallet.sendTransaction({
                to,
                value: parseEther(amount)
            });

            const receipt = await tx.wait();

            return {
                success: true,
                hash: tx.hash,
                gasUsed: receipt?.gasUsed?.toString()
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Approve token spending (required before swaps)
     */
    async approveToken(tokenAddress: string, spenderAddress: string, amount?: string): Promise<TransactionResult> {
        if (!this.wallet) {
            return { success: false, error: 'Wallet not initialized' };
        }

        try {
            const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.wallet);

            // Max approval if no amount specified
            const approvalAmount = amount
                ? parseEther(amount)
                : ethers.MaxUint256;

            const tx = await contract.approve(spenderAddress, approvalAmount);
            const receipt = await tx.wait();

            return {
                success: true,
                hash: tx.hash,
                gasUsed: receipt?.gasUsed?.toString()
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current block number
     */
    async getBlockNumber(): Promise<number> {
        return this.provider.getBlockNumber();
    }

    /**
     * Get transaction by hash
     */
    async getTransaction(hash: string) {
        return this.provider.getTransaction(hash);
    }

    /**
     * Get BSCScan URL for transaction
     */
    getTxUrl(hash: string): string {
        return `${this.chainConfig.explorerUrl}/tx/${hash}`;
    }

    /**
     * Get BSCScan URL for address
     */
    getAddressUrl(address: string): string {
        return `${this.chainConfig.explorerUrl}/address/${address}`;
    }
}

export const bscClient = new BSCClient();
