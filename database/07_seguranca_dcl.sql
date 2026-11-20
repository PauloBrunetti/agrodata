-- AgroData — Plano de segurança: perfis (ROLES), usuários e permissões (DCL)
-- NÃO é executado automaticamente pela aplicação. Rodar manualmente, com um usuário administrador do MySQL.
-- Substitua `agrodata` pelo nome do seu banco (no Railway o banco padrão chama-se `railway`)
-- e TROQUE TODAS AS SENHAS antes de executar. Nunca versionar senhas reais.

-- ------------------------------------------------------------------
-- 1. Perfis de acesso (espelham o campo usuario.perfil)
-- ------------------------------------------------------------------
CREATE ROLE IF NOT EXISTS 'agro_administrador', 'agro_agronomo', 'agro_operador', 'agro_auditor';

-- Administrador: controle total do banco do projeto (sem privilégios globais do servidor)
GRANT ALL PRIVILEGES ON agrodata.* TO 'agro_administrador';

-- Agrônomo: consulta tudo e gerencia o manejo técnico (safras, pragas, defensivos, recomendações)
GRANT SELECT ON agrodata.* TO 'agro_agronomo';
GRANT INSERT, UPDATE, DELETE ON agrodata.safra               TO 'agro_agronomo';
GRANT INSERT, UPDATE, DELETE ON agrodata.cultivo             TO 'agro_agronomo';
GRANT INSERT, UPDATE, DELETE ON agrodata.ocorrencia_praga    TO 'agro_agronomo';
GRANT INSERT, UPDATE, DELETE ON agrodata.aplicacao_defensivo TO 'agro_agronomo';
GRANT INSERT, UPDATE, DELETE ON agrodata.recomendacao_manejo TO 'agro_agronomo';
GRANT INSERT, UPDATE, DELETE ON agrodata.praga               TO 'agro_agronomo';
GRANT INSERT, UPDATE, DELETE ON agrodata.defensivo           TO 'agro_agronomo';
GRANT INSERT, UPDATE, DELETE ON agrodata.cultivo_praga       TO 'agro_agronomo';
GRANT INSERT, UPDATE, DELETE ON agrodata.defensivo_praga     TO 'agro_agronomo';
GRANT EXECUTE ON PROCEDURE agrodata.sp_registrar_colheita    TO 'agro_agronomo';
GRANT EXECUTE ON PROCEDURE agrodata.sp_consumo_agua_periodo  TO 'agro_agronomo';
GRANT EXECUTE ON PROCEDURE agrodata.sp_resumo_safra          TO 'agro_agronomo';

-- Operador de campo: registra eventos do dia a dia (irrigação, leituras, ocorrências, aplicações)
GRANT SELECT ON agrodata.propriedade       TO 'agro_operador';
GRANT SELECT ON agrodata.talhao            TO 'agro_operador';
GRANT SELECT ON agrodata.safra             TO 'agro_operador';
GRANT SELECT ON agrodata.cultivo           TO 'agro_operador';
GRANT SELECT ON agrodata.praga             TO 'agro_operador';
GRANT SELECT ON agrodata.defensivo         TO 'agro_operador';
GRANT SELECT ON agrodata.sensor            TO 'agro_operador';
GRANT SELECT ON agrodata.tipo_sensor       TO 'agro_operador';
GRANT SELECT, INSERT, UPDATE ON agrodata.irrigacao           TO 'agro_operador';
GRANT SELECT, INSERT         ON agrodata.leitura_sensor      TO 'agro_operador';
GRANT SELECT, INSERT         ON agrodata.ocorrencia_praga    TO 'agro_operador';
GRANT SELECT, INSERT         ON agrodata.aplicacao_defensivo TO 'agro_operador';
GRANT SELECT, UPDATE (status) ON agrodata.recomendacao_manejo TO 'agro_operador';

-- Auditor: somente leitura, incluindo o histórico de auditoria
GRANT SELECT ON agrodata.* TO 'agro_auditor';

