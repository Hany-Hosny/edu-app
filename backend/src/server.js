import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import pg from 'pg';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;
const app = express();
const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5050),
  dbHost: process.env.DB_HOST,
  dbPort: Number(process.env.DB_PORT || 5432),
  dbName: process.env.DB_NAME,
  dbUser: process.env.DB_USER,
  dbPassword: process.env.DB_PASSWORD,
  corsOrigin: process.env.CORS_ORIGIN || '*',
};

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  ssl:
    process.env.DB_SSL === "true"
      ? { rejectUnauthorized: false }
      : false,
});

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));

async function health(_req, res, next) {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
}

app.get('/health', health);
app.get('/api/health', health);

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      teacher_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS homework (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
      description TEXT,
      due_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE homework ADD COLUMN IF NOT EXISTS description TEXT;
  `);
}

app.get('/api/courses', async (_req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM courses ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/courses', async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const teacherName = String(req.body?.teacher_name || '').trim() || null;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const result = await pool.query(
      'INSERT INTO courses (name, teacher_name) VALUES ($1, $2) RETURNING *',
      [name, teacherName],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.get('/api/homework', async (_req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT homework.*, courses.name AS course_name
      FROM homework LEFT JOIN courses ON courses.id = homework.course_id
      ORDER BY homework.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/homework', async (req, res, next) => {
  try {
    const title = String(req.body?.title || '').trim();
    const courseId = req.body?.course_id ? Number(req.body.course_id) : null;
    const description = String(req.body?.description || '').trim() || null;
    const dueDate = req.body?.due_date || null;
    if (!title) return res.status(400).json({ error: 'title is required' });
    if (courseId !== null && !Number.isInteger(courseId)) {
      return res.status(400).json({ error: 'course_id must be an integer' });
    }
    const result = await pool.query(
      'INSERT INTO homework (title, course_id, description, due_date) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, courseId, description, dueDate],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: config.nodeEnv === 'production' ? 'Internal server error' : error.message });
});

let server;
export async function start() {
  const required = ['dbHost', 'dbName', 'dbUser', 'dbPassword'];
  const missing = required.filter((key) => !config[key]);
  if (missing.length) throw new Error(`Missing database configuration: ${missing.join(', ')}`);
  await ensureSchema();
  server = app.listen(config.port, '0.0.0.0', () => console.log(`Backend listening on ${config.port}`));
  return server;
}

async function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end();
}

process.once('SIGTERM', () => shutdown('SIGTERM').finally(() => process.exit(0)));
process.once('SIGINT', () => shutdown('SIGINT').finally(() => process.exit(0)));

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  start().catch((error) => {
    console.error('Failed to start backend', error);
    process.exit(1);
  });
}

export default app;
