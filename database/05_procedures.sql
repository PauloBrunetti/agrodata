-- AgroData — STORED PROCEDURES e FUNCTION
-- Script idempotente. Execute o arquivo inteiro no Workbench / cliente mysql.

DROP FUNCTION IF EXISTS `fn_m3_agua_por_tonelada`;
DROP PROCEDURE IF EXISTS `sp_registrar_colheita`;
DROP PROCEDURE IF EXISTS `sp_consumo_agua_periodo`;
DROP PROCEDURE IF EXISTS `sp_resumo_safra`;

DELIMITER $$

-- ------------------------------------------------------------------
-- Eficiência hídrica: m³ de água irrigada por tonelada colhida (NULL se a safra não foi colhida)
-- ------------------------------------------------------------------
CREATE FUNCTION `fn_m3_agua_por_tonelada`(p_id_safra INT)
RETURNS DECIMAL(12,2)
READS SQL DATA
BEGIN
  DECLARE v_agua DECIMAL(14,2);
  DECLARE v_kg DECIMAL(12,2);
  SELECT quantidade_colhida_kg INTO v_kg FROM safra WHERE id_safra = p_id_safra;
  IF v_kg IS NULL OR v_kg = 0 THEN
    RETURN NULL;
  END IF;
  SELECT COALESCE(SUM(volume_m3), 0) INTO v_agua FROM irrigacao WHERE id_safra = p_id_safra;
  RETURN ROUND(v_agua / (v_kg / 1000), 2);
END$$

-- ------------------------------------------------------------------
-- Registra a colheita de uma safra em andamento, com validações, e devolve a produtividade obtida.
-- Uso: CALL sp_registrar_colheita(5, 36000);
-- ------------------------------------------------------------------
CREATE PROCEDURE `sp_registrar_colheita`(IN p_id_safra INT, IN p_quantidade_kg DECIMAL(12,2))
BEGIN
  DECLARE v_plantio DATE;
  DECLARE v_colhido DECIMAL(12,2);
  DECLARE v_existe INT DEFAULT 0;

  SELECT COUNT(*), MAX(data_plantio), MAX(quantidade_colhida_kg)
    INTO v_existe, v_plantio, v_colhido
    FROM safra WHERE id_safra = p_id_safra;

  IF v_existe = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Safra não encontrada';
  END IF;
  IF v_colhido IS NOT NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Esta safra já teve a colheita registrada';
  END IF;
  IF p_quantidade_kg IS NULL OR p_quantidade_kg <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A quantidade colhida deve ser maior que zero';
  END IF;
  IF CURDATE() < v_plantio THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A colheita não pode ser anterior ao plantio';
  END IF;

  UPDATE safra SET quantidade_colhida_kg = p_quantidade_kg WHERE id_safra = p_id_safra;

  SELECT s.id_safra, c.nome AS cultivo, t.nome AS talhao, p.nome AS propriedade,
         s.quantidade_colhida_kg,
         ROUND(s.quantidade_colhida_kg / t.area_ha, 2) AS kg_por_ha,
         c.rendimento_esperado_kg_ha,
         ROUND(100 * (s.quantidade_colhida_kg / t.area_ha) / c.rendimento_esperado_kg_ha, 1) AS pct_esperado,
         fn_m3_agua_por_tonelada(s.id_safra) AS m3_agua_por_tonelada
    FROM safra s
    JOIN talhao t ON t.id_talhao = s.id_talhao
    JOIN propriedade p ON p.id_propriedade = t.id_propriedade
    JOIN cultivo c ON c.id_cultivo = s.id_cultivo
   WHERE s.id_safra = p_id_safra;
END$$

