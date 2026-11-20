-- AgroData — dados de demonstração (FICTÍCIOS, para fins acadêmicos)
-- Base: registros originais de bd_agro_data.sql, sem as linhas duplicadas
-- (propriedades 3-4, talhões 5-8, safras 6-10 e irrigações 9-16 do dump original),
-- complementados com registros adicionais coerentes para o dashboard.
-- ATENÇÃO: este script APAGA os dados atuais antes de inserir.
-- Requer 03_auditoria_indices.sql já aplicado (tabela auditoria).

-- Desliga auditoria e recomendações automáticas durante a carga (ver 04_triggers.sql)
SET @agrodata_seed = 1;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE aplicacao_defensivo;
TRUNCATE TABLE recomendacao_manejo;
TRUNCATE TABLE ocorrencia_praga;
TRUNCATE TABLE leitura_sensor;
TRUNCATE TABLE sensor;
TRUNCATE TABLE irrigacao;
TRUNCATE TABLE safra;
TRUNCATE TABLE previsao_climatica;
TRUNCATE TABLE talhao;
TRUNCATE TABLE propriedade;
TRUNCATE TABLE cultivo_praga;
TRUNCATE TABLE defensivo_praga;
TRUNCATE TABLE defensivo;
TRUNCATE TABLE praga;
TRUNCATE TABLE cultivo;
TRUNCATE TABLE tipo_sensor;
TRUNCATE TABLE usuario;
TRUNCATE TABLE auditoria;
SET FOREIGN_KEY_CHECKS = 1;

-- Cadastros base (originais)
INSERT INTO usuario VALUES
 (1,'Carlos Mendes','carlos@agrodata.exemplo','agronomo'),
 (2,'Ana Lima','ana@agrodata.exemplo','operador'),
 (3,'Rafael Costa','rafael@agrodata.exemplo','administrador'),
 (4,'Auditoria','auditoria@agrodata.exemplo','auditor');

INSERT INTO cultivo VALUES
 (1,'Soja','Convencional',120,65.00,'unica',3500.00),
 (2,'Milho','Híbrido',130,65.00,'unica',6000.00),
 (3,'Tomate','Salada',100,70.00,'multipla',60000.00);

INSERT INTO praga VALUES
 (1,'Lagarta-do-cartucho','Spodoptera frugiperda'),
 (2,'Lagarta-da-soja','Anticarsia gemmatalis'),
 (3,'Percevejo-marrom','Euschistus heros'),
 (4,'Traça-do-tomateiro','Tuta absoluta'),
 (5,'Mosca-branca','Bemisia tabaci');

INSERT INTO cultivo_praga VALUES (2,1),(1,2),(1,3),(3,4),(1,5),(3,5);

INSERT INTO defensivo VALUES
 (1,'LagartaStop','Clorantraniliprole',4,14),
 (2,'PercevejoOff','Tiametoxam + Lambda-cialotrina',3,21),
 (3,'TraçaFim','Abamectina',2,7);

INSERT INTO defensivo_praga VALUES (1,1),(1,2),(2,3),(1,4),(3,4),(2,5),(3,5);

INSERT INTO tipo_sensor VALUES
 (1,'Umidade do solo','%'),
 (2,'Temperatura do solo','°C'),
 (3,'Chuva','mm');

-- Propriedades e talhões (originais 1-2 / 1-4 + complemento)
INSERT INTO propriedade VALUES
 (1,'Fazenda Boa Terra','João Almeida','Ribeirão Preto',250.00),
 (2,'Sítio Vale Verde','Maria Souza','Campinas',40.00),
 (3,'Chácara Santa Luzia','Pedro Nogueira','Piracicaba',12.00);

INSERT INTO talhao VALUES
 (1,1,'Talhão Norte',100.00,'Latossolo'),
 (2,1,'Talhão Sul',80.00,'Argissolo'),
 (3,2,'Talhão A',15.00,'Latossolo'),
 (4,2,'Talhão B',10.00,'Argissolo'),
 (5,3,'Estufa 1',2.00,'Latossolo'),
 (6,3,'Talhão Leste',8.00,'Nitossolo');

-- Safras (originais 1-5 + complemento)
INSERT INTO safra VALUES
 (1,1,1,'2025-10-20','2026-02-17',332000.00),
 (2,2,2,'2026-02-20','2026-06-30',455000.00),
 (3,4,2,'2026-02-15','2026-06-25',58000.00),
 (4,3,3,'2026-08-10','2026-11-18',NULL),
 (5,4,1,'2026-10-25','2027-02-22',NULL),
 (6,1,2,'2026-03-01','2026-07-09',590000.00),
 (7,2,1,'2026-10-15','2027-02-12',NULL),
 (8,5,3,'2026-08-20','2026-11-28',NULL),
 (9,6,2,'2026-02-10','2026-06-20',44000.00);

