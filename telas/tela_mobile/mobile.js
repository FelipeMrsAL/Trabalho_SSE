// Mobile Screen Controller - SSE & Equipment Interaction

let currentEquipamentoId = 'ESTEIRA-01';

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

// Connect to SSE stream
const evtSource = new EventSource('/api/telemetria/stream');

evtSource.addEventListener('equipamento_update', (event) => {
    const data = JSON.parse(event.data);
    if (data.equipamentoId === currentEquipamentoId) {
        updateMobileScreen(data);
    }
});

function updateMobileScreen(data) {
    const deviceNameEl = document.getElementById('m-device-name');
    const deviceSubEl = document.getElementById('m-device-sub');
    const timerMainEl = document.getElementById('m-timer-main');
    const timerRemEl = document.getElementById('m-timer-rem');
    const speedEl = document.getElementById('m-speed');
    const calEl = document.getElementById('m-cal');
    const bpmEl = document.getElementById('m-bpm');

    if (deviceNameEl) deviceNameEl.innerText = `${data.nome.toUpperCase()}`;
    if (deviceSubEl) deviceSubEl.innerText = `Status: ${data.status} | ID: ${data.equipamentoId}`;
    if (timerMainEl) timerMainEl.innerText = `${data.tempoMinutos} min`;
    
    const remaining = Math.max(0, 60 - data.tempoMinutos);
    if (timerRemEl) {
        if (data.alertaTempoExcedido) {
            timerRemEl.innerText = `⚠️ ATENÇÃO: Limite de 60 min excedido!`;
            timerRemEl.style.color = '#d93025';
        } else {
            timerRemEl.innerText = `Restam ${remaining} min no seu limite de horário de pico`;
            timerRemEl.style.color = '';
        }
    }

    if (speedEl) speedEl.innerText = `${(data.velocidade_kmh || 0).toFixed(1)} km/h`;
    if (calEl) calEl.innerText = `${(data.calorias || 0).toFixed(1)} kcal`;
    if (bpmEl) bpmEl.innerText = `${data.frequencia_cardiaca_bpm || 0} BPM`;
}

window.simulateScan = async function() {
    const selectEq = document.getElementById('eq-select');
    if (selectEq) currentEquipamentoId = selectEq.value;

    const aluno = prompt('Digite seu nome para conectar ao aparelho:', 'Maria Santos');
    if (!aluno) return;

    try {
        const res = await fetch(`/api/equipamentos/${currentEquipamentoId}/iniciar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alunoId: aluno })
        });
        const data = await res.json();
        
        if (data.sucesso) {
            showToast(`✅ Treino iniciado em ${currentEquipamentoId}!`);
            document.getElementById('scan-screen').classList.add('hidden');
            document.getElementById('scan-screen').classList.remove('active');
            document.getElementById('training-screen').classList.remove('hidden');
            document.getElementById('training-screen').classList.add('active');
        } else {
            showToast(`❌ ${data.erro || 'Não foi possível iniciar'}`);
        }
    } catch (err) {
        showToast('❌ Erro na comunicação com servidor.');
    }
};

window.finishWorkout = async function() {
    if (confirm('Deseja encerrar o treino e liberar o aparelho?')) {
        try {
            const res = await fetch(`/api/equipamentos/${currentEquipamentoId}/finalizar`, { method: 'POST' });
            const data = await res.json();
            if (data.sucesso) {
                showToast('🎉 Treino finalizado! O equipamento agora está livre.');
                document.getElementById('training-screen').classList.add('hidden');
                document.getElementById('training-screen').classList.remove('active');
                document.getElementById('scan-screen').classList.remove('hidden');
                document.getElementById('scan-screen').classList.add('active');
            }
        } catch (err) {
            showToast('❌ Erro ao finalizar treino.');
        }
    }
};

window.reportProblem = async function() {
    const desc = prompt('Informe a falha observada no aparelho:', 'Barulho incomum ou painel travado');
    if (desc) {
        try {
            const res = await fetch(`/api/equipamentos/${currentEquipamentoId}/manutencao`, { method: 'POST' });
            const data = await res.json();
            if (data.sucesso) {
                showToast('🛠️ Problema reportado! O equipamento foi enviado para manutenção.');
                document.getElementById('training-screen').classList.add('hidden');
                document.getElementById('training-screen').classList.remove('active');
                document.getElementById('scan-screen').classList.remove('hidden');
                document.getElementById('scan-screen').classList.add('active');
            }
        } catch (err) {
            showToast('❌ Erro ao reportar chamado.');
        }
    }
};
