const fs = require('fs');
const path = require('path');

const appJsPath = 'frontend/js/app.js';
let appContent = fs.readFileSync(appJsPath, 'utf8');

// 1. Update SSE handler
const oldSse = `        const evtSource = new EventSource('/api/stream');
        evtSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'update') {
                    console.log('Update received via SSE, reloading data...');
                    loadData();
                }
            } catch (err) {
                console.error('SSE Error:', err);
            }
        };`;

const newSse = `        const evtSource = new EventSource('/api/stream');
        evtSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'update') {
                    console.log('Update received via SSE, reloading data...');
                    loadData();
                    if (typeof loadAdminTickets === 'function') {
                        loadAdminTickets();
                    }
                    if (window.activeChatTicketId) {
                        fetchAndRenderChatMessages(window.activeChatTicketId, 'admin');
                    }
                }
            } catch (err) {
                console.error('SSE Error:', err);
            }
        };`;

if (appContent.includes(oldSse)) {
    appContent = appContent.replace(oldSse, newSse);
    console.log('Successfully updated SSE handler in app.js');
} else {
    // If exact spacing is different, try regex or locate eventSource
    const sseRegex = /const\s+evtSource\s*=\s*new\s+EventSource\('\/api\/stream'\);[\s\S]+?loadData\(\);\s*\}\s*\}\s*catch\s*\(err\)\s*\{\s*console\.error\('SSE Error:',\s*err\);\s*\}\s*\};/g;
    if (sseRegex.test(appContent)) {
        appContent = appContent.replace(sseRegex, `const evtSource = new EventSource('/api/stream');
        evtSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'update') {
                    console.log('Update received via SSE, reloading data...');
                    loadData();
                    if (typeof loadAdminTickets === 'function') {
                        loadAdminTickets();
                    }
                    if (window.activeChatTicketId) {
                        fetchAndRenderChatMessages(window.activeChatTicketId, 'admin');
                    }
                }
            } catch (err) {
                console.error('SSE Error:', err);
            }
        };`);
        console.log('Successfully updated SSE handler via regex in app.js');
    } else {
        console.log('Warning: SSE handler match not found. Please review.');
    }
}

// 2. Update navigation tab listener
const oldTab = `            if (target === 'tab-billing') renderBillingData();`;
const newTab = `            if (target === 'tab-billing') renderBillingData();
            if (target === 'tab-tickets') loadAdminTickets();`;

if (appContent.includes(oldTab)) {
    appContent = appContent.replace(oldTab, newTab);
    console.log('Successfully updated navigation tabs click listener in app.js');
} else {
    console.log('Warning: Tab trigger match not found.');
}

// 2.5. Update adminFetch function to allow FormData uploads
const oldAdminFetch = `async function adminFetch(url, options = {}) {
    options.headers = { ...getAdminHeaders(), ...(options.headers || {}) };
    let resp = await fetch(url, options);`;

const newAdminFetch = `async function adminFetch(url, options = {}) {
    const headers = { ...getAdminHeaders(), ...(options.headers || {}) };
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }
    options.headers = headers;
    let resp = await fetch(url, options);`;

const oldAdminFetchNormalized = oldAdminFetch.replace(/\r?\n/g, '\r\n');
const oldAdminFetchLF = oldAdminFetch.replace(/\r?\n/g, '\n');

