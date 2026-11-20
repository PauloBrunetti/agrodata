// Dashboard: indicadores vindos de GET /api/dashboard (consultas SQL reais ao MySQL)
window.Dashboard = (() => {
  const { esc, num, date, datetime, label } = window.Fmt;
  let charts = [];

  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  function destroyCharts() { charts.forEach((c) => c.destroy()); charts = []; }

  function baseOptions(extra = {}) {
    const grid = css('--grid');
    const text = css('--text-2');
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: css('--text'), titleColor: css('--surface'), bodyColor: css('--surface'),
          padding: 10, cornerRadius: 8, boxPadding: 4,
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: text }, border: { color: grid } },
        y: { grid: { color: grid }, ticks: { color: text }, border: { display: false } },
      },
      ...extra,
    };
  }

  function card(id, title, sub, body, { table = false } = {}) {
    return `<section class="card" id="card_${id}">
      <div class="card-head"><div><h3>${esc(title)}</h3>${sub ? `<p class="card-sub">${esc(sub)}</p>` : ''}</div>
        <div class="card-tools">
          ${table ? `<button class="link-btn" data-toggle-table="${id}" type="button">Ver tabela</button>` : ''}
          <button class="link-btn" data-toggle-sql="${id}" type="button">Ver SQL</button>
        </div></div>
      <div class="card-body">${body}<div class="alt-table" id="tbl_${id}" hidden></div><pre class="sql" id="sql_${id}" hidden></pre></div>
    </section>`;
  }

  function simpleTable(cols, rows, empty = 'Sem registros.') {
    if (!rows.length) return `<p class="empty">${esc(empty)}</p>`;
    return `<div class="table-wrap"><table><thead><tr>${cols.map((c) => `<th class="${c.num ? 'num' : ''}">${esc(c.label)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td class="${c.num ? 'num' : ''}">${c.render ? c.render(r) : esc(r[c.key] ?? '—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function legend(items) {
    return `<div class="legend">${items.map(([name, color]) => `<span><i style="background:${color}"></i>${esc(name)}</span>`).join('')}</div>`;
  }

  async function render(view, params) {
    destroyCharts();
    view.innerHTML = '<p class="loading">Carregando indicadores do MySQL…</p>';
    const [props, res] = await Promise.all([
      Api.get('/propriedades/options'),
      Api.get('/dashboard', { id_propriedade: params.id_propriedade }),
    ]);
    const I = res.indicadores;
    const k = I.kpis;
    const s1 = css('--series-1'), s2 = css('--series-2'), s3 = css('--series-3');
    const warnC = css('--status-warning'), serC = css('--status-serious'), critC = css('--status-critical');
    const surface = css('--surface');

    const kpi = (lbl, value, unit, hint) => `<div class="card kpi"><div class="label">${esc(lbl)}</div>
      <div class="value">${value}${unit ? `<small>${esc(unit)}</small>` : ''}</div>${hint ? `<div class="hint">${esc(hint)}</div>` : ''}</div>`;

    const umid = I.umidade_solo.map((r) => {
      const diff = r.umidade_ideal_pct == null ? null : r.umidade_pct - r.umidade_ideal_pct;
      let st = '<span class="badge">Sem safra ativa</span>';
      if (diff != null) {
        st = diff < -5 ? '<span class="badge bad">▼ Abaixo do ideal</span>'
          : diff > 5 ? '<span class="badge warn">▲ Acima do ideal</span>'
            : '<span class="badge good">● Dentro da faixa</span>';
      }
      return { ...r, st };
    });

    view.innerHTML = `
      <div class="dash-filters">
        <label class="field-inline" for="dashProp">Propriedade
          <select class="input" id="dashProp"><option value="">Todas as propriedades</option>
          ${props.map((p) => `<option value="${p.id}" ${String(p.id) === String(params.id_propriedade || '') ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}
          </select></label>
        <span class="muted" style="font-size:12.5px">Atualizado em ${esc(datetime(res.gerado_em.replace('T', ' ')))} (UTC) · fonte: MySQL</span>
      </div>
      <div class="kpis">
        ${kpi('Propriedades', num(k.propriedades, 0))}
        ${kpi('Talhões', num(k.talhoes, 0), '', `${num(k.area_talhoes_ha, 1)} ha cadastrados`)}
        ${kpi('Safras em andamento', num(k.safras_em_andamento, 0))}
        ${kpi('Água total irrigada', num(k.agua_total_m3, 0), 'm³', `${num(k.agua_30d_m3, 0)} m³ nos últimos 30 dias`)}
        ${kpi('Defensivos aplicados', num(k.defensivos_total_l, 1), 'L')}
        ${kpi('Ocorrências nível alto', num(k.ocorrencias_nivel_alto, 0))}
        ${kpi('Recomendações pendentes', num(k.recomendacoes_pendentes, 0))}
      </div>
      <div class="grid-2">
        ${card('consumo_mensal', 'Consumo de água por mês', 'm³ por método de irrigação — últimos 12 meses',
          `${legend([['Aspersão', s1], ['Gotejamento', s2], ['Sulco', s3]])}<div class="chart-box"><canvas id="ch_mensal" aria-label="Gráfico de consumo mensal de água"></canvas></div>`, { table: true })}
        ${card('consumo_por_talhao', 'Consumo de água por talhão', 'm³ por hectare (volume total no detalhe)',
          '<div class="chart-box"><canvas id="ch_talhao" aria-label="Gráfico de consumo por talhão"></canvas></div>', { table: true })}
      </div>
      <div class="grid-2">
        ${card('produtividade', 'Produtividade das safras colhidas', '% do rendimento esperado do cultivo (100% = meta)',
          '<div class="chart-box"><canvas id="ch_prod" aria-label="Gráfico de produtividade"></canvas></div>', { table: true })}
        ${card('pragas', 'Ocorrências de pragas', 'Quantidade por praga e nível de infestação',
          `${legend([['Baixo', warnC], ['Médio', serC], ['Alto', critC]])}<div class="chart-box"><canvas id="ch_pragas" aria-label="Gráfico de ocorrências de pragas"></canvas></div>`, { table: true })}
      </div>
      <div class="grid-2">
        ${card('umidade_solo', 'Umidade do solo (última leitura)', 'Comparada à umidade ideal do cultivo em andamento (±5 p.p.)',
          simpleTable([
            { label: 'Talhão', render: (r) => `${esc(r.talhao)}<br><span class="muted">${esc(r.propriedade)}</span>` },
            { label: 'Leitura', render: (r) => esc(datetime(r.data_hora)) },
            { label: 'Umidade', num: true, render: (r) => `${num(r.umidade_pct, 1)}%` },
            { label: 'Ideal', num: true, render: (r) => (r.umidade_ideal_pct == null ? '—' : `${num(r.umidade_ideal_pct, 0)}%`) },
            { label: 'Situação', render: (r) => r.st },
          ], umid, 'Nenhum sensor de umidade com leituras.'))}
        ${card('recomendacoes_pendentes', 'Recomendações pendentes', 'Ordenadas por prioridade',
          simpleTable([
            { label: 'Prioridade', render: (r) => Fmt.cell('badge', r.prioridade) },
            { label: 'Tipo', render: (r) => esc(label(r.tipo)) },
            { label: 'Descrição', render: (r) => `${esc(r.descricao)}<br><span class="muted">${esc(r.cultivo)} · ${esc(r.talhao)} (${esc(r.propriedade)})</span>` },
          ], I.recomendacoes_pendentes, 'Nenhuma recomendação pendente.') + '<p><a href="#/r/recomendacoes?status=pendente">Gerenciar recomendações →</a></p>')}
      </div>
      <div class="grid-2">
        ${card('defensivos_por_safra', 'Uso de defensivos por safra', 'Litros aplicados e litros por hectare',
          simpleTable([
            { label: 'Safra', render: (r) => `#${r.id_safra} ${esc(r.cultivo)}<br><span class="muted">${esc(r.talhao)} (${esc(r.propriedade)})</span>` },
            { label: 'Aplicações', num: true, render: (r) => num(r.aplicacoes, 0) },
            { label: 'Litros', num: true, render: (r) => num(r.litros, 1) },
            { label: 'L/ha', num: true, render: (r) => num(r.litros_por_ha, 2) },
          ], I.defensivos_por_safra))}
        ${card('carencia_ativa', 'Safras em período de carência', 'Colheita só após a data de liberação do defensivo',
          simpleTable([
            { label: 'Defensivo', key: 'defensivo' },
            { label: 'Safra', render: (r) => `${esc(r.cultivo)} · ${esc(r.talhao)}<br><span class="muted">${esc(r.propriedade)}</span>` },
            { label: 'Aplicação', render: (r) => esc(date(r.data_aplicacao)) },
            { label: 'Liberação', render: (r) => `<span class="badge warn">${esc(date(r.liberacao))}</span>` },
          ], I.carencia_ativa, 'Nenhuma safra em carência hoje.'))}
      </div>
      <p class="note">Todos os números acima são calculados no momento da consulta, diretamente sobre os registros do MySQL. Os dados cadastrados na base de demonstração são fictícios.</p>`;

    // SQL de cada indicador
    res.consultas.forEach((c) => {
      const el = view.querySelector(`#sql_${c.id}`);
      if (el) el.textContent = c.sql;
    });
    view.querySelector('#dashProp').addEventListener('change', (e) => {
      location.hash = e.target.value ? `#/dashboard?id_propriedade=${e.target.value}` : '#/dashboard';
    });
    view.onclick = (e) => {
      const s = e.target.closest('[data-toggle-sql]');
      const t = e.target.closest('[data-toggle-table]');
      if (s) { const el = view.querySelector(`#sql_${s.dataset.toggleSql}`); el.hidden = !el.hidden; s.textContent = el.hidden ? 'Ver SQL' : 'Ocultar SQL'; }
      if (t) { const el = view.querySelector(`#tbl_${t.dataset.toggleTable}`); el.hidden = !el.hidden; t.textContent = el.hidden ? 'Ver tabela' : 'Ocultar tabela'; }
    };

    // Tabelas alternativas (acessibilidade)
    const setTbl = (id, html) => { view.querySelector(`#tbl_${id}`).innerHTML = html; };
    setTbl('consumo_mensal', simpleTable([
      { label: 'Mês', key: 'mes' }, { label: 'Aspersão', num: true, render: (r) => num(r.aspersao, 0) },
      { label: 'Gotejamento', num: true, render: (r) => num(r.gotejamento, 0) }, { label: 'Sulco', num: true, render: (r) => num(r.sulco, 0) },
      { label: 'Total (m³)', num: true, render: (r) => num(r.volume_m3, 0) }], I.consumo_mensal));
    setTbl('consumo_por_talhao', simpleTable([
      { label: 'Talhão', render: (r) => `${esc(r.talhao)} (${esc(r.propriedade)})` }, { label: 'Área (ha)', num: true, render: (r) => num(r.area_ha, 1) },
      { label: 'Eventos', num: true, render: (r) => num(r.eventos, 0) }, { label: 'Volume (m³)', num: true, render: (r) => num(r.volume_m3, 0) },
      { label: 'm³/ha', num: true, render: (r) => num(r.m3_por_ha, 1) }], I.consumo_por_talhao));
    setTbl('produtividade', simpleTable([
      { label: 'Safra', render: (r) => `#${r.id_safra} ${esc(r.cultivo)} · ${esc(r.talhao)}` }, { label: 'kg/ha', num: true, render: (r) => num(r.kg_por_ha, 0) },
      { label: 'Esperado', num: true, render: (r) => num(r.rendimento_esperado_kg_ha, 0) }, { label: '% meta', num: true, render: (r) => `${num(r.pct_esperado, 1)}%` },
      { label: 'm³ água/t', num: true, render: (r) => num(r.m3_agua_por_tonelada, 2) }], I.produtividade));
    setTbl('pragas', simpleTable([
      { label: 'Praga', key: 'praga' }, { label: 'Baixo', num: true, key: 'baixo' }, { label: 'Médio', num: true, key: 'medio' },
      { label: 'Alto', num: true, key: 'alto' }, { label: 'Total', num: true, key: 'total' }], I.pragas));

    // Gráficos
    const bar = { borderRadius: 4, borderSkipped: false, maxBarThickness: 36, borderColor: surface, borderWidth: 1 };
    const mesLabel = (m) => { const [y, mm] = m.split('-'); return `${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(mm) - 1]}/${y.slice(2)}`; };

    charts.push(new Chart(view.querySelector('#ch_mensal'), {
      type: 'bar',
      data: {
        labels: I.consumo_mensal.map((r) => mesLabel(r.mes)),
        datasets: [
          { label: 'Aspersão', data: I.consumo_mensal.map((r) => r.aspersao), backgroundColor: s1, ...bar },
          { label: 'Gotejamento', data: I.consumo_mensal.map((r) => r.gotejamento), backgroundColor: s2, ...bar },
          { label: 'Sulco', data: I.consumo_mensal.map((r) => r.sulco), backgroundColor: s3, ...bar },
        ],
      },
      options: baseOptions({
        scales: { ...baseOptions().scales, x: { ...baseOptions().scales.x, stacked: true }, y: { ...baseOptions().scales.y, stacked: true, title: { display: true, text: 'm³', color: css('--text-3') } } },
        plugins: { ...baseOptions().plugins, tooltip: { ...baseOptions().plugins.tooltip, callbacks: { label: (c) => ` ${c.dataset.label}: ${num(c.raw, 0)} m³`, footer: (items) => `Total: ${num(items.reduce((a, i) => a + i.raw, 0), 0)} m³` } } },
      }),
    }));

    const talhoes = I.consumo_por_talhao.filter((r) => r.volume_m3 > 0).sort((a, b) => b.m3_por_ha - a.m3_por_ha);
    charts.push(new Chart(view.querySelector('#ch_talhao'), {
      type: 'bar',
      data: { labels: talhoes.map((r) => `${r.talhao} · ${r.propriedade}`), datasets: [{ label: 'm³/ha', data: talhoes.map((r) => r.m3_por_ha), backgroundColor: s1, ...bar }] },
      options: baseOptions({
        indexAxis: 'y',
        interaction: { mode: 'nearest', axis: 'y', intersect: false },
        scales: { x: { ...baseOptions().scales.y, title: { display: true, text: 'm³/ha', color: css('--text-3') } }, y: { ...baseOptions().scales.x } },
        plugins: { ...baseOptions().plugins, tooltip: { ...baseOptions().plugins.tooltip, callbacks: { label: (c) => { const r = talhoes[c.dataIndex]; return [` ${num(r.m3_por_ha, 1)} m³/ha`, ` ${num(r.volume_m3, 0)} m³ em ${r.eventos} irrigações`, ` Área: ${num(r.area_ha, 1)} ha`]; } } } },
      }),
    }));

    const prod = I.produtividade;
    charts.push(new Chart(view.querySelector('#ch_prod'), {
      type: 'bar',
      data: { labels: prod.map((r) => `#${r.id_safra} ${r.cultivo} · ${r.talhao}`), datasets: [{ label: '% do esperado', data: prod.map((r) => r.pct_esperado), backgroundColor: s1, ...bar }] },
      options: baseOptions({
        indexAxis: 'y',
        interaction: { mode: 'nearest', axis: 'y', intersect: false },
        scales: { x: { ...baseOptions().scales.y, min: 0, suggestedMax: 110, ticks: { color: css('--text-2'), callback: (v) => `${v}%` } }, y: { ...baseOptions().scales.x } },
        plugins: { ...baseOptions().plugins, tooltip: { ...baseOptions().plugins.tooltip, callbacks: { label: (c) => { const r = prod[c.dataIndex]; return [` ${num(r.pct_esperado, 1)}% do esperado`, ` ${num(r.kg_por_ha, 0)} kg/ha (meta ${num(r.rendimento_esperado_kg_ha, 0)})`, ` Água: ${num(r.m3_agua_por_tonelada, 2)} m³ por tonelada`]; } } } },
      }),
    }));

    const pr = I.pragas;
    charts.push(new Chart(view.querySelector('#ch_pragas'), {
      type: 'bar',
      data: {
        labels: pr.map((r) => r.praga),
        datasets: [
          { label: 'Baixo', data: pr.map((r) => r.baixo), backgroundColor: warnC, ...bar },
          { label: 'Médio', data: pr.map((r) => r.medio), backgroundColor: serC, ...bar },
          { label: 'Alto', data: pr.map((r) => r.alto), backgroundColor: critC, ...bar },
        ],
      },
      options: baseOptions({
        indexAxis: 'y',
        scales: { x: { ...baseOptions().scales.y, stacked: true, ticks: { color: css('--text-2'), precision: 0 } }, y: { ...baseOptions().scales.x, stacked: true } },
        plugins: { ...baseOptions().plugins, tooltip: { ...baseOptions().plugins.tooltip, filter: (i) => i.raw > 0 } },
      }),
    }));
  }

  return { render, destroyCharts };
})();
