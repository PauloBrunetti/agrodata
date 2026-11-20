// Testes de integração da API contra um MySQL real.
// Usa o banco definido em TEST_DB_NAME (padrão: agrodata_test), que é RECRIADO a cada execução.
// Ex.: DB_HOST=localhost DB_USER=root DB_PASSWORD=root npm test
require('dotenv').config({ quiet: true });
process.env.DB_NAME = process.env.TEST_DB_NAME || 'agrodata_test';
delete process.env.DATABASE_URL;
delete process.env.MYSQL_URL;

const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const request = require('supertest');
const { connectionConfig, closePool, query } = require('../src/lib/db');
const { initDatabase } = require('../src/lib/dbInit');
const { createApp } = require('../src/app');

let app;

before(async () => {
  const cfg = connectionConfig({ database: undefined });
  const conn = await mysql.createConnection(cfg);
  await conn.query(`DROP DATABASE IF EXISTS \`${process.env.DB_NAME}\``);
  await conn.query(`CREATE DATABASE \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
  await conn.end();
  await initDatabase({ seed: true, log: () => {} });
  app = createApp();
});

after(async () => {
  await closePool();
});

describe('infraestrutura', () => {
  test('health check confirma conexão com o MySQL', async () => {
    const res = await request(app).get('/api/health').expect(200);
    assert.equal(res.body.status, 'ok');
    assert.match(res.body.mysql.versao, /^8\./);
  });

  test('banco possui as 17 tabelas do modelo + auditoria, views, triggers e procedures', async () => {
    const [t] = await query(
      "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'"
    );
    assert.equal(t.n, 18);
    const [v] = await query("SELECT COUNT(*) AS n FROM information_schema.views WHERE table_schema = DATABASE()");
    assert.equal(v.n, 3);
    const [tr] = await query('SELECT COUNT(*) AS n FROM information_schema.triggers WHERE trigger_schema = DATABASE()');
    assert.equal(tr.n, 16);
    const [r] = await query('SELECT COUNT(*) AS n FROM information_schema.routines WHERE routine_schema = DATABASE()');
    assert.equal(r.n, 4);
  });

  test('carga de demonstração não gera auditoria nem recomendações automáticas', async () => {
    const [a] = await query('SELECT COUNT(*) AS n FROM auditoria');
    assert.equal(a.n, 0);
    const [r] = await query("SELECT COUNT(*) AS n FROM recomendacao_manejo WHERE descricao LIKE '[automática]%'");
    assert.equal(r.n, 0);
  });

  test('reaplicar os objetos do banco é idempotente', async () => {
    await initDatabase({ onlyIfEmpty: true, seed: true, log: () => {} });
    const [p] = await query('SELECT COUNT(*) AS n FROM propriedade');
    assert.equal(p.n, 3);
  });

  test('seed não contém duplicatas de propriedade/talhão', async () => {
    const dup = await query('SELECT nome, COUNT(*) n FROM propriedade GROUP BY nome HAVING n > 1');
    assert.equal(dup.length, 0);
    const dupT = await query('SELECT id_propriedade, nome, COUNT(*) n FROM talhao GROUP BY id_propriedade, nome HAVING n > 1');
    assert.equal(dupT.length, 0);
  });

  test('metadados expõem os recursos para o frontend', async () => {
    const res = await request(app).get('/api/meta').expect(200);
    for (const r of ['propriedades', 'talhoes', 'irrigacoes', 'safras', 'ocorrencias', 'aplicacoes']) {
      assert.ok(res.body[r], `recurso ${r} ausente`);
    }
    assert.ok(!JSON.stringify(res.body).includes('SELECT'), 'meta não deve vazar SQL');
  });

  test('rota inexistente retorna 404 JSON', async () => {
    const res = await request(app).get('/api/nao-existe').expect(404);
    assert.ok(res.body.error);
  });
});

describe('propriedades e talhões (CRUD ponta a ponta)', () => {
  let idProp;
  let idTalhao;

  test('cria propriedade e persiste no MySQL', async () => {
    const res = await request(app).post('/api/propriedades')
      .send({ nome: 'Fazenda Teste', proprietario: 'Equipe A3', cidade: 'São Paulo', area_total_ha: '55,5' })
      .expect(201);
    idProp = res.body.id_propriedade;
    assert.equal(res.body.area_total_ha, 55.5);
    const [row] = await query('SELECT nome FROM propriedade WHERE id_propriedade = ?', [idProp]);
    assert.equal(row.nome, 'Fazenda Teste');
  });

  test('rejeita propriedade sem campos obrigatórios e área inválida', async () => {
    const res = await request(app).post('/api/propriedades').send({ nome: '', area_total_ha: -3 }).expect(400);
    assert.ok(res.body.details.nome);
    assert.ok(res.body.details.proprietario);
    assert.ok(res.body.details.area_total_ha);
  });

  test('cria talhão vinculado à propriedade', async () => {
    const res = await request(app).post('/api/talhoes')
      .send({ id_propriedade: idProp, nome: 'Talhão T1', area_ha: 20, tipo_solo: 'Latossolo' })
      .expect(201);
    idTalhao = res.body.id_talhao;
  });

  test('rejeita talhão com propriedade inexistente (FK)', async () => {
    const res = await request(app).post('/api/talhoes').send({ id_propriedade: 99999, nome: 'X', area_ha: 1 }).expect(400);
    assert.match(res.body.error, /relacionado/);
  });

  test('lista com busca e filtro por propriedade', async () => {
    const res = await request(app).get('/api/talhoes').query({ id_propriedade: idProp }).expect(200);
    assert.equal(res.body.total, 1);
    assert.equal(res.body.data[0].propriedade, 'Fazenda Teste');
    const busca = await request(app).get('/api/propriedades').query({ q: 'teste' }).expect(200);
    assert.equal(busca.body.data[0].qtd_talhoes, 1);
  });

  test('edita propriedade (PUT) e atualização parcial (PATCH)', async () => {
    await request(app).put(`/api/propriedades/${idProp}`)
      .send({ nome: 'Fazenda Teste 2', proprietario: 'Equipe A3', cidade: 'Campinas', area_total_ha: 60 })
      .expect(200);
    const res = await request(app).patch(`/api/propriedades/${idProp}`).send({ cidade: 'Jundiaí' }).expect(200);
    assert.equal(res.body.nome, 'Fazenda Teste 2');
    assert.equal(res.body.cidade, 'Jundiaí');
  });

  test('impede excluir propriedade que possui talhões (409)', async () => {
    await request(app).delete(`/api/propriedades/${idProp}`).expect(409);
  });

  test('exclui talhão e depois a propriedade', async () => {
    await request(app).delete(`/api/talhoes/${idTalhao}`).expect(204);
    await request(app).delete(`/api/propriedades/${idProp}`).expect(204);
    await request(app).get(`/api/propriedades/${idProp}`).expect(404);
  });

  test('ID inválido retorna 400', async () => {
    await request(app).get('/api/propriedades/abc').expect(400);
  });
});

describe('irrigação, safras e regras de negócio', () => {
  test('registra irrigação e soma no resumo da listagem', async () => {
    const antes = await request(app).get('/api/irrigacoes').query({ id_safra: 5 }).expect(200);
    const res = await request(app).post('/api/irrigacoes')
      .send({ id_safra: 5, data_hora: '2026-11-19T07:30', volume_m3: 250, duracao_min: 90, metodo: 'aspersao' })
      .expect(201);
    assert.equal(res.body.data_hora, '2026-11-19 07:30:00');
    const depois = await request(app).get('/api/irrigacoes').query({ id_safra: 5 }).expect(200);
    assert.equal(depois.body.total, antes.body.total + 1);
    assert.equal(depois.body.summary.volume_total_m3, antes.body.summary.volume_total_m3 + 250);
  });

  test('valida método, volume e data/hora da irrigação', async () => {
    const res = await request(app).post('/api/irrigacoes')
      .send({ id_safra: 5, data_hora: '2026-02-30 10:00', volume_m3: 0, duracao_min: 10, metodo: 'balde' })
      .expect(400);
    assert.deepEqual(Object.keys(res.body.details).sort(), ['data_hora', 'metodo', 'volume_m3']);
  });

  test('filtra irrigações por período e método', async () => {
    const res = await request(app).get('/api/irrigacoes')
      .query({ de: '2026-08-01', ate: '2026-10-31', metodo: 'gotejamento' }).expect(200);
    assert.ok(res.body.total > 0);
    for (const r of res.body.data) {
      assert.equal(r.metodo, 'gotejamento');
      assert.ok(r.data_hora >= '2026-08-01' && r.data_hora <= '2026-10-31 23:59:59');
    }
  });

  test('filtro inválido retorna 400', async () => {
    await request(app).get('/api/irrigacoes').query({ metodo: 'balde' }).expect(400);
  });

  test('safra não aceita colheita antes do plantio', async () => {
    const res = await request(app).post('/api/safras')
      .send({ id_talhao: 1, id_cultivo: 1, data_plantio: '2026-10-01', data_prevista_colheita: '2026-09-01' })
      .expect(400);
    assert.ok(res.body.details.data_prevista_colheita);
  });

  test('aplicação de defensivo exige ocorrência da mesma safra', async () => {
    // ocorrência 1 pertence à safra 4
    const res = await request(app).post('/api/aplicacoes')
      .send({ id_safra: 5, id_defensivo: 3, id_ocorrencia: 1, id_usuario: 2, data_aplicacao: '2026-11-15', quantidade_l: 5 })
      .expect(400);
    assert.ok(res.body.details.id_ocorrencia);
    await request(app).post('/api/aplicacoes')
      .send({ id_safra: 4, id_defensivo: 3, id_ocorrencia: 1, id_usuario: 2, data_aplicacao: '2026-11-15', quantidade_l: 5 })
      .expect(201);
  });

  test('e-mail de usuário único (409) e formato validado (400)', async () => {
    await request(app).post('/api/usuarios').send({ nome: 'X', email: 'ana@agrodata.exemplo', perfil: 'operador' }).expect(409);
    await request(app).post('/api/usuarios').send({ nome: 'X', email: 'invalido', perfil: 'operador' }).expect(400);
  });

  test('atualiza status de recomendação', async () => {
    const res = await request(app).patch('/api/recomendacoes/2').send({ status: 'concluida' }).expect(200);
    assert.equal(res.body.status, 'concluida');
  });

  test('options devolve rótulos legíveis para selects', async () => {
    const res = await request(app).get('/api/safras/options').expect(200);
    assert.ok(res.body.length >= 9);
    assert.match(res.body[0].label, /^#\d+ /);
  });
});

describe('triggers, procedures e auditoria', () => {
  test('trigger bloqueia irrigação antes do plantio (SIGNAL → 400)', async () => {
    const res = await request(app).post('/api/irrigacoes')
      .send({ id_safra: 5, data_hora: '2026-09-01T07:00', volume_m3: 10, duracao_min: 5, metodo: 'sulco' })
      .expect(400);
    assert.match(res.body.error, /anterior ao plantio/);
  });

  test('trigger de auditoria registra INSERT, UPDATE e DELETE com antes/depois', async () => {
    const criado = await request(app).post('/api/irrigacoes')
      .send({ id_safra: 7, data_hora: '2026-11-18 06:30', volume_m3: 100, duracao_min: 30, metodo: 'aspersao' }).expect(201);
    const id = criado.body.id_irrigacao;
    await request(app).patch(`/api/irrigacoes/${id}`).send({ volume_m3: 150 }).expect(200);
    await request(app).delete(`/api/irrigacoes/${id}`).expect(204);
    const res = await request(app).get('/api/auditoria').query({ tabela: 'irrigacao' }).expect(200);
    const ops = res.body.data.filter((r) => r.id_registro === id).map((r) => r.operacao).sort();
    assert.deepEqual(ops, ['DELETE', 'INSERT', 'UPDATE']);
    const upd = res.body.data.find((r) => r.id_registro === id && r.operacao === 'UPDATE');
    assert.equal(JSON.parse(upd.dados_antigos).volume_m3, 100);
    assert.equal(JSON.parse(upd.dados_novos).volume_m3, 150);
  });

  test('auditoria é somente leitura na API (405)', async () => {
    await request(app).post('/api/auditoria').send({}).expect(405);
    await request(app).delete('/api/auditoria/1').expect(405);
  });

  test('ocorrência de nível alto gera recomendação automática', async () => {
    await request(app).post('/api/ocorrencias')
      .send({ id_safra: 7, id_praga: 3, data_identificacao: '2026-11-18', nivel_infestacao: 'alto' }).expect(201);
    const rows = await query("SELECT * FROM recomendacao_manejo WHERE id_safra = 7 AND tipo = 'aplicar_defensivo' AND descricao LIKE '[automática]%'");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].prioridade, 'alta');
  });

  test('umidade abaixo do ideal gera uma única recomendação de irrigar', async () => {
    // sensor 1 está no Talhão A (safra 4, tomate, ideal 70%)
    await request(app).post('/api/leituras').send({ id_sensor: 1, data_hora: '2026-11-19 06:00', valor: 58 }).expect(201);
    await request(app).post('/api/leituras').send({ id_sensor: 1, data_hora: '2026-11-19 18:00', valor: 57 }).expect(201);
    await request(app).post('/api/leituras').send({ id_sensor: 1, data_hora: '2026-11-20 06:00', valor: 69 }).expect(201);
    const rows = await query("SELECT * FROM recomendacao_manejo WHERE id_safra = 4 AND tipo = 'irrigar' AND status = 'pendente'");
    assert.equal(rows.length, 1);
  });

  test('procedure sp_consumo_agua_periodo filtra por propriedade e período', async () => {
    const res = await request(app).get('/api/relatorios/consumo-agua')
      .query({ id_propriedade: 2, de: '2026-08-01', ate: '2026-11-30' }).expect(200);
    assert.ok(res.body.data.every((r) => r.propriedade === 'Sítio Vale Verde'));
    const [esperado] = await query(
      `SELECT SUM(i.volume_m3) v FROM irrigacao i JOIN safra s ON s.id_safra = i.id_safra JOIN talhao t ON t.id_talhao = s.id_talhao
       WHERE t.id_propriedade = 2 AND DATE(i.data_hora) BETWEEN '2026-08-01' AND '2026-11-30'`
    );
    assert.equal(res.body.data.reduce((a, r) => a + r.volume_m3, 0), esperado.v);
    await request(app).get('/api/relatorios/consumo-agua').query({ de: '2026-12-01', ate: '2026-01-01' }).expect(400);
  });

  test('procedure sp_resumo_safra e função fn_m3_agua_por_tonelada', async () => {
    const res = await request(app).get('/api/relatorios/safras/1').expect(200);
    assert.equal(res.body.data.agua_m3, 9000);
    assert.equal(res.body.data.m3_agua_por_tonelada, 27.11); // 9000 m³ / 332 t
    await request(app).get('/api/relatorios/safras/9999').expect(400);
  });

  test('procedure sp_registrar_colheita grava e impede colheita duplicada', async () => {
    const res = await request(app).post('/api/relatorios/safras/5/colheita').send({ quantidade_colhida_kg: 33000 }).expect(200);
    assert.equal(res.body.data.kg_por_ha, 3300);
    const [s] = await query('SELECT quantidade_colhida_kg FROM safra WHERE id_safra = 5');
    assert.equal(s.quantidade_colhida_kg, 33000);
    const dup = await request(app).post('/api/relatorios/safras/5/colheita').send({ quantidade_colhida_kg: 1 }).expect(400);
    assert.match(dup.body.error, /já teve a colheita/);
    await request(app).post('/api/relatorios/safras/7/colheita').send({ quantidade_colhida_kg: -1 }).expect(400);
  });
});

describe('dashboard (indicadores calculados no MySQL)', () => {
  test('KPIs batem com consultas diretas ao banco', async () => {
    const res = await request(app).get('/api/dashboard').expect(200);
    const k = res.body.indicadores.kpis;
    const [agua] = await query('SELECT SUM(volume_m3) AS v FROM irrigacao');
    const [props] = await query('SELECT COUNT(*) AS n FROM propriedade');
    assert.equal(k.agua_total_m3, agua.v);
    assert.equal(k.propriedades, props.n);
    assert.ok(res.body.consultas.length >= 8);
    assert.ok(res.body.consultas.every((c) => /SELECT/i.test(c.sql)));
  });

  test('KPIs do topo e pizza de água por método conferem com o banco', async () => {
    const res = await request(app).get('/api/dashboard').expect(200);
    const I = res.body.indicadores;
    const [prod] = await query('SELECT SUM(quantidade_colhida_kg) AS kg FROM safra');
    assert.equal(I.kpis.producao_colhida_kg, prod.kg);
    const [media] = await query('SELECT ROUND(AVG(pct_do_esperado), 1) AS m FROM vw_produtividade_safra');
    assert.equal(I.kpis.produtividade_media_pct, media.m);
    const soma = I.agua_por_metodo.reduce((a, r) => a + r.volume_m3, 0);
    assert.equal(soma, I.kpis.agua_total_m3);
    const pct = I.agua_por_metodo.reduce((a, r) => a + r.pct, 0);
    assert.ok(Math.abs(pct - 100) < 0.5);
  });

  test('consumo por talhão soma o total geral', async () => {
    const res = await request(app).get('/api/dashboard').expect(200);
    const soma = res.body.indicadores.consumo_por_talhao.reduce((a, r) => a + r.volume_m3, 0);
    assert.equal(soma, res.body.indicadores.kpis.agua_total_m3);
  });

  test('filtro por propriedade restringe os indicadores', async () => {
    const res = await request(app).get('/api/dashboard').query({ id_propriedade: 2 }).expect(200);
    assert.equal(res.body.indicadores.kpis.propriedades, 1);
    assert.ok(res.body.indicadores.consumo_por_talhao.every((r) => r.propriedade === 'Sítio Vale Verde'));
    const [agua] = await query(
      `SELECT SUM(i.volume_m3) v FROM irrigacao i JOIN safra s ON s.id_safra = i.id_safra
       JOIN talhao t ON t.id_talhao = s.id_talhao WHERE t.id_propriedade = 2`
    );
    assert.equal(res.body.indicadores.kpis.agua_total_m3, agua.v);
  });

  test('produtividade calcula kg/ha da safra 1 (332 t em 100 ha)', async () => {
    const res = await request(app).get('/api/dashboard').expect(200);
    const s1 = res.body.indicadores.produtividade.find((r) => r.id_safra === 1);
    assert.equal(s1.kg_por_ha, 3320);
    assert.equal(s1.pct_esperado, 94.9);
  });
});
