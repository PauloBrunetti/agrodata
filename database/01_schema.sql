-- AgroData — estrutura do banco MySQL (extraída de bd_agro_data.sql, sem alterações de schema)
-- 17 tabelas. Executar no banco já selecionado (USE agrodata) ou via `npm run db:init`.
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `aplicacao_defensivo` (
  `id_aplicacao` int NOT NULL AUTO_INCREMENT,
  `id_safra` int NOT NULL,
  `id_defensivo` int NOT NULL,
  `id_ocorrencia` int DEFAULT NULL,
  `id_usuario` int NOT NULL,
  `data_aplicacao` date NOT NULL,
  `quantidade_l` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_aplicacao`),
  KEY `id_safra` (`id_safra`),
  KEY `id_defensivo` (`id_defensivo`),
  KEY `id_ocorrencia` (`id_ocorrencia`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `aplicacao_defensivo_ibfk_1` FOREIGN KEY (`id_safra`) REFERENCES `safra` (`id_safra`),
  CONSTRAINT `aplicacao_defensivo_ibfk_2` FOREIGN KEY (`id_defensivo`) REFERENCES `defensivo` (`id_defensivo`),
  CONSTRAINT `aplicacao_defensivo_ibfk_3` FOREIGN KEY (`id_ocorrencia`) REFERENCES `ocorrencia_praga` (`id_ocorrencia`),
  CONSTRAINT `aplicacao_defensivo_ibfk_4` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `aplicacao_defensivo_chk_1` CHECK ((`quantidade_l` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `cultivo` (
  `id_cultivo` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(60) NOT NULL,
  `variedade` varchar(60) DEFAULT NULL,
  `ciclo_dias` int NOT NULL,
  `umidade_ideal_pct` decimal(5,2) DEFAULT NULL,
  `tipo_colheita` enum('unica','multipla') NOT NULL,
  `rendimento_esperado_kg_ha` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id_cultivo`),
  CONSTRAINT `cultivo_chk_1` CHECK ((`ciclo_dias` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `cultivo_praga` (
  `id_cultivo` int NOT NULL,
  `id_praga` int NOT NULL,
  PRIMARY KEY (`id_cultivo`,`id_praga`),
  KEY `id_praga` (`id_praga`),
  CONSTRAINT `cultivo_praga_ibfk_1` FOREIGN KEY (`id_cultivo`) REFERENCES `cultivo` (`id_cultivo`),
  CONSTRAINT `cultivo_praga_ibfk_2` FOREIGN KEY (`id_praga`) REFERENCES `praga` (`id_praga`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `defensivo` (
  `id_defensivo` int NOT NULL AUTO_INCREMENT,
  `nome_comercial` varchar(80) NOT NULL,
  `principio_ativo` varchar(120) NOT NULL,
  `classe_toxicologica` tinyint NOT NULL,
  `carencia_dias` int NOT NULL,
  PRIMARY KEY (`id_defensivo`),
  CONSTRAINT `defensivo_chk_1` CHECK ((`classe_toxicologica` between 1 and 5)),
  CONSTRAINT `defensivo_chk_2` CHECK ((`carencia_dias` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `defensivo_praga` (
  `id_defensivo` int NOT NULL,
  `id_praga` int NOT NULL,
  PRIMARY KEY (`id_defensivo`,`id_praga`),
  KEY `id_praga` (`id_praga`),
  CONSTRAINT `defensivo_praga_ibfk_1` FOREIGN KEY (`id_defensivo`) REFERENCES `defensivo` (`id_defensivo`),
  CONSTRAINT `defensivo_praga_ibfk_2` FOREIGN KEY (`id_praga`) REFERENCES `praga` (`id_praga`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `irrigacao` (
  `id_irrigacao` int NOT NULL AUTO_INCREMENT,
  `id_safra` int NOT NULL,
  `data_hora` datetime NOT NULL,
  `volume_m3` decimal(12,2) NOT NULL,
  `duracao_min` int NOT NULL,
  `metodo` enum('gotejamento','aspersao','sulco') NOT NULL,
  PRIMARY KEY (`id_irrigacao`),
  KEY `id_safra` (`id_safra`),
  CONSTRAINT `irrigacao_ibfk_1` FOREIGN KEY (`id_safra`) REFERENCES `safra` (`id_safra`),
  CONSTRAINT `irrigacao_chk_1` CHECK ((`volume_m3` > 0)),
  CONSTRAINT `irrigacao_chk_2` CHECK ((`duracao_min` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `leitura_sensor` (
  `id_leitura` bigint NOT NULL AUTO_INCREMENT,
  `id_sensor` int NOT NULL,
  `data_hora` datetime NOT NULL,
  `valor` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_leitura`),
  KEY `idx_leitura_sensor_data` (`id_sensor`,`data_hora`),
  CONSTRAINT `leitura_sensor_ibfk_1` FOREIGN KEY (`id_sensor`) REFERENCES `sensor` (`id_sensor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `ocorrencia_praga` (
  `id_ocorrencia` int NOT NULL AUTO_INCREMENT,
  `id_safra` int NOT NULL,
  `id_praga` int NOT NULL,
  `data_identificacao` date NOT NULL,
  `nivel_infestacao` enum('baixo','medio','alto') NOT NULL,
  `observacoes` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_ocorrencia`),
  KEY `id_safra` (`id_safra`),
  KEY `id_praga` (`id_praga`),
  CONSTRAINT `ocorrencia_praga_ibfk_1` FOREIGN KEY (`id_safra`) REFERENCES `safra` (`id_safra`),
  CONSTRAINT `ocorrencia_praga_ibfk_2` FOREIGN KEY (`id_praga`) REFERENCES `praga` (`id_praga`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `praga` (
  `id_praga` int NOT NULL AUTO_INCREMENT,
  `nome_popular` varchar(80) NOT NULL,
  `nome_cientifico` varchar(100) NOT NULL,
  PRIMARY KEY (`id_praga`),
  UNIQUE KEY `nome_cientifico` (`nome_cientifico`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `previsao_climatica` (
  `id_previsao` int NOT NULL AUTO_INCREMENT,
  `id_propriedade` int NOT NULL,
  `data_hora` datetime NOT NULL,
  `temperatura_c` decimal(4,1) DEFAULT NULL,
  `precipitacao_mm` decimal(5,1) DEFAULT NULL,
  `umidade_ar_pct` decimal(4,1) DEFAULT NULL,
  `vento_kmh` decimal(5,1) DEFAULT NULL,
  PRIMARY KEY (`id_previsao`),
  KEY `id_propriedade` (`id_propriedade`),
  CONSTRAINT `previsao_climatica_ibfk_1` FOREIGN KEY (`id_propriedade`) REFERENCES `propriedade` (`id_propriedade`),
  CONSTRAINT `previsao_climatica_chk_1` CHECK ((`precipitacao_mm` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `propriedade` (
  `id_propriedade` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `proprietario` varchar(100) NOT NULL,
  `cidade` varchar(80) DEFAULT NULL,
  `area_total_ha` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_propriedade`),
  CONSTRAINT `propriedade_chk_1` CHECK ((`area_total_ha` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `recomendacao_manejo` (
  `id_recomendacao` int NOT NULL AUTO_INCREMENT,
  `id_safra` int NOT NULL,
  `data_geracao` datetime NOT NULL,
  `tipo` enum('irrigar','aplicar_defensivo','monitorar') NOT NULL,
  `descricao` varchar(255) NOT NULL,
  `prioridade` enum('baixa','media','alta') NOT NULL,
  `status` enum('pendente','aceita','recusada','concluida') NOT NULL DEFAULT 'pendente',
  PRIMARY KEY (`id_recomendacao`),
  KEY `id_safra` (`id_safra`),
  CONSTRAINT `recomendacao_manejo_ibfk_1` FOREIGN KEY (`id_safra`) REFERENCES `safra` (`id_safra`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `safra` (
  `id_safra` int NOT NULL AUTO_INCREMENT,
  `id_talhao` int NOT NULL,
  `id_cultivo` int NOT NULL,
  `data_plantio` date NOT NULL,
  `data_prevista_colheita` date NOT NULL,
  `quantidade_colhida_kg` decimal(12,2) DEFAULT NULL,
  PRIMARY KEY (`id_safra`),
  KEY `id_talhao` (`id_talhao`),
  KEY `id_cultivo` (`id_cultivo`),
  CONSTRAINT `safra_ibfk_1` FOREIGN KEY (`id_talhao`) REFERENCES `talhao` (`id_talhao`),
  CONSTRAINT `safra_ibfk_2` FOREIGN KEY (`id_cultivo`) REFERENCES `cultivo` (`id_cultivo`),
  CONSTRAINT `safra_chk_1` CHECK ((`data_prevista_colheita` >= `data_plantio`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `sensor` (
  `id_sensor` int NOT NULL AUTO_INCREMENT,
  `id_talhao` int NOT NULL,
  `id_tipo_sensor` int NOT NULL,
  `modelo` varchar(60) DEFAULT NULL,
  `data_instalacao` date NOT NULL,
  `status` enum('ativo','inativo','manutencao') NOT NULL DEFAULT 'ativo',
  `latitude` decimal(9,6) DEFAULT NULL,
  `longitude` decimal(9,6) DEFAULT NULL,
  PRIMARY KEY (`id_sensor`),
  KEY `id_talhao` (`id_talhao`),
  KEY `id_tipo_sensor` (`id_tipo_sensor`),
  CONSTRAINT `sensor_ibfk_1` FOREIGN KEY (`id_talhao`) REFERENCES `talhao` (`id_talhao`),
  CONSTRAINT `sensor_ibfk_2` FOREIGN KEY (`id_tipo_sensor`) REFERENCES `tipo_sensor` (`id_tipo_sensor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `talhao` (
  `id_talhao` int NOT NULL AUTO_INCREMENT,
  `id_propriedade` int NOT NULL,
  `nome` varchar(60) NOT NULL,
  `area_ha` decimal(10,2) NOT NULL,
  `tipo_solo` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id_talhao`),
  KEY `id_propriedade` (`id_propriedade`),
  CONSTRAINT `talhao_ibfk_1` FOREIGN KEY (`id_propriedade`) REFERENCES `propriedade` (`id_propriedade`),
  CONSTRAINT `talhao_chk_1` CHECK ((`area_ha` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `tipo_sensor` (
  `id_tipo_sensor` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(60) NOT NULL,
  `unidade_medida` varchar(10) NOT NULL,
  PRIMARY KEY (`id_tipo_sensor`),
  UNIQUE KEY `nome` (`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `usuario` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `email` varchar(120) NOT NULL,
  `perfil` enum('administrador','agronomo','operador','auditor') NOT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
