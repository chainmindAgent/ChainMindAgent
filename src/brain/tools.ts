import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { defiLlamaFetcher } from "./fetchers/defillama.js";
import { dappsBayFetcher } from "./fetchers/dappsbay.js";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. TVL Tool
export const checkTvlTool = tool(
    async () => {
        const data = await defiLlamaFetcher.getBNBChainTVL();
        if (!data) return "Failed to fetch TVL data.";
        return JSON.stringify(data);
    },
    {
        name: "check_bnb_tvl",
        description: "Get the current real-time Total Value Locked (TVL), ranking, and active protocols count of BNB Chain.",
        schema: z.object({})
    }
);

// 2. Protocols Tool
export const checkProtocolsTool = tool(
    async () => {
        const data = await defiLlamaFetcher.getTopProtocols(10);
        return JSON.stringify(data.map(p => ({ name: p.name, tvl: p.tvl, category: p.category })));
    },
    {
        name: "check_best_protocols",
        description: "Get the top 10 list of DeFi protocols on BNB Chain by TVL.",
        schema: z.object({})
    }
);

// 3. Dapps Tool
export const checkDappsTool = tool(
    async () => {
        const data = await dappsBayFetcher.getDApps();
        return JSON.stringify(data.slice(0, 10)); // Top 10
    },
    {
        name: "check_popular_dapps",
        description: "Get the top popular dApps on BNB Chain from DappBay.",
        schema: z.object({})
    }
);

// 4. Revenue Tool (Python Script)
export const checkRevenueTool = tool(
    async ({ interval = "24h" }: { interval?: string }) => {
        try {
            // Path to python script: d:\ChainMind\analysis\revenue_ranking_template_fill.py
            // We are in src/brain/tools.ts -> ../../analysis
            const scriptPath = path.join(__dirname, '..', '..', 'analysis', 'revenue_ranking_template_fill.py');

            // Run python script with --json
            const cmd = `python "${scriptPath}" --json --interval ${interval}`;
            const { stdout } = await execAsync(cmd);

            // Parse output between JSON markers
            const jsonMatch = stdout.match(/---JSON_START---([\s\S]*?)---JSON_END---/);
            if (!jsonMatch) {
                return "Failed to parse script output. Raw: " + stdout.substring(0, 200);
            }

            const result = JSON.parse(jsonMatch[1]);
            if (result.error) return `Error: ${result.error}`;

            if (result.error) return `Error: ${result.error}`;

            // Helper to format money
            const formatMoney = (val: number) => {
                if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
                if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
                if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
                return `$${val.toFixed(0)}`;
            };

            const formattedData = (result.data || []).map((p: any) => ({
                ...p,
                revenue: formatMoney(p.revenue || 0),
                max_revenue: formatMoney(p.max_revenue || 0)
            }));

            // Return raw data so Agent can format it as a table
            return JSON.stringify({
                analysis_interval: result.interval,
                top_protocols: formattedData
            });
        } catch (error) {
            return `Failed to run revenue analysis: ${error}`;
        }
    },
    {
        name: "analyze_revenue",
        description: "Analyze the top revenue-generating protocols on BNB Chain. Returns a summary caption.",
        schema: z.object({
            interval: z.enum(["24h", "7d", "30d"]).optional().describe("Time interval for revenue analysis (default: 24h)")
        })
    }
);

export const agentTools = [checkTvlTool, checkProtocolsTool, checkDappsTool, checkRevenueTool];
