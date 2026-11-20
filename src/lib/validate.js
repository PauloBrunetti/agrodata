// Validação de entrada baseada nos metadados dos campos (src/resources.js).
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(:\d{2})?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidDate(s) {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function checkRange(field, n) {
  if (field.gt !== undefined && !(n > field.gt)) return `${field.label} deve ser maior que ${field.gt}`;
  if (field.min !== undefined && n < field.min) return `${field.label} deve ser no mínimo ${field.min}`;
  if (field.max !== undefined && n > field.max) return `${field.label} deve ser no máximo ${field.max}`;
  return null;
}

/** Converte e valida um único valor. Retorna { value } ou { error }. */
function coerce(field, raw) {
  if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
    if (field.required) return { error: `${field.label} é obrigatório` };
    return { value: null };
  }
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'email': {
      const v = String(raw).trim();
      if (field.max && v.length > field.max) return { error: `${field.label} deve ter no máximo ${field.max} caracteres` };
      if (field.type === 'email' && !EMAIL_RE.test(v)) return { error: `${field.label} inválido` };
      return { value: v };
    }
    case 'int':
    case 'fk': {
      const n = Number(raw);
      if (!Number.isInteger(n)) return { error: `${field.label} deve ser um número inteiro` };
      if (field.type === 'fk' && n <= 0) return { error: `${field.label} inválido` };
      const err = checkRange(field, n);
      return err ? { error: err } : { value: n };
    }
    case 'decimal': {
      const n = Number(typeof raw === 'string' ? raw.replace(',', '.') : raw);
      if (!Number.isFinite(n)) return { error: `${field.label} deve ser numérico` };
      const err = checkRange(field, n);
      return err ? { error: err } : { value: n };
    }
    case 'date': {
      const v = String(raw).trim();
      return isValidDate(v) ? { value: v } : { error: `${field.label}: data inválida (use AAAA-MM-DD)` };
    }
    case 'datetime': {
      const m = String(raw).trim().match(DATETIME_RE);
      if (!m || !isValidDate(m[1])) return { error: `${field.label}: data/hora inválida` };
      const [hh, mm] = m[2].split(':').map(Number);
      if (hh > 23 || mm > 59) return { error: `${field.label}: horário inválido` };
      return { value: `${m[1]} ${m[2]}${m[3] || ':00'}` };
    }
    case 'enum': {
      const v = String(raw);
      return field.options.includes(v) ? { value: v } : { error: `${field.label}: valor deve ser um de ${field.options.join(', ')}` };
    }
    default:
      return { value: raw };
  }
}

/**
 * Valida o corpo de uma requisição.
 * @param {object[]} fields
 * @param {object} body
 * @param {boolean} partial  true em PATCH/PUT parcial: só valida campos enviados
 */
function validateBody(fields, body, partial = false) {
  const data = {};
  const errors = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { data, errors: { _: 'Corpo da requisição deve ser um objeto JSON' } };
  }
  for (const field of fields) {
    const present = Object.prototype.hasOwnProperty.call(body, field.name);
    if (partial && !present) continue;
    let raw = body[field.name];
    if (!present && field.default !== undefined) raw = field.default;
    const { value, error } = coerce(field, raw);
    if (error) errors[field.name] = error;
    else data[field.name] = value;
  }
  return { data, errors };
}

module.exports = { validateBody, coerce, isValidDate };
