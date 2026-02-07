import { ethers, Contract } from 'ethers';
import { bscClient } from './bsc-client.js';

/**
 * BAP-578 Non-Fungible Agent (NFA) Interface
 * Based on BNB Chain's proposed standard for on-chain AI agents
 * 
 * Key Features:
 * - Unique agent identity on-chain (like NFT)
 * - Action execution and state management
 * - Logic upgrades and learning capabilities
 * - Cross-dApp interoperability
 */

export interface NFAMetadata {
    name: string;
    description: string;
    image?: string;
    capabilities: string[];
    version: string;
    creator: string;
    createdAt: number;
}

export interface NFAState {
    tokenId: number;
    owner: string;
    metadata: NFAMetadata;
    learningEnabled: boolean;
    lastAction: number;
    actionCount: number;
}

export interface NFAAction {
    actionType: string;
    params: any;
    timestamp: number;
    signature?: string;
}

// BAP-578 NFA Standard Interface ABI (based on specification)
const NFA_INTERFACE_ABI = [
    // Core Identity
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function tokenURI(uint256 tokenId) view returns (string)',
    'function ownerOf(uint256 tokenId) view returns (address)',

    // Agent State
    'function getAgentState(uint256 tokenId) view returns (tuple(bool active, uint256 lastAction, uint256 actionCount, bytes32 stateHash))',
    'function getAgentCapabilities(uint256 tokenId) view returns (string[])',

    // Actions
    'function executeAction(uint256 tokenId, bytes actionData) returns (bool)',
    'function proposeAction(uint256 tokenId, bytes actionData) returns (uint256 proposalId)',

    // Learning Module (Optional)
    'function isLearningEnabled(uint256 tokenId) view returns (bool)',
    'function updateLearning(uint256 tokenId, bytes learningData) returns (bool)',

    // Events
    'event ActionExecuted(uint256 indexed tokenId, bytes32 actionHash, uint256 timestamp)',
    'event StateUpdated(uint256 indexed tokenId, bytes32 newStateHash)',
    'event LearningUpdated(uint256 indexed tokenId, bytes32 learningHash)'
];

// Factory ABI for minting new NFA agents
const NFA_FACTORY_ABI = [
    'function mint(address to, string calldata metadataURI) returns (uint256)',
    'function mintWithCapabilities(address to, string calldata metadataURI, string[] calldata capabilities) returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'event AgentMinted(uint256 indexed tokenId, address indexed owner, string metadataURI)'
];

/**
 * BAP-578 NFA Registry Client
 * Manages on-chain agent identity and interactions
 */
export class NFARegistry {
    private provider: ethers.JsonRpcProvider;
    private nfaContract: Contract | null = null;
    private factoryContract: Contract | null = null;

    // Known NFA contract addresses (to be updated with official deployments)
    private contractAddresses = {
        mainnet: {
            nfa: '', // To be deployed
            factory: '' // To be deployed
        },
        testnet: {
            nfa: '', // To be deployed
            factory: '' // To be deployed
        }
    };

    constructor() {
        const rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
    }

    /**
     * Initialize with contract addresses
     */
    initialize(nfaAddress: string, factoryAddress?: string): void {
        this.nfaContract = new Contract(nfaAddress, NFA_INTERFACE_ABI, this.provider);
        if (factoryAddress) {
            this.factoryContract = new Contract(factoryAddress, NFA_FACTORY_ABI, this.provider);
        }
        console.log('🤖 NFA Registry initialized');
    }

    /**
     * Get agent state from on-chain
     */
    async getAgentState(tokenId: number): Promise<NFAState | null> {
        if (!this.nfaContract) {
            console.warn('NFA contract not initialized');
            return null;
        }

        try {
            const [owner, tokenURI, state, capabilities] = await Promise.all([
                this.nfaContract.ownerOf(tokenId),
                this.nfaContract.tokenURI(tokenId),
                this.nfaContract.getAgentState(tokenId),
                this.nfaContract.getAgentCapabilities(tokenId)
            ]);

            // Fetch metadata from URI
            const metadata = await this.fetchMetadata(tokenURI);

            return {
                tokenId,
                owner,
                metadata: {
                    ...metadata,
                    capabilities
                },
                learningEnabled: await this.nfaContract.isLearningEnabled(tokenId),
                lastAction: Number(state.lastAction),
                actionCount: Number(state.actionCount)
            };
        } catch (error) {
            console.error('Failed to get agent state:', error);
            return null;
        }
    }

