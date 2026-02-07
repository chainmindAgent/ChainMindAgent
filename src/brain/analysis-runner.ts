/**
 * Analysis Runner Module
 * Runs Python analysis scripts and returns text captions for social media posting
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Analysis script configurations
const ANALYSIS_SCRIPTS = {
    fees: {
        script: 'fees_ranking_template_fill.py',
        name: 'Fees Ranking',
        args: ['--json', '--interval', '24h'],
        expectsCaption: true
    },
    revenue: {
        script: 'revenue_ranking_template_fill.py',
        name: 'Revenue Ranking',
        args: ['--json', '--interval', '24h'],
        expectsCaption: true
    },
    social_hype: {
        script: 'social_hype_template_fill.py',
        name: 'Social Hype',
        args: ['--json', '--interval', '24'],
        expectsCaption: true
    },
    tvl: {
        script: 'tvl_ranking_template_fill.py',
        name: 'TVL Ranking',
        args: ['--json'],
        expectsCaption: true
    },
    dappbay: {
        script: 'capture_dappbay.py',
        name: 'DappBay Rankings',
        args: [],
        expectsCaption: false
    }
} as const;

export type AnalysisType = keyof typeof ANALYSIS_SCRIPTS;

export interface AnalysisResult {
    success: boolean;
    type: AnalysisType;
    caption: string;
    timestamp: string;
    error?: string;
}

// Track which analysis was last posted (excludes dappbay since it's data-only)
let lastAnalysisIndex = -1;
const analysisOrder: AnalysisType[] = ['fees', 'revenue', 'social_hype', 'tvl'];

/**
 * Get the next analysis type in rotation
 */
export function getNextAnalysisType(): AnalysisType {
    lastAnalysisIndex = (lastAnalysisIndex + 1) % analysisOrder.length;
    return analysisOrder[lastAnalysisIndex];
}

/**
 * Run a specific analysis script and return the caption
 */
export async function runAnalysis(type: AnalysisType): Promise<AnalysisResult> {
    const config = ANALYSIS_SCRIPTS[type];
    const scriptPath = join(__dirname, '..', '..', 'analysis', config.script);

    console.log(`[Analysis] Running ${config.name}...`);

    return new Promise((resolve) => {
        let stdout = '';
        let stderr = '';

        const proc = spawn('python', [scriptPath, ...config.args], {
            cwd: join(__dirname, '..', '..'),
            env: process.env as NodeJS.ProcessEnv
        });

        proc.stdout.on('data', (data: Buffer) => {
            stdout += data.toString();
        });

        proc.stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
        });

        proc.on('close', (code: number | null) => {
            if (code !== 0) {
                console.error(`[Analysis] ${config.name} failed with code ${code}`);
                // ... error handling ...
                resolve({
                    success: false,
                    type,
                    caption: '',
                    timestamp: new Date().toISOString(),
                    error: `Script exited with code ${code}`
                });
                return;
            }

            // For data-only scripts (like DappBay), just return success
            if (!config.expectsCaption) {
                resolve({
                    success: true,
                    type,
                    caption: 'Data refreshed successfully', // Placeholder
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Parse JSON output between markers
            // ... (rest of JSON parsing) ...
            try {
                const jsonMatch = stdout.match(/---JSON_START---\s*([\s\S]*?)\s*---JSON_END---/);
                if (!jsonMatch) {
                    // Fallback: extract caption from console output
                    const captionMatch = stdout.match(/CAPTION:\s*([\s\S]*?)$/);
                    if (captionMatch) {
                        resolve({
                            success: true,
                            type,
                            caption: captionMatch[1].trim(),
                            timestamp: new Date().toISOString()
                        });
                        return;
                    }
                    throw new Error('No JSON or caption found in output');
                }

                const jsonData = JSON.parse(jsonMatch[1]);

                resolve({
                    success: true,
                    type,
                    caption: jsonData.caption || '',
                    timestamp: jsonData.timestamp || new Date().toISOString()
                });
            } catch (parseError) {
                console.error(`[Analysis] Failed to parse output:`, parseError);
                resolve({
                    success: false,
                    type,
                    caption: '',
                    timestamp: new Date().toISOString(),
                    error: `Failed to parse output: ${parseError}`
                });
            }
        });

        proc.on('error', (error: Error) => {
            console.error(`[Analysis] Failed to spawn process:`, error);
            resolve({
                success: false,
                type,
                caption: '',
                timestamp: new Date().toISOString(),
                error: `Process error: ${error.message}`
            });
        });

        // Timeout after 2 minutes
        setTimeout(() => {
            proc.kill();
            resolve({
                success: false,
                type,
                caption: '',
                timestamp: new Date().toISOString(),
                error: 'Script timeout (2 minutes)'
            });
        }, 120000);
    });
}

/**
 * Run the next analysis in rotation
 */
export async function runNextAnalysis(): Promise<AnalysisResult> {
    const type = getNextAnalysisType();
    return runAnalysis(type);
}

/**
 * Get all available analysis types
 */
export function getAnalysisTypes(): AnalysisType[] {
    return analysisOrder;
}
