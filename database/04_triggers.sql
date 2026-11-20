-- AgroData — TRIGGERS: regras de negócio, auditoria e recomendações automáticas
-- Script idempotente (DROP TRIGGER IF EXISTS). Execute o arquivo inteiro no Workbench / cliente mysql.
--
-- Variável de sessão @agrodata_seed: quando = 1 (definida pelo 06_seed.sql), os triggers de auditoria
-- e de recomendação automática não disparam, para a carga de demonstração não gerar registros extras.
-- As validações de regra de negócio continuam ativas sempre.

-- ==================================================================
-- 1. REGRAS DE NEGÓCIO (BEFORE) — bloqueiam dados inconsistentes com SIGNAL
-- ==================================================================

DROP TRIGGER IF EXISTS `trg_irrigacao_bi_valida`;
DROP TRIGGER IF EXISTS `trg_irrigacao_bu_valida`;
DROP TRIGGER IF EXISTS `trg_aplicacao_bi_valida`;
DROP TRIGGER IF EXISTS `trg_aplicacao_bu_valida`;
DROP TRIGGER IF EXISTS `trg_safra_bu_valida`;

DELIMITER $$

-- Irrigação não pode ser registrada antes do plantio da safra
CREATE TRIGGER `trg_irrigacao_bi_valida` BEFORE INSERT ON `irrigacao`
FOR EACH ROW
BEGIN
  DECLARE v_plantio DATE;
  SELECT data_plantio INTO v_plantio FROM safra WHERE id_safra = NEW.id_safra;
  IF v_plantio IS NOT NULL AND DATE(NEW.data_hora) < v_plantio THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Irrigação com data anterior ao plantio da safra';
  END IF;
END$$

CREATE TRIGGER `trg_irrigacao_bu_valida` BEFORE UPDATE ON `irrigacao`
FOR EACH ROW
BEGIN
  DECLARE v_plantio DATE;
  SELECT data_plantio INTO v_plantio FROM safra WHERE id_safra = NEW.id_safra;
  IF v_plantio IS NOT NULL AND DATE(NEW.data_hora) < v_plantio THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Irrigação com data anterior ao plantio da safra';
  END IF;
END$$

-- Aplicação de defensivo: data após o plantio e ocorrência (se houver) da mesma safra
CREATE TRIGGER `trg_aplicacao_bi_valida` BEFORE INSERT ON `aplicacao_defensivo`
FOR EACH ROW
BEGIN
  DECLARE v_plantio DATE;
  DECLARE v_safra_ocorrencia INT;
  SELECT data_plantio INTO v_plantio FROM safra WHERE id_safra = NEW.id_safra;
  IF v_plantio IS NOT NULL AND NEW.data_aplicacao < v_plantio THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Aplicação de defensivo com data anterior ao plantio da safra';
  END IF;
  IF NEW.id_ocorrencia IS NOT NULL THEN
    SELECT id_safra INTO v_safra_ocorrencia FROM ocorrencia_praga WHERE id_ocorrencia = NEW.id_ocorrencia;
    IF v_safra_ocorrencia <> NEW.id_safra THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'A ocorrência de praga informada pertence a outra safra';
    END IF;
  END IF;
END$$

CREATE TRIGGER `trg_aplicacao_bu_valida` BEFORE UPDATE ON `aplicacao_defensivo`
FOR EACH ROW
BEGIN
  DECLARE v_plantio DATE;
  DECLARE v_safra_ocorrencia INT;
  SELECT data_plantio INTO v_plantio FROM safra WHERE id_safra = NEW.id_safra;
  IF v_plantio IS NOT NULL AND NEW.data_aplicacao < v_plantio THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Aplicação de defensivo com data anterior ao plantio da safra';
  END IF;
  IF NEW.id_ocorrencia IS NOT NULL THEN
    SELECT id_safra INTO v_safra_ocorrencia FROM ocorrencia_praga WHERE id_ocorrencia = NEW.id_ocorrencia;
    IF v_safra_ocorrencia <> NEW.id_safra THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'A ocorrência de praga informada pertence a outra safra';
    END IF;
  END IF;