-- Irrigação (originais 1-8 + complemento)
INSERT INTO irrigacao VALUES
 (1,1,'2025-12-10 06:30:00',3000.00,180,'aspersao'),
 (2,1,'2026-01-14 06:30:00',3200.00,190,'aspersao'),
 (3,2,'2026-03-05 07:00:00',2400.00,150,'aspersao'),
 (4,3,'2026-03-06 07:00:00',300.00,90,'aspersao'),
 (5,4,'2026-08-20 08:00:00',600.00,240,'gotejamento'),
 (6,4,'2026-09-15 08:00:00',650.00,250,'gotejamento'),
 (7,4,'2026-10-12 08:00:00',700.00,260,'gotejamento'),
 (8,5,'2026-11-03 07:30:00',300.00,100,'aspersao'),
 (9,1,'2025-11-18 06:30:00',2800.00,170,'aspersao'),
 (10,2,'2026-04-10 07:00:00',2600.00,160,'aspersao'),
 (11,2,'2026-05-08 07:00:00',2200.00,140,'aspersao'),
 (12,3,'2026-04-02 07:00:00',320.00,95,'aspersao'),
 (13,3,'2026-05-04 07:00:00',280.00,85,'aspersao'),
 (14,6,'2026-03-20 06:30:00',3100.00,185,'aspersao'),
 (15,6,'2026-04-22 06:30:00',2900.00,175,'aspersao'),
 (16,6,'2026-05-25 06:30:00',2500.00,160,'aspersao'),
 (17,9,'2026-03-12 07:15:00',210.00,120,'sulco'),
 (18,9,'2026-04-15 07:15:00',230.00,125,'sulco'),
 (19,7,'2026-10-28 06:30:00',2400.00,150,'aspersao'),
 (20,7,'2026-11-12 06:30:00',2300.00,145,'aspersao'),
 (21,8,'2026-09-02 08:00:00',90.00,180,'gotejamento'),
 (22,8,'2026-10-01 08:00:00',95.00,185,'gotejamento'),
 (23,8,'2026-11-04 08:00:00',100.00,190,'gotejamento'),
 (24,5,'2026-11-14 07:30:00',320.00,105,'aspersao'),
 (25,4,'2026-11-08 08:00:00',680.00,255,'gotejamento');

-- Sensores e leituras (originais + complemento)
INSERT INTO sensor VALUES
 (1,3,1,'SoilMoist X1','2026-08-05','ativo',-22.905600,-47.060800),
 (2,4,1,'SoilMoist X1','2026-10-20','ativo',-22.906100,-47.061500),
 (3,3,2,'TempSolo T2','2026-08-05','ativo',-22.905700,-47.060900),
 (4,5,1,'SoilMoist X2','2026-08-18','ativo',-22.725300,-47.649100),
 (5,1,3,'Pluvio P1','2025-10-01','manutencao',-21.177500,-47.810300);

INSERT INTO leitura_sensor VALUES
 (1,1,'2026-11-10 06:00:00',68.50),
 (2,1,'2026-11-10 18:00:00',61.00),
 (3,1,'2026-11-11 06:00:00',72.30),
 (4,1,'2026-11-11 18:00:00',63.80),
 (5,2,'2026-11-10 06:00:00',66.00),
 (6,2,'2026-11-11 06:00:00',58.20),
 (7,2,'2026-11-12 06:00:00',55.40),
 (8,3,'2026-11-11 06:00:00',22.40),
 (9,3,'2026-11-12 06:00:00',23.10),
 (10,4,'2026-11-11 07:00:00',71.20),
 (11,4,'2026-11-12 07:00:00',69.80),
 (12,5,'2026-11-09 00:00:00',12.00);

-- Previsões climáticas (originais + complemento)
INSERT INTO previsao_climatica VALUES
 (1,2,'2026-11-13 12:00:00',29.5,12.0,70.0,14.0),
 (2,2,'2026-11-14 12:00:00',27.0,0.0,55.0,10.0),
 (3,2,'2026-11-15 12:00:00',30.2,0.0,48.0,9.0),
 (4,1,'2026-11-13 12:00:00',31.0,4.5,62.0,12.0),
 (5,1,'2026-11-14 12:00:00',32.4,0.0,50.0,11.0),
 (6,3,'2026-11-14 12:00:00',28.1,8.0,68.0,8.0);

-- Pragas, aplicações e recomendações (originais + complemento)
INSERT INTO ocorrencia_praga VALUES
 (1,4,4,'2026-10-05','alto','Galerias nas folhas'),
 (2,4,5,'2026-10-20','medio','Presença na parte de baixo das folhas'),
 (3,5,3,'2026-11-09','baixo','Poucos indivíduos'),
 (4,1,2,'2026-01-20','medio','Folhas danificadas'),
 (5,3,1,'2026-03-10','alto','Ataque no cartucho do milho'),
 (6,8,4,'2026-11-06','baixo','Primeiras galerias na estufa'),
 (7,6,1,'2026-04-08','medio','Cartuchos atacados nas bordaduras');

INSERT INTO aplicacao_defensivo VALUES
 (1,4,3,1,2,'2026-10-06',15.00),
 (2,3,1,5,2,'2026-03-11',8.00),
 (3,1,1,4,2,'2026-01-22',40.00),
 (4,4,3,2,2,'2026-10-22',6.00),
 (5,6,1,7,2,'2026-04-09',32.00);

INSERT INTO recomendacao_manejo VALUES
 (1,4,'2026-10-21 08:00:00','aplicar_defensivo','Mosca-branca em nível médio: avaliar aplicação','media','aceita'),
 (2,5,'2026-11-12 07:00:00','irrigar','Umidade do solo abaixo do ideal para a soja','alta','pendente'),
 (3,8,'2026-11-07 08:00:00','monitorar','Traça-do-tomateiro em nível baixo na estufa: monitorar armadilhas','media','pendente'),
 (4,4,'2026-11-15 07:00:00','monitorar','Colheita prevista para 18/11: verificar carência do último defensivo','baixa','concluida');

SET @agrodata_seed = NULL;
