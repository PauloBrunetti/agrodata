# AgroData — Documentação do banco de dados

Material de apoio ao relatório da A3 (seções *Modelagem de Dados*, *Scripts SQL* e *Plano de Segurança e Administração de Dados*). Todos os scripts citados estão na pasta [`database/`](../database) e foram testados no MySQL 8.0.

## 1. Scripts SQL e ordem de execução

| Arquivo | Conteúdo | Execução |
|---|---|---|
| `00_create_database.sql` | `CREATE DATABASE agrodata` (utf8mb4) | manual, uso local |
| `01_schema.sql` | `CREATE TABLE` das 17 tabelas, PK, FK, `NOT NULL`, `UNIQUE`, `CHECK`, `ENUM` | automática |
| `02_views.sql` | 3 views de relatório | automática |
| `03_auditoria_indices.sql` | tabela `auditoria` + 7 índices de otimização | automática |
| `04_triggers.sql` | 16 triggers: regras de negócio, auditoria, recomendações automáticas | automática |
| `05_procedures.sql` | 3 stored procedures + 1 function | automática |
| `06_seed.sql` | `INSERT` dos dados de demonstração (fictícios) | automática no 1º uso / `npm run db:seed` |
| `07_seguranca_dcl.sql` | `CREATE ROLE`, `CREATE USER`, `GRANT`, `REVOKE` | **manual**, por um administrador |
| `08_consultas.sql` | 19 consultas de análise (JOIN, GROUP BY, HAVING, subconsultas, views, procedures, EXPLAIN) | manual |

Todos os arquivos 02 a 05 são **idempotentes** (`CREATE OR REPLACE`, `DROP ... IF EXISTS`, verificação de índice existente) e podem ser executados várias vezes. No MySQL Workbench, abra o arquivo e execute-o inteiro (eles usam `DELIMITER $$` nos blocos `BEGIN ... END`). A aplicação aplica os arquivos 01 a 06 automaticamente (`npm run db:init` ou no primeiro start com banco vazio).

## 2. Modelagem de dados

### 2.1 Entidades

| Entidade | Descrição | Principais atributos |
|---|---|---|
| `propriedade` | Fazenda / sítio | nome, proprietário, cidade, área total (ha) |
| `talhao` | Subdivisão de cultivo de uma propriedade | nome, área (ha), tipo de solo |
| `cultivo` | Cultura agrícola | nome, variedade, ciclo (dias), umidade ideal (%), tipo de colheita, rendimento esperado (kg/ha) |
| `safra` | Um ciclo de um cultivo em um talhão | plantio, colheita prevista, quantidade colhida (kg) |
| `irrigacao` | Evento de irrigação de uma safra | data/hora, volume (m³), duração (min), método |
| `tipo_sensor` | Catálogo de sensores | nome, unidade de medida |
| `sensor` | Sensor instalado em um talhão | modelo, instalação, status, latitude/longitude |
| `leitura_sensor` | Medição de um sensor | data/hora, valor |
| `praga` | Catálogo de pragas | nome popular, nome científico (único) |
| `cultivo_praga` | Associação N:N cultivo × praga | — |
| `ocorrencia_praga` | Praga identificada em uma safra | data, nível de infestação, observações |
| `defensivo` | Produto fitossanitário | nome comercial, princípio ativo, classe toxicológica (1–5), carência (dias) |
| `defensivo_praga` | Associação N:N defensivo × praga-alvo | — |
| `aplicacao_defensivo` | Aplicação de defensivo em uma safra | data, quantidade (L), ocorrência (opcional), responsável |
| `previsao_climatica` | Previsão por propriedade | temperatura, precipitação, umidade do ar, vento |
| `recomendacao_manejo` | Recomendação para uma safra | tipo, descrição, prioridade, status |
| `usuario` | Pessoa que opera o sistema | nome, e-mail (único), perfil |
| `auditoria` *(nova)* | Histórico de alterações gravado por triggers | tabela, operação, registro, dados antes/depois (JSON), usuário do banco |

### 2.2 Relacionamentos

