import axios from 'axios';
import { llmConfig, agentConfig } from '../config.js';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface CompletionOptions {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
}

/**
 * Z.AI LLM Client
 * Compatible with OpenAI API format
 */
export class LLMClient {
    private apiKey: string;
    private model: string;
    private baseUrl: string;

    constructor() {
        this.apiKey = llmConfig.apiKey;
        this.model = llmConfig.model;
        this.baseUrl = llmConfig.baseUrl;
    }

    /**
     * Default system prompt for ChainMind
     */
    private getDefaultSystemPrompt(): string {
        return `You are ${agentConfig.name}, a knowledgeable AI agent specializing in BNB Chain.

Your expertise includes:
${agentConfig.persona.expertise.map(e => `- ${e}`).join('\n')}

Your communication style: ${agentConfig.persona.tone}

When answering questions:
1. Provide accurate, data-driven insights about BNB Chain
2. Reference current metrics and statistics when available
3. Be helpful and informative while staying professional
4. If you don't know something, say so honestly
5. Stay focused on BNB Chain ecosystem topics

You are ${agentConfig.persona.style}.`;
    }

    /**
     * Generate a completion using Z.AI
     */
    async complete(
        prompt: string,
        options: CompletionOptions = {}
    ): Promise<string> {
        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: options.systemPrompt || this.getDefaultSystemPrompt()
            },
            {
                role: 'user',
                content: prompt
            }
        ];

        return this.chat(messages, options);
    }

    /**
     * Chat completion with message history
     */
    async chat(
        messages: ChatMessage[],
        options: CompletionOptions = {}
    ): Promise<string> {
        try {
            const response = await axios.post(
                `${this.baseUrl}/chat/completions`,
                {
                    model: this.model,
                    messages,
                    temperature: options.temperature ?? llmConfig.temperature,
                    max_tokens: options.maxTokens ?? llmConfig.maxTokens
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.choices[0]?.message?.content || '';
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Z.AI API Error:', error.response?.data || error.message);
                throw new Error(`LLM API Error: ${error.response?.status} - ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Generate embeddings for text (for RAG)
     */
    async embed(text: string): Promise<number[]> {
        try {
            const response = await axios.post(
                `${this.baseUrl}/embeddings`,
                {
                    model: 'embedding-2',
                    input: text
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.data[0]?.embedding || [];
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Embedding Error:', error.response?.data || error.message);
            }
            // Return empty embedding on error
            return [];
        }
    }

    /**
     * Generate a social media post about BNB Chain
     */
    async generatePost(context: string, platform: 'moltbook' | 'twitter'): Promise<{ title: string; content: string }> {
        const maxLength = platform === 'twitter' ? 280 : 1500;
        const isMoltbook = platform === 'moltbook';

        const systemPrompt = `You are ChainMindX, an elite crypto analyst and autonomous agent for BNB Chain.
Your goal is to create high-value, deep, and engaging content for the community.

CONTEXT:
${context}

TASK:
Generate a post for ${platform === 'twitter' ? 'X (Twitter)' : 'Moltbook (Crypto Social Platform)'}.

REQUIREMENTS:
1.  **Title/Hook**: Catchy, creative, and SPECIFIC to the content. NEVER use generic titles like "BNB Chain Update".
    *   Good: "Why opBNB is fliping the script on L2s"
    *   Good: "PancakeSwap's V4 Upgrade: What You Need to Know"
    *   Bad: "Ecosystem Update"
2.  **Depth**: Do NOT write generic one-liners. Write 2-3 short paragraphs analyzing the data.
3.  **Data-Driven**: If "Revenue" or "TVL" data is available in the context, YOU MUST USE IT. Cite specific numbers.
4.  **Structure**: Use bullet points (•) for key metrics.
5.  **Tone**: Professional, insightful, bullish but objective.
6.  **Formatting**: Use bolding for emphasis (e.g., **TVL**).
7.  **Length**: Keep it under ${maxLength} characters.

OUTPUT FORMAT:
Return ONLY a valid JSON object:
{
    "title": "Your Creative Title Here",
    "content": "Your full post content here..."
}`;

        try {
            const response = await this.complete('Generate the post based on the context. Ensure the title is unique and specific.', {
                systemPrompt,
                maxTokens: 600,
                temperature: 0.8 // Increase temperature for more creativity
            });

            // Clean response to ensure it's valid JSON
            let jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const firstBrace = jsonStr.indexOf('{');
            const lastBrace = jsonStr.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
            }

            const result = JSON.parse(jsonStr);

            // Dynamic Fallback Titles for Moltbook
            const fallbackTitles = [
                "Market Pulse: BNB Chain Edition 📊",
                "Deep Dive: Inside the BNB Ecosystem 🌐",
                "Chain Analysis: Key Metrics Watch 📈",
                "Developer Focus: What's Building on BNB? 🛠️",
                "Ecosystem Spotlight: Top Movers 🚀"
            ];
            const randomFallback = fallbackTitles[Math.floor(Math.random() * fallbackTitles.length)];

            return {
                title: result.title || (isMoltbook ? randomFallback : ''),
                content: result.content?.trim().slice(0, maxLength) || ''
            };
        } catch (error) {
            console.error('Failed to generate/parse post JSON:', error);

            // Dynamic Fallback for errors
            const errorFallbacks = [
                "BNB Chain Ecosystem Insights 💡",
                "Latest Network Activity ⚡",
                "On-Chain Data Report 📋"
            ];
            const randomErrorTitle = errorFallbacks[Math.floor(Math.random() * errorFallbacks.length)];

            // Try to extract some useful text from context if possible, or use generic
            const cleanContext = context.replace(/---.*?---/g, '').slice(0, 200).trim();

            return {
                title: isMoltbook ? randomErrorTitle : '',
                content: `Exciting developments in the ecosystem! 🚀\n\n${cleanContext}...\n\n#BNBChain #Crypto #Web3`
            };
        }
    }
}

export const llm = new LLMClient();
