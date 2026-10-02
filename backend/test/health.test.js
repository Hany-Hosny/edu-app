import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app, { pool } from '../src/server.js';

test('GET /health returns a JSON health response', async () => {
  const originalQuery = pool.query;
  pool.query = async () => ({ rows: [{ '?column?': 1 }] });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
  await new Promise((resolve) => server.close(resolve));
  pool.query = originalQuery;
  await pool.end();
});