END$$

-- Quantidade colhida não pode ser negativa
CREATE TRIGGER `trg_safra_bu_valida` BEFORE UPDATE ON `safra`
FOR EACH ROW
BEGIN
  IF NEW.quantidade_colhida_kg IS NOT NULL AND NEW.quantidade_colhida_kg < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Quantidade colhida não pode ser negativa';
  END IF;
END$$

DELIMITER ;

-- ==================================================================
-- 2. AUDITORIA (AFTER) — grava antes/depois em JSON na tabela `auditoria`
-- ==================================================================

DROP TRIGGER IF EXISTS `trg_irrigacao_ai_auditoria`;
DROP TRIGGER IF EXISTS `trg_irrigacao_au_auditoria`;
DROP TRIGGER IF EXISTS `trg_irrigacao_ad_auditoria`;
DROP TRIGGER IF EXISTS `trg_aplicacao_ai_auditoria`;
DROP TRIGGER IF EXISTS `trg_aplicacao_au_auditoria`;
DROP TRIGGER IF EXISTS `trg_aplicacao_ad_auditoria`;
DROP TRIGGER IF EXISTS `trg_safra_ai_auditoria`;
DROP TRIGGER IF EXISTS `trg_safra_au_auditoria`;
DROP TRIGGER IF EXISTS `trg_safra_ad_auditoria`;

DELIMITER $$

CREATE TRIGGER `trg_irrigacao_ai_auditoria` AFTER INSERT ON `irrigacao`
FOR EACH ROW
BEGIN
  IF @agrodata_seed IS NULL THEN
    INSERT INTO auditoria (tabela, operacao, id_registro, dados_novos, usuario_banco)
    VALUES ('irrigacao', 'INSERT', NEW.id_irrigacao,
      JSON_OBJECT('id_safra', NEW.id_safra, 'data_hora', NEW.data_hora, 'volume_m3', NEW.volume_m3,
                  'duracao_min', NEW.duracao_min, 'metodo', NEW.metodo),
      USER());
  END IF;
END$$

CREATE TRIGGER `trg_irrigacao_au_auditoria` AFTER UPDATE ON `irrigacao`
FOR EACH ROW
BEGIN
  IF @agrodata_seed IS NULL THEN
    INSERT INTO auditoria (tabela, operacao, id_registro, dados_antigos, dados_novos, usuario_banco)
    VALUES ('irrigacao', 'UPDATE', NEW.id_irrigacao,
      JSON_OBJECT('id_safra', OLD.id_safra, 'data_hora', OLD.data_hora, 'volume_m3', OLD.volume_m3,
                  'duracao_min', OLD.duracao_min, 'metodo', OLD.metodo),
      JSON_OBJECT('id_safra', NEW.id_safra, 'data_hora', NEW.data_hora, 'volume_m3', NEW.volume_m3,
                  'duracao_min', NEW.duracao_min, 'metodo', NEW.metodo),
      USER());
  END IF;
END$$

CREATE TRIGGER `trg_irrigacao_ad_auditoria` AFTER DELETE ON `irrigacao`
FOR EACH ROW
BEGIN
  IF @agrodata_seed IS NULL THEN
    INSERT INTO auditoria (tabela, operacao, id_registro, dados_antigos, usuario_banco)
    VALUES ('irrigacao', 'DELETE', OLD.id_irrigacao,
      JSON_OBJECT('id_safra', OLD.id_safra, 'data_hora', OLD.data_hora, 'volume_m3', OLD.volume_m3,
                  'duracao_min', OLD.duracao_min, 'metodo', OLD.metodo),
      USER());
  END IF;
END$$

