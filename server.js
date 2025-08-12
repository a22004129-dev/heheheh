// backend/server.js
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { nanoid } = require('nanoid');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mime = require('mime-types');
const { insert, getById, deleteById, all } = require('./db');

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
const MAX_FILE_BYTES = parseInt(process.env.MAX_FILE_BYTES || '104857600', 10);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use('/upload', rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
}));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const id = nanoid(10);
    const ext = path.extname(file.originalname) || ('.' + (mime.extension(file.mimetype) || 'bin'));
    cb(null, `${id}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: MAX_FILE_BYTES } });

app.get('/ping', (req, res) => res.json({ ok: true }));

app.post('/upload', upload.array('files', 12), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'no files uploaded' });
  }

  const now = Date.now();
  const entries = req.files.map(f => {
    const storageName = path.basename(f.filename);
    const id = storageName.split('.')[0];
    const deleteToken = nanoid(40);

    insert.run({
      id,
      filename: f.originalname,
      storage_name: storageName,
      content_type: f.mimetype,
      size: f.size,
      created_at: now,
      delete_token: deleteToken,
      expires_at: null
    });

    return {
      id,
      url: `${BASE_URL}/file/${id}`,
      raw: `${BASE_URL}/raw/${id}`,
      delete_url: `${BASE_URL}/delete/${id}?token=${deleteToken}`
    };
  });

  res.json({ files: entries });
});

app.get('/file/:id', (req, res) => {
  const meta = getById.get(req.params.id);
  if (!meta) return res.status(404).send('Not found');
  const raw = `${BASE_URL}/raw/${meta.id}`;
  res.send(`<html><body><a href="${raw}">Download ${meta.filename}</a></body></html>`);
});

app.get('/raw/:id', (req, res) => {
  const meta = getById.get(req.params.id);
  if (!meta) return res.status(404).send('Not found');
  const fpath = path.join(UPLOAD_DIR, meta.storage_name);
  if (!fs.existsSync(fpath)) return res.status(410).send('File missing');
  res.setHeader('Content-Type', meta.content_type || 'application/octet-stream');
  fs.createReadStream(fpath).pipe(res);
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
