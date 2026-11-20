// Formatação pt-BR e utilidades de interface
window.Fmt = (() => {
  const nf = (d) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: 0 });
  const LABELS = {
    aspersao: 'Aspersão', gotejamento: 'Gotejamento', sulco: 'Sulco',
    unica: 'Única', multipla: 'Múltipla',
    baixo: 'Baixo', medio: 'Médio', alto: 'Alto',
    baixa: 'Baixa', media: 'Média', alta: 'Alta',
    pendente: 'Pendente', aceita: 'Aceita', recusada: 'Recusada', concluida: 'Concluída',
    irrigar: 'Irrigar', aplicar_defensivo: 'Aplicar defensivo', monitorar: 'Monitorar',
    ativo: 'Ativo', inativo: 'Inativo', manutencao: 'Manutenção',
    administrador: 'Administrador', agronomo: 'Agrônomo', operador: 'Operador', auditor: 'Auditor',
    em_andamento: 'Em andamento', colhida: 'Colhida', 'em andamento': 'Em andamento',
  };
  const BADGE = {
    baixo: 'good', medio: 'warn', alto: 'bad',
    baixa: '', media: 'warn', alta: 'bad',
    pendente: 'warn', aceita: 'info', recusada: '', concluida: 'good',
    ativo: 'good', inativo: '', manutencao: 'warn',
    colhida: 'good', 'em andamento': 'info',
    INSERT: 'good', UPDATE: 'info', DELETE: 'bad',
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const label = (v) => LABELS[v] || v;
  const num = (v, d = 2) => (v == null || v === '' ? '—' : nf(d).format(Number(v)));
  const date = (v) => {
    if (!v) return '—';
    const [y, m, d] = String(v).slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  };
  const datetime = (v) => (v ? `${date(v)} ${String(v).slice(11, 16)}` : '—');
  function cell(type, v) {
    if (v == null || v === '') return '<span class="muted">—</span>';
    switch (type) {
      case 'int': return esc(num(v, 0));
      case 'decimal': return esc(num(v, 2));
      case 'date': return esc(date(v));
      case 'datetime': return esc(datetime(v));
      case 'enum': return esc(label(v));
      case 'badge': return `<span class="badge ${BADGE[v] || ''}">${esc(label(v))}</span>`;
      case 'italic': return `<i>${esc(v)}</i>`;
      case 'json': {
        try {
          const o = JSON.parse(v);
          return `<span class="json">${Object.entries(o).map(([k, val]) => `<span><b>${esc(k)}</b>: ${esc(val ?? '—')}</span>`).join('')}</span>`;
        } catch { return esc(v); }
      }
      default: return esc(v);
    }
  }
  function toast(msg, kind) {
    const el = document.createElement('div');
    el.className = `toast ${kind || ''}`;
    el.textContent = msg;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.remove(), kind === 'error' ? 6000 : 3500);
  }
  return { esc, label, num, date, datetime, cell, toast, LABELS };
})();
