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

    // ---------- Hero: fazenda ao fundo com indicadores em vidro na frente ----------
    const ICON = {
      prod: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
      agua: '<path d="M12 3c3.5 4.2 6 7.4 6 10.5A6 6 0 0 1 6 13.5C6 10.4 8.5 7.2 12 3z"/>',
      area: '<path d="M4 20c4-1 6-5 8-9s5-6 8-7c-1 6-3 10-7 13s-7 3-9 3z"/><path d="M4 20l7-7"/>',
      safra: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
      def: '<path d="M10 3h4v4l3 3v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9l3-3z"/><path d="M7 13h10"/>',
      praga: '<ellipse cx="12" cy="13" rx="4" ry="6"/><path d="M12 7V4M8 9 5 7M16 9l3-2M8 14H4M16 14h4M8 18l-3 2M16 18l3 2"/>',
      rec: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    };
    const icon = (n) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;
    const pct = Math.max(0, Math.min(Number(k.produtividade_media_pct) || 0, 100));
    const R = 54, C = 2 * Math.PI * R;
    const meses = I.consumo_mensal.map((r) => r.volume_m3);
    const spark = (() => {
      if (meses.length < 2) return '';
      const max = Math.max(...meses), w = 160, h = 40;
      const pts = meses.map((v, i) => `${(i / (meses.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(' ');
      return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}"/></svg>`;
    })();
    const colhidas = I.produtividade.length;
    const metodoCor = { aspersao: '#3987e5', gotejamento: '#d95926', sulco: '#199e70' };
    const mini = (ic, lbl, val, sub) => `<div class="glass mini">${icon(ic)}<div><span>${esc(lbl)}</span><b>${val}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div></div>`;
    const atualizado = new Date(res.gerado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

    view.innerHTML = `
      <section class="hero" aria-label="Resumo da produção">
        <div class="hero-head">
          <div>
            <span class="eyebrow">Gestão inteligente</span>
            <h2>Visão geral da produção</h2>
            <p>Indicadores calculados agora, direto do MySQL · ${esc(atualizado)}</p>
          </div>
          <label class="glass-select" for="dashProp"><span>Propriedade</span>
            <select id="dashProp"><option value="">Todas as propriedades</option>
            ${props.map((p) => `<option value="${p.id}" ${String(p.id) === String(params.id_propriedade || '') ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}
            </select></label>
        </div>
        <div class="hero-grid">
          <div class="glass gauge-card">
            <div class="gauge" role="img" aria-label="Produtividade média: ${num(k.produtividade_media_pct, 1)}% da meta">
              <svg viewBox="0 0 128 128" aria-hidden="true">
                <circle cx="64" cy="64" r="${R}" class="track"/>
                <circle cx="64" cy="64" r="${R}" class="bar" stroke-dasharray="${(pct / 100) * C} ${C}"/>
              </svg>
              <div class="gauge-val"><span>${k.produtividade_media_pct == null ? '—' : `${num(k.produtividade_media_pct, 1)}<small>%</small>`}</span></div>
            </div>
            <div><span class="g-label">Produtividade média</span><b class="g-title">da meta por talhão</b>
              <small>kg/ha obtido ÷ esperado · ${colhidas} safra(s) colhida(s)</small></div>
          </div>
          <div class="glass big">
            ${icon('prod')}<span>Produção colhida</span>
            <b>${num(k.producao_colhida_kg / 1000, 0)}<small> t</small></b>
            <small>${num(k.area_em_cultivo_ha, 0)} ha com safras em andamento</small>
          </div>
          <div class="glass big">
            ${icon('agua')}<span>Água irrigada</span>
            <b>${num(k.agua_total_m3, 0)}<small> m³</small></b>
            <small>${num(k.agua_30d_m3, 0)} m³ nos últimos 30 dias</small>
            ${spark}
          </div>
          <div class="glass donut-card">
            <span class="d-title">Uso de água por método</span>
            <div class="donut-wrap">
              <div class="donut"><canvas id="ch_metodo" aria-label="Gráfico de pizza: participação de cada método no volume de água irrigada"></canvas>
                <div class="donut-center"><b>${num(k.agua_total_m3 / 1000, 1)}</b><small>mil m³</small></div></div>
              <ul class="d-legend">${I.agua_por_metodo.map((m) => `<li><i style="background:${metodoCor[m.metodo]}"></i>
                <span>${esc(label(m.metodo))}</span><b>${num(m.pct, 1)}%</b><small>${num(m.volume_m3, 0)} m³</small></li>`).join('') || '<li>Sem irrigações</li>'}</ul>
            </div>
          </div>
        </div>
        <div class="hero-minis">
          ${mini('area', 'Talhões', `${num(k.talhoes, 0)}`, `${num(k.area_talhoes_ha, 0)} ha em ${num(k.propriedades, 0)} propriedade(s)`)}
          ${mini('safra', 'Safras em andamento', num(k.safras_em_andamento, 0))}
          ${mini('def', 'Defensivos aplicados', `${num(k.defensivos_total_l, 0)} L`)}
          ${mini('praga', 'Ocorrências nível alto', num(k.ocorrencias_nivel_alto, 0))}
          ${mini('rec', 'Recomendações pendentes', num(k.recomendacoes_pendentes, 0))}
        </div>
      </section>
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
    // SQL do donut e dos KPIs do topo
    const sqlHero = res.consultas.filter((c) => ['kpis', 'agua_por_metodo'].includes(c.id));
    view.querySelector('.hero').insertAdjacentHTML('beforeend', `<details class="hero-sql"><summary>Ver SQL dos indicadores do topo</summary>${sqlHero.map((c) => `<p>${esc(c.titulo)}</p><pre class="sql"></pre>`).join('')}</details>`);
    view.querySelectorAll('.hero-sql pre').forEach((el, i) => { el.textContent = sqlHero[i].sql; });

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

    if (I.agua_por_metodo.length) {
      charts.push(new Chart(view.querySelector('#ch_metodo'), {
        type: 'doughnut',
        data: {
          labels: I.agua_por_metodo.map((m) => label(m.metodo)),
          datasets: [{
            data: I.agua_por_metodo.map((m) => m.volume_m3),
            backgroundColor: I.agua_por_metodo.map((m) => metodoCor[m.metodo]),
            borderColor: 'rgba(12, 22, 12, 0.85)', borderWidth: 2, hoverOffset: 6,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: true, cutout: '68%', animation: { duration: 400 },
          plugins: {
            legend: { display: false },
            tooltip: { ...baseOptions().plugins.tooltip, callbacks: {
              label: (c) => { const m = I.agua_por_metodo[c.dataIndex]; return ` ${num(m.volume_m3, 0)} m³ (${num(m.pct, 1)}%) · ${m.eventos} irrigações`; } } },
          },
        },
      }));
    }

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
