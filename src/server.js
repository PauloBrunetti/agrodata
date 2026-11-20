require('dotenv').config({ quiet: true });
const { createApp } = require('./app');
const { initDatabase } = require('./lib/dbInit');

const PORT = Number(process.env.PORT) || 3000;

async function main() {
  // Em um banco vazio (ex.: primeiro deploy), cria a estrutura e carrega os dados de demonstração.
  if (process.env.AUTO_INIT_DB !== 'false') {
    try {
      await initDatabase({ onlyIfEmpty: true, seed: true });
    } catch (err) {
      console.error('[db] não foi possível verificar/inicializar o banco:', err.message);
    }
  }
  createApp().listen(PORT, () => console.log(`AgroData rodando em http://localhost:${PORT}`));
}

main();
