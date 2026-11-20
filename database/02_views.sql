-- AgroData — VIEWs de apoio a relatórios (aditivas: não alteram tabelas existentes)

CREATE OR REPLACE VIEW vw_irrigacao_detalhada AS
SELECT i.id_irrigacao, i.data_hora, i.volume_m3, i.duracao_min, i.metodo,
       s.id_safra, c.nome AS cultivo,
       t.id_talhao, t.nome AS talhao, t.area_ha,
       p.id_propriedade, p.nome AS propriedade
FROM irrigacao i
JOIN safra s       ON s.id_safra = i.id_safra
JOIN cultivo c     ON c.id_cultivo = s.id_cultivo
JOIN talhao t      ON t.id_talhao = s.id_talhao
JOIN propriedade p ON p.id_propriedade = t.id_propriedade;

CREATE OR REPLACE VIEW vw_consumo_agua_talhao AS
SELECT p.id_propriedade, p.nome AS propriedade, t.id_talhao, t.nome AS talhao, t.area_ha,
       COUNT(i.id_irrigacao)              AS eventos,
       COALESCE(SUM(i.volume_m3), 0)      AS volume_total_m3,
       ROUND(COALESCE(SUM(i.volume_m3), 0) / t.area_ha, 2) AS m3_por_ha
FROM talhao t
JOIN propriedade p    ON p.id_propriedade = t.id_propriedade
LEFT JOIN safra s     ON s.id_talhao = t.id_talhao
LEFT JOIN irrigacao i ON i.id_safra = s.id_safra
GROUP BY p.id_propriedade, p.nome, t.id_talhao, t.nome, t.area_ha;

CREATE OR REPLACE VIEW vw_produtividade_safra AS
SELECT s.id_safra, p.nome AS propriedade, t.nome AS talhao, c.nome AS cultivo,
       s.data_plantio, s.data_prevista_colheita, t.area_ha,
       s.quantidade_colhida_kg,
       ROUND(s.quantidade_colhida_kg / t.area_ha, 2) AS kg_por_ha,
       c.rendimento_esperado_kg_ha,
       ROUND(100 * (s.quantidade_colhida_kg / t.area_ha) / c.rendimento_esperado_kg_ha, 1) AS pct_do_esperado
FROM safra s
JOIN talhao t      ON t.id_talhao = s.id_talhao
JOIN propriedade p ON p.id_propriedade = t.id_propriedade
JOIN cultivo c     ON c.id_cultivo = s.id_cultivo
WHERE s.quantidade_colhida_kg IS NOT NULL;
