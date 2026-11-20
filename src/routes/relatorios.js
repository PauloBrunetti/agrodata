// Relatórios e operações implementados como STORED PROCEDURES no MySQL (database/05_procedures.sql)
const express = require('express');
const { query } = require('../lib/db');
const { coerce } = require('../lib/validate');
const { HttpError } = require('../lib/errors');

const router = express.Router();

function need(field, raw) {
  const { value, error } = coerce(field, raw);
  if (error) throw new HttpError(400, error);
  return value;
}

// CALL sp_consumo_agua_periodo(id_propriedade | NULL, inicio, fim)
router.get('/consumo-agua', async (req, res) => {
  const inicio = need({ label: 'Data inicial', type: 'date', required: true }, req.query.de);
  const fim = need({ label: 'Data final', type: 'date', required: true }, req.query.ate);
  const idProp = need({ label: 'Propriedade', type: 'fk' }, req.query.id_propriedade);
  const [rows] = await query('CALL sp_consumo_agua_periodo(?, ?, ?)', [idProp, inicio, fim]);
  res.json({ procedure: 'sp_consumo_agua_periodo', parametros: { id_propriedade: idProp, de: inicio, ate: fim }, data: rows });
});

// CALL sp_resumo_safra(id_safra)
router.get('/safras/:id', async (req, res) => {
  const id = need({ label: 'Safra', type: 'fk', required: true }, req.params.id);
  const [rows] = await query('CALL sp_resumo_safra(?)', [id]);
  res.json({ procedure: 'sp_resumo_safra', data: rows[0] });
});

// CALL sp_registrar_colheita(id_safra, quantidade_kg)
router.post('/safras/:id/colheita', async (req, res) => {
  const id = need({ label: 'Safra', type: 'fk', required: true }, req.params.id);
  const kg = need(
    { label: 'Quantidade colhida (kg)', type: 'decimal', required: true, gt: 0, max: 9999999999.99 },
    req.body && req.body.quantidade_colhida_kg
  );
  const [rows] = await query('CALL sp_registrar_colheita(?, ?)', [id, kg]);
  res.json({ procedure: 'sp_registrar_colheita', data: rows[0] });
});

module.exports = router;