CREATE TRIGGER `trg_aplicacao_ai_auditoria` AFTER INSERT ON `aplicacao_defensivo`
FOR EACH ROW
BEGIN
  IF @agrodata_seed IS NULL THEN
    INSERT INTO auditoria (tabela, operacao, id_registro, dados_novos, usuario_banco)
    VALUES ('aplicacao_defensivo', 'INSERT', NEW.id_aplicacao,
      JSON_OBJECT('id_safra', NEW.id_safra, 'id_defensivo', NEW.id_defensivo, 'id_ocorrencia', NEW.id_ocorrencia,
                  'id_usuario', NEW.id_usuario, 'data_aplicacao', NEW.data_aplicacao, 'quantidade_l', NEW.quantidade_l),
      USER());
  END IF;
END$$

CREATE TRIGGER `trg_aplicacao_au_auditoria` AFTER UPDATE ON `aplicacao_defensivo`
FOR EACH ROW
BEGIN
  IF @agrodata_seed IS NULL THEN
    INSERT INTO auditoria (tabela, operacao, id_registro, dados_antigos, dados_novos, usuario_banco)
    VALUES ('aplicacao_defensivo', 'UPDATE', NEW.id_aplicacao,
      JSON_OBJECT('id_safra', OLD.id_safra, 'id_defensivo', OLD.id_defensivo, 'id_ocorrencia', OLD.id_ocorrencia,
                  'id_usuario', OLD.id_usuario, 'data_aplicacao', OLD.data_aplicacao, 'quantidade_l', OLD.quantidade_l),
      JSON_OBJECT('id_safra', NEW.id_safra, 'id_defensivo', NEW.id_defensivo, 'id_ocorrencia', NEW.id_ocorrencia,
                  'id_usuario', NEW.id_usuario, 'data_aplicacao', NEW.data_aplicacao, 'quantidade_l', NEW.quantidade_l),
      USER());
  END IF;
END$$

CREATE TRIGGER `trg_aplicacao_ad_auditoria` AFTER DELETE ON `aplicacao_defensivo`
FOR EACH ROW
BEGIN
  IF @agrodata_seed IS NULL THEN
    INSERT INTO auditoria (tabela, operacao, id_registro, dados_antigos, usuario_banco)
    VALUES ('aplicacao_defensivo', 'DELETE', OLD.id_aplicacao,
      JSON_OBJECT('id_safra', OLD.id_safra, 'id_defensivo', OLD.id_defensivo, 'id_ocorrencia', OLD.id_ocorrencia,
                  'id_usuario', OLD.id_usuario, 'data_aplicacao', OLD.data_aplicacao, 'quantidade_l', OLD.quantidade_l),
      USER());
  END IF;
END$$

CREATE TRIGGER `trg_safra_ai_auditoria` AFTER INSERT ON `safra`
FOR EACH ROW
BEGIN
  IF @agrodata_seed IS NULL THEN
    INSERT INTO auditoria (tabela, operacao, id_registro, dados_novos, usuario_banco)
    VALUES ('safra', 'INSERT', NEW.id_safra,
      JSON_OBJECT('id_talhao', NEW.id_talhao, 'id_cultivo', NEW.id_cultivo, 'data_plantio', NEW.data_plantio,
                  'data_prevista_colheita', NEW.data_prevista_colheita, 'quantidade_colhida_kg', NEW.quantidade_colhida_kg),
      USER());
  END IF;
END$$

CREATE TRIGGER `trg_safra_au_auditoria` AFTER UPDATE ON `safra`
FOR EACH ROW
BEGIN
  IF @agrodata_seed IS NULL THEN
    INSERT INTO auditoria (tabela, operacao, id_registro, dados_antigos, dados_novos, usuario_banco)
    VALUES ('safra', 'UPDATE', NEW.id_safra,
      JSON_OBJECT('id_talhao', OLD.id_talhao, 'id_cultivo', OLD.id_cultivo, 'data_plantio', OLD.data_plantio,
                  'data_prevista_colheita', OLD.data_prevista_colheita, 'quantidade_colhida_kg', OLD.quantidade_colhida_kg),
      JSON_OBJECT('id_talhao', NEW.id_talhao, 'id_cultivo', NEW.id_cultivo, 'data_plantio', NEW.data_plantio,
                  'data_prevista_colheita', NEW.data_prevista_colheita, 'quantidade_colhida_kg', NEW.quantidade_colhida_kg),
      USER());
  END IF;