-- ------------------------------------------------------------------
-- 2. Usuário da aplicação (API) — princípio do menor privilégio:
--    manipula dados e executa procedures, mas não altera a estrutura (sem DROP/ALTER/CREATE)
-- ------------------------------------------------------------------
CREATE USER IF NOT EXISTS 'agrodata_app'@'%' IDENTIFIED BY 'TROQUE_SENHA_APP';
GRANT SELECT, INSERT, UPDATE, DELETE ON agrodata.propriedade         TO 'agrodata_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON agrodata.talhao              TO 'agrodata_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON agrodata.cultivo             TO 'agrodata_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON agrodata.safra               TO 'agrodata_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON agrodata.irrigacao           TO 'agrodata_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON agrodata.sensor              TO 'agrodata_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON agrodata.tipo_sensor         TO 'agrodata_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON agrodata.leitura_sensor      TO 'agrodata_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON agrodata.praga               TO 'agrodata_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON agrodata.cultivo_praga       TO 'agrodata_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON agrodata.ocorrencia_praga    TO 'agrodata_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON agrodata.defensivo           TO 'agrodata_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON agrodata.defensivo_praga     TO 'agrodata_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON agrodata.aplicacao_defensivo TO 'agrodata_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON agrodata.previsao_climatica  TO 'agrodata_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON agrodata.recomendacao_manejo TO 'agrodata_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON agrodata.usuario             TO 'agrodata_app'@'%';
-- Auditoria: a aplicação só lê. Quem grava são os triggers (executados com o privilégio do DEFINER),
-- portanto o histórico não pode ser alterado nem apagado pela API.
GRANT SELECT ON agrodata.auditoria TO 'agrodata_app'@'%';
-- Views e procedures
GRANT SELECT  ON agrodata.vw_irrigacao_detalhada TO 'agrodata_app'@'%';
GRANT SELECT  ON agrodata.vw_consumo_agua_talhao TO 'agrodata_app'@'%';
GRANT SELECT  ON agrodata.vw_produtividade_safra TO 'agrodata_app'@'%';
GRANT EXECUTE ON agrodata.* TO 'agrodata_app'@'%';

-- ------------------------------------------------------------------
-- 3. Usuários nominais, um por pessoa, com o perfil correspondente
-- ------------------------------------------------------------------
CREATE USER IF NOT EXISTS 'rafael.costa'@'%'  IDENTIFIED BY 'TROQUE_SENHA_1' PASSWORD EXPIRE INTERVAL 90 DAY FAILED_LOGIN_ATTEMPTS 5 PASSWORD_LOCK_TIME 1;
CREATE USER IF NOT EXISTS 'carlos.mendes'@'%' IDENTIFIED BY 'TROQUE_SENHA_2' PASSWORD EXPIRE INTERVAL 90 DAY FAILED_LOGIN_ATTEMPTS 5 PASSWORD_LOCK_TIME 1;
CREATE USER IF NOT EXISTS 'ana.lima'@'%'      IDENTIFIED BY 'TROQUE_SENHA_3' PASSWORD EXPIRE INTERVAL 90 DAY FAILED_LOGIN_ATTEMPTS 5 PASSWORD_LOCK_TIME 1;
CREATE USER IF NOT EXISTS 'auditoria'@'%'     IDENTIFIED BY 'TROQUE_SENHA_4' PASSWORD EXPIRE INTERVAL 90 DAY FAILED_LOGIN_ATTEMPTS 5 PASSWORD_LOCK_TIME 1;

GRANT 'agro_administrador' TO 'rafael.costa'@'%';
GRANT 'agro_agronomo'      TO 'carlos.mendes'@'%';
GRANT 'agro_operador'      TO 'ana.lima'@'%';
GRANT 'agro_auditor'       TO 'auditoria'@'%';

SET DEFAULT ROLE ALL TO 'rafael.costa'@'%', 'carlos.mendes'@'%', 'ana.lima'@'%', 'auditoria'@'%';

-- ------------------------------------------------------------------
-- 4. Exemplos de REVOKE (retirada de permissões)
-- ------------------------------------------------------------------
-- Operador deixa de poder alterar irrigações já registradas (passa a só inserir):
REVOKE UPDATE ON agrodata.irrigacao FROM 'agro_operador';

-- Desligamento de um colaborador: remove o perfil e bloqueia a conta (mantém histórico)
-- REVOKE 'agro_operador' FROM 'ana.lima'@'%';
-- ALTER USER 'ana.lima'@'%' ACCOUNT LOCK;

-- ------------------------------------------------------------------
-- 5. Conferência
-- ------------------------------------------------------------------
SHOW GRANTS FOR 'agro_operador';
SHOW GRANTS FOR 'agrodata_app'@'%';
SHOW GRANTS FOR 'ana.lima'@'%' USING 'agro_operador';
