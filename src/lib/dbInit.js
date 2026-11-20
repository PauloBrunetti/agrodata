// Aplica os scripts SQL da pasta database/.
// Os arquivos usam DELIMITER (comando do cliente mysql/Workbench); aqui eles são divididos
// em comandos individuais respeitando o delimitador atual e enviados um a um ao servidor.
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { connectionConfig } = require('./db');

const DIR = path.join(__dirname, '..', '..', 'database');
const SCHEMA = ['01_schema.sql'];
// Objetos idempotentes (podem ser reaplicados a cada inicialização)
const OBJECTS = ['02_views.sql', '03_auditoria_indices.sql', '04_triggers.sql', '05_procedures.sql'];
const SEED = ['06_seed.sql'];

/** Divide um script em comandos, tratando `DELIMITER x`, comentários e strings. */
function splitSql(sql) {
  const statements = [];
  let delimiter = ';';
  let buf = '';
  const lines = sql.replace(/\r\n/g, '\n').split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*DELIMITER\s+(\S+)\s*$/i);
    if (m) {
      if (buf.trim()) statements.push(buf.trim());
      buf = '';
      delimiter = m[1];
      continue;
    }
    if (/^\s*--/.test(line) && !buf.trim()) continue; // comentário fora de comando
    buf += `${line}\n`;
    // termina o comando quando a linha (sem comentário final) acaba com o delimitador
    const trimmed = line.replace(/\s+--\s.*$/, '').trimEnd();
    if (trimmed.endsWith(delimiter) && !insideString(buf)) {
      const stmt = buf.trimEnd();
      statements.push(stmt.slice(0, stmt.lastIndexOf(delimiter)).trim());
      buf = '';
    }
  }
  if (buf.trim()) statements.push(buf.trim());
  return statements.filter((s) => s && !/^(--[^\n]*\n?\s*)+$/.test(s));
}

function insideString(text) {
  let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') i += 1;
      else if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
    } else if (ch === '-' && text[i + 1] === '-' && /\s/.test(text[i + 2] || ' ')) {
      const nl = text.indexOf('\n', i);
      if (nl === -1) break;
      i = nl;
    }
  }
  return quote !== null;
}

async function runFile(conn, name) {
  const sql = fs.readFileSync(path.join(DIR, name), 'utf8');
  for (const stmt of splitSql(sql)) {
    await conn.query(stmt);
  }
}

async function withConnection(fn) {
  const conn = await mysql.createConnection(connectionConfig());
  try {
    return await fn(conn);
  } finally {
    await conn.end();
  }
}

async function isInitialized(conn) {
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'propriedade'"
  );
  return rows[0].n > 0;
}

/**
 * @param {{seed?: boolean, seedOnly?: boolean, onlyIfEmpty?: boolean, log?: Function}} opts
 *  - onlyIfEmpty: se as tabelas já existem, só (re)aplica views/índices/triggers/procedures, sem tocar nos dados
 */
async function initDatabase(opts = {}) {
  const log = opts.log || console.log;
  return withConnection(async (conn) => {
    if (opts.seedOnly) {
      for (const f of SEED) await runFile(conn, f);
      log('[db] dados de demonstração recarregados');
      return { seeded: true };
    }
    const existed = await isInitialized(conn);
    if (!existed || !opts.onlyIfEmpty) {
      for (const f of SCHEMA) await runFile(conn, f);
      log('[db] estrutura aplicada (17 tabelas do modelo)');
    }
    for (const f of OBJECTS) await runFile(conn, f);
    log('[db] views, auditoria, índices, triggers e procedures aplicados');
    const seed = opts.onlyIfEmpty ? !existed && opts.seed : opts.seed;
    if (seed) {
      for (const f of SEED) await runFile(conn, f);
      log('[db] dados de demonstração inseridos');
    }
    return { existed, seeded: Boolean(seed) };
  });
}

module.exports = { initDatabase, splitSql };
