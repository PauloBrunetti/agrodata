// Aplica os scripts SQL da pasta database/ (estrutura, views e dados de demonstração).
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { connectionConfig } = require('./db');

const DIR = path.join(__dirname, '..', '..', 'database');
const FILES = { schema: '01_schema.sql', views: '02_views.sql', seed: '03_seed.sql' };

async function withConnection(fn) {
  const conn = await mysql.createConnection(connectionConfig({ multipleStatements: true }));
  try {
    return await fn(conn);
  } finally {
    await conn.end();
  }
}

async function runFile(conn, name) {
  const sql = fs.readFileSync(path.join(DIR, name), 'utf8');
  await conn.query(sql);
}

async function isInitialized(conn) {
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'propriedade'"
  );
  return rows[0].n > 0;
}

/**
 * @param {{seed?: boolean, seedOnly?: boolean, onlyIfEmpty?: boolean, log?: Function}} opts
 */
async function initDatabase(opts = {}) {
  const log = opts.log || console.log;
  return withConnection(async (conn) => {
    if (opts.onlyIfEmpty && (await isInitialized(conn))) {
      log('[db] estrutura já existe — inicialização ignorada');
      return { skipped: true };
    }
    if (!opts.seedOnly) {
      await runFile(conn, FILES.schema);
      log('[db] estrutura aplicada (17 tabelas)');
      await runFile(conn, FILES.views);
      log('[db] views aplicadas');
    }
    if (opts.seed || opts.seedOnly) {
      await runFile(conn, FILES.seed);
      log('[db] dados de demonstração inseridos');
    }
    return { skipped: false };
  });
}

module.exports = { initDatabase };