    /**
     * Fetch metadata from URI (IPFS or HTTP)
     */
    private async fetchMetadata(uri: string): Promise<NFAMetadata> {
        try {
            // Handle IPFS URIs
            let fetchUrl = uri;
            if (uri.startsWith('ipfs://')) {
                fetchUrl = `https://ipfs.io/ipfs/${uri.slice(7)}`;
            }

            const response = await fetch(fetchUrl);
            const data = await response.json() as Record<string, unknown>;

            return {
                name: String(data.name || 'Unknown Agent'),
                description: String(data.description || ''),
                image: data.image ? String(data.image) : undefined,
                capabilities: Array.isArray(data.capabilities) ? data.capabilities as string[] : [],
                version: String(data.version || '1.0.0'),
                creator: String(data.creator || ''),
                createdAt: Number(data.createdAt) || 0
            };
        } catch (error) {
            console.error('Failed to fetch metadata:', error);
            return {
                name: 'Unknown Agent',
                description: '',
                capabilities: [],
                version: '1.0.0',
                creator: '',
                createdAt: 0
            };
        }
    }

    /**
     * Execute an action on behalf of the agent
     */
    async executeAction(tokenId: number, action: NFAAction): Promise<{ success: boolean; txHash?: string; error?: string }> {
        if (!this.nfaContract || !bscClient.hasWallet()) {
            return { success: false, error: 'Contract or wallet not initialized' };
        }

        try {
            // Encode action data
            const actionData = ethers.AbiCoder.defaultAbiCoder().encode(
                ['string', 'bytes', 'uint256'],
                [action.actionType, JSON.stringify(action.params), action.timestamp]
            );

            // Get signer
            const wallet = bscClient.getAddress();
            if (!wallet) {
                return { success: false, error: 'No wallet connected' };
            }

            // Execute action (would need signer connection)
            // This is a read-only example
            console.log(`📝 Would execute action: ${action.actionType} for token ${tokenId}`);

            return {
                success: true,
                txHash: 'DRY_RUN_' + Date.now()
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if an address owns an NFA
     */
    async checkOwnership(address: string, tokenId: number): Promise<boolean> {
        if (!this.nfaContract) return false;

        try {
            const owner = await this.nfaContract.ownerOf(tokenId);
            return owner.toLowerCase() === address.toLowerCase();
        } catch {
            return false;
        }
    }

    /**
     * Get ChainMind's NFA metadata for registration
     */
    getChainMindMetadata(): NFAMetadata {
        return {
            name: 'ChainMindX',
            description: 'Autonomous BNB Chain knowledge agent with DeFi analytics, trading skills, and cross-platform presence.',
            image: 'https://chainmind.ai/nft/chainmindx.png', // Placeholder
            capabilities: [
                'defi-analytics',
                'trading',
                'portfolio-management',
                'on-chain-research',
                'social-posting',
                'autonomous-decisions'
            ],
            version: '2.0.0',
            creator: 'ChainMind Labs',
            createdAt: Date.now()
        };
    }

    /**
     * Generate metadata URI for IPFS upload
     */
    generateMetadataJSON(): string {
        const metadata = this.getChainMindMetadata();
        return JSON.stringify({
            name: metadata.name,
            description: metadata.description,
            image: metadata.image,
            attributes: [
                { trait_type: 'Version', value: metadata.version },
                { trait_type: 'Creator', value: metadata.creator },
                { trait_type: 'Type', value: 'BNB Chain Agent' },
                ...metadata.capabilities.map(cap => ({
                    trait_type: 'Capability',
                    value: cap
                }))
            ],
            properties: {
                capabilities: metadata.capabilities,
                platform: 'BNB Chain',
                standard: 'BAP-578'
            }
        }, null, 2);
    }

    /**
     * Get NFA status report
     */
    getStatusReport(): string {
        const metadata = this.getChainMindMetadata();

        let report = '🤖 **BAP-578 NFA Status**\n\n';
        report += `**Agent:** ${metadata.name}\n`;
        report += `**Version:** ${metadata.version}\n`;
        report += `**Standard:** BAP-578 (Non-Fungible Agent)\n\n`;

        report += `**Capabilities:**\n`;
        metadata.capabilities.forEach(cap => {
            report += `  • ${cap}\n`;
        });

        report += `\n**On-Chain Status:** `;
        if (this.nfaContract) {
            report += '✅ Connected\n';
        } else {
            report += '⏳ Pending deployment\n';
            report += '\n> To register ChainMindX on-chain:\n';
            report += '> 1. Deploy NFA contract or use official registry\n';
            report += '> 2. Upload metadata to IPFS\n';
            report += '> 3. Mint NFA token with metadata URI\n';
        }

        return report;
    }
}

export const nfaRegistry = new NFARegistry();