if (appContent.includes(oldAdminFetch)) {
    appContent = appContent.replace(oldAdminFetch, newAdminFetch);
    console.log('Successfully updated adminFetch function in app.js');
} else if (appContent.includes(oldAdminFetchNormalized)) {
    appContent = appContent.replace(oldAdminFetchNormalized, newAdminFetch.replace(/\r?\n/g, '\r\n'));
    console.log('Successfully updated adminFetch function (CRLF) in app.js');
} else if (appContent.includes(oldAdminFetchLF)) {
    appContent = appContent.replace(oldAdminFetchLF, newAdminFetch.replace(/\r?\n/g, '\n'));
    console.log('Successfully updated adminFetch function (LF) in app.js');
} else {
    const fetchRegex = /async\s+function\s+adminFetch\s*\(\s*url\s*,\s*options\s*=\s*\{\s*\}\s*\)\s*\{[\s\S]*?options\.headers\s*=\s*\{\s*\.\.\.getAdminHeaders\(\),\s*\.\.\.\(\s*options\.headers\s*\|\|\s*\{\s*\}\s*\)\s*\}\s*;[\s\S]*?let\s+resp\s*=\s*await\s+fetch\(\s*url\s*,\s*options\s*\)\s*;/g;
    if (fetchRegex.test(appContent)) {
        appContent = appContent.replace(fetchRegex, `async function adminFetch(url, options = {}) {
    const headers = { ...getAdminHeaders(), ...(options.headers || {}) };
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }
    options.headers = headers;
    let resp = await fetch(url, options);`);
        console.log('Successfully updated adminFetch via regex in app.js');
    } else {
        console.log('Warning: adminFetch match not found.');
    }
}

// 3. Append Tickets module
const ticketsModule = `

// ============================================================
// MODULO: GESTION DE TICKETS DE SOPORTE (ADMIN)
// ============================================================
appState.adminTickets = [];
window._currentTicketFilter = 'all';

async function loadAdminTickets() {
    const tbody = document.getElementById('tickets-list');
    if (!tbody) return;
    
    tbody.innerHTML = \`<tr><td colspan="8" style="text-align:center;padding:2.5rem;color:var(--text-muted);">
        <span style="display:inline-block;width:16px;height:16px;border:2px solid var(--text-muted);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;margin-right:8px;"></span>
        Cargando tickets...
    </td></tr>\`;
    
    try {
        const res = await adminFetch('/api/admin/tickets');
        const data = await res.json();
        if (res.ok && data.success) {
            appState.adminTickets = data.tickets || [];
            renderAdminTickets();
            updateTicketBadge();
        } else {
            tbody.innerHTML = \`<tr><td colspan="8" style="text-align:center;padding:2.5rem;color:var(--danger);">Error: \${data.error || 'No se pudieron cargar los tickets'}</td></tr>\`;
        }
    } catch (err) {
        console.error('Error cargando tickets de admin:', err);
        tbody.innerHTML = \`<tr><td colspan="8" style="text-align:center;padding:2.5rem;color:var(--danger);">Error al cargar los tickets. (\${err.message})</td></tr>\`;
    }
}

function updateTicketBadge() {
    const badge = document.getElementById('badge-tickets');
    if (!badge) return;
    const openCount = appState.adminTickets.filter(t => t.status === 'abierto').length;
    if (openCount > 0) {
        badge.textContent = openCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function setTicketFilter(filter) {
    window._currentTicketFilter = filter;
    document.querySelectorAll('#ticket-filters .pill').forEach(p => p.classList.remove('active'));
    const activeBtn = document.querySelector(\`#ticket-filters .pill[onclick="setTicketFilter('\${filter}')"]\`);
    if (activeBtn) activeBtn.classList.add('active');
    renderAdminTickets();
}

const TICKET_STATUS_MAP = {
    abierto:    { label: 'Abierto',     color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: 'info' },
    en_proceso: { label: 'En Proceso',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: 'clock' },
    resuelto:   { label: 'Resuelto',    color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: 'check-circle' },
    cerrado:    { label: 'Cerrado',     color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: 'lock' }
};

const TICKET_PRIORITY_MAP = {
    baja:    { label: 'Baja',         color: '#94a3b8' },
    normal:  { label: 'Normal',       color: '#64748b' },
    urgente: { label: '🔴 Urgente',    color: '#ef4444' }
};

function renderAdminTickets() {
    const tbody = document.getElementById('tickets-list');
    if (!tbody) return;
    
    const search = (document.getElementById('ticket-search')?.value || '').toLowerCase().trim();
    const filter = window._currentTicketFilter || 'all';
    
    let list = appState.adminTickets || [];
    
    // Apply status filter
    if (filter !== 'all') {
        list = list.filter(t => t.status === filter);
    }
    
    // Apply search filter
    if (search) {
        list = list.filter(t => 
            (t.business_name || '').toLowerCase().includes(search) ||
            (t.module || '').toLowerCase().includes(search) ||
            (t.id || '').toLowerCase().includes(search) ||
            (t.description || '').toLowerCase().includes(search)
        );
    }
    
    // Update KPI counters
    const all = appState.adminTickets || [];
    const setKPI = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    setKPI('ticket-kpi-open',        all.filter(t => t.status === 'abierto').length);
    setKPI('ticket-kpi-in-progress', all.filter(t => t.status === 'en_proceso').length);
    setKPI('ticket-kpi-resolved',    all.filter(t => t.status === 'resuelto').length);
    setKPI('ticket-kpi-closed',      all.filter(t => t.status === 'cerrado').length);
    
    if (list.length === 0) {
        tbody.innerHTML = \`<tr><td colspan="8" style="text-align:center;padding:2.5rem;color:var(--text-muted);">No se encontraron tickets.</td></tr>\`;
        return;
    }
    
    tbody.innerHTML = list.map(t => {
        const st = TICKET_STATUS_MAP[t.status] || TICKET_STATUS_MAP['abierto'];
        const pr = TICKET_PRIORITY_MAP[t.priority] || TICKET_PRIORITY_MAP['normal'];
        
        let dateStr = '—';
        if (t.created_at) {
            const d = new Date(t.created_at);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            dateStr = \`\${day}/\${month}/\${year}\`;
        }
        
        const desc = t.description ? (t.description.length > 40 ? t.description.substring(0, 40) + '…' : t.description) : '—';
        return \`
            <tr>
                <td style="padding:1rem 1.5rem;">
                    <a href="javascript:void(0)" onclick="viewTicketDetails('\${t.id}')" style="font-size:0.78rem; font-weight:800; color:var(--primary); font-family:monospace; text-decoration:none; border-bottom:1px dashed var(--primary-alpha); padding-bottom:1px;" title="Ver detalles del ticket">
                        #\${String(t.id || '').substring(0, 8).toUpperCase()}
                    </a>
                </td>
                <td style="padding:1rem 1.5rem; font-weight:600; color:var(--text-main);">\${t.business_name || '—'}</td>
                <td style="padding:1rem 1.5rem; color:var(--text-muted);">\${t.module || '—'}</td>
                <td style="padding:1rem 1.5rem;">
                    <span style="font-size:0.78rem; font-weight:700; padding:3px 10px; border-radius:20px; background:\${pr.color}18; color:\${pr.color}; white-space:nowrap;">
                        \${pr.label}
                    </span>
                </td>
                <td style="padding:1rem 1.5rem; font-size:0.85rem; color:var(--text-muted); max-width:220px;" title="\${(t.description || '').replace(/"/g, '&quot;')}">\${desc}</td>
                <td style="padding:1rem 1.5rem; text-align:center;">
                    <span style="display:inline-flex; align-items:center; gap:5px; font-size:0.8rem; font-weight:700; padding:4px 12px; border-radius:20px; background:\${st.bg}; color:\${st.color}; white-space:nowrap;">
                        <i data-lucide="\${st.icon}" style="width:12px;height:12px;"></i> \${st.label}
                    </span>
                </td>
                <td style="padding:1rem 1.5rem; font-size:0.82rem; color:var(--text-muted);">\${dateStr}</td>
                <td style="padding:1rem 1.5rem; text-align:center;">
                    <button class="btn-ghost" style="padding:0.35rem 0.85rem; font-size:0.8rem; border:1px solid var(--border-color); border-radius:8px; cursor:pointer;"
                        onclick="updateTicketStatus('\${t.id}', '\${t.status}')">
                        <i data-lucide="edit-3" style="width:13px;"></i> Estado
                    </button>
                </td>
            </tr>\`;
    }).join('');
    lucide.createIcons();
}

async function updateTicketStatus(ticketId, currentStatus) {
    const { value: newStatus } = await Swal.fire({
        title: 'Actualizar Estado del Ticket',
        html: \`
            <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1.2rem;">
                Selecciona el nuevo estado para el ticket <b style="font-family:monospace;">#\${String(ticketId).substring(0,8).toUpperCase()}</b>.
            </p>
            <div style="display:flex;flex-direction:column;gap:0.6rem;">
                \${Object.entries(TICKET_STATUS_MAP).map(([key, val]) => \`
                    <label style="display:flex;align-items:center;gap:12px;padding:0.8rem 1rem;border-radius:10px;border:2px solid \${key === currentStatus ? val.color : 'var(--border-color)'};cursor:pointer;background:\${key === currentStatus ? val.bg : 'var(--bg-surface-light)'};transition:all .2s;">
                        <input type="radio" name="ticket-status-pick" value="\${key}" \${key === currentStatus ? 'checked' : ''} style="accent-color:\${val.color};">
                        <span style="font-weight:700;color:\${val.color};">\${val.label}</span>
                    </label>
                \`).join('')}
            </div>\`,
        background: 'var(--bg-surface)',
        color: 'var(--text-main)',
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: 'var(--primary)',
        preConfirm: () => {
            const selected = document.querySelector('input[name="ticket-status-pick"]:checked');
            if (!selected) { Swal.showValidationMessage('Selecciona un estado'); return false; }
            return selected.value;
        }
    });

    if (!newStatus || newStatus === currentStatus) return;

    try {
        const res = await adminFetch(\`/api/admin/tickets/\${ticketId}/status\`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            const ticket = appState.adminTickets.find(t => t.id === ticketId);
            if (ticket) ticket.status = newStatus;
            renderAdminTickets();
            updateTicketBadge();
            showToast(\`Ticket actualizado a: \${TICKET_STATUS_MAP[newStatus]?.label || newStatus}\`, 'success');
        } else {
            showToast(data.error || 'Error al actualizar el ticket', 'error');
        }
    } catch (err) {
        console.error('Error actualizando ticket:', err);
        showToast('Error de conexión', 'error');
    }
}

window.viewTicketDetails = function(ticketId) {
    const ticket = appState.adminTickets.find(t => t.id === ticketId);
    if (!ticket) return;

    window.activeChatTicketId = ticketId;

    const st = TICKET_STATUS_MAP[ticket.status] || TICKET_STATUS_MAP['abierto'];
    const pr = TICKET_PRIORITY_MAP[ticket.priority] || TICKET_PRIORITY_MAP['normal'];
    const d = ticket.created_at ? new Date(ticket.created_at) : null;
    
    // FORMAT DATE WITH / TO PREVENT WRAPPING ON WINDOWS
    let fullDate = '—';
    if (d) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const timeStr = \`\${String(hours).padStart(2, '0')}:\${minutes} \${ampm}\`;
        fullDate = \`\${day}/\${month}/\${year} \${timeStr}\`;
    }

    Swal.fire({
        title: '',
        html: \`
            <div style="font-family:'Outfit',sans-serif; color:var(--text-main);">

                <!-- Header pill -->
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,var(--primary),#818cf8);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">
                            <i data-lucide="ticket" style="width:18px;height:18px;color:white;"></i>
                        </div>
                        <div style="text-align:left;">
                            <div style="font-size:0.65rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Ticket de Soporte</div>
                            <div style="font-family:monospace;font-size:0.95rem;font-weight:900;color:var(--primary);">#\${ticket.id.toUpperCase()}</div>
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <span style="font-size:0.68rem;font-weight:700;padding:3px 9px;border-radius:20px;background:\${pr.color}18;color:\${pr.color};border:1px solid \${pr.color}33;white-space:nowrap;">\${pr.label}</span>
                        <span style="font-size:0.68rem;font-weight:700;padding:3px 9px;border-radius:20px;background:\${st.bg};color:\${st.color};border:1px solid \${st.color}33;white-space:nowrap;">\${st.label}</span>
                    </div>
                </div>

                <!-- Meta chips row -->
                <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
                    <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:10px;padding:8px 12px;text-align:left;">
                        <div style="font-size:0.6rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:2px;">Negocio</div>
                        <div style="font-weight:700;font-size:0.84rem;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">\${ticket.business_name || '—'}</div>
                    </div>
                    <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:10px;padding:8px 12px;text-align:left;">
                        <div style="font-size:0.6rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:2px;">Módulo</div>
                        <div style="font-weight:700;font-size:0.84rem;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">\${ticket.module || '—'}</div>
                    </div>
                    <div style="flex:1;min-width:100px;background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:10px;padding:8px 12px;text-align:left;">
                        <div style="font-size:0.6rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:2px;">Creado</div>
                        <div style="font-weight:600;font-size:0.78rem;color:var(--text-main);">\${fullDate}</div>
                    </div>
                </div>

                <!-- Chat area -->
                <div style="border:1px solid var(--border-color);border-radius:14px;overflow:hidden;background:rgba(0,0,0,0.18);">
                    <!-- Chat header bar -->
                    <div style="padding:8px 14px;background:rgba(255,255,255,0.03);border-bottom:1px solid var(--border-color);display:flex;align-items:center;gap:8px;">
                        <div style="width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 6px #10b981;"></div>
                        <span style="font-size:0.73rem;font-weight:600;color:var(--text-muted);">Conversación del Ticket</span>
                    </div>
                    <!-- Messages -->
                    <div id="ticket-chat-container" style="height:320px;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:6px;scroll-behavior:smooth;">
                        <div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:30px 0;color:var(--text-muted);font-size:0.82rem;">
                            <span style="display:inline-block;width:16px;height:16px;border:2px solid var(--text-muted);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></span>
                            Cargando conversación...
                        </div>
                    </div>
                    <!-- Input area -->
                    \${ticket.status === 'cerrado' ? \`
                        <div style="padding:10px 14px;background:rgba(239,68,68,0.06);border-top:1px solid rgba(239,68,68,0.2);color:#ef4444;display:flex;align-items:center;gap:8px;font-size:0.78rem;font-weight:700;justify-content:center;">
                            <i data-lucide="lock" style="width:12px;height:12px;"></i>
                            Ticket cerrado — abre uno nuevo para continuar
                        </div>
                    \` : \`
                        <div style="padding:10px 12px;background:rgba(255,255,255,0.02);border-top:1px solid var(--border-color);display:flex;align-items:center;gap:8px;">
                            <input type="file" id="chat-image-input" accept="image/*" style="display:none;" onchange="handleTicketImageUpload('\${ticket.id}','admin')" />
                            <button onclick="document.getElementById('chat-image-input').click()" title="Enviar imagen" style="width:34px;height:34px;border-radius:8px;border:1px solid var(--border-color);background:rgba(255,255,255,0.04);color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s;" onmouseover="this.style.background='rgba(99,102,241,0.15)';this.style.color='var(--primary)'" onmouseout="this.style.background='rgba(255,255,255,0.04)';this.style.color='var(--text-muted)'">
                                <i data-lucide="image" style="width:15px;height:15px;"></i>
                            </button>
                            <input type="text" id="chat-message-input" placeholder="Escribe un mensaje..." style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid var(--border-color);background:rgba(255,255,255,0.05);color:var(--text-main);font-size:0.85rem;outline:none;font-family:'Outfit',sans-serif;" />
                            <button id="chat-send-btn" onclick="sendTicketMessage('\${ticket.id}','admin')" style="width:34px;height:34px;border-radius:8px;border:none;background:linear-gradient(135deg,var(--primary),#818cf8);color:white;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity 0.15s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                                <i data-lucide="send" style="width:14px;height:14px;"></i>
                            </button>
                        </div>
                    \`}
                </div>

            </div>
        \`,
        background: 'var(--bg-surface)',
        color: 'var(--text-main)',
        width: '680px',
        padding: '1.5rem',
        showConfirmButton: true,
        confirmButtonText: 'Cerrar',
        confirmButtonColor: 'var(--primary)',
        didOpen: () => {
            lucide.createIcons();
            fetchAndRenderChatMessages(ticketId, 'admin');

            const input = document.getElementById('chat-message-input');
            if (input) {
                input.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        sendTicketMessage(ticketId, 'admin');
                    }
                });
                setTimeout(() => input.focus(), 100);
            }
        },
        willClose: () => {
            window.activeChatTicketId = null;
        }
    });
};

window.fetchAndRenderChatMessages = async function(ticketId, role) {
    const container = document.getElementById('ticket-chat-container');
    if (!container) return;

    try {
        const fetchUrl = \`/api/tickets/\${ticketId}/messages\`;
        const res = await (role === 'admin' ? adminFetch(fetchUrl) : clientFetch(fetchUrl));
        if (!res.ok) throw new Error('Error al obtener mensajes');
        
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Error al obtener mensajes');

        const messages = data.messages || [];
        if (messages.length === 0) {
            container.innerHTML = \`
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:0.82rem;gap:8px;padding:20px;">
                    <span style="font-size:2rem;">💬</span>
                    <span>Aún no hay mensajes en este chat.</span>
                </div>
            \`;
            return;
        }

        let lastSender = null;
        container.innerHTML = messages.map((msg, idx) => {
            const isMe = (role === 'admin' && msg.sender === 'admin') || (role === 'client' && msg.sender === 'client');
            const sameAsPrev = lastSender === msg.sender;
            lastSender = msg.sender;

            const d = new Date(msg.created_at);
            const timeStr = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
            const dateStr = \`\${String(d.getDate()).padStart(2,'0')}/\${String(d.getMonth()+1).padStart(2,'0')}\`;

            const prevMsg = messages[idx - 1];
            let dateSeparator = '';
            const fullDateStr = \`\${String(d.getDate()).padStart(2,'0')}/\${String(d.getMonth()+1).padStart(2,'0')}/\${d.getFullYear()}\`;
            if (idx === 0) {
                dateSeparator = \`<div style="text-align:center;margin:6px 0 10px;"><span style="font-size:0.65rem;font-weight:700;color:var(--text-muted);background:rgba(0,0,0,0.3);padding:3px 10px;border-radius:20px;">\${fullDateStr}</span></div>\`;
            } else {
                const prevDate = new Date(prevMsg.created_at);
                if (prevDate.toDateString() !== d.toDateString()) {
                    dateSeparator = \`<div style="text-align:center;margin:8px 0 10px;"><span style="font-size:0.65rem;font-weight:700;color:var(--text-muted);background:rgba(0,0,0,0.3);padding:3px 10px;border-radius:20px;">\${fullDateStr}</span></div>\`;
                }
            }

            const nameRow = (!sameAsPrev || dateSeparator) ? \`
                <span style="font-size:0.63rem;font-weight:700;color:\${isMe ? 'rgba(129,140,248,0.9)' : 'var(--text-muted)'};\${isMe ? 'text-align:right;' : ''}display:block;margin-bottom:2px;padding:0 4px;">\${isMe ? 'Tú' : msg.sender_name}</span>
            \` : '';

            const contentHtml = msg.image_url
                ? \`<img src="\${msg.image_url}" alt="imagen" onclick="openChatImageLightbox('\${msg.image_url}')" style="max-width:200px;max-height:200px;border-radius:8px;cursor:zoom-in;object-fit:cover;display:block;" />\`
                : \`<span style="white-space:pre-wrap;word-break:break-word;">\${msg.message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>\`;

            const bubbleStyle = isMe
                ? \`background:linear-gradient(135deg,rgba(99,102,241,0.28),rgba(129,140,248,0.18));border:1px solid rgba(99,102,241,0.35);border-radius:14px 14px 4px 14px;\`
                : \`background:rgba(255,255,255,0.06);border:1px solid var(--border-color);border-radius:14px 14px 14px 4px;\`;

            return \`
                \${dateSeparator}
                <div style="display:flex;flex-direction:column;align-items:\${isMe ? 'flex-end' : 'flex-start'};">
                    \${nameRow}
                    <div style="max-width:75%;\${bubbleStyle}padding:8px 12px;font-size:0.85rem;line-height:1.4;color:var(--text-main);position:relative;">
                        \${contentHtml}
                        <span style="display:block;text-align:right;font-size:0.58rem;color:\${isMe ? 'rgba(199,210,254,0.6)' : 'var(--text-muted)'};margin-top:4px;margin-bottom:-2px;">\${timeStr}</span>
                    </div>
                </div>
            \`;
        }).join('');

        container.scrollTop = container.scrollHeight;
    } catch (err) {
        console.error('Error cargando chat:', err);
        container.innerHTML = \`
            <div style="text-align:center;color:#ef4444;font-size:0.82rem;padding:20px 10px;">
                Error al cargar la conversación.
            </div>
        \`;
    }
};

window.sendTicketMessage = async function(ticketId, role) {
    const input = document.getElementById('chat-message-input');
    const sendBtn = document.getElementById('chat-send-btn');
    if (!input || !input.value.trim()) return;

    const message = input.value.trim();
    input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    try {
        const fetchUrl = \`/api/tickets/\${ticketId}/messages\`;
        const res = await (role === 'admin' ? adminFetch(fetchUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        }) : clientFetch(fetchUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        }));

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Error al enviar el mensaje');
        }

        input.value = '';
        await fetchAndRenderChatMessages(ticketId, role);
    } catch (err) {
        console.error('Error al enviar mensaje:', err);
        showToast(err.message || 'Error de conexión', 'error');
    } finally {
        input.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        input.focus();
    }
};

window.handleTicketImageUpload = async function(ticketId, role) {
    const fileInput = document.getElementById('chat-image-input');
    if (!fileInput || !fileInput.files || !fileInput.files[0]) return;

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('image', file);

    const sendBtn = document.getElementById('chat-send-btn');
    const msgInput = document.getElementById('chat-message-input');
    if (sendBtn) sendBtn.disabled = true;
    if (msgInput) msgInput.disabled = true;

    const container = document.getElementById('ticket-chat-container');
    const uploadingId = 'uploading-indicator-' + Date.now();
    if (container) {
        const el = document.createElement('div');
        el.id = uploadingId;
        el.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:6px;font-size:0.75rem;color:var(--text-muted);';
        el.innerHTML = '<span style="display:inline-block;width:12px;height:12px;border:2px solid var(--text-muted);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></span> Enviando imagen...';
        container.appendChild(el);
        container.scrollTop = container.scrollHeight;
    }

    try {
        const fetchUrl = \`/api/tickets/\${ticketId}/messages/image\`;
        const res = await (role === 'admin' ? adminFetch(fetchUrl, {
            method: 'POST',
            body: formData
        }) : clientFetch(fetchUrl, {
            method: 'POST',
            body: formData
        }));

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Error al subir imagen');
        }

        fileInput.value = '';
        await fetchAndRenderChatMessages(ticketId, role);
    } catch (err) {
        console.error('Error al enviar imagen:', err);
        showToast(err.message || 'Error al enviar imagen', 'error');
    } finally {
        const el = document.getElementById(uploadingId);
        if (el) el.remove();
        if (sendBtn) sendBtn.disabled = false;
        if (msgInput) msgInput.disabled = false;
    }
};

window.openChatImageLightbox = function(src) {
    Swal.fire({
        html: \`<img src="\${src}" style="max-width:100%;max-height:80vh;border-radius:10px;object-fit:contain;" />\`,
        background: 'rgba(0,0,0,0.92)',
        showConfirmButton: false,
        showCloseButton: true,
        width: 'auto',
        padding: '1rem',
    });
};
`;

appContent += ticketsModule;

fs.writeFileSync(appJsPath, appContent, 'utf8');
console.log('Successfully appended Tickets Module to app.js');
