// Fábrica de rotas REST genéricas a partir da definição de um recurso.
const express = require('express');
const { query } = require('./db');
const { validateBody, coerce } = require('./validate');
const { HttpError } = require('./errors');

const MAX_LIMIT = 200;

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'ID inválido');
  return id;
}

/** Monta WHERE a partir da busca textual e dos filtros declarados. */
function buildWhere(def, q) {
  const clauses = [];
  const params = [];
  if (q.q && def.search && def.search.length) {
    const term = `%${String(q.q).trim()}%`;
    clauses.push(`(${def.search.map((c) => `${c} LIKE ?`).join(' OR ')})`);
    def.search.forEach(() => params.push(term));
  }
  for (const f of def.filters || []) {
    const raw = q[f.param];
    if (raw === undefined || raw === '') continue;
    const fieldLike = {
      label: f.label || f.param,
      type: f.ref ? 'fk' : f.type || 'text',
      options: f.options,
    };
    const { value, error } = coerce(fieldLike, raw);
    if (error) throw new HttpError(400, `Filtro inválido: ${error}`);
    if (f.clause) {
      clauses.push(f.clause(value));
    } else {
      clauses.push(`${f.sql} ${f.op || '='} ?`);
      params.push(value);
    }
  }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

function createCrudRouter(name, def) {
  const router = express.Router();
  const selectCols = def.columns.map((c) => `${c.sql} AS \`${c.key}\``).join(',\n  ');
  const fieldNames = def.fields.map((f) => f.name);

  async function findRow(id) {
    const rows = await query(`SELECT * FROM \`${def.table}\` WHERE \`${def.pk}\` = ?`, [id]);
    if (!rows.length) throw new HttpError(404, `${def.singular} não encontrado(a)`);
    return rows[0];
  }

  async function runValidations(data) {
    let errors = def.validate ? def.validate(data) : null;
    if (!errors && def.validateAsync) errors = await def.validateAsync(data, query);
    if (errors) throw new HttpError(400, 'Dados inválidos', errors);
  }

  // Listagem com busca, filtros, ordenação e paginação
  router.get('/', async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), MAX_LIMIT);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const { where, params } = buildWhere(def, req.query);

    let orderBy = def.order;
    const sortCol = def.columns.find((c) => c.key === req.query.sort);
    if (sortCol) orderBy = `${sortCol.sql} ${req.query.dir === 'desc' ? 'DESC' : 'ASC'}`;

    const rows = await query(
      `SELECT\n  ${selectCols}\nFROM ${def.from}\n${where}\nORDER BY ${orderBy}\nLIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );
    const [agg] = await query(
      `SELECT COUNT(*) AS total${def.summary ? `, ${def.summary}` : ''} FROM ${def.from} ${where}`,
      params
    );
    const { total, ...summary } = agg;
    res.json({ data: rows, total, page, limit, pages: Math.ceil(total / limit) || 1, summary });
  });

  // Opções para campos de seleção (id + rótulo legível)
  router.get('/options', async (req, res) => {
    const label = def.optionLabel || `x.${def.pk}`;
    const rows = await query(
      `SELECT x.\`${def.pk}\` AS id, ${label} AS label FROM ${def.from} ORDER BY ${def.order} LIMIT 1000`
    );
    res.json(rows);
  });

  router.get('/:id', async (req, res) => {
    res.json(await findRow(parseId(req.params.id)));
  });

  router.post('/', async (req, res) => {
    const { data, errors } = validateBody(def.fields, req.body);
    if (Object.keys(errors).length) throw new HttpError(400, 'Dados inválidos', errors);
    await runValidations(data);
    const cols = Object.keys(data);
    const result = await query(
      `INSERT INTO \`${def.table}\` (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => data[c])
    );
    res.status(201).json(await findRow(result.insertId));
  });

  async function update(req, res, partial) {
    const id = parseId(req.params.id);
    const current = await findRow(id);
    const { data, errors } = validateBody(def.fields, req.body, partial);
    if (Object.keys(errors).length) throw new HttpError(400, 'Dados inválidos', errors);
    const cols = Object.keys(data);
    if (!cols.length) throw new HttpError(400, 'Nenhum campo para atualizar');
    const merged = {};
    for (const f of fieldNames) merged[f] = Object.prototype.hasOwnProperty.call(data, f) ? data[f] : current[f];
    await runValidations(merged);
    await query(
      `UPDATE \`${def.table}\` SET ${cols.map((c) => `\`${c}\` = ?`).join(', ')} WHERE \`${def.pk}\` = ?`,
      [...cols.map((c) => data[c]), id]
    );
    res.json(await findRow(id));
  }
  router.put('/:id', (req, res) => update(req, res, false));
  router.patch('/:id', (req, res) => update(req, res, true));

  router.delete('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    await findRow(id);
    await query(`DELETE FROM \`${def.table}\` WHERE \`${def.pk}\` = ?`, [id]);
    res.status(204).end();
  });

  return router;
}

/** Metadados públicos (sem SQL) para o frontend montar telas. */
function publicMeta(resources) {
  const out = {};
  for (const [name, def] of Object.entries(resources)) {
    out[name] = {
      label: def.label,
      singular: def.singular,
      group: def.group,
      pk: def.pk,
      fields: def.fields,
      columns: def.columns.map(({ key, label, type }) => ({ key, label, type })),
      filters: (def.filters || []).map(({ param, label, ref, type, options }) => ({ param, label, ref, type, options })),
      searchable: Boolean(def.search && def.search.length),
      hasSummary: Boolean(def.summary),
    };
  }
  return out;
}

module.exports = { createCrudRouter, publicMeta, buildWhere };