| Relacionamento | Cardinalidade | Chave estrangeira |
|---|---|---|
| propriedade → talhão | 1:N | `talhao.id_propriedade` |
| propriedade → previsão climática | 1:N | `previsao_climatica.id_propriedade` |
| talhão → safra | 1:N | `safra.id_talhao` |
| cultivo → safra | 1:N | `safra.id_cultivo` |
| talhão → sensor | 1:N | `sensor.id_talhao` |
| tipo de sensor → sensor | 1:N | `sensor.id_tipo_sensor` |
| sensor → leitura | 1:N | `leitura_sensor.id_sensor` |
| safra → irrigação | 1:N | `irrigacao.id_safra` |
| safra → ocorrência de praga | 1:N | `ocorrencia_praga.id_safra` |
| praga → ocorrência | 1:N | `ocorrencia_praga.id_praga` |
| safra → aplicação de defensivo | 1:N | `aplicacao_defensivo.id_safra` |
| defensivo → aplicação | 1:N | `aplicacao_defensivo.id_defensivo` |
| ocorrência → aplicação | 1:N (opcional) | `aplicacao_defensivo.id_ocorrencia` (NULL permitido) |
| usuário → aplicação | 1:N | `aplicacao_defensivo.id_usuario` |
| safra → recomendação | 1:N | `recomendacao_manejo.id_safra` |
| cultivo ↔ praga | N:N | tabela associativa `cultivo_praga` |
| defensivo ↔ praga | N:N | tabela associativa `defensivo_praga` |

Decisão de modelagem: irrigação, ocorrências, aplicações e recomendações referenciam a **safra** (e não o talhão diretamente). Assim cada evento fica ligado ao ciclo de cultivo, e o talhão e a propriedade são obtidos por JOIN, sem redundância.

### 2.3 Restrições de integridade

- **Chaves primárias** `AUTO_INCREMENT` em todas as entidades; PK composta nas associativas (`cultivo_praga`, `defensivo_praga`).
- **Chaves estrangeiras** em todos os relacionamentos (19 FKs). Exclusão de registro pai com filhos é bloqueada (`RESTRICT`), por exemplo uma propriedade com talhões.
- **UNIQUE**: `praga.nome_cientifico`, `tipo_sensor.nome`, `usuario.email`.
- **CHECK**: áreas > 0, ciclo > 0, volume e duração de irrigação > 0, quantidade de defensivo > 0, classe toxicológica entre 1 e 5, carência ≥ 0, precipitação ≥ 0, colheita prevista ≥ plantio.
- **ENUM** para domínios fechados: método de irrigação, nível de infestação, status de sensor, tipo/prioridade/status de recomendação, perfil de usuário.
- **Triggers** para regras que envolvem mais de uma tabela (seção 5).

### 2.4 Normalização

- **1FN**: todos os atributos são atômicos (sem listas em colunas). As relações "um cultivo é atacado por várias pragas" e "um defensivo controla várias pragas" foram separadas em `cultivo_praga` e `defensivo_praga`, em vez de colunas com listas de nomes.
- **2FN**: as tabelas com PK composta (`cultivo_praga`, `defensivo_praga`) não têm atributos não-chave; nas demais a PK é simples, portanto não há dependência parcial.
- **3FN**: não há dependências transitivas. Exemplos: o nome da propriedade não é repetido em `talhao` (apenas `id_propriedade`); a unidade de medida fica em `tipo_sensor`, e não em cada `leitura_sensor`; a carência fica em `defensivo`, e a data de liberação da colheita é **calculada** (`data_aplicacao + carencia_dias`) em vez de armazenada.
- Valores derivados (m³/ha, kg/ha, % do esperado, m³ por tonelada) não são armazenados: são calculados em views, procedures e consultas, evitando inconsistência.

## 3. Índices

Além dos índices criados automaticamente para PK, UNIQUE e FK, o script `03_auditoria_indices.sql` cria:

| Índice | Tabela (colunas) | Consulta beneficiada |
|---|---|---|
| `idx_irrigacao_safra_data` | irrigacao (id_safra, data_hora) | consumo por safra em um período |
| `idx_irrigacao_data` | irrigacao (data_hora) | consumo mensal / últimos 30 dias |
| `idx_safra_talhao_plantio` | safra (id_talhao, data_plantio) | safra em andamento mais recente do talhão |
| `idx_ocorrencia_nivel` | ocorrencia_praga (nivel_infestacao) | KPI de ocorrências em nível alto |
| `idx_recomendacao_status_prioridade` | recomendacao_manejo (status, prioridade) | recomendações pendentes por prioridade |
| `idx_aplicacao_data` | aplicacao_defensivo (data_aplicacao) | safras em período de carência |
| `idx_previsao_propriedade_data` | previsao_climatica (id_propriedade, data_hora) | previsões de uma propriedade |
| `idx_leitura_sensor_data` *(já existia)* | leitura_sensor (id_sensor, data_hora) | última leitura de cada sensor |
| `idx_auditoria_tabela_registro`, `idx_auditoria_data` | auditoria | histórico de um registro / por data |

Verificação: `EXPLAIN SELECT * FROM irrigacao WHERE id_safra = 4 AND data_hora >= '2026-09-01';` (consulta 19 de `08_consultas.sql`) mostra o uso de `idx_irrigacao_safra_data`.

## 4. Views

