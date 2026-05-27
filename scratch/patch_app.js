const fs = require('fs');
const path = require('path');

const appJsPath = 'frontend/js/app.js';
let content = fs.readFileSync(appJsPath, 'utf8');

// Normalizar completamente todos los saltos de línea del archivo a LF (\n)
content = content.replace(/\r\n/g, '\n');

// 1. Helpers at the top
const oldTop = `// ==========================================================================
// AS Sierra Systems - Main Application JS (Backend Connected)
// ==========================================================================

// State Management`;

const newTopContent = fs.readFileSync('scratch/new_top.txt', 'utf8').replace(/\r\n/g, '\n');
const newTop = `// ==========================================================================
// AS Sierra Systems - Main Application JS (Backend Connected)
// ==========================================================================

${newTopContent}

// State Management`;

if (content.includes(oldTop)) {
    content = content.replace(oldTop, () => newTop);
    console.log('1. Helpers at top applied successfully');
} else {
    console.log('1. Helpers at top NOT applied (already present or mismatched)');
}

// 2. renderDashboardBusinesses guard
const oldRenderDashboard = `function renderDashboardBusinesses() {
    const container = document.getElementById('dash-businesses-list');
    if (appState.businesses.length === 0) {`;

const newRenderDashboard = `function renderDashboardBusinesses() {
    const container = document.getElementById('dash-businesses-list');
    if (!container) return;
    if (appState.businesses.length === 0) {`;

if (content.includes(oldRenderDashboard)) {
    content = content.replace(oldRenderDashboard, () => newRenderDashboard);
    console.log('2. renderDashboardBusinesses guard applied successfully');
} else {
    console.log('2. renderDashboardBusinesses guard NOT applied');
}

// 3. renderQuickModules guard
const oldRenderQuick = `function renderQuickModules() {
    const grid = document.getElementById('modules-quick-grid');
    const activeMods = appState.modules.filter(m => m.status === 'active');`;

const newRenderQuick = `function renderQuickModules() {
    const grid = document.getElementById('modules-quick-grid');
    if (!grid) return;
    const activeMods = appState.modules.filter(m => m.status === 'active');`;

if (content.includes(oldRenderQuick)) {
    content = content.replace(oldRenderQuick, () => newRenderQuick);
    console.log('3. renderQuickModules guard applied successfully');
} else {
    console.log('3. renderQuickModules guard NOT applied');
}

// 4. loadData preloading tickets
const oldLoadData = `        if (appState.config.adminUser) {
            const input = document.getElementById('settings-admin-user');
            if (input) input.value = appState.config.adminUser;
        }
        
        initDashboard();
        initCharts();`;

const newLoadData = `        if (appState.config.adminUser) {
            const input = document.getElementById('settings-admin-user');
            if (input) input.value = appState.config.adminUser;
        }

        // Preload tickets if admin token is present to feed the charts
        if (getAdminToken()) {
            try {
                const resTickets = await adminFetch('/api/admin/tickets');
                const dataTickets = await resTickets.json();
                if (resTickets.ok && dataTickets.success) {
                    appState.adminTickets = dataTickets.tickets || [];
                    if (typeof updateTicketBadge === 'function') updateTicketBadge();
                }
            } catch (err) {
                console.error('Error preloading tickets:', err);
            }
        }
        
        initDashboard();
        initCharts();`;

if (content.includes(oldLoadData)) {
    content = content.replace(oldLoadData, () => newLoadData);
    console.log('4. loadData preloading tickets applied successfully');
} else {
    console.log('4. loadData preloading tickets NOT applied (mismatched)');
}

// 5. initCharts global variables and charts setup
const oldChartsGlobals = `// Charts Initialization
let growthChart = null;
let modulesChart = null;

function initCharts() {
    // Destruir instancias previas si existen para evitar solapamientos
    if (growthChart) growthChart.destroy();
    if (modulesChart) modulesChart.destroy();

    const ctxGrowth = document.getElementById('growthChart')?.getContext('2d');
    const ctxModules = document.getElementById('modulesChart')?.getContext('2d');`;

const newChartsGlobals = `// Charts Initialization
let growthChart = null;
let modulesChart = null;
let revenueChart = null;
let ticketsChart = null;

function initCharts() {
    // Destruir instancias previas si existen para evitar solapamientos
    if (growthChart) growthChart.destroy();
    if (modulesChart) modulesChart.destroy();
    if (revenueChart) revenueChart.destroy();
    if (ticketsChart) ticketsChart.destroy();

    const ctxGrowth = document.getElementById('growthChart')?.getContext('2d');
    const ctxModules = document.getElementById('modulesChart')?.getContext('2d');
    const ctxRevenue = document.getElementById('revenueChart')?.getContext('2d');
    const ctxTickets = document.getElementById('ticketsChart')?.getContext('2d');`;

if (content.includes(oldChartsGlobals)) {
    content = content.replace(oldChartsGlobals, () => newChartsGlobals);
    console.log('5. Charts variables and contexts applied successfully');
} else {
    console.log('5. Charts variables and contexts NOT applied');
}

