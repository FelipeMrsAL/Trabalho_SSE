// Dashboard Controller - SSE real-time integration & interactive controls

const equipmentsState = new Map();
let filterOnlyInUse = false;
let searchQuery = '';

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

// Connect to Server-Sent Events stream
const evtSource = new EventSource('/api/telemetria/stream');

evtSource.addEventListener('equipamento_update', (event) => {
    const data = JSON.parse(event.data);
    equipmentsState.set(data.equipamentoId, data);
    renderDashboard();
});

evtSource.addEventListener('ocupacao_update', (event) => {
    const data = JSON.parse(event.data);
    updateStatsGrid(data);
});

evtSource.addEventListener('alerta_tempo', (event) => {
    const data = JSON.parse(event.data);
    showToast(`⚠️ Alerta: ${data.equipamentoId} - Excedeu limite de tempo!`);
});

evtSource.onerror = (err) => {
    console.error('SSE Error:', err);
    const statusSpan = document.querySelector('.header-status span');
    if (statusSpan) {
        statusSpan.innerText = 'SSE RECONECTANDO...';
        statusSpan.parentElement.style.color = '#eab308';
    }
};

evtSource.onopen = () => {
    const statusSpan = document.querySelector('.header-status span');
    if (statusSpan) {
        statusSpan.innerText = 'STREAM SSE CONECTADO';
        statusSpan.parentElement.style.color = '#4ade80';
    }
};

// Update top statistics summary
function updateStatsGrid(occupancyData) {
    const totalEl = document.getElementById('stat-total');
    const inUseEl = document.getElementById('stat-inuse');
    const freeEl = document.getElementById('stat-free');
    const alertEl = document.getElementById('stat-alerts');

    const total = Array.from(equipmentsState.values()).length;
    const inUse = Array.from(equipmentsState.values()).filter(e => e.status === 'EM_USO').length;
    const free = Array.from(equipmentsState.values()).filter(e => e.status === 'LIVRE').length;
    const alerts = Array.from(equipmentsState.values()).filter(e => e.alertaTempoExcedido).length;

    if (totalEl) totalEl.innerText = `${total} Equipamentos`;
    if (inUseEl) inUseEl.innerText = `${inUse} Ativas (${occupancyData.taxaOcupacao || 0}%)`;
    if (freeEl) freeEl.innerText = `${free} Disponíveis`;
    if (alertEl) alertEl.innerText = `${alerts} Excedidos [!]`;
}

// Render equipments dynamically based on sector and filters
function renderDashboard() {
    const cardioGrid = document.getElementById('cardio-grid');
    const musculacaoList = document.getElementById('musculacao-grid');

    if (!cardioGrid || !musculacaoList) return;

    let items = Array.from(equipmentsState.values());

    // Apply "Apenas em uso" filter
    if (filterOnlyInUse) {
        items = items.filter(e => e.status === 'EM_USO');
    }

    // Apply search filter (equipment name, ID, student user name, sector)
    if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        items = items.filter(e => 
            (e.nome && e.nome.toLowerCase().includes(query)) ||
            (e.equipamentoId && e.equipamentoId.toLowerCase().includes(query)) ||
            (e.usuario && e.usuario.toLowerCase().includes(query)) ||
            (e.setor && e.setor.toLowerCase().includes(query))
        );
    }

    // Cardio & Spinning sector
    const cardioItems = items.filter(e => e.setor === 'CARDIO' || e.setor === 'SPINNING');
    cardioGrid.innerHTML = cardioItems.length === 0 ? '<p style="color:#888; grid-column: 1/-1;">Nenhum equipamento encontrado com esse filtro.</p>' : '';
    cardioItems.forEach(eq => {
        cardioGrid.appendChild(createEquipmentCard(eq));
    });

    // Musculação sector
    const musculacaoItems = items.filter(e => e.setor === 'MUSCULACAO');
    musculacaoList.innerHTML = musculacaoItems.length === 0 ? '<p style="color:#888;">Nenhum equipamento encontrado com esse filtro.</p>' : '';
    musculacaoItems.forEach(eq => {
        musculacaoList.appendChild(createStrengthItem(eq));
    });

    // Also update stats if needed
    updateStatsGrid({});
}

