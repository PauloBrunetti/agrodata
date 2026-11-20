// Tela genérica de listagem + formulário (cadastro/edição/exclusão) para qualquer recurso da API.
window.ResourcePage = (() => {
  const { esc, cell, label, toast } = window.Fmt;
  const optionsCache = {};
  const SUMMARY_LABELS = { volume_total_m3: 'Volume total (m³)', duracao_total_min: 'Duração total (min)', quantidade_total_l: 'Total aplicado (L)' };

  async function getOptions(ref) {
    if (!optionsCache[ref]) optionsCache[ref] = Api.get(`/${ref}/options`).catch((e) => { delete optionsCache[ref]; throw e; });
    return optionsCache[ref];
  }
  function invalidate(ref) { delete optionsCache[ref]; }

  function selectHtml(id, options, value, placeholder) {
    return `<select class="input" id="${id}" name="${id}">
      <option value="">${esc(placeholder)}</option>
      ${options.map((o) => `<option value="${esc(o.id)}" ${String(o.id) === String(value ?? '') ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
    </select>`;
  }

  async function render(view, name, meta, params) {
    const def = meta[name];
    const state = {
      q: params.q || '',
      page: Number(params.page) || 1,
      sort: params.sort || '',
      dir: params.dir || 'asc',
      filters: {},
    };
    (def.filters || []).forEach((f) => { state.filters[f.param] = params[f.param] || ''; });

    // Monta barra de ferramentas (busca + filtros)
    const filterControls = await Promise.all(
      (def.filters || []).map(async (f) => {
        const id = `flt_${f.param}`;
        let control;
        if (f.ref) {
          const opts = await getOptions(f.ref);
          control = selectHtml(id, opts, state.filters[f.param], 'Todos');
        } else if (f.type === 'enum') {
          control = selectHtml(id, f.options.map((o) => ({ id: o, label: label(o) })), state.filters[f.param], 'Todos');
        } else {
          control = `<input class="input" type="date" id="${id}" value="${esc(state.filters[f.param])}">`;
        }
        return `<label class="field-inline" for="${id}">${esc(f.label)}${control}</label>`;
      })
    );

    view.innerHTML = `
      <div class="toolbar">
        ${def.searchable ? `<label class="field-inline grow" for="q">Buscar
          <input class="input search" id="q" type="search" placeholder="Digite para pesquisar…" value="${esc(state.q)}"></label>` : '<span class="grow"></span>'}
        ${filterControls.join('')}
        <button class="btn ghost" id="clearBtn" type="button">Limpar</button>
        ${def.readOnly ? '<span class="badge info">Somente leitura</span>' : `<button class="btn primary" id="newBtn" type="button">+ ${esc(def.singular)}</button>`}
      </div>
      <div class="summary" id="summary"></div>
      <div class="card">
        <div class="table-wrap"><table>
          <thead><tr>${def.columns.map((c) => `<th class="sortable ${['int', 'decimal'].includes(c.type) ? 'num' : ''}" data-key="${c.key}" scope="col">${esc(c.label)}<span class="arrow"></span></th>`).join('')}${def.readOnly ? '' : '<th><span class="sr-only">Ações</span></th>'}</tr></thead>
          <tbody id="rows"><tr><td colspan="${def.columns.length + (def.readOnly ? 0 : 1)}"><div class="skeleton"></div></td></tr></tbody>
        </table></div>
        <div class="pager" id="pager"></div>
      </div>`;

    const rowsEl = view.querySelector('#rows');
    const pagerEl = view.querySelector('#pager');
    const summaryEl = view.querySelector('#summary');

    function syncHash() {
      const p = new URLSearchParams();
      if (state.q) p.set('q', state.q);
      Object.entries(state.filters).forEach(([k, v]) => v && p.set(k, v));
      if (state.sort) { p.set('sort', state.sort); p.set('dir', state.dir); }
      if (state.page > 1) p.set('page', state.page);
      const s = p.toString();
      history.replaceState(null, '', `#/r/${name}${s ? `?${s}` : ''}`);
    }

    async function load() {
      syncHash();
      view.querySelectorAll('th.sortable').forEach((th) => {
        th.querySelector('.arrow').textContent = th.dataset.key === state.sort ? (state.dir === 'desc' ? '▼' : '▲') : '';
        th.setAttribute('aria-sort', th.dataset.key === state.sort ? (state.dir === 'desc' ? 'descending' : 'ascending') : 'none');
      });
      try {
        const res = await Api.get(`/${name}`, { q: state.q, page: state.page, limit: 20, sort: state.sort, dir: state.dir, ...state.filters });
        if (!res.data.length) {
          rowsEl.innerHTML = `<tr><td colspan="${def.columns.length + (def.readOnly ? 0 : 1)}" class="empty">Nenhum registro encontrado.</td></tr>`;
        } else {
          rowsEl.innerHTML = res.data.map((r) => `<tr>
            ${def.columns.map((c) => `<td class="${['int', 'decimal'].includes(c.type) ? 'num' : ''}">${cell(c.type, r[c.key])}</td>`).join('')}
            ${def.readOnly ? '' : `<td class="actions">
              ${name === 'safras' && r.quantidade_colhida_kg == null ? `<button class="btn sm" data-colher="${r[def.pk]}" type="button" title="Executa a procedure sp_registrar_colheita">Colher</button>` : ''}
              <button class="btn sm" data-edit="${r[def.pk]}" type="button">Editar</button>
              <button class="btn sm ghost" data-del="${r[def.pk]}" type="button" aria-label="Excluir registro ${r[def.pk]}">Excluir</button>
            </td>`}</tr>`).join('');
        }
        const sums = Object.entries(res.summary || {}).map(([k, v]) =>
          `<span class="chip">${esc(SUMMARY_LABELS[k] || k)}: <b>${Fmt.num(v ?? 0, 2)}</b></span>`);
        summaryEl.innerHTML = `<span class="chip"><b>${res.total}</b> registro(s)</span>${sums.join('')}`;
        pagerEl.innerHTML = `<span>Página ${res.page} de ${res.pages}</span>
          <span class="btns"><button class="btn sm" id="prev" ${res.page <= 1 ? 'disabled' : ''}>← Anterior</button>
          <button class="btn sm" id="next" ${res.page >= res.pages ? 'disabled' : ''}>Próxima →</button></span>`;
        pagerEl.querySelector('#prev').onclick = () => { state.page -= 1; load(); };
        pagerEl.querySelector('#next').onclick = () => { state.page += 1; load(); };
      } catch (e) {
        rowsEl.innerHTML = `<tr><td colspan="${def.columns.length + (def.readOnly ? 0 : 1)}" class="empty">Erro ao carregar: ${esc(e.message)}</td></tr>`;
      }
    }

    // Eventos
    let t;
    const q = view.querySelector('#q');
    if (q) q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { state.q = q.value.trim(); state.page = 1; load(); }, 300); });
    (def.filters || []).forEach((f) => {
      view.querySelector(`#flt_${f.param}`).addEventListener('change', (e) => { state.filters[f.param] = e.target.value; state.page = 1; load(); });
    });
    view.querySelector('#clearBtn').onclick = () => { location.hash = `#/r/${name}`; };
    view.querySelectorAll('th.sortable').forEach((th) => th.addEventListener('click', () => {
      if (state.sort === th.dataset.key) state.dir = state.dir === 'asc' ? 'desc' : 'asc';
      else { state.sort = th.dataset.key; state.dir = 'asc'; }
      load();
    }));
    if (!def.readOnly) view.querySelector('#newBtn').onclick = () => openForm(name, def, null, load);
    rowsEl.addEventListener('click', async (e) => {
      const edit = e.target.closest('[data-edit]');
      const del = e.target.closest('[data-del]');
      const colher = e.target.closest('[data-colher]');
      if (colher) { openColheita(colher.dataset.colher, load); return; }
      if (edit) {
        try { openForm(name, def, await Api.get(`/${name}/${edit.dataset.edit}`), load); } catch (err) { toast(err.message, 'error'); }
      } else if (del) {
        confirmDelete(name, def, del.dataset.del, load);
      }
    });

    await load();
  }

  // ---------- Formulário ----------
  const dlg = () => document.getElementById('formDialog');

  function toInputValue(field, v) {
    if (v == null) return '';
    if (field.type === 'datetime') return String(v).slice(0, 16).replace(' ', 'T');
    return v;
  }

  async function openForm(name, def, record, onSaved) {
    const form = document.getElementById('recordForm');
    const fieldsEl = document.getElementById('formFields');
    const errEl = document.getElementById('formError');
    errEl.hidden = true;
    document.getElementById('formTitle').textContent = record ? `Editar ${def.singular} #${record[def.pk]}` : `Cadastrar ${def.singular.toLowerCase()}`;

    const parts = await Promise.all(def.fields.map(async (f) => {
      const id = `f_${f.name}`;
      const val = record ? toInputValue(f, record[f.name]) : (f.default ?? '');
      const req = f.required ? 'required' : '';
      let input;
      if (f.type === 'fk') {
        const opts = await getOptions(f.ref).catch(() => []);
        input = selectHtml(id, opts, val, f.required ? 'Selecione…' : '(nenhum)');
      } else if (f.type === 'enum') {
        input = selectHtml(id, f.options.map((o) => ({ id: o, label: label(o) })), val, 'Selecione…');
      } else if (f.type === 'textarea') {
        input = `<textarea class="input" id="${id}" rows="3" maxlength="${f.max || ''}" ${req}>${esc(val)}</textarea>`;
      } else {
        const type = { int: 'number', decimal: 'number', date: 'date', datetime: 'datetime-local', email: 'email' }[f.type] || 'text';
        const step = f.type === 'decimal' ? 'step="any"' : f.type === 'int' ? 'step="1"' : '';
        const min = f.min ?? (f.gt !== undefined ? f.gt : undefined);
        input = `<input class="input" id="${id}" type="${type}" ${step} ${min !== undefined ? `min="${min}"` : ''} ${f.max && type === 'number' ? `max="${f.max}"` : ''} ${f.max && type === 'text' ? `maxlength="${f.max}"` : ''} value="${esc(val)}" ${req}>`;
      }
      const full = f.type === 'textarea' || f.type === 'fk' ? 'full' : '';
      return `<div class="form-field ${full}" data-field="${f.name}">
        <label for="${id}">${esc(f.label)} ${f.required ? '<span class="req" aria-hidden="true">*</span>' : ''}</label>
        ${input}<span class="err" id="${id}_err"></span></div>`;
    }));
    fieldsEl.innerHTML = parts.join('');
    dlg().showModal();
    fieldsEl.querySelector('.input')?.focus();

    form.onsubmit = async (e) => {
      e.preventDefault();
      fieldsEl.querySelectorAll('.form-field').forEach((el) => { el.classList.remove('invalid'); el.querySelector('.err').textContent = ''; });
      errEl.hidden = true;
      const body = {};
      def.fields.forEach((f) => {
        const v = form.querySelector(`#f_${f.name}`).value;
        body[f.name] = v === '' ? null : v;
      });
      const btn = document.getElementById('saveBtn');
      btn.disabled = true;
      btn.textContent = 'Salvando…';
      try {
        if (record) await Api.put(`/${name}/${record[def.pk]}`, body);
        else await Api.post(`/${name}`, body);
        invalidate(name);
        dlg().close();
        toast(record ? 'Registro atualizado.' : 'Registro cadastrado.');
        onSaved();
      } catch (err) {
        errEl.textContent = err.message;
        errEl.hidden = false;
        Object.entries(err.details || {}).forEach(([k, msg]) => {
          const wrap = fieldsEl.querySelector(`[data-field="${k}"]`);
          if (wrap) { wrap.classList.add('invalid'); wrap.querySelector('.err').textContent = msg; }
        });
      } finally {
        btn.disabled = false;
        btn.textContent = 'Salvar';
      }
    };
  }

  function confirmDelete(name, def, id, onDone) {
    const d = document.getElementById('confirmDialog');
    document.getElementById('confirmText').textContent = `Excluir ${def.singular.toLowerCase()} #${id}? Esta ação não pode ser desfeita.`;
    d.showModal();
    document.getElementById('confirmBtn').onclick = async () => {
      try {
        await Api.del(`/${name}/${id}`);
        invalidate(name);
        toast('Registro excluído.');
        onDone();
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        d.close();
      }
    };
  }

  // Registrar colheita: chama a procedure sp_registrar_colheita via API
  function openColheita(idSafra, onDone) {
    const d = document.getElementById('colheitaDialog');
    const input = document.getElementById('colheitaKg');
    const err = document.getElementById('colheitaError');
    document.getElementById('colheitaTitle').textContent = `Registrar colheita da safra #${idSafra}`;
    input.value = '';
    err.hidden = true;
    d.showModal();
    input.focus();
    document.getElementById('colheitaForm').onsubmit = async (e) => {
      e.preventDefault();
      try {
        const res = await Api.post(`/relatorios/safras/${idSafra}/colheita`, { quantidade_colhida_kg: input.value });
        const r = res.data;
        d.close();
        toast(`Colheita registrada: ${Fmt.num(r.kg_por_ha, 0)} kg/ha (${Fmt.num(r.pct_esperado, 1)}% do esperado)`);
        invalidate('safras');
        onDone();
      } catch (ex) {
        err.textContent = ex.message;
        err.hidden = false;
      }
    };
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) e.target.closest('dialog').close();
  });

  return { render, invalidate };
})();