| View | Finalidade |
|---|---|
| `vw_irrigacao_detalhada` | irrigação com cultivo, talhão e propriedade (JOIN de 5 tabelas) |
| `vw_consumo_agua_talhao` | eventos, volume total e m³/ha por talhão |
| `vw_produtividade_safra` | safras colhidas com kg/ha e % do rendimento esperado |

## 5. Triggers

| Trigger | Momento | Regra |
|---|---|---|
| `trg_irrigacao_bi_valida` / `_bu_valida` | BEFORE INSERT / UPDATE em `irrigacao` | bloqueia irrigação com data anterior ao plantio da safra |
| `trg_aplicacao_bi_valida` / `_bu_valida` | BEFORE INSERT / UPDATE em `aplicacao_defensivo` | bloqueia aplicação antes do plantio e ocorrência de outra safra |
| `trg_safra_bu_valida` | BEFORE UPDATE em `safra` | impede quantidade colhida negativa |
| `trg_irrigacao_{ai,au,ad}_auditoria` | AFTER INSERT / UPDATE / DELETE | grava o antes/depois em `auditoria` |
| `trg_aplicacao_{ai,au,ad}_auditoria` | AFTER INSERT / UPDATE / DELETE | idem para aplicações de defensivos |
| `trg_safra_{ai,au,ad}_auditoria` | AFTER INSERT / UPDATE / DELETE | idem para safras (inclui o registro da colheita) |
| `trg_ocorrencia_ai_recomendacao` | AFTER INSERT em `ocorrencia_praga` | infestação **alta** gera recomendação "aplicar defensivo" com prioridade alta |
| `trg_leitura_ai_recomendacao` | AFTER INSERT em `leitura_sensor` | umidade do solo > 5 p.p. abaixo do ideal do cultivo em andamento gera recomendação "irrigar" (uma por safra enquanto estiver pendente) |

As validações usam `SIGNAL SQLSTATE '45000'`. A API converte esse erro em resposta HTTP 400 com a mensagem do banco, exibida no formulário. Durante a carga de demonstração, a variável de sessão `@agrodata_seed = 1` impede que os triggers de auditoria e de recomendação gerem registros; as validações continuam ativas.

Teste rápido no Workbench:

```sql
-- Bloqueado pelo trigger (safra 5 foi plantada em 25/10/2026):
INSERT INTO irrigacao (id_safra, data_hora, volume_m3, duracao_min, metodo)
VALUES (5, '2026-10-01 07:00', 100, 30, 'aspersao');
-- Error Code: 1644. Irrigação com data anterior ao plantio da safra

-- Gera recomendação automática:
INSERT INTO ocorrencia_praga (id_safra, id_praga, data_identificacao, nivel_infestacao)
VALUES (7, 3, CURDATE(), 'alto');
SELECT * FROM recomendacao_manejo ORDER BY id_recomendacao DESC LIMIT 1;
SELECT * FROM auditoria ORDER BY id_auditoria DESC;
```

## 6. Stored procedures e function

| Rotina | Parâmetros | O que faz | Uso na aplicação |
|---|---|---|---|
| `sp_registrar_colheita` | id_safra, quantidade_kg | valida (safra existe, ainda não colhida, quantidade > 0), grava a colheita e retorna kg/ha, % do esperado e m³ de água por tonelada | botão **Colher** em Safras |
| `sp_consumo_agua_periodo` | id_propriedade (ou NULL), início, fim | consumo por talhão no período: eventos, m³, m³/ha, horas | página **Relatórios** |
| `sp_resumo_safra` | id_safra | indicadores de sustentabilidade da safra: água, defensivos, pragas, produtividade | página **Relatórios** |
| `fn_m3_agua_por_tonelada` | id_safra | eficiência hídrica: m³ irrigados por tonelada colhida | procedures e consultas |

## 7. Plano de segurança

### 7.1 Perfis de usuário (`07_seguranca_dcl.sql`)

| Perfil (ROLE) | Permissões |
|---|---|
| `agro_administrador` | todos os privilégios no banco do projeto (sem privilégios globais do servidor) |
| `agro_agronomo` | leitura geral; INSERT/UPDATE/DELETE em safras, cultivos, pragas, defensivos, ocorrências, aplicações e recomendações; EXECUTE das procedures |
| `agro_operador` | leitura dos cadastros; registra irrigações, leituras, ocorrências e aplicações; altera só a coluna `status` das recomendações |
| `agro_auditor` | somente leitura, incluindo a tabela `auditoria` |
| usuário `agrodata_app` (API) | SELECT/INSERT/UPDATE/DELETE nas tabelas de negócio, apenas SELECT na auditoria, EXECUTE nas procedures; **sem** CREATE/ALTER/DROP |

