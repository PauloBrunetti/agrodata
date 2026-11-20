-- Uso local apenas: cria o banco e seleciona-o.
-- Em produção (Railway) o banco já existe; o script de inicialização usa o banco da variável de ambiente.
CREATE DATABASE IF NOT EXISTS agrodata
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE agrodata;
