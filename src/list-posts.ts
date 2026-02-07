import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env'), override: true });

const { moltbook } = await import('./platforms/moltbook.js');

console.log('🔍 Getting recent posts from Moltbook feed...\n');

const feed = await moltbook.getFeed('hot', 10);

if (feed.length === 0) {
    console.log('❌ Could not fetch feed');
} else {
    console.log(`Found ${feed.length} posts:\n`);
    feed.forEach((post: any, i: number) => {
        const title = post.title || post.content?.substring(0, 50) || 'Untitled';
        const author = post.author?.username || post.author?.name || 'unknown';
        const id = post.id || post._id;
        console.log(`${i + 1}. "${title.substring(0, 60)}..."`);
        console.log(`   Author: @${author}`);
        console.log(`   🔗 https://www.moltbook.com/post/${id}\n`);
    });
}