-- ------------------------------------------------------------------
-- Consumo de água por talhão em um período (propriedade opcional: NULL = todas)
-- Uso: CALL sp_consumo_agua_periodo(NULL, '2026-01-01', '2026-12-31');
-- ------------------------------------------------------------------
CREATE PROCEDURE `sp_consumo_agua_periodo`(IN p_id_propriedade INT, IN p_inicio DATE, IN p_fim DATE)
BEGIN
  IF p_inicio IS NULL OR p_fim IS NULL OR p_fim < p_inicio THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Período inválido: informe início e fim (fim >= início)';
  END IF;

  SELECT p.nome AS propriedade, t.nome AS talhao, t.area_ha,
         COUNT(i.id_irrigacao) AS eventos,
         COALESCE(SUM(i.volume_m3), 0) AS volume_m3,
         ROUND(COALESCE(SUM(i.volume_m3), 0) / t.area_ha, 2) AS m3_por_ha,
         COALESCE(SUM(i.duracao_min), 0) AS minutos_irrigados
    FROM talhao t
    JOIN propriedade p ON p.id_propriedade = t.id_propriedade
    LEFT JOIN safra s ON s.id_talhao = t.id_talhao
    LEFT JOIN irrigacao i ON i.id_safra = s.id_safra
                         AND DATE(i.data_hora) BETWEEN p_inicio AND p_fim
   WHERE p_id_propriedade IS NULL OR p.id_propriedade = p_id_propriedade
   GROUP BY p.nome, t.id_talhao, t.nome, t.area_ha
   ORDER BY volume_m3 DESC, p.nome, t.nome;
END$$

-- ------------------------------------------------------------------
-- Resumo de sustentabilidade de uma safra: água, defensivos, pragas e produtividade
-- Uso: CALL sp_resumo_safra(1);
-- ------------------------------------------------------------------
CREATE PROCEDURE `sp_resumo_safra`(IN p_id_safra INT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM safra WHERE id_safra = p_id_safra) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Safra não encontrada';
  END IF;

  SELECT s.id_safra, c.nome AS cultivo, t.nome AS talhao, p.nome AS propriedade, t.area_ha,
         s.data_plantio, s.data_prevista_colheita,
         IF(s.quantidade_colhida_kg IS NULL, 'em andamento', 'colhida') AS situacao,
         (SELECT COUNT(*) FROM irrigacao i WHERE i.id_safra = s.id_safra) AS irrigacoes,
         (SELECT COALESCE(SUM(i.volume_m3), 0) FROM irrigacao i WHERE i.id_safra = s.id_safra) AS agua_m3,
         ROUND((SELECT COALESCE(SUM(i.volume_m3), 0) FROM irrigacao i WHERE i.id_safra = s.id_safra) / t.area_ha, 2) AS agua_m3_por_ha,
         (SELECT COUNT(*) FROM aplicacao_defensivo a WHERE a.id_safra = s.id_safra) AS aplicacoes,
         (SELECT COALESCE(SUM(a.quantidade_l), 0) FROM aplicacao_defensivo a WHERE a.id_safra = s.id_safra) AS defensivos_l,
         ROUND((SELECT COALESCE(SUM(a.quantidade_l), 0) FROM aplicacao_defensivo a WHERE a.id_safra = s.id_safra) / t.area_ha, 2) AS defensivos_l_por_ha,
         (SELECT COUNT(*) FROM ocorrencia_praga o WHERE o.id_safra = s.id_safra) AS ocorrencias,
         (SELECT COUNT(*) FROM ocorrencia_praga o WHERE o.id_safra = s.id_safra AND o.nivel_infestacao = 'alto') AS ocorrencias_alto,
         s.quantidade_colhida_kg,
         ROUND(s.quantidade_colhida_kg / t.area_ha, 2) AS kg_por_ha,
         c.rendimento_esperado_kg_ha,
         ROUND(100 * (s.quantidade_colhida_kg / t.area_ha) / c.rendimento_esperado_kg_ha, 1) AS pct_esperado,
         fn_m3_agua_por_tonelada(s.id_safra) AS m3_agua_por_tonelada
    FROM safra s
    JOIN talhao t ON t.id_talhao = s.id_talhao
    JOIN propriedade p ON p.id_propriedade = t.id_propriedade
    JOIN cultivo c ON c.id_cultivo = s.id_cultivo
   WHERE s.id_safra = p_id_safra;
END$$

DELIMITER ;
