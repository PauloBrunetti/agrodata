-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: agrodata
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `aplicacao_defensivo`
--

DROP TABLE IF EXISTS `aplicacao_defensivo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `aplicacao_defensivo` (
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `aplicacao_defensivo`
--

LOCK TABLES `aplicacao_defensivo` WRITE;
/*!40000 ALTER TABLE `aplicacao_defensivo` DISABLE KEYS */;
INSERT INTO `aplicacao_defensivo` VALUES (1,4,3,1,2,'2026-10-06',15.00),(2,3,1,5,2,'2026-03-11',8.00),(3,1,1,4,2,'2026-01-22',40.00);
/*!40000 ALTER TABLE `aplicacao_defensivo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cultivo`
--

DROP TABLE IF EXISTS `cultivo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cultivo` (
  `id_cultivo` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(60) NOT NULL,
  `variedade` varchar(60) DEFAULT NULL,
  `ciclo_dias` int NOT NULL,
  `umidade_ideal_pct` decimal(5,2) DEFAULT NULL,
  `tipo_colheita` enum('unica','multipla') NOT NULL,
  `rendimento_esperado_kg_ha` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id_cultivo`),
  CONSTRAINT `cultivo_chk_1` CHECK ((`ciclo_dias` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cultivo`
--

LOCK TABLES `cultivo` WRITE;
/*!40000 ALTER TABLE `cultivo` DISABLE KEYS */;
INSERT INTO `cultivo` VALUES (1,'Soja','Convencional',120,65.00,'unica',3500.00),(2,'Milho','Híbrido',130,65.00,'unica',6000.00),(3,'Tomate','Salada',100,70.00,'multipla',60000.00);
/*!40000 ALTER TABLE `cultivo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cultivo_praga`
--

DROP TABLE IF EXISTS `cultivo_praga`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cultivo_praga` (
  `id_cultivo` int NOT NULL,
  `id_praga` int NOT NULL,
  PRIMARY KEY (`id_cultivo`,`id_praga`),
  KEY `id_praga` (`id_praga`),
  CONSTRAINT `cultivo_praga_ibfk_1` FOREIGN KEY (`id_cultivo`) REFERENCES `cultivo` (`id_cultivo`),
  CONSTRAINT `cultivo_praga_ibfk_2` FOREIGN KEY (`id_praga`) REFERENCES `praga` (`id_praga`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cultivo_praga`
--

LOCK TABLES `cultivo_praga` WRITE;
/*!40000 ALTER TABLE `cultivo_praga` DISABLE KEYS */;
INSERT INTO `cultivo_praga` VALUES (2,1),(1,2),(1,3),(3,4),(1,5),(3,5);
/*!40000 ALTER TABLE `cultivo_praga` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `defensivo`
--

DROP TABLE IF EXISTS `defensivo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `defensivo` (
  `id_defensivo` int NOT NULL AUTO_INCREMENT,
  `nome_comercial` varchar(80) NOT NULL,
  `principio_ativo` varchar(120) NOT NULL,
  `classe_toxicologica` tinyint NOT NULL,
  `carencia_dias` int NOT NULL,
  PRIMARY KEY (`id_defensivo`),
  CONSTRAINT `defensivo_chk_1` CHECK ((`classe_toxicologica` between 1 and 5)),
  CONSTRAINT `defensivo_chk_2` CHECK ((`carencia_dias` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `defensivo`
--

LOCK TABLES `defensivo` WRITE;
/*!40000 ALTER TABLE `defensivo` DISABLE KEYS */;
INSERT INTO `defensivo` VALUES (1,'LagartaStop','Clorantraniliprole',4,14),(2,'PercevejoOff','Tiametoxam + Lambda-cialotrina',3,21),(3,'TraçaFim','Abamectina',2,7);
/*!40000 ALTER TABLE `defensivo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `defensivo_praga`
--

DROP TABLE IF EXISTS `defensivo_praga`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `defensivo_praga` (
  `id_defensivo` int NOT NULL,
  `id_praga` int NOT NULL,
  PRIMARY KEY (`id_defensivo`,`id_praga`),
  KEY `id_praga` (`id_praga`),
  CONSTRAINT `defensivo_praga_ibfk_1` FOREIGN KEY (`id_defensivo`) REFERENCES `defensivo` (`id_defensivo`),
  CONSTRAINT `defensivo_praga_ibfk_2` FOREIGN KEY (`id_praga`) REFERENCES `praga` (`id_praga`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `defensivo_praga`
--

LOCK TABLES `defensivo_praga` WRITE;
/*!40000 ALTER TABLE `defensivo_praga` DISABLE KEYS */;
INSERT INTO `defensivo_praga` VALUES (1,1),(1,2),(2,3),(1,4),(3,4),(2,5),(3,5);
/*!40000 ALTER TABLE `defensivo_praga` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `irrigacao`
--

DROP TABLE IF EXISTS `irrigacao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `irrigacao` (
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
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `irrigacao`
--

LOCK TABLES `irrigacao` WRITE;
/*!40000 ALTER TABLE `irrigacao` DISABLE KEYS */;
INSERT INTO `irrigacao` VALUES (1,1,'2025-12-10 06:30:00',3000.00,180,'aspersao'),(2,1,'2026-01-14 06:30:00',3200.00,190,'aspersao'),(3,2,'2026-03-05 07:00:00',2400.00,150,'aspersao'),(4,3,'2026-03-06 07:00:00',300.00,90,'aspersao'),(5,4,'2026-08-20 08:00:00',600.00,240,'gotejamento'),(6,4,'2026-09-15 08:00:00',650.00,250,'gotejamento'),(7,4,'2026-10-12 08:00:00',700.00,260,'gotejamento'),(8,5,'2026-11-03 07:30:00',300.00,100,'aspersao'),(9,1,'2025-12-10 06:30:00',3000.00,180,'aspersao'),(10,1,'2026-01-14 06:30:00',3200.00,190,'aspersao'),(11,2,'2026-03-05 07:00:00',2400.00,150,'aspersao'),(12,3,'2026-03-06 07:00:00',300.00,90,'aspersao'),(13,4,'2026-08-20 08:00:00',600.00,240,'gotejamento'),(14,4,'2026-09-15 08:00:00',650.00,250,'gotejamento'),(15,4,'2026-10-12 08:00:00',700.00,260,'gotejamento'),(16,5,'2026-11-03 07:30:00',300.00,100,'aspersao');
/*!40000 ALTER TABLE `irrigacao` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leitura_sensor`
--

DROP TABLE IF EXISTS `leitura_sensor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leitura_sensor` (
  `id_leitura` bigint NOT NULL AUTO_INCREMENT,
  `id_sensor` int NOT NULL,
  `data_hora` datetime NOT NULL,
  `valor` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_leitura`),
  KEY `idx_leitura_sensor_data` (`id_sensor`,`data_hora`),
  CONSTRAINT `leitura_sensor_ibfk_1` FOREIGN KEY (`id_sensor`) REFERENCES `sensor` (`id_sensor`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leitura_sensor`
--

LOCK TABLES `leitura_sensor` WRITE;
/*!40000 ALTER TABLE `leitura_sensor` DISABLE KEYS */;
INSERT INTO `leitura_sensor` VALUES (1,1,'2026-11-10 06:00:00',68.50),(2,1,'2026-11-10 18:00:00',61.00),(3,1,'2026-11-11 06:00:00',72.30),(4,1,'2026-11-11 18:00:00',63.80),(5,2,'2026-11-10 06:00:00',66.00),(6,2,'2026-11-11 06:00:00',58.20),(7,2,'2026-11-12 06:00:00',55.40),(8,3,'2026-11-11 06:00:00',22.40);
/*!40000 ALTER TABLE `leitura_sensor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ocorrencia_praga`
--

DROP TABLE IF EXISTS `ocorrencia_praga`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ocorrencia_praga` (
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ocorrencia_praga`
--

LOCK TABLES `ocorrencia_praga` WRITE;
/*!40000 ALTER TABLE `ocorrencia_praga` DISABLE KEYS */;
INSERT INTO `ocorrencia_praga` VALUES (1,4,4,'2026-10-05','alto','Galerias nas folhas'),(2,4,5,'2026-10-20','medio','Presença na parte de baixo das folhas'),(3,5,3,'2026-11-09','baixo','Poucos indivíduos'),(4,1,2,'2026-01-20','medio','Folhas danificadas'),(5,3,1,'2026-03-10','alto','Ataque no cartucho do milho');
/*!40000 ALTER TABLE `ocorrencia_praga` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `praga`
--

DROP TABLE IF EXISTS `praga`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `praga` (
  `id_praga` int NOT NULL AUTO_INCREMENT,
  `nome_popular` varchar(80) NOT NULL,
  `nome_cientifico` varchar(100) NOT NULL,
  PRIMARY KEY (`id_praga`),
  UNIQUE KEY `nome_cientifico` (`nome_cientifico`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `praga`
--

LOCK TABLES `praga` WRITE;
/*!40000 ALTER TABLE `praga` DISABLE KEYS */;
INSERT INTO `praga` VALUES (1,'Lagarta-do-cartucho','Spodoptera frugiperda'),(2,'Lagarta-da-soja','Anticarsia gemmatalis'),(3,'Percevejo-marrom','Euschistus heros'),(4,'Traça-do-tomateiro','Tuta absoluta'),(5,'Mosca-branca','Bemisia tabaci');
/*!40000 ALTER TABLE `praga` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `previsao_climatica`
--

DROP TABLE IF EXISTS `previsao_climatica`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `previsao_climatica` (
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `previsao_climatica`
--

LOCK TABLES `previsao_climatica` WRITE;
/*!40000 ALTER TABLE `previsao_climatica` DISABLE KEYS */;
INSERT INTO `previsao_climatica` VALUES (1,2,'2026-11-13 12:00:00',29.5,12.0,70.0,14.0),(2,2,'2026-11-14 12:00:00',27.0,0.0,55.0,10.0),(3,2,'2026-11-15 12:00:00',30.2,0.0,48.0,9.0);
/*!40000 ALTER TABLE `previsao_climatica` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `propriedade`
--

DROP TABLE IF EXISTS `propriedade`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `propriedade` (
  `id_propriedade` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `proprietario` varchar(100) NOT NULL,
  `cidade` varchar(80) DEFAULT NULL,
  `area_total_ha` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_propriedade`),
  CONSTRAINT `propriedade_chk_1` CHECK ((`area_total_ha` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `propriedade`
--

LOCK TABLES `propriedade` WRITE;
/*!40000 ALTER TABLE `propriedade` DISABLE KEYS */;
INSERT INTO `propriedade` VALUES (1,'Fazenda Boa Terra','João Almeida','Ribeirão Preto',250.00),(2,'Sítio Vale Verde','Maria Souza','Campinas',40.00),(3,'Fazenda Boa Terra','João Almeida','Ribeirão Preto',250.00),(4,'Sítio Vale Verde','Maria Souza','Campinas',40.00);
/*!40000 ALTER TABLE `propriedade` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recomendacao_manejo`
--

DROP TABLE IF EXISTS `recomendacao_manejo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recomendacao_manejo` (
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recomendacao_manejo`
--

LOCK TABLES `recomendacao_manejo` WRITE;
/*!40000 ALTER TABLE `recomendacao_manejo` DISABLE KEYS */;
INSERT INTO `recomendacao_manejo` VALUES (1,4,'2026-10-21 08:00:00','aplicar_defensivo','Mosca-branca em nível médio: avaliar aplicação','media','aceita'),(2,5,'2026-11-12 07:00:00','irrigar','Umidade do solo abaixo do ideal para a soja','alta','pendente');
/*!40000 ALTER TABLE `recomendacao_manejo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `safra`
--

DROP TABLE IF EXISTS `safra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `safra` (
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
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `safra`
--

LOCK TABLES `safra` WRITE;
/*!40000 ALTER TABLE `safra` DISABLE KEYS */;
INSERT INTO `safra` VALUES (1,1,1,'2025-10-20','2026-02-17',332000.00),(2,2,2,'2026-02-20','2026-06-30',455000.00),(3,4,2,'2026-02-15','2026-06-25',58000.00),(4,3,3,'2026-08-10','2026-11-18',NULL),(5,4,1,'2026-10-25','2027-02-22',NULL),(6,1,1,'2025-10-20','2026-02-17',332000.00),(7,2,2,'2026-02-20','2026-06-30',455000.00),(8,4,2,'2026-02-15','2026-06-25',58000.00),(9,3,3,'2026-08-10','2026-11-18',NULL),(10,4,1,'2026-10-25','2027-02-22',NULL);
/*!40000 ALTER TABLE `safra` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sensor`
--

DROP TABLE IF EXISTS `sensor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sensor` (
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sensor`
--

LOCK TABLES `sensor` WRITE;
/*!40000 ALTER TABLE `sensor` DISABLE KEYS */;
INSERT INTO `sensor` VALUES (1,3,1,'SoilMoist X1','2026-08-05','ativo',-22.905600,-47.060800),(2,4,1,'SoilMoist X1','2026-10-20','ativo',-22.906100,-47.061500),(3,3,2,'TempSolo T2','2026-08-05','ativo',-22.905700,-47.060900);
/*!40000 ALTER TABLE `sensor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `talhao`
--

DROP TABLE IF EXISTS `talhao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `talhao` (
  `id_talhao` int NOT NULL AUTO_INCREMENT,
  `id_propriedade` int NOT NULL,
  `nome` varchar(60) NOT NULL,
  `area_ha` decimal(10,2) NOT NULL,
  `tipo_solo` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id_talhao`),
  KEY `id_propriedade` (`id_propriedade`),
  CONSTRAINT `talhao_ibfk_1` FOREIGN KEY (`id_propriedade`) REFERENCES `propriedade` (`id_propriedade`),
  CONSTRAINT `talhao_chk_1` CHECK ((`area_ha` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `talhao`
--

LOCK TABLES `talhao` WRITE;
/*!40000 ALTER TABLE `talhao` DISABLE KEYS */;
INSERT INTO `talhao` VALUES (1,1,'Talhão Norte',100.00,'Latossolo'),(2,1,'Talhão Sul',80.00,'Argissolo'),(3,2,'Talhão A',15.00,'Latossolo'),(4,2,'Talhão B',10.00,'Argissolo'),(5,1,'Talhão Norte',100.00,'Latossolo'),(6,1,'Talhão Sul',80.00,'Argissolo'),(7,2,'Talhão A',15.00,'Latossolo'),(8,2,'Talhão B',10.00,'Argissolo');
/*!40000 ALTER TABLE `talhao` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tipo_sensor`
--

DROP TABLE IF EXISTS `tipo_sensor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipo_sensor` (
  `id_tipo_sensor` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(60) NOT NULL,
  `unidade_medida` varchar(10) NOT NULL,
  PRIMARY KEY (`id_tipo_sensor`),
  UNIQUE KEY `nome` (`nome`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tipo_sensor`
--

LOCK TABLES `tipo_sensor` WRITE;
/*!40000 ALTER TABLE `tipo_sensor` DISABLE KEYS */;
INSERT INTO `tipo_sensor` VALUES (1,'Umidade do solo','%'),(2,'Temperatura do solo','°C'),(3,'Chuva','mm');
/*!40000 ALTER TABLE `tipo_sensor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuario`
--

DROP TABLE IF EXISTS `usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuario` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `email` varchar(120) NOT NULL,
  `perfil` enum('administrador','agronomo','operador','auditor') NOT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuario`
--

LOCK TABLES `usuario` WRITE;
/*!40000 ALTER TABLE `usuario` DISABLE KEYS */;
INSERT INTO `usuario` VALUES (1,'Carlos Mendes','carlos@agrodata.exemplo','agronomo'),(2,'Ana Lima','ana@agrodata.exemplo','operador'),(3,'Rafael Costa','rafael@agrodata.exemplo','administrador'),(4,'Auditoria','auditoria@agrodata.exemplo','auditor');
/*!40000 ALTER TABLE `usuario` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-12 21:50:59
