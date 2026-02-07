import { spawn } from 'child_process';
import { join } from 'path';

export interface BirdResult {
    success: boolean;
    output?: string;
    error?: string;
}

/**
 * Bird (X/Twitter) Client
 * Uses local browser cookies via @steipete/bird CLI
 */
export class BirdClient {
    /**
     * Post a tweet using Bird
     */
    async tweet(content: string): Promise<BirdResult> {
        // Escape double quotes and wrap in quotes for shell capability
        const safeContent = `"${content.replace(/"/g, '\\"')}"`;
        return this.runBird(['tweet', safeContent]);
    }

    /**
     * Check who is logged in
     */
    async whoami(): Promise<BirdResult> {
        return this.runBird(['whoami']);
    }

    /**
     * Get tweets from a user's timeline
     */
    async userTweets(username: string, limit: number = 5): Promise<BirdResult> {
        // Remove @ if present
        const handle = username.replace(/^@/, '');
        // Use -n for count and --json for structured output
        // We use shell: true, so simple arguments are safe, but better to quote handle if weird chars
        return this.runBird(['user-tweets', `@${handle}`, '-n', limit.toString(), '--json']);
    }

    /**
     * Execute bird CLI command
     */
    private runBird(args: string[]): Promise<BirdResult> {
        return new Promise((resolve) => {
            // Use npx to run bird
            // detailed args are constructed by caller if quoting needed
            const bird = spawn('npx', ['bird', ...args], {
                shell: true,
                env: process.env
            });

            let stdout = '';
            let stderr = '';

            bird.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            bird.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            bird.on('close', (code) => {
                if (code === 0) {
                    resolve({
                        success: true,
                        output: stdout.trim()
                    });
                } else {
                    resolve({
                        success: false,
                        error: stderr.trim() || stdout.trim() || 'Unknown error',
                        output: stdout
                    });
                }
            });

            bird.on('error', (err) => {
                resolve({
                    success: false,
                    error: err.message
                });
            });
        });
    }
}

export const bird = new BirdClient();
