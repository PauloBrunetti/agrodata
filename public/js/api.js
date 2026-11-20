// Cliente HTTP da API REST (o navegador nunca acessa o MySQL diretamente)
window.Api = (() => {
  class ApiError extends Error {
    constructor(status, body) {
      super((body && body.error) || `Erro ${status}`);
      this.status = status;
      this.details = body && body.details;
    }
  }
  async function request(method, url, body) {
    let res;
    try {
      res = await fetch(`/api${url}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new ApiError(0, { error: 'Sem conexão com o servidor' });
    }
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, data);
    return data;
  }
  const qs = (params) => {
    const p = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v); });
    const s = p.toString();
    return s ? `?${s}` : '';
  };
  return {
    ApiError,
    get: (url, params) => request('GET', url + qs(params)),
    post: (url, body) => request('POST', url, body),
    put: (url, body) => request('PUT', url, body),
    del: (url) => request('DELETE', url),
  };
})();
