const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Redirecionamento da raiz para o Dashboard
app.get('/', (req, res) => {
    res.redirect('/telas/tela_dashboard/dashboard.html');
});

const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, 'equipamentos.json');

// Função para carregar equipamentos do arquivo JSON
function carregarEquipamentos() {
    try {
        if (!fs.existsSync(FILE_PATH)) {
            return [];
        }
        const data = fs.readFileSync(FILE_PATH, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Erro ao ler equipamentos.json:', err);
        return [];
    }
}

// Função para salvar equipamentos no arquivo JSON
function salvarEquipamentos(equipamentos) {
    try {
        fs.writeFileSync(FILE_PATH, JSON.stringify(equipamentos, null, 2), 'utf8');
    } catch (err) {
        console.error('Erro ao salvar equipamentos.json:', err);
    }
}

// Base de dados em JSON dos equipamentos
let equipamentos = carregarEquipamentos();

let clients = [];

// Envia eventos para todos os clientes conectados via SSE
function sendEventToAll(eventName, data) {
    clients.forEach(client => {
        client.res.write(`event: ${eventName}\n`);
        client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    });
}

// Atualiza e faz broadcast da taxa de ocupação dos equipamentos
function broadcastOcupacao() {
    const operacionais = equipamentos.filter(e => e.status !== 'MANUTENCAO');
    const total = operacionais.length;
    const emUso = operacionais.filter(e => e.status === 'EM_USO').length;
    const taxa = total === 0 ? 0 : Math.round((emUso / total) * 100);

    sendEventToAll('ocupacao_update', {
        taxaOcupacao: taxa,
        equipamentosEmUso: emUso,
        totalOperacionais: total
    });
}

// Formata os dados de telemetria do equipamento
function createEqUpdatePayload(eq) {
    return {
        equipamentoId: eq.id,
        setor: eq.setor,
        nome: eq.nome,
        status: eq.status,
        usuario: eq.usuario,
        tempoMinutos: eq.tempoMinutos,
        calorias: eq.calorias,
        alertaTempoExcedido: eq.alertaTempoExcedido,
        temperaturaMotor: eq.temperaturaMotor,
        velocidade_kmh: eq.speed,
        rpm: eq.rpm,
        frequencia_cardiaca_bpm: eq.bpm,
        timestamp: new Date().toISOString()
    };
}

// Endpoint SSE para streaming de telemetria em tempo real
app.get('/api/telemetria/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clientId = Date.now();
    clients.push({ id: clientId, res });

    equipamentos.forEach(eq => {
        res.write(`event: equipamento_update\n`);
        res.write(`data: ${JSON.stringify(createEqUpdatePayload(eq))}\n\n`);
    });
    broadcastOcupacao();

    req.on('close', () => {
        clients = clients.filter(client => client.id !== clientId);
    });
});

// Iniciar treino em um equipamento
app.post('/api/equipamentos/:id/iniciar', (req, res) => {
    const eq = equipamentos.find(e => e.id === req.params.id);
    if (!eq) return res.status(404).json({ erro: 'Equipamento não encontrado' });
    if (eq.status !== 'LIVRE') return res.status(400).json({ erro: 'Equipamento indisponível' });

    eq.status = 'EM_USO';
    eq.usuario = req.body.alunoId || 'Maria Santos';
    eq.tempoMinutos = 0;
    eq.calorias = 0;
    eq.alertaTempoExcedido = false;
    eq.ticks = 0;

    sendEventToAll('equipamento_update', createEqUpdatePayload(eq));
    broadcastOcupacao();
    salvarEquipamentos(equipamentos);

    const now = new Date();
    res.json({
        sucesso: true,
        equipamentoId: eq.id,
        status: eq.status,
        horaInicio: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:00`,
        mensagem: "Treino iniciado! Lembre-se do limite de 60 minutos em horários de pico."
    });
});

// Encerramento de treino e liberação do equipamento
app.post('/api/equipamentos/:id/finalizar', (req, res) => {
    const eq = equipamentos.find(e => e.id === req.params.id);
    if (!eq) return res.status(404).json({ erro: 'Equipamento não encontrado' });

    eq.status = 'LIVRE';
    eq.usuario = null;
    eq.tempoMinutos = 0;
    eq.calorias = 0;
    eq.alertaTempoExcedido = false;
    eq.speed = 0;
    eq.rpm = 0;
    eq.bpm = 0;
    eq.temperaturaMotor = 25.0;
    eq.ticks = 0;

    sendEventToAll('equipamento_update', createEqUpdatePayload(eq));
    broadcastOcupacao();
    salvarEquipamentos(equipamentos);

    res.json({ sucesso: true, mensagem: 'Treino finalizado com sucesso. Equipamento livre.' });
});

// Bloqueio do equipamento para manutenção preventiva
app.post('/api/equipamentos/:id/manutencao', (req, res) => {
    const eq = equipamentos.find(e => e.id === req.params.id);
    if (!eq) return res.status(404).json({ erro: 'Equipamento não encontrado' });

    eq.status = 'MANUTENCAO';
    eq.usuario = null;
    eq.tempoMinutos = 0;
    eq.calorias = 0;
    eq.alertaTempoExcedido = false;
    eq.speed = 0;
    eq.rpm = 0;
    eq.bpm = 0;

    sendEventToAll('equipamento_update', createEqUpdatePayload(eq));
    broadcastOcupacao();
    salvarEquipamentos(equipamentos);

    res.json({ sucesso: true, mensagem: 'Equipamento marcado para manutenção preventiva.' });
});

// Simulação periódica dos sensores dos equipamentos em uso
setInterval(() => {
    equipamentos.forEach(eq => {
        if (eq.status === 'EM_USO') {
            eq.speed = parseFloat((Math.random() * (12 - 5) + 5).toFixed(1));
            eq.rpm = Math.floor(Math.random() * (120 - 60) + 60);
            eq.bpm = Math.floor(Math.random() * (160 - 100) + 100);
            eq.temperaturaMotor = parseFloat((Math.random() * (50 - 35) + 35).toFixed(1));
            eq.calorias = parseFloat((eq.calorias + 0.3).toFixed(2));

            eq.ticks = (eq.ticks || 0) + 1;
            eq.tempoMinutos = eq.ticks;

            // Alerta automático se o tempo em uso exceder 60 minutos
            if (eq.tempoMinutos > 60 && !eq.alertaTempoExcedido) {
                eq.alertaTempoExcedido = true;
                sendEventToAll('alerta_tempo', {
                    equipamentoId: eq.id,
                    mensagem: "[!] RECOMENDAÇÃO: Solicitar liberação do equipamento por limite de tempo em horário de pico"
                });
            }

            sendEventToAll('equipamento_update', createEqUpdatePayload(eq));
        }
    });
}, 2000);

app.listen(port, () => {
    console.log(`Servidor de Telemetria rodando na porta ${port}`);
    console.log(`SSE Event Stream endpoint: http://localhost:${port}/api/telemetria/stream`);
});
