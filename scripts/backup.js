const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || './database/samfriggingpt.db';
const backupsDir = './backups';

if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupsDir, `samfriggingpt_${timestamp}.db`);

try {
    if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, backupPath);
        console.log(`[BACKUP_SUCCESS] Database backed up to ${backupPath}`);
        
        // Keep only last 10 backups
        const backups = fs.readdirSync(backupsDir)
            .filter(file => file.startsWith('samfriggingpt_') && file.endsWith('.db'))
            .map(file => ({
                name: file,
                path: path.join(backupsDir, file),
                time: fs.statSync(path.join(backupsDir, file)).mtime
            }))
            .sort((a, b) => b.time - a.time);
        
        if (backups.length > 10) {
            const toDelete = backups.slice(10);
            toDelete.forEach(backup => {
                fs.unlinkSync(backup.path);
                console.log(`[BACKUP_CLEANUP] Removed old backup: ${backup.name}`);
            });
        }
    } else {
        console.log('[BACKUP_INFO] No database file found to backup');
    }
} catch (error) {
    console.error('[BACKUP_ERROR] Backup failed:', error.message);
}
