import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_FILE = path.join(__dirname, '../logs/activity.json');

export async function logActivity(logEntry) {
  try {
    let logs = [];
    
    // Read existing logs
    try {
      const data = await fs.readFile(LOG_FILE, 'utf-8');
      logs = JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet, start with empty array
      logs = [];
    }

    // Add new log entry
    logs.push({
      id: Date.now(),
      ...logEntry
    });

    // Keep only last 100 logs
    if (logs.length > 100) {
      logs = logs.slice(-100);
    }

    // Write back to file
    await fs.writeFile(LOG_FILE, JSON.stringify(logs, null, 2));

    return true;
  } catch (error) {
    console.error('Logging error:', error);
    return false;
  }
}

export async function getLogs() {
  try {
    const data = await fs.readFile(LOG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Return empty array if file doesn't exist
    return [];
  }
}
