-- AgroData — Consultas SQL de análise (JOINs, filtros, agrupamentos, subconsultas, views e procedures)
-- Somente leitura (exceto o exemplo comentado de sp_registrar_colheita). Executar após 01–06.

-- 1. Histórico de irrigação com propriedade, talhão e cultivo (JOIN de 5 tabelas)
SELECT p.nome AS propriedade, t.nome AS talhao, c.nome AS cultivo,
       i.data_hora, i.metodo, i.volume_m3, i.duracao_min
FROM irrigacao i
JOIN safra s       ON s.id_safra = i.id_safra
JOIN talhao t      ON t.id_talhao = s.id_talhao
JOIN propriedade p ON p.id_propriedade = t.id_propriedade
JOIN cultivo c     ON c.id_cultivo = s.id_cultivo
ORDER BY i.data_hora DESC;

-- 2. Consumo de água por talhão: total e por hectare (SUM + GROUP BY)
SELECT p.nome AS propriedade, t.nome AS talhao, t.area_ha,
       SUM(i.volume_m3) AS volume_total_m3,
       ROUND(SUM(i.volume_m3) / t.area_ha, 2) AS m3_por_ha
FROM irrigacao i
JOIN safra s       ON s.id_safra = i.id_safra
JOIN talhao t      ON t.id_talhao = s.id_talhao
JOIN propriedade p ON p.id_propriedade = t.id_propriedade
GROUP BY p.nome, t.id_talhao, t.nome, t.area_ha
ORDER BY m3_por_ha DESC;

-- 3. Consumo mensal por método de irrigação (agregação condicional)
SELECT DATE_FORMAT(data_hora, '%Y-%m') AS mes,
       SUM(CASE WHEN metodo = 'aspersao'    THEN volume_m3 ELSE 0 END) AS aspersao_m3,
       SUM(CASE WHEN metodo = 'gotejamento' THEN volume_m3 ELSE 0 END) AS gotejamento_m3,
       SUM(CASE WHEN metodo = 'sulco'       THEN volume_m3 ELSE 0 END) AS sulco_m3,
       SUM(volume_m3) AS total_m3
FROM irrigacao
GROUP BY mes
ORDER BY mes;

-- 4. Eficiência por método: volume médio por minuto de irrigação
SELECT metodo, COUNT(*) AS eventos,
       ROUND(AVG(volume_m3), 2) AS volume_medio_m3,
       ROUND(SUM(volume_m3) / SUM(duracao_min), 2) AS m3_por_minuto
FROM irrigacao
GROUP BY metodo;

-- 5. Talhões que consumiram acima da média de m³/ha (subconsulta no HAVING)
SELECT t.nome AS talhao, ROUND(SUM(i.volume_m3) / t.area_ha, 2) AS m3_por_ha
FROM irrigacao i
JOIN safra s  ON s.id_safra = i.id_safra
JOIN talhao t ON t.id_talhao = s.id_talhao
GROUP BY t.id_talhao, t.nome, t.area_ha
HAVING m3_por_ha > (
  SELECT AVG(x.m3_ha) FROM (
    SELECT SUM(i2.volume_m3) / t2.area_ha AS m3_ha
    FROM irrigacao i2
    JOIN safra s2  ON s2.id_safra = i2.id_safra
    JOIN talhao t2 ON t2.id_talhao = s2.id_talhao
    GROUP BY t2.id_talhao, t2.area_ha
  ) AS x
);

-- 6. Produtividade das safras colhidas × rendimento esperado (view)
SELECT * FROM vw_produtividade_safra ORDER BY pct_do_esperado DESC;

-- 7. Eficiência hídrica: m³ de água por tonelada colhida (FUNCTION)
SELECT s.id_safra, c.nome AS cultivo, t.nome AS talhao,
       fn_m3_agua_por_tonelada(s.id_safra) AS m3_agua_por_tonelada
FROM safra s
JOIN cultivo c ON c.id_cultivo = s.id_cultivo
JOIN talhao t  ON t.id_talhao = s.id_talhao
WHERE s.quantidade_colhida_kg IS NOT NULL
ORDER BY m3_agua_por_tonelada;

-- 8. Uso de defensivos por safra em litros por hectare
SELECT s.id_safra, c.nome AS cultivo, t.nome AS talhao,
       COUNT(a.id_aplicacao) AS aplicacoes,
       SUM(a.quantidade_l) AS litros,
       ROUND(SUM(a.quantidade_l) / t.area_ha, 2) AS litros_por_ha
FROM aplicacao_defensivo a
JOIN safra s   ON s.id_safra = a.id_safra
JOIN talhao t  ON t.id_talhao = s.id_talhao
JOIN cultivo c ON c.id_cultivo = s.id_cultivo
GROUP BY s.id_safra, c.nome, t.nome, t.area_ha
ORDER BY litros_por_ha DESC;

-- 9. Aplicações e data de liberação para colheita (carência do defensivo)
SELECT a.id_aplicacao, d.nome_comercial, d.principio_ativo, a.data_aplicacao, d.carencia_dias,
       DATE_ADD(a.data_aplicacao, INTERVAL d.carencia_dias DAY) AS liberacao_colheita,
       DATE_ADD(a.data_aplicacao, INTERVAL d.carencia_dias DAY) >= CURDATE() AS em_carencia
FROM aplicacao_defensivo a
JOIN defensivo d ON d.id_defensivo = a.id_defensivo
ORDER BY liberacao_colheita DESC;

