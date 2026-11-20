-- AgroData — tabela de auditoria e índices de otimização
-- Script idempotente: pode ser executado mais de uma vez sem erro.
-- No MySQL Workbench / cliente mysql, execute o arquivo inteiro (usa DELIMITER).

-- ------------------------------------------------------------------
-- 1. Auditoria: histórico de INSERT / UPDATE / DELETE alimentado por TRIGGERS (ver 04_triggers.sql)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `auditoria` (
  `id_auditoria` bigint NOT NULL AUTO_INCREMENT,
  `tabela` varchar(40) NOT NULL,
  `operacao` enum('INSERT','UPDATE','DELETE') NOT NULL,
  `id_registro` int NOT NULL,
  `dados_antigos` json DEFAULT NULL,
  `dados_novos` json DEFAULT NULL,
  `usuario_banco` varchar(120) NOT NULL,
  `data_hora` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_auditoria`),
  KEY `idx_auditoria_tabela_registro` (`tabela`, `id_registro`),
  KEY `idx_auditoria_data` (`data_hora`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------------------
-- 2. Índices para as consultas mais frequentes da aplicação e do dashboard
--    (o MySQL não tem CREATE INDEX IF NOT EXISTS; o procedimento auxiliar verifica antes de criar)
-- ------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_aux_criar_indice`;

DELIMITER $$
CREATE PROCEDURE `sp_aux_criar_indice`(IN p_tabela VARCHAR(64), IN p_indice VARCHAR(64), IN p_colunas VARCHAR(255))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = p_tabela AND index_name = p_indice
  ) THEN
    SET @ddl = CONCAT('CREATE INDEX `', p_indice, '` ON `', p_tabela, '` (', p_colunas, ')');
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

-- Consumo de água por safra e período (dashboard, filtros por data)
CALL sp_aux_criar_indice('irrigacao', 'idx_irrigacao_safra_data', '`id_safra`, `data_hora`');
CALL sp_aux_criar_indice('irrigacao', 'idx_irrigacao_data', '`data_hora`');
-- Safras em andamento / colhidas por talhão
CALL sp_aux_criar_indice('safra', 'idx_safra_talhao_plantio', '`id_talhao`, `data_plantio`');
-- Ocorrências por nível de infestação (KPI "nível alto")
CALL sp_aux_criar_indice('ocorrencia_praga', 'idx_ocorrencia_nivel', '`nivel_infestacao`');
-- Recomendações pendentes ordenadas por prioridade
CALL sp_aux_criar_indice('recomendacao_manejo', 'idx_recomendacao_status_prioridade', '`status`, `prioridade`');
-- Aplicações por data (período de carência)
CALL sp_aux_criar_indice('aplicacao_defensivo', 'idx_aplicacao_data', '`data_aplicacao`');
-- Previsões por propriedade e data
CALL sp_aux_criar_indice('previsao_climatica', 'idx_previsao_propriedade_data', '`id_propriedade`, `data_hora`');

DROP PROCEDURE IF EXISTS `sp_aux_criar_indice`;
