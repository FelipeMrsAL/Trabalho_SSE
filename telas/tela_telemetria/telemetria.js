// Controller da Tela de Telemetria de Equipamento Individual

// Obter ID do equipamento a partir do URL (ex: ?id=ESTEIRA-02) ou fallback para ESTEIRA-03
const urlParams = new URLSearchParams(window.location.search);
let targetEquipamentoId = urlParams.get('id') || 'ESTEIRA-03';

function showToast(message) {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerText = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3500);
}

// Conectar ao EventSource SSE
const evtSource = new EventSource('/api/telemetria/stream');

evtSource.addEventListener('equipamento_update', (event) => {
    const data = JSON.parse(event.data);
    if (data.equipamentoId === targetEquipamentoId) {
        updateTelemetryView(data);
    }
});

evtSource.addEventListener('alerta_tempo', (event) => {
    const data = JSON.parse(event.data);
    if (data.equipamentoId === targetEquipamentoId) {
        showToast(`⚠️ ATENÇÃO: ${data.mensagem}`);
    }
});

function updateTelemetryView(data) {
    // Header
    const titleEl = document.getElementById('header-title');
    if (titleEl) {
        titleEl.innerText = `MONITOR DE TELEMETRIA EM TEMPO REAL — ${data.nome.toUpperCase()} (${data.equipamentoId})`;
    }
    document.title = `Telemetria - ${data.nome}`;

    // Velocidade (Gauge)
    const speedEl = document.getElementById('gauge-speed');
    if (speedEl) {
        speedEl.innerText = (data.velocidade_kmh || 0).toFixed(1);
    }

    // Frequência Cardíaca
    const bpmEl = document.getElementById('metric-bpm');
    if (bpmEl) {
        bpmEl.innerText = `${data.frequencia_cardiaca_bpm || 0} BPM`;
    }

    // Calorias
    const calEl = document.getElementById('metric-calories');
    if (calEl) {
        calEl.innerText = `${(data.calorias || 0).toFixed(1)} kcal`;
    }

    // Temperatura Motor
    const tempEl = document.getElementById('metric-temp');
    if (tempEl) {
        const temp = data.temperaturaMotor || 25;
        const tempStatus = temp > 45 ? '(Elevada 🔥)' : '(Normal)';
        tempEl.innerText = `${temp} °C ${tempStatus}`;
        tempEl.className = `metric-value ${temp > 45 ? 'text-red' : 'text-green'}`;
    }

    // RPM
    const rpmEl = document.getElementById('metric-rpm');
    if (rpmEl) {
        rpmEl.innerText = `${data.rpm || 0} RPM`;
    }

    // Timer & Status
    const timerValueEl = document.getElementById('timer-value');
    const timerAlertEl = document.getElementById('timer-alert');
    const timerBoxEl = document.getElementById('timer-display-box');

    if (timerValueEl) {
        timerValueEl.innerText = `${data.tempoMinutos} min`;
    }

    if (data.alertaTempoExcedido) {
        if (timerAlertEl) {
            timerAlertEl.innerText = '[!] EXCEDE LIMITE DE 60 MIN';
            timerAlertEl.style.display = 'block';
        }
        if (timerBoxEl) timerBoxEl.className = 'timer-display warning-state';
    } else {
        if (timerAlertEl) {
            timerAlertEl.innerText = data.status === 'LIVRE' ? 'EQUIPAMENTO DISPONÍVEL' : 'TEMPO EM USO NORMAL';
            timerAlertEl.style.display = 'block';
        }
        if (timerBoxEl) timerBoxEl.className = 'timer-display';
    }

    // Usuário
    const userEl = document.getElementById('user-name');
    if (userEl) {
        userEl.innerText = data.usuario ? data.usuario : '(Nenhum / Livre)';
    }
}

// Botões de Ação
document.addEventListener('DOMContentLoaded', () => {
    const btnNotify = document.getElementById('btn-notify');
    const btnStop = document.getElementById('btn-stop');
    const btnReport = document.getElementById('btn-report');

    if (btnNotify) {
        btnNotify.addEventListener('click', () => {
            const userEl = document.getElementById('user-name');
            const userName = userEl ? userEl.innerText : 'Aluno';
            showToast(`🔔 Notificação de limite enviada para o painel de ${userName}!`);
        });
    }

    if (btnStop) {
        btnStop.addEventListener('click', async () => {
            if (confirm(`Deseja realmente desligar o motor e finalizar o treino em ${targetEquipamentoId}?`)) {
                try {
                    const res = await fetch(`/api/equipamentos/${targetEquipamentoId}/finalizar`, { method: 'POST' });
                    const data = await res.json();
                    if (data.sucesso) {
                        showToast(`⏹️ Motor desligado! Equipamento agora está livre.`);
                    }
                } catch (err) {
                    showToast(`❌ Erro ao enviar comando para desligar motor.`);
                }
            }
        });
    }

    if (btnReport) {
        btnReport.addEventListener('click', async () => {
            const motivo = prompt('Digite o motivo do chamado de manutenção:', 'Sobreaquecimento ou falha no sensor');
            if (motivo) {
                try {
                    const res = await fetch(`/api/equipamentos/${targetEquipamentoId}/manutencao`, { method: 'POST' });
                    const data = await res.json();
                    if (data.sucesso) {
                        showToast(`🛠️ Chamado de manutenção registrado com sucesso!`);
                    }
                } catch (err) {
                    showToast(`❌ Erro ao registrar chamado.`);
                }
            }
        });
    }
});
