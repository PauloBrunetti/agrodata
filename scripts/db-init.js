// Uso: npm run db:init       -> cria tabelas (se não existirem), views e insere os dados de demonstração
//      npm run db:seed       -> apenas recarrega os dados de demonstração (APAGA os dados atuais)
//      node scripts/db-init.js --no-seed -> só estrutura + views
require('dotenv').config({ quiet: true });
const { initDatabase } = require('../src/lib/dbInit');

const args = process.argv.slice(2);
initDatabase({ seedOnly: args.includes('--seed-only'), seed: !args.includes('--no-seed') })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[db] falha:', err.message);
    process.exit(1);
  });