-- 10. Defensivos aplicados contra uma praga para a qual NÃO são indicados (consistência via NOT EXISTS)
SELECT a.id_aplicacao, d.nome_comercial, pr.nome_popular AS praga
FROM aplicacao_defensivo a
JOIN defensivo d          ON d.id_defensivo = a.id_defensivo
JOIN ocorrencia_praga o   ON o.id_ocorrencia = a.id_ocorrencia
JOIN praga pr             ON pr.id_praga = o.id_praga
WHERE NOT EXISTS (
  SELECT 1 FROM defensivo_praga dp WHERE dp.id_defensivo = a.id_defensivo AND dp.id_praga = o.id_praga
);

-- 11. Ocorrências de pragas por nível de infestação e cultivo
SELECT c.nome AS cultivo, pr.nome_popular AS praga, o.nivel_infestacao, COUNT(*) AS ocorrencias
FROM ocorrencia_praga o
JOIN praga pr  ON pr.id_praga = o.id_praga
JOIN safra s   ON s.id_safra = o.id_safra
JOIN cultivo c ON c.id_cultivo = s.id_cultivo
GROUP BY c.nome, pr.nome_popular, o.nivel_infestacao
ORDER BY FIELD(o.nivel_infestacao, 'alto', 'medio', 'baixo'), ocorrencias DESC;

-- 12. Ocorrências de nível alto que ainda não receberam aplicação de defensivo (LEFT JOIN ... IS NULL)
SELECT o.id_ocorrencia, pr.nome_popular, o.data_identificacao, t.nome AS talhao
FROM ocorrencia_praga o
JOIN praga pr  ON pr.id_praga = o.id_praga
JOIN safra s   ON s.id_safra = o.id_safra
JOIN talhao t  ON t.id_talhao = s.id_talhao
LEFT JOIN aplicacao_defensivo a ON a.id_ocorrencia = o.id_ocorrencia
WHERE o.nivel_infestacao = 'alto' AND a.id_aplicacao IS NULL;

-- 13. Última leitura de cada sensor (subconsulta correlacionada)
SELECT se.id_sensor, ts.nome AS tipo, t.nome AS talhao, l.data_hora, l.valor, ts.unidade_medida
FROM sensor se
JOIN tipo_sensor ts ON ts.id_tipo_sensor = se.id_tipo_sensor
JOIN talhao t       ON t.id_talhao = se.id_talhao
JOIN leitura_sensor l ON l.id_sensor = se.id_sensor
WHERE l.data_hora = (SELECT MAX(l2.data_hora) FROM leitura_sensor l2 WHERE l2.id_sensor = se.id_sensor);

-- 14. Média diária de umidade do solo por talhão comparada ao ideal do cultivo em andamento
SELECT t.nome AS talhao, DATE(l.data_hora) AS dia, ROUND(AVG(l.valor), 1) AS umidade_media,
       (SELECT c.umidade_ideal_pct FROM safra s JOIN cultivo c ON c.id_cultivo = s.id_cultivo
         WHERE s.id_talhao = t.id_talhao AND s.quantidade_colhida_kg IS NULL
         ORDER BY s.data_plantio DESC LIMIT 1) AS umidade_ideal
FROM leitura_sensor l
JOIN sensor se      ON se.id_sensor = l.id_sensor
JOIN tipo_sensor ts ON ts.id_tipo_sensor = se.id_tipo_sensor AND ts.nome = 'Umidade do solo'
JOIN talhao t       ON t.id_talhao = se.id_talhao
GROUP BY t.id_talhao, t.nome, DATE(l.data_hora)
ORDER BY t.nome, dia;

-- 15. Previsão: dias sem chuva e com umidade do ar baixa (janela crítica para irrigação)
SELECT p.nome AS propriedade, pc.data_hora, pc.temperatura_c, pc.precipitacao_mm, pc.umidade_ar_pct
FROM previsao_climatica pc
JOIN propriedade p ON p.id_propriedade = pc.id_propriedade
WHERE pc.precipitacao_mm = 0 AND pc.umidade_ar_pct < 55
ORDER BY pc.data_hora;

-- 16. Recomendações pendentes por prioridade
SELECT r.prioridade, r.tipo, r.descricao, c.nome AS cultivo, t.nome AS talhao, r.data_geracao
FROM recomendacao_manejo r
JOIN safra s   ON s.id_safra = r.id_safra
JOIN talhao t  ON t.id_talhao = s.id_talhao
JOIN cultivo c ON c.id_cultivo = s.id_cultivo
WHERE r.status = 'pendente'
ORDER BY FIELD(r.prioridade, 'alta', 'media', 'baixa'), r.data_geracao;

-- 17. Trilha de auditoria das últimas alterações (tabela preenchida pelos triggers)
SELECT data_hora, tabela, operacao, id_registro, usuario_banco, dados_antigos, dados_novos
FROM auditoria
ORDER BY data_hora DESC
LIMIT 20;

-- 18. Stored procedures
CALL sp_consumo_agua_periodo(NULL, '2026-01-01', '2026-12-31');  -- todas as propriedades
CALL sp_consumo_agua_periodo(2, '2026-08-01', '2026-11-30');     -- Sítio Vale Verde
CALL sp_resumo_safra(1);
-- CALL sp_registrar_colheita(5, 36000);  -- altera dados: registra a colheita da safra 5

-- 19. Plano de execução (verificação de uso de índice)
EXPLAIN SELECT * FROM irrigacao WHERE id_safra = 4 AND data_hora >= '2026-09-01';