Usuários nominais são criados com expiração de senha em 90 dias e bloqueio após 5 tentativas (`FAILED_LOGIN_ATTEMPTS 5 PASSWORD_LOCK_TIME 1`). O script mostra `REVOKE` para retirar permissões e o procedimento de desligamento (`REVOKE` do perfil + `ACCOUNT LOCK`, preservando o histórico).

A trilha de auditoria é protegida: quem grava são os triggers, executados com o privilégio do seu DEFINER. Como o usuário da aplicação só tem SELECT na tabela `auditoria`, a API não consegue alterar nem apagar o histórico.

### 7.2 Segurança na aplicação

- Credenciais apenas em variáveis de ambiente (`.env` fora do Git).
- Todas as consultas usam parâmetros (`?`): proteção contra SQL injection.
- Validação dupla: na API (tipos, faixas, obrigatoriedade) e no banco (CHECK, FK, triggers).
- A aplicação conecta ao MySQL pela rede privada do Railway (`mysql.railway.internal`). Se o acesso público (TCP proxy) do banco for habilitado para usar o Workbench, use senha forte e desative-o quando não estiver em uso.

> Observação para produção: com o usuário restrito `agrodata_app`, defina `AUTO_INIT_DB=false`, porque a reaplicação automática de views/triggers/procedures exige privilégios de criação. Rode `npm run db:init` com um usuário administrador quando houver mudança de estrutura.

## 8. Backup e recuperação

### 8.1 Estratégia

| Tipo | Como | Frequência | Retenção |
|---|---|---|---|
| **Completo (full)** | `mysqldump --single-transaction --routines --triggers --events` | diário, 02:00 | 7 diários + 4 semanais |
| **Incremental** | binary logs (`log_bin`, já ativo no MySQL 8) copiados para outro local | a cada hora | até o próximo full |
| **Diferencial** | alternativa ao incremental: aplicar todos os binlogs desde o último full | — | — |
| **Snapshot do provedor** | backups do volume do serviço MySQL no Railway | conforme o plano | conforme o plano |

`--single-transaction` gera um backup consistente sem travar as tabelas InnoDB; `--routines --triggers` garante que procedures, function e triggers também sejam salvos.

```bash
# Backup completo (local ou apontando para o host do Railway)
mysqldump -h HOST -P PORTA -u USUARIO -p --single-transaction --routines --triggers --events \
  --set-gtid-purged=OFF agrodata | gzip > backup_agrodata_$(date +%F).sql.gz

# Lista os binlogs disponíveis (incremental)
mysql -u root -p -e "SHOW BINARY LOGS;"
```

### 8.2 Plano de recuperação de desastres

1. **Identificar** a falha e o horário (perda do servidor, exclusão acidental, corrupção).
2. **Provisionar** um MySQL limpo (novo serviço no Railway ou servidor local).
3. **Restaurar o último backup completo**:
   `gunzip < backup_agrodata_AAAA-MM-DD.sql.gz | mysql -h HOST -u USUARIO -p agrodata`
4. **Reaplicar os binlogs** desde o backup até um instante antes do erro (*point-in-time recovery*):
   `mysqlbinlog --start-datetime="AAAA-MM-DD 02:00:00" --stop-datetime="AAAA-MM-DD 14:29:59" binlog.0000NN | mysql -u root -p agrodata`
5. **Validar**: contagem de registros por tabela, `SELECT * FROM auditoria ORDER BY data_hora DESC LIMIT 20`, e o endpoint `/api/health`.
6. **Reapontar** a aplicação (`DATABASE_URL`) para o banco restaurado.

Metas: RPO (perda máxima de dados) de 1 hora, com binlogs a cada hora; RTO (tempo de volta) de até 2 horas. Recomenda-se testar a restauração uma vez por mês em um banco separado.

## 9. Monitoramento e otimização

- **Consultas lentas**: `SET GLOBAL slow_query_log = 'ON'; SET GLOBAL long_query_time = 1;` e análise com `mysqldumpslow`.
- **Planos de execução**: `EXPLAIN` / `EXPLAIN ANALYZE` nas consultas do dashboard para confirmar o uso dos índices.
- **Índices não usados**: `SELECT * FROM sys.schema_unused_indexes WHERE object_schema = 'agrodata';`
- **Consultas mais custosas**: `SELECT * FROM sys.statements_with_runtimes_in_95th_percentile;`
- **Saúde da aplicação**: endpoint `/api/health` (usado pelo health check do Railway) e status "MySQL conectado" no topo da interface.
- **Crescimento**: `leitura_sensor` e `auditoria` são as tabelas de maior volume. Para elas é indicado arquivar dados antigos ou particionar por data (`PARTITION BY RANGE`) quando o volume crescer.
