import initSqlJs, { Database } from 'sql.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { storageConfig } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface KnowledgeEntry {
    id?: number;
    source: string;
    category: string;
    title: string;
    content: string;
    metadata?: string;
    createdAt: string;
    updatedAt: string;
}

export interface QueueItem {
    id: number;
    title: string;
    content: string;
    platform: 'moltbook' | 'twitter';
    priority: number;
    status: 'pending' | 'processing' | 'done' | 'failed';
    scheduledFor?: string;
    createdAt: string;
}

let db: Database | null = null;
let dbPath: string;

/**
 * Initialize the database
 */
async function initDb(): Promise<Database> {
    if (db) return db;

    const SQL = await initSqlJs();
    dbPath = join(__dirname, '..', '..', storageConfig.knowledgeDb);
    const dbDir = dirname(dbPath);

    // Ensure directory exists
    if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
    }

    // Load existing database or create new one
    if (existsSync(dbPath)) {
        const buffer = readFileSync(dbPath);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    // Initialize schema
    db.run(`
    CREATE TABLE IF NOT EXISTS knowledge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_knowledge_source ON knowledge(source)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge(category)`);

    db.run(`
    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_name TEXT UNIQUE NOT NULL,
      metric_value REAL NOT NULL,
      metadata TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS training_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      entries_added INTEGER DEFAULT 0,
      entries_updated INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS post_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      content TEXT NOT NULL,
      platform TEXT NOT NULL,
      priority INTEGER DEFAULT 1,
      status TEXT DEFAULT 'pending',
      scheduled_for TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      processed_at TEXT
    )
  `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_queue_status ON post_queue(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_queue_priority ON post_queue(priority)`);

    saveDb();
    return db;
}

/**
 * Save database to disk
 */
function saveDb() {
    if (db && dbPath) {
        const data = db.export();
        const buffer = Buffer.from(data);
        writeFileSync(dbPath, buffer);
    }
}

/**
 * Knowledge Storage
 * SQLite-based storage for BNB Chain knowledge
 */
export class KnowledgeStorage {
    private initialized: boolean = false;

    async init(): Promise<void> {
        if (this.initialized) return;
        await initDb();
        this.initialized = true;
    }

    /**
     * Add or update a knowledge entry
     */
    upsertKnowledge(entry: KnowledgeEntry): number {
        if (!db) throw new Error('Database not initialized');

        const now = new Date().toISOString();

        // Check if entry exists by source and title
        const existing = db.exec(`
      SELECT id FROM knowledge WHERE source = '${entry.source.replace(/'/g, "''")}' AND title = '${entry.title.replace(/'/g, "''")}'
    `);

        if (existing.length > 0 && existing[0].values.length > 0) {
            const id = existing[0].values[0][0] as number;
            db.run(`
        UPDATE knowledge 
        SET content = '${entry.content.replace(/'/g, "''")}', 
            category = '${entry.category.replace(/'/g, "''")}', 
            metadata = '${(entry.metadata || '').replace(/'/g, "''")}', 
            updated_at = '${now}'
        WHERE id = ${id}
      `);
            saveDb();
            return id;
        } else {
            db.run(`
        INSERT INTO knowledge (source, category, title, content, metadata, created_at, updated_at)
        VALUES ('${entry.source.replace(/'/g, "''")}', '${entry.category.replace(/'/g, "''")}', 
                '${entry.title.replace(/'/g, "''")}', '${entry.content.replace(/'/g, "''")}', 
                '${(entry.metadata || '').replace(/'/g, "''")}', '${now}', '${now}')
      `);
            saveDb();
            const result = db.exec('SELECT last_insert_rowid()');
            return result[0]?.values[0]?.[0] as number || 0;
        }
    }

    /**
     * Store multiple knowledge entries
     */
    bulkUpsert(entries: KnowledgeEntry[]): { added: number; updated: number } {
        if (!db) throw new Error('Database not initialized');

        let added = 0;
        let updated = 0;

        for (const entry of entries) {
            const existing = db.exec(`
        SELECT id FROM knowledge WHERE source = '${entry.source.replace(/'/g, "''")}' AND title = '${entry.title.replace(/'/g, "''")}'
      `);

            if (existing.length > 0 && existing[0].values.length > 0) {
                updated++;
            } else {
                added++;
            }

            this.upsertKnowledge(entry);
        }

        return { added, updated };
    }

    /**
     * Search knowledge by keyword
     */
    search(query: string, limit: number = 10): KnowledgeEntry[] {
        if (!db) return [];

        const safeQuery = query.replace(/'/g, "''");
        const results = db.exec(`
      SELECT * FROM knowledge 
      WHERE title LIKE '%${safeQuery}%' OR content LIKE '%${safeQuery}%'
      ORDER BY updated_at DESC
      LIMIT ${limit}
    `);

        return this.mapResults(results);
    }

    /**
     * Get knowledge by category
     */
    getByCategory(category: string, limit: number = 20): KnowledgeEntry[] {
        if (!db) return [];

        const results = db.exec(`
      SELECT * FROM knowledge 
      WHERE category = '${category.replace(/'/g, "''")}'
      ORDER BY updated_at DESC
      LIMIT ${limit}
    `);

        return this.mapResults(results);
    }

    /**
     * Get knowledge by source
     */
    getBySource(source: string, limit: number = 20): KnowledgeEntry[] {
        if (!db) return [];

        const results = db.exec(`
      SELECT * FROM knowledge 
      WHERE source = '${source.replace(/'/g, "''")}'
      ORDER BY updated_at DESC
      LIMIT ${limit}
    `);

        return this.mapResults(results);
    }

    /**
     * Get recent knowledge entries
     */
    getRecent(limit: number = 20): KnowledgeEntry[] {
        if (!db) return [];

        const results = db.exec(`
      SELECT * FROM knowledge 
      ORDER BY updated_at DESC
      LIMIT ${limit}
    `);

        return this.mapResults(results);
    }

    /**
     * Update a metric value
     */
    updateMetric(name: string, value: number, metadata?: string) {
        if (!db) return;

        const safeName = name.replace(/'/g, "''");
        const safeMeta = (metadata || '').replace(/'/g, "''");

        db.run(`
      INSERT OR REPLACE INTO metrics (metric_name, metric_value, metadata, updated_at)
      VALUES ('${safeName}', ${value}, '${safeMeta}', datetime('now'))
    `);
        saveDb();
    }

    /**
     * Get a metric value
     */
    getMetric(name: string): { value: number; metadata?: string } | null {
        if (!db) return null;

        const result = db.exec(`
      SELECT metric_value, metadata FROM metrics WHERE metric_name = '${name.replace(/'/g, "''")}'
    `);

        if (result.length === 0 || result[0].values.length === 0) return null;

        return {
            value: result[0].values[0][0] as number,
            metadata: result[0].values[0][1] as string
        };
    }

    /**
     * Log a training run
     */
    logTraining(source: string, entriesAdded: number, entriesUpdated: number, status: string, error?: string) {
        if (!db) return;

        db.run(`
      INSERT INTO training_logs (source, entries_added, entries_updated, status, error_message)
      VALUES ('${source.replace(/'/g, "''")}', ${entriesAdded}, ${entriesUpdated}, 
              '${status.replace(/'/g, "''")}', '${(error || '').replace(/'/g, "''")}')
    `);
        saveDb();
    }

    /**
     * Get training statistics
     */
    getTrainingStats(): { total: number; lastRun: string | null; sources: string[] } {
        if (!db) return { total: 0, lastRun: null, sources: [] };

        const total = db.exec('SELECT COUNT(*) as count FROM knowledge');
        const lastRun = db.exec('SELECT created_at FROM training_logs ORDER BY created_at DESC LIMIT 1');
        const sources = db.exec('SELECT DISTINCT source FROM knowledge');

        return {
            total: (total[0]?.values[0]?.[0] as number) || 0,
            lastRun: (lastRun[0]?.values[0]?.[0] as string) || null,
            sources: (sources[0]?.values || []).map(v => v[0] as string)
        };
    }



    /**
     * Enqueue a post
     */
    enqueuePost(post: { title: string; content: string; platform: string; priority?: number; scheduledFor?: string }): number {
        if (!db) return 0;

        const safeTitle = (post.title || '').replace(/'/g, "''");
        const safeContent = post.content.replace(/'/g, "''");

        db.run(`
       INSERT INTO post_queue (title, content, platform, priority, status, scheduled_for, created_at)
       VALUES ('${safeTitle}', '${safeContent}', '${post.platform}', ${post.priority || 1}, 'pending', 
               '${post.scheduledFor || ''}', datetime('now'))
     `);

        saveDb();
        const result = db.exec('SELECT last_insert_rowid()');
        return result[0]?.values[0]?.[0] as number || 0;
    }

    /**
     * Dequeue next pending post
     */
    dequeueNextPost(): QueueItem | null {
        if (!db) return null;

        // Get highest priority, oldest pending item
        const result = db.exec(`
       SELECT * FROM post_queue 
       WHERE status = 'pending' 
       AND (scheduled_for IS NULL OR scheduled_for = '' OR scheduled_for <= datetime('now'))
       ORDER BY priority DESC, created_at ASC
       LIMIT 1
     `);

        if (result.length === 0 || result[0].values.length === 0) return null;

        const columns = result[0].columns;
        const row = result[0].values[0];
        const item: any = {};
        columns.forEach((col, i) => item[col] = row[i]);

        return {
            id: item.id,
            title: item.title,
            content: item.content,
            platform: item.platform,
            priority: item.priority,
            status: item.status,
            createdAt: item.created_at
        };
    }

    /**
     * Update post status
     */
    updatePostStatus(id: number, status: 'processing' | 'done' | 'failed') {
        if (!db) return;

        db.run(`
       UPDATE post_queue 
       SET status = '${status}', processed_at = datetime('now')
       WHERE id = ${id}
     `);
        saveDb();
    }

    /**
     * Map database results to KnowledgeEntry
     */
    private mapResults(results: any[]): KnowledgeEntry[] {
        if (results.length === 0) return [];

        const columns = results[0].columns;
        return results[0].values.map((row: any[]) => {
            const entry: any = {};
            columns.forEach((col: string, i: number) => {
                const key = col === 'created_at' ? 'createdAt' :
                    col === 'updated_at' ? 'updatedAt' : col;
                entry[key] = row[i];
            });
            return entry as KnowledgeEntry;
        });
    }
}

export const storage = new KnowledgeStorage();