function createEquipmentCard(eq) {
    const card = document.createElement('div');
    
    let statusClass = 'status-free';
    let statusLabel = '[LIVRE] — 0 min';

    if (eq.status === 'EM_USO') {
        if (eq.alertaTempoExcedido) {
            statusClass = 'status-warning';
            statusLabel = `${eq.tempoMinutos} min (EXCEDIDO [!])`;
        } else {
            statusClass = 'status-in-use';
            statusLabel = `[EM USO] — ${eq.tempoMinutos} min`;
        }
    } else if (eq.status === 'MANUTENCAO') {
        statusClass = 'status-maintenance';
        statusLabel = '[MANUTENÇÃO]';
    }

    card.className = `equipment-card ${statusClass}`;
    
    const userDisplay = eq.usuario ? `<span class="user-info"><i class="fa-solid fa-user"></i> Aluno: <strong>${eq.usuario}</strong></span>` : '';
    
    card.innerHTML = `
        <div class="card-header">
            <h3>${eq.nome} <small>(${eq.equipamentoId})</small></h3>
        </div>
        <div class="card-body">
            <span class="status-text">${statusLabel}</span>
            ${userDisplay}
        </div>
        <div class="card-actions" style="display:flex; gap: 6px; flex-wrap: wrap; margin-top:8px;">
            <button class="btn-telemetry" onclick="openTelemetry('${eq.equipamentoId}')">
                <i class="fa-solid fa-gauge-high"></i> Ver Telemetria
            </button>
            ${eq.status === 'LIVRE' ? `
                <button class="btn-action-start" onclick="iniciarSessao('${eq.equipamentoId}')">
                    <i class="fa-solid fa-play"></i> Iniciar
                </button>
            ` : ''}
            ${eq.status === 'EM_USO' ? `
                <button class="btn-action-finish" onclick="finalizarSessao('${eq.equipamentoId}')">
                    <i class="fa-solid fa-stop"></i> Finalizar
                </button>
            ` : ''}
        </div>
    `;

    return card;
}

function createStrengthItem(eq) {
    const item = document.createElement('div');
    item.className = 'list-item';

    let statusText = '';
    let statusColorClass = 'text-green';

    if (eq.status === 'EM_USO') {
        statusColorClass = eq.alertaTempoExcedido ? 'text-yellow' : 'text-red';
        const userText = eq.usuario ? ` (${eq.usuario})` : '';
        statusText = `Em uso (${eq.tempoMinutos} min)${userText}`;
    } else if (eq.status === 'LIVRE') {
        statusText = 'Livre';
        statusColorClass = 'text-green';
    } else {
        statusText = 'Manutenção';
        statusColorClass = 'text-muted';
    }

    item.innerHTML = `
        <div>
            <span class="item-name">• ${eq.nome}:</span>
            <span class="item-status ${statusColorClass}">${statusText}</span>
        </div>
        <div style="display:flex; gap:6px;">
            <button class="btn-telemetry" style="padding:4px 8px; font-size:0.75rem;" onclick="openTelemetry('${eq.equipamentoId}')">
                Telemetria
            </button>
            ${eq.status === 'LIVRE' ? `
                <button class="btn-action-start" style="padding:4px 8px; font-size:0.75rem;" onclick="iniciarSessao('${eq.equipamentoId}')">Iniciar</button>
            ` : ''}
            ${eq.status === 'EM_USO' ? `
                <button class="btn-action-finish" style="padding:4px 8px; font-size:0.75rem;" onclick="finalizarSessao('${eq.equipamentoId}')">Finalizar</button>
            ` : ''}
        </div>
    `;

    return item;
}

// Navigation to telemetry screen
window.openTelemetry = function(id) {
    window.location.href = `../tela_telemetria/telemetria.html?id=${encodeURIComponent(id)}`;
};

// API actions
window.iniciarSessao = async function(id) {
    const aluno = prompt('Digite o nome do aluno para iniciar o treino:', 'Maria Santos');
    if (!aluno) return;

    try {
        const res = await fetch(`/api/equipamentos/${id}/iniciar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alunoId: aluno })
        });
        const data = await res.json();
        if (data.sucesso) {
            showToast(`✅ Treino iniciado em ${id} para ${aluno}!`);
        } else {
            showToast(`❌ Erro: ${data.erro}`);
        }
    } catch (err) {
        showToast(`❌ Erro na comunicação com servidor.`);
    }
};

window.finalizarSessao = async function(id) {
    try {
        const res = await fetch(`/api/equipamentos/${id}/finalizar`, { method: 'POST' });
        const data = await res.json();
        if (data.sucesso) {
            showToast(`⏹️ Treino em ${id} finalizado. Equipamento livre!`);
        }
    } catch (err) {
        showToast(`❌ Erro na comunicação com servidor.`);
    }
};

// Controls initialization
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('.search-bar input');
    const filterBtn = document.querySelector('.btn-filter');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderDashboard();
        });
    }

    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            filterOnlyInUse = !filterOnlyInUse;
            filterBtn.classList.toggle('active', filterOnlyInUse);
            renderDashboard();
        });
    }
});
