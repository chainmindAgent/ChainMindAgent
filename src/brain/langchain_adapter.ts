import { ChatOpenAI } from "@langchain/openai";
import { llmConfig } from "../config.js";

// Fallback to process.env if config module failed
const apiKey = llmConfig.apiKey || process.env.ZAI_API_KEY || '';

console.log('🔑 Adapter Key Check:', apiKey ? `Present (${apiKey.length} chars)` : 'MISSING');

export const chatModel = new ChatOpenAI({
    openAIApiKey: apiKey,
    apiKey: apiKey,
    modelName: llmConfig.model,
    temperature: 0.7,
    configuration: {
        baseURL: llmConfig.baseUrl,
    },
});

/**
 * Helper to get a configured chain or model
 */
export function getModel(temperature?: number) {
    return new ChatOpenAI({
        openAIApiKey: llmConfig.apiKey,
        modelName: llmConfig.model,
        temperature: temperature ?? 0.7,
        configuration: {
            baseURL: llmConfig.baseUrl,
        },
    });
}
