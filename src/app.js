// Montagem da aplicação Express: API REST em /api e frontend estático em /
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const resources = require('./resources');
const { createCrudRouter, publicMeta } = require('./lib/crud');
const { errorHandler } = require('./lib/errors');
const { query } = require('./lib/db');
const dashboardRouter = require('./routes/dashboard');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { 'default-src': ["'self'"], 'img-src': ["'self'", 'data:'], 'script-src': ["'self'"] },
      },
    })
  );
  app.use(express.json({ limit: '100kb' }));

  const api = express.Router();

  api.get('/health', async (req, res) => {
    try {
      const [row] = await query('SELECT VERSION() AS versao, DATABASE() AS banco');
      res.json({ status: 'ok', mysql: row });
    } catch (err) {
      res.status(503).json({ status: 'erro', error: 'Banco de dados indisponível' });
    }
  });

  const meta = publicMeta(resources);
  api.get('/meta', (req, res) => res.json(meta));
  api.use('/dashboard', dashboardRouter);
  for (const [name, def] of Object.entries(resources)) {
    api.use(`/${name}`, createCrudRouter(name, def));
  }
  api.use((req, res) => res.status(404).json({ error: 'Rota da API não encontrada' }));

  app.use('/api', api);

  // Frontend
  const chartJs = path.join(__dirname, '..', 'node_modules', 'chart.js', 'dist', 'chart.umd.min.js');
  app.get('/vendor/chart.umd.js', (req, res) => res.sendFile(chartJs));
  app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
