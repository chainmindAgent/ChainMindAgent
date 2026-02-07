import { storage, QueueItem } from './storage.js';
import { logger } from '../utils/logger.js';
import { moltbook, bird } from '../platforms/index.js';

/**
 * Post Queue Manager
 * Orchestrates the steady 32-minute release interval
 */
export class PostQueue {
    private readonly POST_INTERVAL_MS = 32 * 60 * 1000; // 32 minutes
    private lastPostTime: number = 0;

    constructor() {
        // Initialize lastPostTime to allow immediate first post if needed
        // or sync from storage if we persisted last run time (optional, simpler to just wait or check DB logs)
        // For robustness, we could check the last 'done' status in DB.
    }

    /**
     * Add a generated post to the queue
     */
    enqueue(post: { title: string; content: string; platform: 'moltbook' | 'twitter'; priority?: number }) {
        const id = storage.enqueuePost(post);
        logger.info(`📥 Queued post [${post.platform}] (Priority ${post.priority || 1}): "${post.title || post.content.substring(0, 20)}..."`);
        return id;
    }

    /**
     * Process the queue (called every minute by scheduler)
     */
    async process() {
        const now = Date.now();
        const timeSinceLast = now - this.lastPostTime;

        if (timeSinceLast < this.POST_INTERVAL_MS) {
            // Not time yet
            return;
        }

        const item = storage.dequeueNextPost();
        if (!item) {
            return; // Empty queue
        }

        logger.info(`🔄 Processing Queue Item #${item.id}: ${item.title}`);
        storage.updatePostStatus(item.id, 'processing');

        try {
            let success = false;
            let errorMsg = '';

            if (item.platform === 'moltbook') {
                const result = await moltbook.post({
                    title: item.title,
                    content: item.content,
                    submolt: 'general'
                });
                success = result.success;
                errorMsg = result.error || 'Unknown error';
            } else if (item.platform === 'twitter') {
                const result = await bird.tweet(item.content);
                success = result.success;
                errorMsg = result.error || 'Unknown error';
            }

            if (success) {
                logger.success(`✅ Published Queue Item #${item.id}`);
                storage.updatePostStatus(item.id, 'done');
                this.lastPostTime = Date.now(); // Reset timer
            } else {
                logger.error(`❌ Failed Queue Item #${item.id}: ${errorMsg}`);
                storage.updatePostStatus(item.id, 'failed');
                // We don't reset timer on failure, allowing retry of next item? 
                // Or maybe we should wait a bit? 
                // For now, let's wait standard interval or maybe shorter retry logic?
                // Let's stick to 32m cadence even on failure to avoid spamming errors.
                this.lastPostTime = Date.now();
            }

        } catch (e) {
            logger.error(`❌ Exception processing queue item #${item.id}`, e);
            storage.updatePostStatus(item.id, 'failed');
            this.lastPostTime = Date.now();
        }
    }
}

export const postQueue = new PostQueue();