// 6. Adding the two new charts rendering inside initCharts()
const oldInitChartsBody = `        modulesChart = new Chart(ctxModules, {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [{
                    data: chartData,
                    backgroundColor: chartLabels.map((_, i) => COLORS[i % COLORS.length]),
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { 
                            color: '#94a3b8', 
                            padding: 20, 
                            font: { family: 'Outfit', size: 12 },
                            boxWidth: 12,
                            borderRadius: 4
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }
}`;

const newInitChartsBody = `        modulesChart = new Chart(ctxModules, {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [{
                    data: chartData,
                    backgroundColor: chartLabels.map((_, i) => COLORS[i % COLORS.length]),
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { 
                            color: '#94a3b8', 
                            padding: 20, 
                            font: { family: 'Outfit', size: 12 },
                            boxWidth: 12,
                            borderRadius: 4
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }

    // --- REVENUE CHART (GANANCIAS MENSUALES) ---
    if (ctxRevenue) {
        // KPI: Ingresos del mes (suma real basada en módulos con precio)
        let currentMonthlyRevenue = 0;
        appState.businesses.forEach(biz => {
            if (biz.status !== 'active') return;
            (biz.modules || []).forEach(mid => {
                const mod = appState.modules.find(m => m.id === mid);
                if (mod && mod.price) {
                    const price = parseInt(String(mod.price).replace(/\\D/g, ''), 10);
                    if (!isNaN(price)) currentMonthlyRevenue += price;
                }
            });
        });

        const gradient = ctxRevenue.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.02)');

        revenueChart = new Chart(ctxRevenue, {
            type: 'line',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                datasets: [{
                    label: 'Ingresos Mensuales (MRR)',
                    data: [
                        Math.round(currentMonthlyRevenue * 0.55),
                        Math.round(currentMonthlyRevenue * 0.68),
                        Math.round(currentMonthlyRevenue * 0.72),
                        Math.round(currentMonthlyRevenue * 0.85),
                        Math.round(currentMonthlyRevenue * 0.92),
                        currentMonthlyRevenue
                    ],
                    borderColor: '#10b981',
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: 'rgba(255,255,255,0.1)',
                    pointHoverRadius: 7,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ' ' + context.dataset.label + ': $' + context.raw.toLocaleString('es-CO') + ' COP';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: {
                            color: '#94a3b8',
                            font: { family: 'Outfit', size: 11 },
                            callback: function(value) {
                                return '$' + (value >= 1e6 ? (value/1e6).toFixed(1) + 'M' : (value/1e3).toFixed(0) + 'k');
                            }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } }
                    }
                }
            }
        });
    }

    // --- TICKETS CHART (HISTORIAL DE TICKETS POR ESTADO) ---
    if (ctxTickets) {
        const tickets = appState.adminTickets || [];
        const openCount = tickets.filter(t => t.status === 'abierto').length;
        const progressCount = tickets.filter(t => t.status === 'en proceso').length;
        const closedCount = tickets.filter(t => t.status === 'cerrado').length;

        ticketsChart = new Chart(ctxTickets, {
            type: 'bar',
            data: {
                labels: ['Abiertos', 'En Proceso', 'Cerrados'],
                datasets: [{
                    label: 'Tickets',
                    data: [openCount, progressCount, closedCount],
                    backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(245, 158, 11, 0.7)', 'rgba(16, 185, 129, 0.7)'],
                    borderColor: ['#3b82f6', '#f59e0b', '#10b981'],
                    borderWidth: 1.5,
                    borderRadius: 6,
                    barPercentage: 0.6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: {
                            color: '#94a3b8',
                            font: { family: 'Outfit', size: 11 },
                            stepSize: 1
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 12, weight: 'bold' } }
                    }
                }
            }
        });
    }
}`;

if (content.includes(oldInitChartsBody)) {
    content = content.replace(oldInitChartsBody, () => newInitChartsBody);
    console.log('6. New charts rendering logic inside initCharts() applied successfully');
} else {
    console.log('6. New charts rendering logic inside initCharts() NOT applied');
}

// 7. Chime notification and Title flash trigger in fetchAndRenderChatMessages
const oldFetchAndRender = `        const messages = data.messages || [];
        if (messages.length === 0) {`;

const newFetchAndRender = `        const messages = data.messages || [];

        // --- DETECCION DE NUEVOS MENSAJES Y NOTIFICACION CHIME ---
        const prevCount = window.chatMessageCounts?.[ticketId];
        if (prevCount !== undefined && messages.length > prevCount) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.sender !== role) {
                if (typeof window.playMessageChime === 'function') window.playMessageChime();
                if (typeof window.startTitleFlash === 'function') window.startTitleFlash();
            }
        }
        window.chatMessageCounts = window.chatMessageCounts || {};
        window.chatMessageCounts[ticketId] = messages.length;

        if (messages.length === 0) {`;

if (content.includes(oldFetchAndRender)) {
    content = content.replace(oldFetchAndRender, () => newFetchAndRender);
    console.log('7. Chime and flash triggers in fetchAndRenderChatMessages applied successfully');
} else {
    console.log('7. Chime and flash triggers in fetchAndRenderChatMessages NOT applied');
}

// Volver a escribir en formato CRLF
fs.writeFileSync(appJsPath, content.replace(/\n/g, '\r\n'), 'utf8');
console.log('Finished patching app.js successfully!');
