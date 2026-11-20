// Relatórios gerados por STORED PROCEDURES do MySQL
window.Relatorios = (() => {
  const { esc, num, date } = window.Fmt;

  function table(cols, rows) {
    if (!rows.length) return '<p class="empty">Sem dados no período.</p>';
    return `<div class="table-wrap"><table><thead><tr>${cols.map((c) => `<th class="${c.num ? 'num' : ''}">${esc(c.label)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td class="${c.num ? 'num' : ''}">${c.render(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  async function render(view) {
    const [props, safras] = await Promise.all([Api.get('/propriedades/options'), Api.get('/safras/options')]);
    const hoje = new Date();
    const fim = hoje.toISOString().slice(0, 10);
    const ini = `${hoje.getFullYear()}-01-01`;

    view.innerHTML = `
      <div class="report-grid">
        <section class="card">
          <div class="card-head"><div><h3>Consumo de água por período</h3>
            <p class="card-sub">Procedure <code>sp_consumo_agua_periodo(propriedade, início, fim)</code></p></div></div>
          <div class="card-body">
            <form class="report-form" id="formConsumo">
              <label class="field-inline" for="rcProp">Propriedade
                <select class="input" id="rcProp"><option value="">Todas</option>${props.map((p) => `<option value="${p.id}">${esc(p.label)}</option>`).join('')}</select></label>
              <label class="field-inline" for="rcDe">De<input class="input" type="date" id="rcDe" value="${ini}" required></label>
              <label class="field-inline" for="rcAte">Até<input class="input" type="date" id="rcAte" value="${fim}" required></label>
              <button class="btn primary" type="submit">Gerar</button>
            </form>
            <div id="outConsumo"></div>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><div><h3>Resumo de sustentabilidade da safra</h3>
            <p class="card-sub">Procedure <code>sp_resumo_safra(id_safra)</code> + função <code>fn_m3_agua_por_tonelada</code></p></div></div>
          <div class="card-body">
            <form class="report-form" id="formSafra">
              <label class="field-inline grow" for="rsSafra" style="flex:1">Safra
                <select class="input" id="rsSafra">${safras.map((s) => `<option value="${s.id}">${esc(s.label)}</option>`).join('')}</select></label>
              <button class="btn primary" type="submit">Gerar</button>
            </form>
            <div id="outSafra"></div>
          </div>
        </section>
      </div>
      <p class="note">Os relatórios desta página são calculados por stored procedures no MySQL (arquivo <code>database/05_procedures.sql</code>). A colheita de uma safra em andamento é registrada pelo botão <b>Colher</b> na tela de Safras, que executa <code>sp_registrar_colheita</code>.</p>`;

    const outC = view.querySelector('#outConsumo');
    const outS = view.querySelector('#outSafra');

    async function consumo(e) {
      if (e) e.preventDefault();
      outC.innerHTML = '<div class="skeleton"></div>';
      try {
        const res = await Api.get('/relatorios/consumo-agua', {
          id_propriedade: view.querySelector('#rcProp').value,
          de: view.querySelector('#rcDe').value,
          ate: view.querySelector('#rcAte').value,
        });
        const total = res.data.reduce((a, r) => a + r.volume_m3, 0);
        outC.innerHTML = `<div class="summary"><span class="chip">Total: <b>${num(total, 0)} m³</b></span>
          <span class="chip">${esc(date(res.parametros.de))} a ${esc(date(res.parametros.ate))}</span></div>` +
          table([
            { label: 'Talhão', render: (r) => `${esc(r.talhao)}<br><span class="muted">${esc(r.propriedade)}</span>` },
            { label: 'Eventos', num: true, render: (r) => num(r.eventos, 0) },
            { label: 'Volume (m³)', num: true, render: (r) => num(r.volume_m3, 0) },
            { label: 'm³/ha', num: true, render: (r) => num(r.m3_por_ha, 1) },
            { label: 'Horas', num: true, render: (r) => num(r.minutos_irrigados / 60, 1) },
          ], res.data);
      } catch (err) {
        outC.innerHTML = `<div class="form-error" role="alert">${esc(err.message)}</div>`;
      }
    }

    async function resumo(e) {
      if (e) e.preventDefault();
      outS.innerHTML = '<div class="skeleton"></div>';
      try {
        const { data: r } = await Api.get(`/relatorios/safras/${view.querySelector('#rsSafra').value}`);
        const item = (l, v) => `<div><span>${esc(l)}</span><b>${v}</b></div>`;
        outS.innerHTML = `<p><b>${esc(r.cultivo)}</b> · ${esc(r.talhao)} (${esc(r.propriedade)}) · ${num(r.area_ha, 1)} ha
          · ${Fmt.cell('badge', r.situacao)}<br><span class="muted">Plantio ${esc(date(r.data_plantio))} · colheita prevista ${esc(date(r.data_prevista_colheita))}</span></p>
          <div class="stat-list">
            ${item('Irrigações', num(r.irrigacoes, 0))}
            ${item('Água (m³)', num(r.agua_m3, 0))}
            ${item('Água (m³/ha)', num(r.agua_m3_por_ha, 1))}
            ${item('Aplicações', num(r.aplicacoes, 0))}
            ${item('Defensivos (L)', num(r.defensivos_l, 1))}
            ${item('Defensivos (L/ha)', num(r.defensivos_l_por_ha, 2))}
            ${item('Ocorrências', `${num(r.ocorrencias, 0)} (${num(r.ocorrencias_alto, 0)} alto)`)}
            ${item('Produtividade', r.kg_por_ha == null ? '—' : `${num(r.kg_por_ha, 0)} kg/ha`)}
            ${item('% do esperado', r.pct_esperado == null ? '—' : `${num(r.pct_esperado, 1)}%`)}
            ${item('Água por tonelada', r.m3_agua_por_tonelada == null ? '—' : `${num(r.m3_agua_por_tonelada, 2)} m³/t`)}
          </div>`;
      } catch (err) {
        outS.innerHTML = `<div class="form-error" role="alert">${esc(err.message)}</div>`;
      }
    }

    view.querySelector('#formConsumo').onsubmit = consumo;
    view.querySelector('#formSafra').onsubmit = resumo;
    await Promise.all([consumo(), resumo()]);
  }

  return { render };
})();
