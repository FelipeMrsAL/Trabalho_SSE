-- Script de criação do banco de dados para PostgreSQL (schema.sql)

CREATE TABLE ALUNO (
    id_aluno SERIAL PRIMARY KEY,
    matricula VARCHAR(20) NOT NULL,
    nome_completo VARCHAR(100) NOT NULL,
    plano_assinatura VARCHAR(30) NOT NULL,
    status_conta VARCHAR(20) NOT NULL,
    data_cadastro DATE NOT NULL
);

CREATE TABLE EQUIPAMENTO (
    id_equipamento SERIAL PRIMARY KEY,
    codigo_qr_tag VARCHAR(50) NOT NULL UNIQUE,
    nome_aparelho VARCHAR(50) NOT NULL,
    setor_academia VARCHAR(30) NOT NULL,
    status_operacional VARCHAR(20) NOT NULL,
    limite_tempo_minutos INT NOT NULL
);

CREATE TABLE SESSAO_TREINO (
    id_sessao SERIAL PRIMARY KEY,
    id_aluno INT NOT NULL,
    id_equipamento INT NOT NULL,
    data_hora_inicio TIMESTAMP NOT NULL,
    data_hora_fim TIMESTAMP,
    duracao_minutos INT,
    calorias_queimadas DECIMAL(6,2),
    alerta_tempo_excedido BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (id_aluno) REFERENCES ALUNO(id_aluno),
    FOREIGN KEY (id_equipamento) REFERENCES EQUIPAMENTO(id_equipamento)
);

CREATE TABLE TELEMETRIA_SENSORES (
    id_telemetria SERIAL PRIMARY KEY,
    id_sessao INT NOT NULL,
    velocidade_kmh DECIMAL(4,1),
    rpm INT,
    frequencia_cardiaca_bpm INT,
    temperatura_motor_c DECIMAL(4,1),
    timestamp_leitura TIMESTAMP NOT NULL,
    FOREIGN KEY (id_sessao) REFERENCES SESSAO_TREINO(id_sessao)
);

CREATE TABLE CHAMADO_MANUTENCAO (
    id_chamado SERIAL PRIMARY KEY,
    id_equipamento INT NOT NULL,
    descricao_defeito TEXT NOT NULL,
    data_abertura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status_chamado VARCHAR(20) NOT NULL,
    FOREIGN KEY (id_equipamento) REFERENCES EQUIPAMENTO(id_equipamento)
);
