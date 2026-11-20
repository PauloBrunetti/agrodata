// Indicadores do dashboard — todos calculados por consultas SQL reais ao MySQL.
// O SQL de cada indicador é devolvido junto com o resultado (campo `consultas`) para transparência.
const express = require('express');
const { query } = require('../lib/db');
const { coerce } = require('../lib/validate');
const { HttpError } = require('../lib/errors');

// /*F*/ é substituído por "AND p.id_propriedade = ?" quando há filtro de propriedade
const BASE_SAFRA = `safra s
    JOIN talhao t ON t.id_talhao = s.id_talhao
    JOIN propriedade p ON p.id_propriedade = t.id_propriedade`;

const QUERIES = [
  {
    id: 'kpis',
    titulo: 'Indicadores gerais',
    single: true,
    sql: `SELECT
  (SELECT COUNT(*) FROM propriedade p WHERE 1=1 /*F*/) AS propriedades,
  (SELECT COUNT(*) FROM talhao t JOIN propriedade p ON p.id_propriedade = t.id_propriedade WHERE 1=1 /*F*/) AS talhoes,
  (SELECT COALESCE(SUM(t.area_ha), 0) FROM talhao t JOIN propriedade p ON p.id_propriedade = t.id_propriedade WHERE 1=1 /*F*/) AS area_talhoes_ha,
  (SELECT COUNT(*) FROM ${BASE_SAFRA} WHERE s.quantidade_colhida_kg IS NULL /*F*/) AS safras_em_andamento,
  (SELECT COALESCE(SUM(i.volume_m3), 0) FROM irrigacao i JOIN ${BASE_SAFRA} ON s.id_safra = i.id_safra WHERE 1=1 /*F*/) AS agua_total_m3,
  (SELECT COALESCE(SUM(i.volume_m3), 0) FROM irrigacao i JOIN ${BASE_SAFRA} ON s.id_safra = i.id_safra
     WHERE i.data_hora >= CURDATE() - INTERVAL 30 DAY /*F*/) AS agua_30d_m3,
  (SELECT COALESCE(SUM(a.quantidade_l), 0) FROM aplicacao_defensivo a JOIN ${BASE_SAFRA} ON s.id_safra = a.id_safra WHERE 1=1 /*F*/) AS defensivos_total_l,
  (SELECT COUNT(*) FROM ocorrencia_praga o JOIN ${BASE_SAFRA} ON s.id_safra = o.id_safra
     WHERE o.nivel_infestacao = 'alto' /*F*/) AS ocorrencias_nivel_alto,
  (SELECT COUNT(*) FROM recomendacao_manejo r JOIN ${BASE_SAFRA} ON s.id_safra = r.id_safra
     WHERE r.status = 'pendente' /*F*/) AS recomendacoes_pendentes,
  (SELECT COALESCE(SUM(s.quantidade_colhida_kg), 0) FROM ${BASE_SAFRA} WHERE s.quantidade_colhida_kg IS NOT NULL /*F*/) AS producao_colhida_kg,
  (SELECT ROUND(AVG(100 * (s.quantidade_colhida_kg / t.area_ha) / c.rendimento_esperado_kg_ha), 1)
     FROM ${BASE_SAFRA} JOIN cultivo c ON c.id_cultivo = s.id_cultivo
    WHERE s.quantidade_colhida_kg IS NOT NULL /*F*/) AS produtividade_media_pct,
  (SELECT COALESCE(SUM(t.area_ha), 0) FROM ${BASE_SAFRA} WHERE s.quantidade_colhida_kg IS NULL /*F*/) AS area_em_cultivo_ha`,
  },
  {
    id: 'agua_por_metodo',
    titulo: 'Uso de água por método de irrigação (participação no total)',
    sql: `SELECT i.metodo, COUNT(*) AS eventos, SUM(i.volume_m3) AS volume_m3,
       ROUND(100 * SUM(i.volume_m3) / SUM(SUM(i.volume_m3)) OVER (), 1) AS pct
FROM irrigacao i
JOIN ${BASE_SAFRA} ON s.id_safra = i.id_safra
WHERE 1=1 /*F*/
GROUP BY i.metodo
ORDER BY volume_m3 DESC`,
  },
  {
    id: 'consumo_por_talhao',
    titulo: 'Consumo de água por talhão (m³ e m³/ha)',
    sql: `SELECT t.id_talhao, t.nome AS talhao, p.nome AS propriedade, t.area_ha,
       COUNT(i.id_irrigacao) AS eventos,
       COALESCE(SUM(i.volume_m3), 0) AS volume_m3,
       ROUND(COALESCE(SUM(i.volume_m3), 0) / t.area_ha, 2) AS m3_por_ha
FROM talhao t
JOIN propriedade p ON p.id_propriedade = t.id_propriedade
LEFT JOIN safra s ON s.id_talhao = t.id_talhao
LEFT JOIN irrigacao i ON i.id_safra = s.id_safra
WHERE 1=1 /*F*/
GROUP BY t.id_talhao, t.nome, p.nome, t.area_ha
ORDER BY volume_m3 DESC`,
  },
  {
    id: 'consumo_mensal',
    titulo: 'Consumo de água por mês e método (m³)',
    sql: `SELECT DATE_FORMAT(i.data_hora, '%Y-%m') AS mes,
       SUM(i.volume_m3) AS volume_m3,
       SUM(CASE WHEN i.metodo = 'aspersao' THEN i.volume_m3 ELSE 0 END) AS aspersao,
       SUM(CASE WHEN i.metodo = 'gotejamento' THEN i.volume_m3 ELSE 0 END) AS gotejamento,
       SUM(CASE WHEN i.metodo = 'sulco' THEN i.volume_m3 ELSE 0 END) AS sulco
FROM irrigacao i
JOIN ${BASE_SAFRA} ON s.id_safra = i.id_safra
WHERE i.data_hora >= DATE_FORMAT(CURDATE() - INTERVAL 11 MONTH, '%Y-%m-01') /*F*/
GROUP BY mes
ORDER BY mes`,
  },
  {
    id: 'produtividade',
    titulo: 'Produtividade das safras colhidas (kg/ha × esperado)',
    sql: `SELECT s.id_safra, c.nome AS cultivo, t.nome AS talhao, p.nome AS propriedade,
       s.data_prevista_colheita,
       ROUND(s.quantidade_colhida_kg / t.area_ha, 0) AS kg_por_ha,
       c.rendimento_esperado_kg_ha,
       ROUND(100 * (s.quantidade_colhida_kg / t.area_ha) / c.rendimento_esperado_kg_ha, 1) AS pct_esperado,
       ROUND((SELECT COALESCE(SUM(i.volume_m3), 0) FROM irrigacao i WHERE i.id_safra = s.id_safra)
             / (s.quantidade_colhida_kg / 1000), 2) AS m3_agua_por_tonelada
FROM ${BASE_SAFRA}
JOIN cultivo c ON c.id_cultivo = s.id_cultivo
WHERE s.quantidade_colhida_kg IS NOT NULL /*F*/
ORDER BY s.data_prevista_colheita DESC`,
  },
  {
    id: 'pragas',
    titulo: 'Ocorrências de pragas por nível de infestação',
    sql: `SELECT pr.nome_popular AS praga,
       SUM(o.nivel_infestacao = 'baixo') AS baixo,
       SUM(o.nivel_infestacao = 'medio') AS medio,
       SUM(o.nivel_infestacao = 'alto')  AS alto,
       COUNT(*) AS total
FROM ocorrencia_praga o
JOIN praga pr ON pr.id_praga = o.id_praga
JOIN ${BASE_SAFRA} ON s.id_safra = o.id_safra
WHERE 1=1 /*F*/
GROUP BY pr.nome_popular
ORDER BY total DESC, praga`,
  },
  {
    id: 'defensivos_por_safra',
    titulo: 'Uso de defensivos por safra (L e L/ha)',
    sql: `SELECT s.id_safra, c.nome AS cultivo, t.nome AS talhao, p.nome AS propriedade,
       COUNT(a.id_aplicacao) AS aplicacoes,
       SUM(a.quantidade_l) AS litros,
       ROUND(SUM(a.quantidade_l) / t.area_ha, 2) AS litros_por_ha
FROM aplicacao_defensivo a
JOIN ${BASE_SAFRA} ON s.id_safra = a.id_safra
JOIN cultivo c ON c.id_cultivo = s.id_cultivo
WHERE 1=1 /*F*/
GROUP BY s.id_safra, c.nome, t.nome, p.nome, t.area_ha
ORDER BY litros_por_ha DESC`,
  },
  {
    id: 'umidade_solo',
    titulo: 'Última leitura de umidade do solo × umidade ideal do cultivo atual',
    sql: `SELECT se.id_sensor, t.nome AS talhao, p.nome AS propriedade, l.data_hora, l.valor AS umidade_pct,
       (SELECT c.umidade_ideal_pct FROM safra s2 JOIN cultivo c ON c.id_cultivo = s2.id_cultivo
         WHERE s2.id_talhao = t.id_talhao AND s2.quantidade_colhida_kg IS NULL
         ORDER BY s2.data_plantio DESC LIMIT 1) AS umidade_ideal_pct
FROM sensor se
JOIN tipo_sensor ts ON ts.id_tipo_sensor = se.id_tipo_sensor AND ts.nome = 'Umidade do solo'
JOIN talhao t ON t.id_talhao = se.id_talhao
JOIN propriedade p ON p.id_propriedade = t.id_propriedade
JOIN leitura_sensor l ON l.id_leitura = (
  SELECT l2.id_leitura FROM leitura_sensor l2 WHERE l2.id_sensor = se.id_sensor ORDER BY l2.data_hora DESC LIMIT 1)
WHERE 1=1 /*F*/
ORDER BY l.data_hora DESC`,
  },
  {
    id: 'carencia_ativa',
    titulo: 'Safras em período de carência (colheita bloqueada)',
    sql: `SELECT a.id_aplicacao, d.nome_comercial AS defensivo, c.nome AS cultivo, t.nome AS talhao, p.nome AS propriedade,
       a.data_aplicacao, DATE_ADD(a.data_aplicacao, INTERVAL d.carencia_dias DAY) AS liberacao
FROM aplicacao_defensivo a
JOIN defensivo d ON d.id_defensivo = a.id_defensivo
JOIN ${BASE_SAFRA} ON s.id_safra = a.id_safra
JOIN cultivo c ON c.id_cultivo = s.id_cultivo
WHERE DATE_ADD(a.data_aplicacao, INTERVAL d.carencia_dias DAY) >= CURDATE() /*F*/
ORDER BY liberacao`,
  },
  {
    id: 'recomendacoes_pendentes',
    titulo: 'Recomendações de manejo pendentes',
    sql: `SELECT r.id_recomendacao, r.tipo, r.prioridade, r.descricao, r.data_geracao,
       c.nome AS cultivo, t.nome AS talhao, p.nome AS propriedade
FROM recomendacao_manejo r
JOIN ${BASE_SAFRA} ON s.id_safra = r.id_safra
JOIN cultivo c ON c.id_cultivo = s.id_cultivo
WHERE r.status = 'pendente' /*F*/
ORDER BY FIELD(r.prioridade, 'alta', 'media', 'baixa'), r.data_geracao DESC`,
  },
];