END$$

CREATE TRIGGER `trg_safra_ad_auditoria` AFTER DELETE ON `safra`
FOR EACH ROW
BEGIN
  IF @agrodata_seed IS NULL THEN
    INSERT INTO auditoria (tabela, operacao, id_registro, dados_antigos, usuario_banco)
    VALUES ('safra', 'DELETE', OLD.id_safra,
      JSON_OBJECT('id_talhao', OLD.id_talhao, 'id_cultivo', OLD.id_cultivo, 'data_plantio', OLD.data_plantio,
                  'data_prevista_colheita', OLD.data_prevista_colheita, 'quantidade_colhida_kg', OLD.quantidade_colhida_kg),
      USER());
  END IF;
END$$

DELIMITER ;

-- ==================================================================
-- 3. RECOMENDAÇÕES AUTOMÁTICAS DE MANEJO (AFTER INSERT)
-- ==================================================================

DROP TRIGGER IF EXISTS `trg_ocorrencia_ai_recomendacao`;
DROP TRIGGER IF EXISTS `trg_leitura_ai_recomendacao`;

DELIMITER $$

-- Ocorrência com infestação ALTA gera recomendação de aplicar defensivo (prioridade alta)
CREATE TRIGGER `trg_ocorrencia_ai_recomendacao` AFTER INSERT ON `ocorrencia_praga`
FOR EACH ROW
BEGIN
  DECLARE v_praga VARCHAR(80);
  IF @agrodata_seed IS NULL AND NEW.nivel_infestacao = 'alto' THEN
    SELECT nome_popular INTO v_praga FROM praga WHERE id_praga = NEW.id_praga;
    INSERT INTO recomendacao_manejo (id_safra, data_geracao, tipo, descricao, prioridade, status)
    VALUES (NEW.id_safra, NOW(), 'aplicar_defensivo',
            LEFT(CONCAT('[automática] ', v_praga, ' em nível alto: avaliar controle com defensivo indicado'), 255),
            'alta', 'pendente');
  END IF;
END$$

-- Leitura de umidade do solo mais de 5 p.p. abaixo do ideal do cultivo em andamento gera recomendação de irrigar
-- (somente se ainda não houver recomendação de irrigação pendente para a mesma safra)
CREATE TRIGGER `trg_leitura_ai_recomendacao` AFTER INSERT ON `leitura_sensor`
FOR EACH ROW
BEGIN
  DECLARE v_tipo VARCHAR(60);
  DECLARE v_talhao INT;
  DECLARE v_safra INT;
  DECLARE v_ideal DECIMAL(5,2);

  IF @agrodata_seed IS NULL THEN
    SELECT ts.nome, se.id_talhao INTO v_tipo, v_talhao
      FROM sensor se JOIN tipo_sensor ts ON ts.id_tipo_sensor = se.id_tipo_sensor
     WHERE se.id_sensor = NEW.id_sensor;

    IF v_tipo = 'Umidade do solo' THEN
      SELECT s.id_safra, c.umidade_ideal_pct INTO v_safra, v_ideal
        FROM safra s JOIN cultivo c ON c.id_cultivo = s.id_cultivo
       WHERE s.id_talhao = v_talhao AND s.quantidade_colhida_kg IS NULL
       ORDER BY s.data_plantio DESC
       LIMIT 1;

      IF v_safra IS NOT NULL AND v_ideal IS NOT NULL AND NEW.valor < v_ideal - 5
         AND NOT EXISTS (SELECT 1 FROM recomendacao_manejo r
                          WHERE r.id_safra = v_safra AND r.tipo = 'irrigar' AND r.status = 'pendente') THEN
        INSERT INTO recomendacao_manejo (id_safra, data_geracao, tipo, descricao, prioridade, status)
        VALUES (v_safra, NOW(), 'irrigar',
                CONCAT('[automática] Umidade do solo em ', NEW.valor, '% (ideal ', v_ideal, '%): programar irrigação'),
                'alta', 'pendente');
      END IF;
    END IF;
  END IF;
END$$

DELIMITER ;
