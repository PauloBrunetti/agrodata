// Conexão com o MySQL via pool (mysql2/promise).
// Aceita DATABASE_URL / MYSQL_URL (formato mysql://user:senha@host:porta/banco — padrão do Railway)
// ou variáveis separadas DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME.
const mysql = require('mysql2/promise');

function connectionConfig(overrides = {}) {
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL;
  let base;
  if (url) {
    const u = new URL(url);
    base = {
      host: u.hostname,
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, '') || undefined,
    };
  } else {
    base = {
      host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
      port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
      user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
      password: process.env.DB_PASSWORD ?? process.env.MYSQLPASSWORD ?? '',
      database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'agrodata',
    };
  }
  const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
  return {
    ...base,
    ssl,
    charset: 'utf8mb4',
    timezone: 'Z',
    dateStrings: true, // DATE/DATETIME voltam como texto, sem conversão de fuso
    decimalNumbers: true, // DECIMAL volta como número
    ...overrides,
  };
}

let pool;
function getPool() {
  if (!pool) {
    pool = mysql.createPool({ ...connectionConfig(), waitForConnections: true, connectionLimit: 10 });
  }
  return pool;
}

async function query(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = { connectionConfig, getPool, query, closePool };
