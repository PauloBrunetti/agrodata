# Evidências de testes — AgroData

Ambiente: Node.js 22, MySQL 8.0.46 (binary log ativo), executado em 20/11/2026.
Comando: `npm test` (banco `agrodata_test`, recriado a partir dos scripts `database/01` a `06`).

## Resultado: 38 de 38 testes aprovados

| Grupo | Caso de teste | Resultado |
|---|---|---|
| infraestrutura | health check confirma conexão com o MySQL | ✅ aprovado |
| infraestrutura | banco possui as 17 tabelas do modelo + auditoria, views, triggers e procedures | ✅ aprovado |
| infraestrutura | carga de demonstração não gera auditoria nem recomendações automáticas | ✅ aprovado |
| infraestrutura | reaplicar os objetos do banco é idempotente | ✅ aprovado |
| infraestrutura | seed não contém duplicatas de propriedade/talhão | ✅ aprovado |
| infraestrutura | metadados expõem os recursos para o frontend | ✅ aprovado |
| infraestrutura | rota inexistente retorna 404 JSON | ✅ aprovado |
| propriedades e talhões (CRUD ponta a ponta) | cria propriedade e persiste no MySQL | ✅ aprovado |
| propriedades e talhões (CRUD ponta a ponta) | rejeita propriedade sem campos obrigatórios e área inválida | ✅ aprovado |
| propriedades e talhões (CRUD ponta a ponta) | cria talhão vinculado à propriedade | ✅ aprovado |
| propriedades e talhões (CRUD ponta a ponta) | rejeita talhão com propriedade inexistente (FK) | ✅ aprovado |
| propriedades e talhões (CRUD ponta a ponta) | lista com busca e filtro por propriedade | ✅ aprovado |
| propriedades e talhões (CRUD ponta a ponta) | edita propriedade (PUT) e atualização parcial (PATCH) | ✅ aprovado |
| propriedades e talhões (CRUD ponta a ponta) | impede excluir propriedade que possui talhões (409) | ✅ aprovado |
| propriedades e talhões (CRUD ponta a ponta) | exclui talhão e depois a propriedade | ✅ aprovado |
| propriedades e talhões (CRUD ponta a ponta) | ID inválido retorna 400 | ✅ aprovado |
| irrigação, safras e regras de negócio | registra irrigação e soma no resumo da listagem | ✅ aprovado |
| irrigação, safras e regras de negócio | valida método, volume e data/hora da irrigação | ✅ aprovado |
| irrigação, safras e regras de negócio | filtra irrigações por período e método | ✅ aprovado |
| irrigação, safras e regras de negócio | filtro inválido retorna 400 | ✅ aprovado |
| irrigação, safras e regras de negócio | safra não aceita colheita antes do plantio | ✅ aprovado |
| irrigação, safras e regras de negócio | aplicação de defensivo exige ocorrência da mesma safra | ✅ aprovado |
| irrigação, safras e regras de negócio | e-mail de usuário único (409) e formato validado (400) | ✅ aprovado |
| irrigação, safras e regras de negócio | atualiza status de recomendação | ✅ aprovado |
| irrigação, safras e regras de negócio | options devolve rótulos legíveis para selects | ✅ aprovado |
| triggers, procedures e auditoria | trigger bloqueia irrigação antes do plantio (SIGNAL → 400) | ✅ aprovado |
| triggers, procedures e auditoria | trigger de auditoria registra INSERT, UPDATE e DELETE com antes/depois | ✅ aprovado |
| triggers, procedures e auditoria | auditoria é somente leitura na API (405) | ✅ aprovado |
| triggers, procedures e auditoria | ocorrência de nível alto gera recomendação automática | ✅ aprovado |
| triggers, procedures e auditoria | umidade abaixo do ideal gera uma única recomendação de irrigar | ✅ aprovado |
| triggers, procedures e auditoria | procedure sp_consumo_agua_periodo filtra por propriedade e período | ✅ aprovado |
| triggers, procedures e auditoria | procedure sp_resumo_safra e função fn_m3_agua_por_tonelada | ✅ aprovado |
| triggers, procedures e auditoria | procedure sp_registrar_colheita grava e impede colheita duplicada | ✅ aprovado |
| dashboard (indicadores calculados no MySQL) | KPIs batem com consultas diretas ao banco | ✅ aprovado |
| dashboard (indicadores calculados no MySQL) | KPIs do topo e pizza de água por método conferem com o banco | ✅ aprovado |
| dashboard (indicadores calculados no MySQL) | consumo por talhão soma o total geral | ✅ aprovado |
| dashboard (indicadores calculados no MySQL) | filtro por propriedade restringe os indicadores | ✅ aprovado |
| dashboard (indicadores calculados no MySQL) | produtividade calcula kg/ha da safra 1 (332 t em 100 ha) | ✅ aprovado |

## Saída do terminal (resumo)

```
# tests 38
# suites 5
# pass 38
# fail 0
```

## Teste manual ponta a ponta (navegador)

1. Abrir **Irrigação → + Irrigação** e clicar em **Salvar** sem preencher: o formulário exibe "Dados inválidos" e a mensagem de cada campo obrigatório (validação da API).
2. Preencher safra, data/hora, volume, duração e método e salvar: o registro aparece na lista e o total de água do filtro é atualizado.
3. Recarregar a página (F5): o registro continua listado — veio do MySQL.
4. Tentar cadastrar uma irrigação com data anterior ao plantio da safra: o **trigger** `trg_irrigacao_bi_valida` bloqueia e a mensagem do banco aparece no formulário.
5. Abrir **Auditoria**: a inclusão do passo 2 aparece com os dados gravados (trigger de auditoria).
6. Em **Safras**, clicar em **Colher** numa safra em andamento: a procedure `sp_registrar_colheita` grava a colheita e mostra a produtividade.
7. Abrir **Relatórios**: consumo por período (`sp_consumo_agua_periodo`) e resumo da safra (`sp_resumo_safra`).
8. Abrir o **Dashboard**: os indicadores incluem os novos dados; "Ver SQL" mostra a consulta executada.
9. Tentar excluir uma propriedade que tem talhões: a API responde 409 e a tela mostra "Registro em uso".

| Tela | Captura |
|---|---|
| Dashboard | ![](img/dashboard.png) |
| SQL exibido no dashboard | ![](img/dashboard-sql.png) |
| Listagem de irrigação com filtros | ![](img/irrigacao-lista.png) |
| Validação do formulário (API) | ![](img/irrigacao-form.png) |
| Regra de negócio do banco (trigger) | ![](img/trigger-validacao.png) |
| Relatórios (stored procedures) | ![](img/relatorios.png) |
| Auditoria (triggers) | ![](img/auditoria.png) |
| Safras | ![](img/safras.png) |
