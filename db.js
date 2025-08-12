// backend/db.js
const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'meta.db');
const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  filename TEXT,
  storage_name TEXT,
  content_type TEXT,
  size INTEGER,
  created_at INTEGER,
  delete_token TEXT,
  expires_at INTEGER
);
`);

const insert = db.prepare(
  `INSERT INTO files (id, filename, storage_name, content_type, size, created_at, delete_token, expires_at)
   VALUES (@id,@filename,@storage_name,@content_type,@size,@created_at,@delete_token,@expires_at)`
);

const getById = db.prepare(`SELECT * FROM files WHERE id = ?`);
const deleteById = db.prepare(`DELETE FROM files WHERE id = ?`);
const findExpired = db.prepare(`SELECT * FROM files WHERE expires_at IS NOT NULL AND expires_at < ?`);
const all = db.prepare(`SELECT * FROM files ORDER BY created_at DESC LIMIT 200`);

module.exports = { insert, getById, deleteById, findExpired, all };
