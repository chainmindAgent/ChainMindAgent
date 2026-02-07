import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'activity.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

export const logger = {
    info: (message: string, ...args: any[]) => {
        log('INFO', message, ...args);
    },

    warn: (message: string, ...args: any[]) => {
        log('WARN', message, ...args);
    },

    error: (message: string, ...args: any[]) => {
        log('ERROR', message, ...args);
    },

    success: (message: string, ...args: any[]) => {
        log('SUCCESS', message, ...args);
    }
};

function log(level: string, message: string, ...args: any[]) {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');

    const logMessage = `[${timestamp}] [${level}] ${message} ${formattedArgs}`.trim();

    // Console output
    switch (level) {
        case 'ERROR': console.error(logMessage); break;
        case 'WARN': console.warn(logMessage); break;
        default: console.log(logMessage);
    }

    // File output
    try {
        fs.appendFileSync(LOG_FILE, logMessage + '\n');
    } catch (e) {
        console.error('Failed to write to log file', e);
    }
}
