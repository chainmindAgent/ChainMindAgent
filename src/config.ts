import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Explicitly load .env from project root (parent of src/)
const envPath = join(__dirname, '..', '.env');
const result = config({ path: envPath });

console.log('🔧 Config Loading .env from:', envPath);
console.log('🔧 Dotenv Result:', result.error ? result.error.message : 'Success');
console.log('🔧 ZAI_API_KEY present:', !!process.env.ZAI_API_KEY);
if (process.env.ZAI_API_KEY) console.log('🔧 ZAI_API_KEY length:', process.env.ZAI_API_KEY.length);

/**
 * ChainMind Agent Configuration
 */
export const agentConfig = {
    name: 'ChainMindX',
    description: 'BNB Chain Knowledge AI Agent - Your expert on all things BNB Chain',
    version: '1.0.0',

    // Personality
    persona: {
        tone: 'professional yet approachable',
        expertise: ['BNB Chain', 'DeFi', 'dApps', 'blockchain metrics', 'Web3'],
        style: 'informative with data-driven insights'
    }
};

/**
 * Z.AI LLM Configuration
 */
export const llmConfig = {
    apiKey: process.env.ZAI_API_KEY || '',
    model: process.env.ZAI_MODEL || 'glm-4.5',
    baseUrl: 'https://api.z.ai/api/coding/paas/v4',
    maxTokens: 4096,
    temperature: 0.7
};

/**
 * Moltbook Configuration
 */
export const moltbookConfig = {
    apiKey: process.env.MOLTBOOK_API_KEY || '',
    agentName: process.env.MOLTBOOK_AGENT_NAME || 'ChainMindX',
    baseUrl: 'https://www.moltbook.com/api/v1',
    profileUrl: 'https://www.moltbook.com/u/ChainMindX'
};

/**
 * Twitter/X Configuration
 */
export const twitterConfig = {
    apiKey: process.env.TWITTER_API_KEY || '',
    apiSecret: process.env.TWITTER_API_SECRET || '',
    accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
    accessSecret: process.env.TWITTER_ACCESS_SECRET || '',
    monitorAccounts: (process.env.TWITTER_MONITOR_ACCOUNTS || 'BNBCHAIN').split(',').map(s => s.trim())
};

/**
 * Autonomy Configuration
 */
export const autonomyConfig = {
    mode: process.env.AUTONOMY_MODE as 'semi' | 'full' || 'semi',
    postFrequencyHours: parseInt(process.env.POST_FREQUENCY_HOURS || '4', 10),
    // New: Post frequency in minutes (for more granular control)
    postFrequencyMins: parseInt(process.env.POST_FREQUENCY_MINS || '35', 10),
    // New: Interaction frequency in minutes (comments, DMs, engagement)
    interactionFrequencyMins: parseInt(process.env.INTERACTION_FREQUENCY_MINS || '10', 10),
    maxPostsPerDay: 40, // Increased to allow for ~35 min interval posting
    requireApproval: process.env.AUTONOMY_MODE !== 'full'
};

/**
 * Analysis Posting Configuration
 * Automatically post analysis reports (fees, revenue, social hype) to social media
 */
export const analysisConfig = {
    enabled: process.env.ANALYSIS_POST_ENABLED !== 'false',
    frequencyHours: parseInt(process.env.ANALYSIS_POST_FREQUENCY_HOURS || '6', 10),
    types: (process.env.ANALYSIS_TYPES || 'fees,revenue,social_hype,tvl').split(',').map(s => s.trim()),
    platforms: (process.env.ANALYSIS_PLATFORMS || 'moltbook,twitter').split(',').map(s => s.trim())
};

/**
 * Web UI Configuration
 */
export const webConfig = {
    port: parseInt(process.env.WEB_PORT || '3000', 10),
    host: process.env.WEB_HOST || 'localhost'
};

/**
 * Data Storage Configuration
 */
export const storageConfig = {
    dataDir: process.env.DATA_DIR || './data',
    knowledgeDb: process.env.KNOWLEDGE_DB || './data/knowledge.db'
};

// Ensure data directory exists
const dataDir = join(__dirname, '..', storageConfig.dataDir);
if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
}

/**
 * Data Source URLs
 */
export const dataSources = {
    defiLlama: {
        baseUrl: 'https://api.llama.fi',
        endpoints: {
            tvl: '/v2/chains',
            protocols: '/protocols',
            bnbChain: '/v2/historicalChainTvl/BSC'
        }
    },
    dappsBay: {
        baseUrl: 'https://dappbay.bnbchain.org',
        apiUrl: 'https://dappbay.bnbchain.org/api'
    },
    bnbChainNews: {
        baseUrl: 'https://www.bnbchain.org',
        blogUrl: 'https://www.bnbchain.org/en/blog'
    }
};

/**
 * Validate required configuration
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!llmConfig.apiKey) {
        errors.push('ZAI_API_KEY is required');
    }

    if (!moltbookConfig.apiKey) {
        errors.push('MOLTBOOK_API_KEY is required');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

export default {
    agent: agentConfig,
    llm: llmConfig,
    moltbook: moltbookConfig,
    twitter: twitterConfig,
    autonomy: autonomyConfig,
    web: webConfig,
    storage: storageConfig,
    dataSources
};
