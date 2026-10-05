// Script para futuras integrações (SSE - Server-Sent Events)
console.log("Dashboard Inicializado");

// Aqui você poderá adicionar a lógica para conectar no feed SSE GET /api/telemetria/stream
// e atualizar os cards dinamicamente conforme descrito na User Story US-01.

document.querySelector('.btn-filter').addEventListener('click', () => {
    alert('Filtro "Apenas em Uso" clicado! Implemente a lógica para ocultar as máquinas livres.');
});

document.querySelectorAll('.btn-telemetry').forEach(btn => {
    btn.addEventListener('click', () => {
        alert('Botão "Ver Telemetria" clicado! Navegar para Tela 2 (Telemetria de Equipamento Individual).');
    });
});
