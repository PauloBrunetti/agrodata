// Roteamento por hash e navegação
(async () => {
  const view = document.getElementById('view');
  const titleEl = document.getElementById('pageTitle');
  const nav = document.getElementById('nav');
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.getElementById('menuBtn');
  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';
  document.body.appendChild(backdrop);

  const GROUP_ORDER = ['Áreas', 'Produção', 'Manejo', 'Monitoramento', 'Cadastros base'];
  let meta;

  function toggleMenu(open) {
    sidebar.classList.toggle('open', open);
    backdrop.classList.toggle('show', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  }
  menuBtn.onclick = () => toggleMenu(!sidebar.classList.contains('open'));
  backdrop.onclick = () => toggleMenu(false);

  async function checkDb() {
    const el = document.getElementById('dbStatus');
    try {
      const h = await Api.get('/health');
      el.className = 'db-status ok';
      el.textContent = `● MySQL ${h.mysql.versao.split('-')[0]} conectado`;
    } catch {
      el.className = 'db-status err';
      el.textContent = '● MySQL indisponível';
    }
  }

  function buildNav() {
    const groups = {};
    Object.entries(meta).forEach(([name, def]) => { (groups[def.group] = groups[def.group] || []).push([name, def]); });
    nav.innerHTML = `<a class="nav-link" href="#/dashboard" data-route="dashboard">Dashboard</a>` +
      GROUP_ORDER.filter((g) => groups[g]).map((g) => `<div class="nav-group">${Fmt.esc(g)}</div>` +
        groups[g].map(([name, def]) => `<a class="nav-link" href="#/r/${name}" data-route="r/${name}">${Fmt.esc(def.label)}</a>`).join('')).join('');
  }

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '') || 'dashboard';
    const [path, query] = raw.split('?');
    return { path, params: Object.fromEntries(new URLSearchParams(query || '')) };
  }

  async function route() {
    const { path, params } = parseHash();
    toggleMenu(false);
    Dashboard.destroyCharts();
    view.onclick = null;
    document.querySelectorAll('dialog[open]').forEach((d) => d.close());
    nav.querySelectorAll('.nav-link').forEach((a) => a.classList.toggle('active', a.dataset.route === path));
    try {
      if (path === 'dashboard') {
        titleEl.textContent = 'Dashboard';
        document.title = 'Dashboard · AgroData';
        await Dashboard.render(view, params);
      } else if (path.startsWith('r/') && meta[path.slice(2)]) {
        const name = path.slice(2);
        titleEl.textContent = meta[name].label;
        document.title = `${meta[name].label} · AgroData`;
        await ResourcePage.render(view, name, meta, params);
      } else {
        titleEl.textContent = 'Página não encontrada';
        view.innerHTML = '<p class="empty">Página não encontrada. <a href="#/dashboard">Voltar ao dashboard</a></p>';
      }
    } catch (e) {
      view.innerHTML = `<div class="card"><p class="empty">Não foi possível carregar os dados: ${Fmt.esc(e.message)}</p></div>`;
    }
  }

  // Evita re-renderizar quando a própria tela só sincroniza filtros na URL (replaceState não dispara hashchange)
  window.addEventListener('hashchange', route);

  checkDb();
  try {
    meta = await Api.get('/meta');
  } catch (e) {
    view.innerHTML = `<p class="empty">API indisponível: ${Fmt.esc(e.message)}</p>`;
    return;
  }
  buildNav();
  route();
})();