function prepare(sql, idPropriedade) {
  const count = (sql.match(/\/\*F\*\//g) || []).length;
  if (idPropriedade == null) return { sql: sql.replace(/ ?\/\*F\*\//g, ''), params: [] };
  return {
    sql: sql.replace(/\/\*F\*\//g, 'AND p.id_propriedade = ?'),
    params: Array(count).fill(idPropriedade),
  };
}

const router = express.Router();

router.get('/', async (req, res) => {
  let idPropriedade = null;
  if (req.query.id_propriedade) {
    const { value, error } = coerce({ label: 'Propriedade', type: 'fk' }, req.query.id_propriedade);
    if (error) throw new HttpError(400, error);
    idPropriedade = value;
  }
  const indicadores = {};
  const consultas = [];
  await Promise.all(
    QUERIES.map(async (q) => {
      const { sql, params } = prepare(q.sql, idPropriedade);
      const rows = await query(sql, params);
      indicadores[q.id] = q.single ? rows[0] : rows;
      consultas.push({ id: q.id, titulo: q.titulo, sql });
    })
  );
  consultas.sort((a, b) => QUERIES.findIndex((q) => q.id === a.id) - QUERIES.findIndex((q) => q.id === b.id));
  res.json({ gerado_em: new Date().toISOString(), filtro: { id_propriedade: idPropriedade }, indicadores, consultas });
});

module.exports = router;
module.exports.QUERIES = QUERIES;
