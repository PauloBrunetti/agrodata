class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Traduz erros do MySQL para respostas HTTP compreensíveis
const MYSQL_ERRORS = {
  ER_ROW_IS_REFERENCED_2: [409, 'Registro em uso: existem outros registros vinculados a ele'],
  ER_ROW_IS_REFERENCED: [409, 'Registro em uso: existem outros registros vinculados a ele'],
  ER_NO_REFERENCED_ROW_2: [400, 'Registro relacionado não encontrado (chave estrangeira inválida)'],
  ER_NO_REFERENCED_ROW: [400, 'Registro relacionado não encontrado (chave estrangeira inválida)'],
  ER_DUP_ENTRY: [409, 'Já existe um registro com este valor único'],
  ER_CHECK_CONSTRAINT_VIOLATED: [400, 'Valor viola uma regra (CHECK) do banco de dados'],
  ER_DATA_TOO_LONG: [400, 'Valor maior que o permitido pela coluna'],
  ER_WARN_DATA_OUT_OF_RANGE: [400, 'Valor numérico fora do intervalo permitido'],
  ER_TRUNCATED_WRONG_VALUE: [400, 'Valor em formato inválido'],
};

function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição' });
  }
  // Regras de negócio dos TRIGGERS / PROCEDURES (SIGNAL SQLSTATE '45000')
  if (err.code === 'ER_SIGNAL_EXCEPTION') {
    return res.status(400).json({ error: err.sqlMessage, code: err.code, origem: 'banco de dados' });
  }
  const mapped = err.code && MYSQL_ERRORS[err.code];
  if (mapped) {
    return res.status(mapped[0]).json({ error: mapped[1], code: err.code });
  }
  if (['ECONNREFUSED', 'ENOTFOUND', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ETIMEDOUT'].includes(err.code)) {
    console.error('[db] indisponível:', err.code, err.message);
    return res.status(503).json({ error: 'Banco de dados indisponível no momento' });
  }
  console.error('[api] erro inesperado:', err);
  return res.status(500).json({ error: 'Erro interno do servidor' });
}

module.exports = { HttpError, errorHandler };
