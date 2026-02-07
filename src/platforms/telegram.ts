import axios from 'axios';
import { logger } from '../utils/logger.js';

export class TelegramClient {
    private token: string;
    private chatId: string;
    private baseUrl: string;

    constructor() {
        this.token = process.env.TELEGRAM_BOT_TOKEN || '';
        this.chatId = process.env.TELEGRAM_CHAT_ID || '';
        this.baseUrl = `https://api.telegram.org/bot${this.token}`;
    }

    isConfigured(): boolean {
        return !!this.token && !!this.chatId;
    }

    /**
     * Send a notification message
     */
    async notify(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
        if (!this.isConfigured()) return;

        const icon = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        }[type];

        const text = `*${icon} ${title}*\n\n${message}`;

        try {
            await axios.post(`${this.baseUrl}/sendMessage`, {
                chat_id: this.chatId,
                text: text,
                parse_mode: 'Markdown'
            });
        } catch (error: any) {
            logger.error(`Telegram notification failed: ${error.message}`);
        }
    }

    /**
     * Check for updates (helper to get Chat ID)
     */
    async getUpdates() {
        if (!this.token) throw new Error('Bot token not configured');

        try {
            const response = await axios.get(`${this.baseUrl}/getUpdates`);
            return response.data.result;
        } catch (error: any) {
            throw new Error(`Failed to get updates: ${error.message}`);
        }
    }
}

export const telegram = new TelegramClient();
