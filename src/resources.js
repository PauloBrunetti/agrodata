// Definição declarativa dos recursos da API.
// Cada recurso mapeia uma tabela existente do MySQL: campos editáveis (com regras de validação),
// colunas da listagem (com JOINs para exibir nomes em vez de IDs) e filtros disponíveis.
// O mesmo metadado alimenta os formulários e as tabelas do frontend (GET /api/meta).

const PROPRIEDADE_JOIN = 'JOIN propriedade p ON p.id_propriedade = t.id_propriedade';
const SAFRA_LABEL = "CONCAT('#', s.id_safra, ' ', c.nome, ' — ', t.nome, ' (', p.nome, ')')";
const SAFRA_JOINS = `JOIN safra s ON s.id_safra = x.id_safra
  JOIN talhao t ON t.id_talhao = s.id_talhao
  ${PROPRIEDADE_JOIN}
  JOIN cultivo c ON c.id_cultivo = s.id_cultivo`;

const resources = {
  propriedades: {
    table: 'propriedade', pk: 'id_propriedade', label: 'Propriedades', singular: 'Propriedade',
    group: 'Áreas',
    fields: [
      { name: 'nome', label: 'Nome', type: 'text', required: true, max: 100 },
      { name: 'proprietario', label: 'Proprietário', type: 'text', required: true, max: 100 },
      { name: 'cidade', label: 'Cidade', type: 'text', max: 80 },
      { name: 'area_total_ha', label: 'Área total (ha)', type: 'decimal', required: true, gt: 0, max: 99999999.99 },
    ],
    from: 'propriedade x',
    columns: [
      { key: 'id_propriedade', label: 'ID', sql: 'x.id_propriedade', type: 'int' },
      { key: 'nome', label: 'Nome', sql: 'x.nome' },
      { key: 'proprietario', label: 'Proprietário', sql: 'x.proprietario' },
      { key: 'cidade', label: 'Cidade', sql: 'x.cidade' },
      { key: 'area_total_ha', label: 'Área (ha)', sql: 'x.area_total_ha', type: 'decimal' },
      { key: 'qtd_talhoes', label: 'Talhões', sql: '(SELECT COUNT(*) FROM talhao tt WHERE tt.id_propriedade = x.id_propriedade)', type: 'int' },
    ],
    search: ['x.nome', 'x.proprietario', 'x.cidade'],
    optionLabel: 'x.nome',
    order: 'x.nome',
  },

  talhoes: {
    table: 'talhao', pk: 'id_talhao', label: 'Talhões', singular: 'Talhão', group: 'Áreas',
    fields: [
      { name: 'id_propriedade', label: 'Propriedade', type: 'fk', ref: 'propriedades', required: true },
      { name: 'nome', label: 'Nome', type: 'text', required: true, max: 60 },
      { name: 'area_ha', label: 'Área (ha)', type: 'decimal', required: true, gt: 0, max: 99999999.99 },
      { name: 'tipo_solo', label: 'Tipo de solo', type: 'text', max: 40 },
    ],
    from: 'talhao x JOIN propriedade p ON p.id_propriedade = x.id_propriedade',
    columns: [
      { key: 'id_talhao', label: 'ID', sql: 'x.id_talhao', type: 'int' },
      { key: 'nome', label: 'Talhão', sql: 'x.nome' },
      { key: 'propriedade', label: 'Propriedade', sql: 'p.nome' },
      { key: 'area_ha', label: 'Área (ha)', sql: 'x.area_ha', type: 'decimal' },
      { key: 'tipo_solo', label: 'Solo', sql: 'x.tipo_solo' },
    ],
    filters: [{ param: 'id_propriedade', sql: 'x.id_propriedade', ref: 'propriedades', label: 'Propriedade' }],
    search: ['x.nome', 'x.tipo_solo', 'p.nome'],
    optionLabel: "CONCAT(x.nome, ' (', p.nome, ')')",
    order: 'p.nome, x.nome',
  },

  cultivos: {
    table: 'cultivo', pk: 'id_cultivo', label: 'Cultivos', singular: 'Cultivo', group: 'Cadastros base',
    fields: [
      { name: 'nome', label: 'Nome', type: 'text', required: true, max: 60 },
      { name: 'variedade', label: 'Variedade', type: 'text', max: 60 },
      { name: 'ciclo_dias', label: 'Ciclo (dias)', type: 'int', required: true, gt: 0 },
      { name: 'umidade_ideal_pct', label: 'Umidade ideal (%)', type: 'decimal', min: 0, max: 100 },
      { name: 'tipo_colheita', label: 'Tipo de colheita', type: 'enum', required: true, options: ['unica', 'multipla'] },
      { name: 'rendimento_esperado_kg_ha', label: 'Rendimento esperado (kg/ha)', type: 'decimal', min: 0, max: 99999999.99 },
    ],
    from: 'cultivo x',
    columns: [
      { key: 'id_cultivo', label: 'ID', sql: 'x.id_cultivo', type: 'int' },
      { key: 'nome', label: 'Cultivo', sql: 'x.nome' },
      { key: 'variedade', label: 'Variedade', sql: 'x.variedade' },
      { key: 'ciclo_dias', label: 'Ciclo (dias)', sql: 'x.ciclo_dias', type: 'int' },
      { key: 'umidade_ideal_pct', label: 'Umidade ideal (%)', sql: 'x.umidade_ideal_pct', type: 'decimal' },
      { key: 'tipo_colheita', label: 'Colheita', sql: 'x.tipo_colheita', type: 'enum' },
      { key: 'rendimento_esperado_kg_ha', label: 'Rend. esperado (kg/ha)', sql: 'x.rendimento_esperado_kg_ha', type: 'decimal' },
    ],
    search: ['x.nome', 'x.variedade'],
    optionLabel: "CONCAT(x.nome, IFNULL(CONCAT(' — ', x.variedade), ''))",
    order: 'x.nome',
  },

  safras: {
    table: 'safra', pk: 'id_safra', label: 'Safras', singular: 'Safra', group: 'Produção',
    fields: [
      { name: 'id_talhao', label: 'Talhão', type: 'fk', ref: 'talhoes', required: true },
      { name: 'id_cultivo', label: 'Cultivo', type: 'fk', ref: 'cultivos', required: true },
      { name: 'data_plantio', label: 'Data de plantio', type: 'date', required: true },
      { name: 'data_prevista_colheita', label: 'Colheita prevista', type: 'date', required: true },
      { name: 'quantidade_colhida_kg', label: 'Quantidade colhida (kg)', type: 'decimal', min: 0, max: 9999999999.99 },
    ],
    from: `safra x JOIN talhao t ON t.id_talhao = x.id_talhao ${PROPRIEDADE_JOIN}
      JOIN cultivo c ON c.id_cultivo = x.id_cultivo`,
    columns: [
      { key: 'id_safra', label: 'ID', sql: 'x.id_safra', type: 'int' },
      { key: 'cultivo', label: 'Cultivo', sql: 'c.nome' },
      { key: 'talhao', label: 'Talhão', sql: 't.nome' },
      { key: 'propriedade', label: 'Propriedade', sql: 'p.nome' },
      { key: 'data_plantio', label: 'Plantio', sql: 'x.data_plantio', type: 'date' },
      { key: 'data_prevista_colheita', label: 'Colheita prevista', sql: 'x.data_prevista_colheita', type: 'date' },
      { key: 'quantidade_colhida_kg', label: 'Colhido (kg)', sql: 'x.quantidade_colhida_kg', type: 'decimal' },
      { key: 'status', label: 'Situação', sql: "IF(x.quantidade_colhida_kg IS NULL, 'em andamento', 'colhida')", type: 'badge' },
    ],
    filters: [
      { param: 'id_propriedade', sql: 'p.id_propriedade', ref: 'propriedades', label: 'Propriedade' },
      { param: 'id_talhao', sql: 'x.id_talhao', ref: 'talhoes', label: 'Talhão' },
      { param: 'id_cultivo', sql: 'x.id_cultivo', ref: 'cultivos', label: 'Cultivo' },
      { param: 'situacao', label: 'Situação', type: 'enum', options: ['em_andamento', 'colhida'],
        clause: (v) => (v === 'colhida' ? 'x.quantidade_colhida_kg IS NOT NULL' : 'x.quantidade_colhida_kg IS NULL') },
    ],
    search: ['c.nome', 't.nome', 'p.nome'],
    optionLabel: "CONCAT('#', x.id_safra, ' ', c.nome, ' — ', t.nome, ' (', p.nome, ')')",
    order: 'x.data_plantio DESC',
    validate: (data) => {
      if (data.data_plantio && data.data_prevista_colheita && data.data_prevista_colheita < data.data_plantio) {
        return { data_prevista_colheita: 'A colheita prevista não pode ser anterior ao plantio' };
      }
      return null;
    },
  },

  irrigacoes: {
    table: 'irrigacao', pk: 'id_irrigacao', label: 'Irrigação', singular: 'Irrigação', group: 'Manejo',
    fields: [
      { name: 'id_safra', label: 'Safra', type: 'fk', ref: 'safras', required: true },
      { name: 'data_hora', label: 'Data e hora', type: 'datetime', required: true },
      { name: 'volume_m3', label: 'Volume (m³)', type: 'decimal', required: true, gt: 0, max: 9999999999.99 },
      { name: 'duracao_min', label: 'Duração (min)', type: 'int', required: true, gt: 0 },
      { name: 'metodo', label: 'Método', type: 'enum', required: true, options: ['gotejamento', 'aspersao', 'sulco'] },
    ],
    from: `irrigacao x ${SAFRA_JOINS}`,
    columns: [
      { key: 'id_irrigacao', label: 'ID', sql: 'x.id_irrigacao', type: 'int' },
      { key: 'data_hora', label: 'Data/hora', sql: 'x.data_hora', type: 'datetime' },
      { key: 'propriedade', label: 'Propriedade', sql: 'p.nome' },
      { key: 'talhao', label: 'Talhão', sql: 't.nome' },
      { key: 'cultivo', label: 'Cultivo', sql: 'c.nome' },
      { key: 'metodo', label: 'Método', sql: 'x.metodo', type: 'enum' },
      { key: 'volume_m3', label: 'Volume (m³)', sql: 'x.volume_m3', type: 'decimal' },
      { key: 'duracao_min', label: 'Duração (min)', sql: 'x.duracao_min', type: 'int' },
    ],
    filters: [
      { param: 'id_propriedade', sql: 'p.id_propriedade', ref: 'propriedades', label: 'Propriedade' },
      { param: 'id_talhao', sql: 't.id_talhao', ref: 'talhoes', label: 'Talhão' },
      { param: 'id_safra', sql: 'x.id_safra', ref: 'safras', label: 'Safra' },
      { param: 'metodo', sql: 'x.metodo', type: 'enum', options: ['gotejamento', 'aspersao', 'sulco'], label: 'Método' },
      { param: 'de', sql: 'DATE(x.data_hora)', op: '>=', type: 'date', label: 'De' },
      { param: 'ate', sql: 'DATE(x.data_hora)', op: '<=', type: 'date', label: 'Até' },
    ],
    search: ['p.nome', 't.nome', 'c.nome'],
    order: 'x.data_hora DESC',
    summary: 'SUM(x.volume_m3) AS volume_total_m3, SUM(x.duracao_min) AS duracao_total_min',
  },

  pragas: {
    table: 'praga', pk: 'id_praga', label: 'Pragas', singular: 'Praga', group: 'Cadastros base',
    fields: [
      { name: 'nome_popular', label: 'Nome popular', type: 'text', required: true, max: 80 },
      { name: 'nome_cientifico', label: 'Nome científico', type: 'text', required: true, max: 100 },
    ],
    from: 'praga x',
    columns: [
      { key: 'id_praga', label: 'ID', sql: 'x.id_praga', type: 'int' },
      { key: 'nome_popular', label: 'Nome popular', sql: 'x.nome_popular' },
      { key: 'nome_cientifico', label: 'Nome científico', sql: 'x.nome_cientifico', type: 'italic' },
      { key: 'cultivos_afetados', label: 'Cultivos afetados',
        sql: "(SELECT GROUP_CONCAT(c.nome ORDER BY c.nome SEPARATOR ', ') FROM cultivo_praga cp JOIN cultivo c ON c.id_cultivo = cp.id_cultivo WHERE cp.id_praga = x.id_praga)" },
      { key: 'defensivos', label: 'Defensivos indicados',
        sql: "(SELECT GROUP_CONCAT(d.nome_comercial ORDER BY d.nome_comercial SEPARATOR ', ') FROM defensivo_praga dp JOIN defensivo d ON d.id_defensivo = dp.id_defensivo WHERE dp.id_praga = x.id_praga)" },
    ],
    search: ['x.nome_popular', 'x.nome_cientifico'],
    optionLabel: 'x.nome_popular',
    order: 'x.nome_popular',
  },

  ocorrencias: {
    table: 'ocorrencia_praga', pk: 'id_ocorrencia', label: 'Ocorrências de pragas', singular: 'Ocorrência', group: 'Manejo',
    fields: [
      { name: 'id_safra', label: 'Safra', type: 'fk', ref: 'safras', required: true },
      { name: 'id_praga', label: 'Praga', type: 'fk', ref: 'pragas', required: true },
      { name: 'data_identificacao', label: 'Data de identificação', type: 'date', required: true },
      { name: 'nivel_infestacao', label: 'Nível de infestação', type: 'enum', required: true, options: ['baixo', 'medio', 'alto'] },
      { name: 'observacoes', label: 'Observações', type: 'textarea', max: 255 },
    ],
    from: `ocorrencia_praga x ${SAFRA_JOINS} JOIN praga pr ON pr.id_praga = x.id_praga`,
    columns: [
      { key: 'id_ocorrencia', label: 'ID', sql: 'x.id_ocorrencia', type: 'int' },
      { key: 'data_identificacao', label: 'Data', sql: 'x.data_identificacao', type: 'date' },
      { key: 'praga', label: 'Praga', sql: 'pr.nome_popular' },
      { key: 'nivel_infestacao', label: 'Nível', sql: 'x.nivel_infestacao', type: 'badge' },
      { key: 'cultivo', label: 'Cultivo', sql: 'c.nome' },
      { key: 'talhao', label: 'Talhão', sql: 't.nome' },
      { key: 'propriedade', label: 'Propriedade', sql: 'p.nome' },
      { key: 'observacoes', label: 'Observações', sql: 'x.observacoes' },
    ],
    filters: [
      { param: 'id_propriedade', sql: 'p.id_propriedade', ref: 'propriedades', label: 'Propriedade' },
      { param: 'id_praga', sql: 'x.id_praga', ref: 'pragas', label: 'Praga' },
      { param: 'nivel_infestacao', sql: 'x.nivel_infestacao', type: 'enum', options: ['baixo', 'medio', 'alto'], label: 'Nível' },
    ],
    search: ['pr.nome_popular', 'x.observacoes', 't.nome', 'p.nome'],
    optionLabel: "CONCAT('#', x.id_ocorrencia, ' ', pr.nome_popular, ' — ', t.nome, ' (', x.data_identificacao, ')')",
    order: 'x.data_identificacao DESC',
  },

  defensivos: {
    table: 'defensivo', pk: 'id_defensivo', label: 'Defensivos', singular: 'Defensivo', group: 'Cadastros base',
    fields: [
      { name: 'nome_comercial', label: 'Nome comercial', type: 'text', required: true, max: 80 },
      { name: 'principio_ativo', label: 'Princípio ativo', type: 'text', required: true, max: 120 },
      { name: 'classe_toxicologica', label: 'Classe toxicológica (1–5)', type: 'int', required: true, min: 1, max: 5 },
      { name: 'carencia_dias', label: 'Carência (dias)', type: 'int', required: true, min: 0 },
    ],
    from: 'defensivo x',
    columns: [
      { key: 'id_defensivo', label: 'ID', sql: 'x.id_defensivo', type: 'int' },
      { key: 'nome_comercial', label: 'Nome comercial', sql: 'x.nome_comercial' },
      { key: 'principio_ativo', label: 'Princípio ativo', sql: 'x.principio_ativo' },
      { key: 'classe_toxicologica', label: 'Classe tox.', sql: 'x.classe_toxicologica', type: 'int' },
      { key: 'carencia_dias', label: 'Carência (dias)', sql: 'x.carencia_dias', type: 'int' },
      { key: 'pragas_alvo', label: 'Pragas-alvo',
        sql: "(SELECT GROUP_CONCAT(pr.nome_popular ORDER BY pr.nome_popular SEPARATOR ', ') FROM defensivo_praga dp JOIN praga pr ON pr.id_praga = dp.id_praga WHERE dp.id_defensivo = x.id_defensivo)" },
    ],
    search: ['x.nome_comercial', 'x.principio_ativo'],
    optionLabel: 'x.nome_comercial',
    order: 'x.nome_comercial',
  },

  aplicacoes: {
    table: 'aplicacao_defensivo', pk: 'id_aplicacao', label: 'Aplicações de defensivos', singular: 'Aplicação', group: 'Manejo',
    fields: [
      { name: 'id_safra', label: 'Safra', type: 'fk', ref: 'safras', required: true },
      { name: 'id_defensivo', label: 'Defensivo', type: 'fk', ref: 'defensivos', required: true },
      { name: 'id_ocorrencia', label: 'Ocorrência relacionada', type: 'fk', ref: 'ocorrencias' },
      { name: 'id_usuario', label: 'Responsável', type: 'fk', ref: 'usuarios', required: true },
      { name: 'data_aplicacao', label: 'Data da aplicação', type: 'date', required: true },
      { name: 'quantidade_l', label: 'Quantidade (L)', type: 'decimal', required: true, gt: 0, max: 99999999.99 },
    ],
    from: `aplicacao_defensivo x ${SAFRA_JOINS}
      JOIN defensivo d ON d.id_defensivo = x.id_defensivo
      JOIN usuario u ON u.id_usuario = x.id_usuario
      LEFT JOIN ocorrencia_praga o ON o.id_ocorrencia = x.id_ocorrencia
      LEFT JOIN praga pr ON pr.id_praga = o.id_praga`,
    columns: [
      { key: 'id_aplicacao', label: 'ID', sql: 'x.id_aplicacao', type: 'int' },
      { key: 'data_aplicacao', label: 'Data', sql: 'x.data_aplicacao', type: 'date' },
      { key: 'defensivo', label: 'Defensivo', sql: 'd.nome_comercial' },
      { key: 'quantidade_l', label: 'Qtd. (L)', sql: 'x.quantidade_l', type: 'decimal' },
      { key: 'praga', label: 'Praga-alvo', sql: 'pr.nome_popular' },
      { key: 'cultivo', label: 'Cultivo', sql: 'c.nome' },
      { key: 'talhao', label: 'Talhão', sql: 't.nome' },
      { key: 'propriedade', label: 'Propriedade', sql: 'p.nome' },
      { key: 'liberacao_colheita', label: 'Liberação (carência)', sql: 'DATE_ADD(x.data_aplicacao, INTERVAL d.carencia_dias DAY)', type: 'date' },
      { key: 'responsavel', label: 'Responsável', sql: 'u.nome' },
    ],
    filters: [
      { param: 'id_propriedade', sql: 'p.id_propriedade', ref: 'propriedades', label: 'Propriedade' },
      { param: 'id_defensivo', sql: 'x.id_defensivo', ref: 'defensivos', label: 'Defensivo' },
      { param: 'de', sql: 'x.data_aplicacao', op: '>=', type: 'date', label: 'De' },
      { param: 'ate', sql: 'x.data_aplicacao', op: '<=', type: 'date', label: 'Até' },
    ],
    search: ['d.nome_comercial', 'pr.nome_popular', 't.nome', 'p.nome'],
    order: 'x.data_aplicacao DESC',
    summary: 'SUM(x.quantidade_l) AS quantidade_total_l',
    // Regra de negócio: a ocorrência vinculada deve pertencer à mesma safra
    validateAsync: async (data, query) => {
      if (data.id_ocorrencia == null || data.id_safra == null) return null;
      const rows = await query('SELECT id_safra FROM ocorrencia_praga WHERE id_ocorrencia = ?', [data.id_ocorrencia]);
      if (rows.length && rows[0].id_safra !== data.id_safra) {
        return { id_ocorrencia: 'A ocorrência selecionada pertence a outra safra' };
      }
      return null;
    },
  },

  'tipos-sensor': {
    table: 'tipo_sensor', pk: 'id_tipo_sensor', label: 'Tipos de sensor', singular: 'Tipo de sensor', group: 'Cadastros base',
    fields: [
      { name: 'nome', label: 'Nome', type: 'text', required: true, max: 60 },
      { name: 'unidade_medida', label: 'Unidade de medida', type: 'text', required: true, max: 10 },
    ],
    from: 'tipo_sensor x',
    columns: [
      { key: 'id_tipo_sensor', label: 'ID', sql: 'x.id_tipo_sensor', type: 'int' },
      { key: 'nome', label: 'Nome', sql: 'x.nome' },
      { key: 'unidade_medida', label: 'Unidade', sql: 'x.unidade_medida' },
    ],
    search: ['x.nome'],
    optionLabel: "CONCAT(x.nome, ' (', x.unidade_medida, ')')",
    order: 'x.nome',
  },

  sensores: {
    table: 'sensor', pk: 'id_sensor', label: 'Sensores', singular: 'Sensor', group: 'Monitoramento',
    fields: [
      { name: 'id_talhao', label: 'Talhão', type: 'fk', ref: 'talhoes', required: true },
      { name: 'id_tipo_sensor', label: 'Tipo', type: 'fk', ref: 'tipos-sensor', required: true },
      { name: 'modelo', label: 'Modelo', type: 'text', max: 60 },
      { name: 'data_instalacao', label: 'Data de instalação', type: 'date', required: true },
      { name: 'status', label: 'Status', type: 'enum', required: true, options: ['ativo', 'inativo', 'manutencao'], default: 'ativo' },
      { name: 'latitude', label: 'Latitude', type: 'decimal', min: -90, max: 90 },
      { name: 'longitude', label: 'Longitude', type: 'decimal', min: -180, max: 180 },
    ],
    from: `sensor x JOIN talhao t ON t.id_talhao = x.id_talhao ${PROPRIEDADE_JOIN}
      JOIN tipo_sensor ts ON ts.id_tipo_sensor = x.id_tipo_sensor`,
    columns: [
      { key: 'id_sensor', label: 'ID', sql: 'x.id_sensor', type: 'int' },
      { key: 'tipo', label: 'Tipo', sql: 'ts.nome' },
      { key: 'modelo', label: 'Modelo', sql: 'x.modelo' },
      { key: 'talhao', label: 'Talhão', sql: 't.nome' },
      { key: 'propriedade', label: 'Propriedade', sql: 'p.nome' },
      { key: 'status', label: 'Status', sql: 'x.status', type: 'badge' },
      { key: 'data_instalacao', label: 'Instalação', sql: 'x.data_instalacao', type: 'date' },
      { key: 'ultima_leitura', label: 'Última leitura',
        sql: "(SELECT CONCAT(l.valor, ' ', ts.unidade_medida) FROM leitura_sensor l WHERE l.id_sensor = x.id_sensor ORDER BY l.data_hora DESC LIMIT 1)" },
    ],
    filters: [
      { param: 'id_propriedade', sql: 'p.id_propriedade', ref: 'propriedades', label: 'Propriedade' },
      { param: 'id_tipo_sensor', sql: 'x.id_tipo_sensor', ref: 'tipos-sensor', label: 'Tipo' },
      { param: 'status', sql: 'x.status', type: 'enum', options: ['ativo', 'inativo', 'manutencao'], label: 'Status' },
    ],
    search: ['x.modelo', 't.nome', 'p.nome', 'ts.nome'],
    optionLabel: "CONCAT('#', x.id_sensor, ' ', ts.nome, ' — ', t.nome, ' (', p.nome, ')')",
    order: 'x.id_sensor',
  },

  leituras: {
    table: 'leitura_sensor', pk: 'id_leitura', label: 'Leituras de sensores', singular: 'Leitura', group: 'Monitoramento',
    fields: [
      { name: 'id_sensor', label: 'Sensor', type: 'fk', ref: 'sensores', required: true },
      { name: 'data_hora', label: 'Data e hora', type: 'datetime', required: true },
      { name: 'valor', label: 'Valor', type: 'decimal', required: true, min: -99999999.99, max: 99999999.99 },
    ],
    from: `leitura_sensor x JOIN sensor se ON se.id_sensor = x.id_sensor
      JOIN tipo_sensor ts ON ts.id_tipo_sensor = se.id_tipo_sensor
      JOIN talhao t ON t.id_talhao = se.id_talhao ${PROPRIEDADE_JOIN}`,
    columns: [
      { key: 'id_leitura', label: 'ID', sql: 'x.id_leitura', type: 'int' },
      { key: 'data_hora', label: 'Data/hora', sql: 'x.data_hora', type: 'datetime' },
      { key: 'tipo', label: 'Tipo', sql: 'ts.nome' },
      { key: 'valor', label: 'Valor', sql: 'x.valor', type: 'decimal' },
      { key: 'unidade', label: 'Unid.', sql: 'ts.unidade_medida' },
      { key: 'sensor', label: 'Sensor', sql: "CONCAT('#', se.id_sensor, ' ', IFNULL(se.modelo, ''))" },
      { key: 'talhao', label: 'Talhão', sql: 't.nome' },
      { key: 'propriedade', label: 'Propriedade', sql: 'p.nome' },
    ],
    filters: [
      { param: 'id_propriedade', sql: 'p.id_propriedade', ref: 'propriedades', label: 'Propriedade' },
      { param: 'id_sensor', sql: 'x.id_sensor', ref: 'sensores', label: 'Sensor' },
      { param: 'de', sql: 'DATE(x.data_hora)', op: '>=', type: 'date', label: 'De' },
      { param: 'ate', sql: 'DATE(x.data_hora)', op: '<=', type: 'date', label: 'Até' },
    ],
    search: ['ts.nome', 'se.modelo', 't.nome'],
    order: 'x.data_hora DESC',
  },

  previsoes: {
    table: 'previsao_climatica', pk: 'id_previsao', label: 'Previsão climática', singular: 'Previsão', group: 'Monitoramento',
    fields: [
      { name: 'id_propriedade', label: 'Propriedade', type: 'fk', ref: 'propriedades', required: true },
      { name: 'data_hora', label: 'Data e hora', type: 'datetime', required: true },
      { name: 'temperatura_c', label: 'Temperatura (°C)', type: 'decimal', min: -99.9, max: 99.9 },
      { name: 'precipitacao_mm', label: 'Precipitação (mm)', type: 'decimal', min: 0, max: 9999.9 },
      { name: 'umidade_ar_pct', label: 'Umidade do ar (%)', type: 'decimal', min: 0, max: 100 },
      { name: 'vento_kmh', label: 'Vento (km/h)', type: 'decimal', min: 0, max: 9999.9 },
    ],
    from: 'previsao_climatica x JOIN propriedade p ON p.id_propriedade = x.id_propriedade',
    columns: [
      { key: 'id_previsao', label: 'ID', sql: 'x.id_previsao', type: 'int' },
      { key: 'data_hora', label: 'Data/hora', sql: 'x.data_hora', type: 'datetime' },
      { key: 'propriedade', label: 'Propriedade', sql: 'p.nome' },
      { key: 'temperatura_c', label: 'Temp. (°C)', sql: 'x.temperatura_c', type: 'decimal' },
      { key: 'precipitacao_mm', label: 'Chuva (mm)', sql: 'x.precipitacao_mm', type: 'decimal' },
      { key: 'umidade_ar_pct', label: 'Umid. ar (%)', sql: 'x.umidade_ar_pct', type: 'decimal' },
      { key: 'vento_kmh', label: 'Vento (km/h)', sql: 'x.vento_kmh', type: 'decimal' },
    ],
    filters: [
      { param: 'id_propriedade', sql: 'x.id_propriedade', ref: 'propriedades', label: 'Propriedade' },
      { param: 'de', sql: 'DATE(x.data_hora)', op: '>=', type: 'date', label: 'De' },
      { param: 'ate', sql: 'DATE(x.data_hora)', op: '<=', type: 'date', label: 'Até' },
    ],
    search: ['p.nome'],
    order: 'x.data_hora DESC',
  },

  recomendacoes: {
    table: 'recomendacao_manejo', pk: 'id_recomendacao', label: 'Recomendações de manejo', singular: 'Recomendação', group: 'Manejo',
    fields: [
      { name: 'id_safra', label: 'Safra', type: 'fk', ref: 'safras', required: true },
      { name: 'data_geracao', label: 'Gerada em', type: 'datetime', required: true },
      { name: 'tipo', label: 'Tipo', type: 'enum', required: true, options: ['irrigar', 'aplicar_defensivo', 'monitorar'] },
      { name: 'descricao', label: 'Descrição', type: 'textarea', required: true, max: 255 },
      { name: 'prioridade', label: 'Prioridade', type: 'enum', required: true, options: ['baixa', 'media', 'alta'] },
      { name: 'status', label: 'Status', type: 'enum', required: true, options: ['pendente', 'aceita', 'recusada', 'concluida'], default: 'pendente' },
    ],
    from: `recomendacao_manejo x ${SAFRA_JOINS}`,
    columns: [
      { key: 'id_recomendacao', label: 'ID', sql: 'x.id_recomendacao', type: 'int' },
      { key: 'data_geracao', label: 'Gerada em', sql: 'x.data_geracao', type: 'datetime' },
      { key: 'tipo', label: 'Tipo', sql: 'x.tipo', type: 'enum' },
      { key: 'prioridade', label: 'Prioridade', sql: 'x.prioridade', type: 'badge' },
      { key: 'status', label: 'Status', sql: 'x.status', type: 'badge' },
      { key: 'descricao', label: 'Descrição', sql: 'x.descricao' },
      { key: 'safra', label: 'Safra', sql: SAFRA_LABEL },
    ],
    filters: [
      { param: 'id_propriedade', sql: 'p.id_propriedade', ref: 'propriedades', label: 'Propriedade' },
      { param: 'status', sql: 'x.status', type: 'enum', options: ['pendente', 'aceita', 'recusada', 'concluida'], label: 'Status' },
      { param: 'prioridade', sql: 'x.prioridade', type: 'enum', options: ['baixa', 'media', 'alta'], label: 'Prioridade' },
    ],
    search: ['x.descricao', 't.nome', 'p.nome'],
    order: "FIELD(x.status, 'pendente', 'aceita', 'concluida', 'recusada'), x.data_geracao DESC",
  },

  usuarios: {
    table: 'usuario', pk: 'id_usuario', label: 'Usuários', singular: 'Usuário', group: 'Cadastros base',
    fields: [
      { name: 'nome', label: 'Nome', type: 'text', required: true, max: 100 },
      { name: 'email', label: 'E-mail', type: 'email', required: true, max: 120 },
      { name: 'perfil', label: 'Perfil', type: 'enum', required: true, options: ['administrador', 'agronomo', 'operador', 'auditor'] },
    ],
    from: 'usuario x',
    columns: [
      { key: 'id_usuario', label: 'ID', sql: 'x.id_usuario', type: 'int' },
      { key: 'nome', label: 'Nome', sql: 'x.nome' },
      { key: 'email', label: 'E-mail', sql: 'x.email' },
      { key: 'perfil', label: 'Perfil', sql: 'x.perfil', type: 'enum' },
    ],
    filters: [{ param: 'perfil', sql: 'x.perfil', type: 'enum', options: ['administrador', 'agronomo', 'operador', 'auditor'], label: 'Perfil' }],
    search: ['x.nome', 'x.email'],
    optionLabel: "CONCAT(x.nome, ' (', x.perfil, ')')",
    order: 'x.nome',
  },
  auditoria: {
    table: 'auditoria', pk: 'id_auditoria', label: 'Auditoria', singular: 'Registro de auditoria', group: 'Administração',
    readOnly: true,
    fields: [],
    from: 'auditoria x',
    columns: [
      { key: 'id_auditoria', label: 'ID', sql: 'x.id_auditoria', type: 'int' },
      { key: 'data_hora', label: 'Data/hora', sql: 'x.data_hora', type: 'datetime' },
      { key: 'tabela', label: 'Tabela', sql: 'x.tabela' },
      { key: 'operacao', label: 'Operação', sql: 'x.operacao', type: 'badge' },
      { key: 'id_registro', label: 'Registro', sql: 'x.id_registro', type: 'int' },
      { key: 'usuario_banco', label: 'Usuário (MySQL)', sql: 'x.usuario_banco' },
      { key: 'dados_antigos', label: 'Antes', sql: 'CAST(x.dados_antigos AS CHAR)', type: 'json' },
      { key: 'dados_novos', label: 'Depois', sql: 'CAST(x.dados_novos AS CHAR)', type: 'json' },
    ],
    filters: [
      { param: 'tabela', sql: 'x.tabela', type: 'enum', options: ['irrigacao', 'aplicacao_defensivo', 'safra'], label: 'Tabela' },
      { param: 'operacao', sql: 'x.operacao', type: 'enum', options: ['INSERT', 'UPDATE', 'DELETE'], label: 'Operação' },
      { param: 'de', sql: 'DATE(x.data_hora)', op: '>=', type: 'date', label: 'De' },
      { param: 'ate', sql: 'DATE(x.data_hora)', op: '<=', type: 'date', label: 'Até' },
    ],
    search: ['x.usuario_banco', 'x.tabela'],
    order: 'x.id_auditoria DESC',
  },
};

module.exports = resources;
