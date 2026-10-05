const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve HTML files statically

// Redirecionamento da raiz para a tela do Dashboard
app.get('/', (req, res) => {
    res.redirect('/telas/tela_dashboard/dashboard.html');
});

// [RF-01] Mapeamento e Gestão de Equipamentos Fitness (In-memory)
const equipamentos = [
    { id: 'ESTEIRA-01', nome: 'Esteira Pro 01', setor: 'CARDIO', status: 'LIVRE', usuario: null, tempoMinutos: 0, calorias: 0, temperaturaMotor: 25.0, alertaTempoExcedido: false, speed: 0, rpm: 0, bpm: 0 },
    { id: 'ESTEIRA-02', nome: 'Esteira Pro 02', setor: 'CARDIO', status: 'EM_USO', usuario: 'João Silva', tempoMinutos: 20, calorias: 150, temperaturaMotor: 40.0, alertaTempoExcedido: false, speed: 8.5, rpm: 80, bpm: 120 },
    { id: 'ESTEIRA-03', nome: 'Esteira Pro 03', setor: 'CARDIO', status: 'EM_USO', usuario: 'Maria Santos', tempoMinutos: 61, calorias: 420, temperaturaMotor: 48.0, alertaTempoExcedido: true, speed: 10.5, rpm: 100, bpm: 145 },
    { id: 'BIKE-01', nome: 'Bicicleta Spinning 01', setor: 'SPINNING', status: 'LIVRE', usuario: null, tempoMinutos: 0, calorias: 0, temperaturaMotor: 25.0, alertaTempoExcedido: false, speed: 0, rpm: 0, bpm: 0 },
    { id: 'BIKE-02', nome: 'Bicicleta Spinning 02', setor: 'SPINNING', status: 'EM_USO', usuario: 'Pedro Lima', tempoMinutos: 15, calorias: 110, temperaturaMotor: 32.0, alertaTempoExcedido: false, speed: 22.0, rpm: 85, bpm: 130 },
    { id: 'ELIPTICO-01', nome: 'Elíptico 01', setor: 'CARDIO', status: 'MANUTENCAO', usuario: null, tempoMinutos: 0, calorias: 0, temperaturaMotor: 25.0, alertaTempoExcedido: false, speed: 0, rpm: 0, bpm: 0 },
    { id: 'LEG-PRESS-01', nome: 'Leg Press 45°', setor: 'MUSCULACAO', status: 'EM_USO', usuario: 'Ana Souza', tempoMinutos: 12, calorias: 80, temperaturaMotor: 25.0, alertaTempoExcedido: false, speed: 0, rpm: 0, bpm: 115 },
    { id: 'SUPINO-01', nome: 'Supino Reto', setor: 'MUSCULACAO', status: 'LIVRE', usuario: null, tempoMinutos: 0, calorias: 0, temperaturaMotor: 25.0, alertaTempoExcedido: false, speed: 0, rpm: 0, bpm: 0 },
    { id: 'PUXADA-01', nome: 'Puxada Alta', setor: 'MUSCULACAO', status: 'EM_USO', usuario: 'Lucas Mendes', tempoMinutos: 34, calorias: 190, temperaturaMotor: 25.0, alertaTempoExcedido: false, speed: 0, rpm: 0, bpm: 125 },
    { id: 'CROSS-01', nome: 'Cross Over', setor: 'MUSCULACAO', status: 'EM_USO', usuario: 'Fernanda Oliveira', tempoMinutos: 45, calorias: 240, temperaturaMotor: 25.0, alertaTempoExcedido: false, speed: 0, rpm: 0, bpm: 135 }
];

let clients = [];

// Função auxiliar para enviar mensagens via SSE
function sendEventToAll(eventName, data) {
    clients.forEach(client => {
        client.res.write(`event: ${eventName}\n`);
        client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    });
}

// [RF-06] Cálculo Dinâmico da Taxa de Ocupação Global
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

// Payload padronizado para equipamentos
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

// [RF-05] Broadcast SSE de Telemetria Multicliente
app.get('/api/telemetria/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clientId = Date.now();
    clients.push({ id: clientId, res });
    
    // Estado inicial
    equipamentos.forEach(eq => {
        res.write(`event: equipamento_update\n`);
        res.write(`data: ${JSON.stringify(createEqUpdatePayload(eq))}\n\n`);
    });
    broadcastOcupacao();

    req.on('close', () => {
        clients = clients.filter(client => client.id !== clientId);
    });
});

// [RF-02] Início de Sessão de Treino via HTTP POST
app.post('/api/equipamentos/:id/iniciar', (req, res) => {
    const eq = equipamentos.find(e => e.id === req.params.id);
    if (!eq) return res.status(404).json({ erro: 'Equipamento não encontrado' });
    if (eq.status !== 'LIVRE') return res.status(400).json({ erro: 'Equipamento indisponível' });

    eq.status = 'EM_USO';
    eq.usuario = req.body.alunoId || 'Maria Santos';
    eq.tempoMinutos = 0;
    eq.calorias = 0;
    eq.alertaTempoExcedido = false;
    eq.ticks = 0; // Utilizado internamente para simular minutos

    sendEventToAll('equipamento_update', createEqUpdatePayload(eq));
    broadcastOcupacao();

    const now = new Date();
    res.json({
        sucesso: true,
        equipamentoId: eq.id,
        status: eq.status,
        horaInicio: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:00`,
        mensagem: "Treino iniciado! Lembre-se do limite de 60 minutos em horários de pico."
    });
});

// [RF-03] Encerramento de Treino e Liberação via HTTP POST
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

    res.json({ sucesso: true, mensagem: 'Treino finalizado com sucesso. Equipamento livre.' });
});

// [RF-04] Sinalização e Bloqueio para Manutenção Preventiva
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

    res.json({ sucesso: true, mensagem: 'Equipamento marcado para manutenção preventiva.' });
});

// [RNF-02] Simulação em Tempo Real de Sensores Biométricos (a cada 2s)
setInterval(() => {
    equipamentos.forEach(eq => {
        if (eq.status === 'EM_USO') {
            eq.speed = parseFloat((Math.random() * (12 - 5) + 5).toFixed(1));
            eq.rpm = Math.floor(Math.random() * (120 - 60) + 60);
            eq.bpm = Math.floor(Math.random() * (160 - 100) + 100);
            eq.temperaturaMotor = parseFloat((Math.random() * (50 - 35) + 35).toFixed(1));
            eq.calorias = parseFloat((eq.calorias + 0.3).toFixed(2));
            
            // Simulador acelerado para teste: cada tick (2s) equivale a 1 minuto no simulador (só para ser mais rápido de ver o [RF-07])
            // Ou podemos manter realista, adicionando 2 segundos e a cada 60 atualizar os minutos. Vou usar rápido para testes.
            eq.ticks = (eq.ticks || 0) + 1; 
            eq.tempoMinutos = eq.ticks; // 1 tick = 1 min apenas pra simular de forma rápida

            // [RF-07] Alerta Automático por Excesso de Tempo Contínuo
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
