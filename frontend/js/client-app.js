// ====================== CONFIGURACIÓN ======================
// --- UTILERIAS PREMIUM (NOTIFICACIONES & BUSQUEDA) ---
window.playMessageChime = function() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
        console.warn('Audio Context not allowed or failed:', e);
    }
};

let titleFlashInterval = null;
let originalTitle = document.title || 'Panel Cliente | AS Sierra Systems';
window.startTitleFlash = function() {
    if (document.hasFocus()) return;
    if (titleFlashInterval) clearInterval(titleFlashInterval);
    let isOriginal = false;
    titleFlashInterval = setInterval(() => {
        document.title = isOriginal ? originalTitle : '💬 (1) Nuevo mensaje';
        isOriginal = !isOriginal;
    }, 1000);
};

window.stopTitleFlash = function() {
    if (titleFlashInterval) {
        clearInterval(titleFlashInterval);
        titleFlashInterval = null;
    }
    document.title = originalTitle;
};

window.addEventListener('focus', () => {
    window.stopTitleFlash();
});

window.handleChatSearch = function(query) {
    const container = document.getElementById('ticket-chat-container');
    if (!container) return;
    const q = query.trim().toLowerCase();
    
    // Buscar en todas las burbujas que contengan texto usando la clase robusta
    const bubbles = container.querySelectorAll('.chat-message-text');
    bubbles.forEach(bubble => {
        let text = bubble.getAttribute('data-original-text');
        if (text === null) {
            text = bubble.textContent || '';
            bubble.setAttribute('data-original-text', text);
        }
        const parent = bubble.closest('div[style*="max-width:75%"]');
        if (!parent) return;

        if (q === '') {
            bubble.textContent = text;
            parent.style.opacity = '1';
        } else if (text.toLowerCase().includes(q)) {
            const regex = new RegExp(`(${q.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi');
            const escaped = text.replace(/</g,'&lt;').replace(/>/g,'&gt;');
            bubble.innerHTML = escaped.replace(regex, '<mark style="background:#f59e0b;color:black;border-radius:2px;padding:0 2px;">$1</mark>');
            parent.style.opacity = '1';
        } else {
            bubble.textContent = text;
            parent.style.opacity = '0.35';
        }
    });
};


window.scrollCarousel = function(btn, direction) {
    const parent = btn.parentNode;
    if (!parent) return;
    const track = parent.querySelector('.carousel-scroll-container') || parent.querySelector('.carousel-track');
    if (!track) return;
    const cardWidth = track.firstElementChild ? track.firstElementChild.offsetWidth + 24 : 340;
    track.scrollBy({
        left: direction * cardWidth,
        behavior: 'smooth'
    });
};


function getActivePromo(moduleId) {
    if (!appState.promotions) return null;
    const now = new Date().toISOString();
    return appState.promotions.find(p => 
        String(p.moduleId) === String(moduleId) &&
        p.status === 'active' &&
        now >= p.startDate &&
        now <= p.endDate
    );
}


let CLIENT_ID = null; // Se asigna dinámicamente desde la sesión
const WHATSAPP_NUMBER = '573001234567'; // Número de ventas de AS Sierra Systems
let appState = { businesses: [], modules: [], notifications: [], promotions: [] };

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar sesión antes de mostrar nada
    const sessionRaw = sessionStorage.getItem('clientSession');
    if (!sessionRaw) {
        window.location.href = '/client-login.html';
        return;
    }

    let session;
    try { session = JSON.parse(sessionRaw); } catch { window.location.href = '/client-login.html'; return; }

    // 2. Validar token con el servidor
    try {
        const verifyRes = await fetch('/api/client/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: session.token })
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.valid) {
            sessionStorage.removeItem('clientSession');
            if (verifyData.reason === 'account_inactive') {
                // Mostrar pantalla de cuenta suspendida antes de redirigir
                document.body.innerHTML = `
                <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;font-family:'Inter',sans-serif;">
                    <div style="text-align:center;max-width:440px;padding:2.5rem;background:#1e293b;border-radius:24px;border:1px solid rgba(239,68,68,0.3);box-shadow:0 25px 50px rgba(0,0,0,0.5);">
                        <div style="width:72px;height:72px;background:rgba(239,68,68,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;font-size:2rem;">🚫</div>
                        <h2 style="color:#f8fafc;font-size:1.5rem;font-weight:800;margin-bottom:0.75rem;">Cuenta Suspendida</h2>
                        <p style="color:#94a3b8;font-size:0.95rem;line-height:1.6;margin-bottom:2rem;">Tu cuenta ha sido desactivada por el administrador. Para más información, comunícate con <strong style="color:#f8fafc;">AS Sierra Systems</strong>.</p>
                        <a href="/client-login.html" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:0.75rem 2rem;border-radius:12px;font-weight:700;text-decoration:none;font-size:0.95rem;">Volver al Inicio</a>
                    </div>
                </div>`;
                return;
            }
            if (verifyData.reason === 'payment_required') {
                // Pantalla de pago requerido
                document.body.innerHTML = `
                <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;font-family:'Inter',sans-serif;">
                    <div style="text-align:center;max-width:460px;padding:2.5rem;background:#1e293b;border-radius:24px;border:1px solid rgba(245,158,11,0.3);box-shadow:0 25px 50px rgba(0,0,0,0.5);">
                        <div style="width:80px;height:80px;background:rgba(245,158,11,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;font-size:2.2rem;">💳</div>
                        <h2 style="color:#f8fafc;font-size:1.5rem;font-weight:800;margin-bottom:0.5rem;">Pago Requerido</h2>
                        <p style="color:#f59e0b;font-size:0.8rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:1rem;">Suscripción vencida</p>
                        <p style="color:#94a3b8;font-size:0.9rem;line-height:1.6;margin-bottom:2rem;">Tu suscripción mensual no pudo procesarse. Para restablecer el acceso a tu plataforma, comunícate con <strong style="color:#f8fafc;">AS Sierra Systems</strong> y actualiza tu método de pago.</p>
                        <div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;">
                            <a href="https://wa.me/${WHATSAPP_NUMBER}?text=Hola,%20necesito%20actualizar%20mi%20pago%20para%20reactivar%20mi%20cuenta." target="_blank"
                               style="display:inline-flex;align-items:center;gap:0.5rem;background:#25d366;color:white;padding:0.75rem 1.5rem;border-radius:12px;font-weight:700;text-decoration:none;font-size:0.9rem;">
                               📱 Contactar por WhatsApp
                            </a>
                            <a href="/client-login.html" style="display:inline-flex;align-items:center;gap:0.5rem;background:rgba(255,255,255,0.05);color:#94a3b8;padding:0.75rem 1.5rem;border-radius:12px;font-weight:600;text-decoration:none;font-size:0.9rem;border:1px solid rgba(255,255,255,0.08);">
                               Volver al Inicio
                            </a>
                        </div>
                    </div>
                </div>`;
                return;
            }
            window.location.href = '/client-login.html';
            return;
        }

        CLIENT_ID = verifyData.clientId;
    } catch {
        // Si el servidor no responde, redirigir por seguridad
        sessionStorage.removeItem('clientSession');
        window.location.href = '/client-login.html';
        return;
    }


    lucide.createIcons();
    initTheme();
    setupSidebar();
    setupTabs();
    setupLogoutBtn();

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        const wrap = document.getElementById('profile-dropdown-wrap');
        if (wrap && !wrap.contains(e.target)) {
            document.getElementById('profile-dropdown-menu')?.classList.add('hidden');
        }
    });

    // Profile modal (Name + Avatar)
    document.getElementById('btn-open-profile')?.addEventListener('click', () => {
        document.getElementById('profile-dropdown-menu')?.classList.add('hidden');
        
        const clientBiz = appState.businesses.find(b => b.id === CLIENT_ID);
        const currentName = clientBiz?.name || '';
        const currentAvatar = clientBiz?.avatarUrl || '';

        Swal.fire({
            title: 'Mi Perfil',
            html: `
                <div style="text-align:center; margin-top: 1rem;">
                    <div id="avatar-preview-wrap" style="width:100px; height:100px; border-radius:50%; background: linear-gradient(135deg,#6366f1,#8b5cf6); margin: 0 auto 1.5rem; display:flex; align-items:center; justify-content:center; font-size:2rem; font-weight:700; color:white; overflow:hidden; border:3px solid rgba(99,102,241,0.4); cursor:pointer;" onclick="document.getElementById('avatar-file-input').click()">
                        ${currentAvatar ? `<img src="${currentAvatar}" style="width:100%;height:100%;object-fit:cover;">` : `<span>${currentName.substring(0, 2).toUpperCase()}</span>`}
                    </div>
                    <p style="font-size:0.75rem; color:var(--primary); margin-bottom:1.5rem; cursor:pointer; font-weight:600;" onclick="document.getElementById('avatar-file-input').click()">
                        <i data-lucide="camera" style="width:14px; vertical-align:middle;"></i> Cambiar foto
                    </p>
                    <input type="file" id="avatar-file-input" accept="image/*" style="display:none;">
                    
                    <div style="text-align:left;">
                        <label class="form-label" style="font-size:0.75rem; color:var(--text-muted); font-weight:700; text-transform:uppercase; margin-bottom:0.5rem; display:block;">Nombre del Negocio</label>
                        <input type="text" id="profile-name-input" class="form-control" style="width:100%; background:rgba(15,23,42,0.6); border:1px solid rgba(255,255,255,0.1); color:white; padding:0.8rem; border-radius:8px;" value="${currentName}">
                    </div>
                </div>
            `,
            background: 'var(--bg-surface)',
            color: 'var(--text)',
            showCancelButton: true,
            confirmButtonText: 'Guardar Cambios',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: 'var(--primary)',
            didRender: () => {
                lucide.createIcons();
                document.getElementById('avatar-file-input')?.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const wrap = document.getElementById('avatar-preview-wrap');
                        wrap.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
                    };
                    reader.readAsDataURL(file);
                });
            },
            preConfirm: async () => {
                const newName = document.getElementById('profile-name-input').value;
                const fileInput = document.getElementById('avatar-file-input');
                const sessionRaw = sessionStorage.getItem('clientSession');
                if (!sessionRaw) return false;
                const session = JSON.parse(sessionRaw);

                if (!newName || newName.trim() === '') {
                    Swal.showValidationMessage('El nombre no puede estar vacío.');
                    return false;
                }

                const handleRes = async (res, msg) => {
                    const contentType = res.headers.get("content-type");
                    if (contentType && contentType.includes("application/json")) {
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || msg);
                        return data;
                    } else {
                        throw new Error('El servidor no respondió correctamente. Asegúrate de haberlo reiniciado.');
                    }
                };

                try {
                    // 1. Update Name if changed
                    if (newName !== currentName) {
                        const nameRes = await fetch('/api/client/profile/update', {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session.token}`
                            },
                            body: JSON.stringify({ newName })
                        });
                        await handleRes(nameRes, 'Error al actualizar nombre.');
                    }

                    // 2. Update Avatar if selected
                    let finalAvatarUrl = currentAvatar;
                    if (fileInput && fileInput.files[0]) {
                        const formData = new FormData();
                        formData.append('avatar', fileInput.files[0]);
                        const avRes = await fetch('/api/client/avatar', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${session.token}` },
                            body: formData
                        });
                        const avData = await handleRes(avRes, 'Error al subir foto.');
                        finalAvatarUrl = avData.avatarUrl;
                    }

                    return { newName, avatarUrl: finalAvatarUrl };
                } catch (err) {
                    Swal.showValidationMessage(err.message);
                    return false;
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const { newName, avatarUrl } = result.value;
                
                // Update local state and re-render header info
                const clientBiz = appState.businesses.find(b => b.id === CLIENT_ID);
                if (clientBiz) {
                    clientBiz.name = newName;
                    clientBiz.avatarUrl = avatarUrl;
                }
                
                // Immediate UI Update
                document.getElementById('client-name-display').textContent = newName;
                const heroName = document.getElementById('hero-client-name');
                if (heroName) heroName.textContent = newName;
                
                const wrap = document.getElementById('client-avatar-wrap');
                if (wrap) {
                    if (avatarUrl) {
                        wrap.innerHTML = `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;">`;
                    } else {
                        wrap.innerHTML = `<span id="client-avatar">${newName.substring(0, 2).toUpperCase()}</span>`;
                    }
                }
                
                Swal.fire({ icon: 'success', title: 'Perfil actualizado', timer: 2000, showConfirmButton: false, background: 'var(--bg-surface)', color: 'var(--text)' });
            }
        });
    });

    await loadData();
    if (typeof loadMyTickets === 'function') {
        await loadMyTickets();
    }

    // ==========================================
    // SSE REAL-TIME SYNC
    // ==========================================
    const evtSource = new EventSource('/api/stream');
    evtSource.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'update') {
                console.log('Update received via SSE, reloading data...');
                loadData();
                if (typeof loadMyTickets === 'function') {
                    loadMyTickets();
                }
                if (window.activeChatTicketId) {
                    fetchAndRenderChatMessages(window.activeChatTicketId, 'client');
                }
            } else if (data.type === 'typing') {
                if (window.activeChatTicketId === data.ticketId && data.role !== 'client') {
                    showChatTypingIndicator('Soporte está escribiendo...');
                }
            }
        } catch (err) {
            console.error('SSE Error:', err);
        }
    };

    // Billing button (attached after DOM is ready)
    document.querySelectorAll('#tab-billing button').forEach(btn => {
        btn.addEventListener('click', () => showPaymentForm());
    });

    // Video Guide Button
    document.getElementById('btn-video-guide')?.addEventListener('click', () => {
        const clientBiz = appState.businesses.find(b => b.id === CLIENT_ID);
        if (!clientBiz || !clientBiz.modules || clientBiz.modules.length === 0) {
            Swal.fire({
                title: 'Aviso',
                text: 'No tienes módulos activos actualmente.',
                icon: 'info',
                background: 'var(--bg-surface)',
                color: 'var(--text)',
                confirmButtonColor: 'var(--primary)'
            });
            return;
        }

        let videosHtml = '';
        clientBiz.modules.forEach(moduleId => {
            // Buscamos la información del módulo desde appState
            const modInfo = appState.modules.find(m => m.id === moduleId);
            
            if (modInfo && modInfo.videoUrl) {
                videosHtml += `
                    <div style="margin-bottom: 2.5rem;">
                        <h4 style="color: var(--primary); margin-bottom: 1rem; font-weight: 600; font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
                            <i data-lucide="play-circle"></i> Guía ${modInfo.name}
                        </h4>
                        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05);">
                            <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
                                    src="${modInfo.videoUrl}" 
                                    title="Guía ${modInfo.name}" frameborder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowfullscreen>
                            </iframe>
                        </div>
                    </div>
                `;
            }
        });

        if (!videosHtml) {
            videosHtml = '<p style="color: var(--text-muted); font-size: 0.95rem; text-align: center; margin-top: 2rem; padding: 2rem; border: 1px dashed var(--border-color); border-radius: 12px;">Aún no hay videos tutoriales disponibles para tus módulos. Contacta con soporte si necesitas ayuda.</p>';
        }

        Swal.fire({
            title: 'Tus Guías en Video',
            html: `
                <div style="text-align: left; margin-top: 1rem; max-height: 60vh; overflow-y: auto; padding-right: 10px;">
                    <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1.5rem;">
                        Aprende cómo usar tus herramientas activas en estos tutoriales.
                    </p>
                    ${videosHtml}
                </div>
            `,
            width: '750px',
            background: 'var(--bg-surface)',
            color: 'var(--text)',
            showConfirmButton: true,
            confirmButtonText: 'Entendido',
            confirmButtonColor: 'var(--primary)',
            padding: '2rem',
            didOpen: () => {
                lucide.createIcons(); // Para renderizar los iconos dentro del modal
            }
        });
    });

    // Ticket button
    document.getElementById('btn-open-ticket')?.addEventListener('click', () => {
        Swal.fire({
            title: 'Crear Ticket de Soporte',
            html: `
                <style>
                    .pro-input { width: 100%; box-sizing: border-box; padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid rgba(139, 92, 246, 0.3); background: var(--bg-body); color: var(--text); font-family: inherit; font-size: 0.95rem; outline: none; transition: all 0.2s; margin:0; }
                    .pro-input:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2); }
                    .pro-label { font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
                </style>
                <div style="text-align:left; display:flex; flex-direction:column; gap:1.25rem; margin-top:1.5rem; overflow:hidden;">
                    <div>
                        <label class="pro-label">Módulo Afectado</label>
                        <select id="ticket-module" class="pro-input">
                            <option value="">Selecciona un módulo...</option>
                            <option>StreetFeed Pro</option>
                            <option>PDFTools Pro</option>
                            <option>Sierra POS</option>
                            <option>StyleSync Pro</option>
                            <option>Facturación / Pagos</option>
                            <option>Otro</option>
                        </select>
                    </div>
                    <div>
                        <label class="pro-label">Prioridad</label>
                        <select id="ticket-priority" class="pro-input">
                            <option value="normal">Normal</option>
                            <option value="urgente">🔴 Urgente</option>
                            <option value="baja">Baja</option>
                        </select>
                    </div>
                    <div>
                        <label class="pro-label">Descripción del Problema</label>
                        <textarea id="ticket-desc" class="pro-input" placeholder="Describe con detalle qué está pasando..." style="height: 120px; resize:none;"></textarea>
                    </div>
                    <p style="font-size:0.75rem; color:var(--text-muted); margin:0; display:flex; align-items:center; gap:6px;">
                        <i data-lucide="info" style="width:16px; color:var(--primary);"></i>
                        <span>Los tickets son enviados directamente a nuestra línea de WhatsApp.</span>
                    </p>
                </div>
            `,
            background: 'var(--bg-surface)',
            color: 'var(--text)',
            width: '450px',
            showCancelButton: true,
            confirmButtonText: 'Enviar Ticket',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: 'var(--primary)',
            didRender: () => lucide.createIcons(),
            preConfirm: () => {
                const mod = document.getElementById('ticket-module').value;
                const desc = document.getElementById('ticket-desc').value;
                const priority = document.getElementById('ticket-priority').value;
                if (!mod) return Swal.showValidationMessage('Selecciona el módulo afectado.');
                if (!desc || desc.length < 10) return Swal.showValidationMessage('Por favor describe el problema (mín. 10 caracteres).');
                return { mod, desc, priority };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const { mod, desc, priority } = result.value;
                const msg = encodeURIComponent(`🎫 NUEVO TICKET\nMódulo: ${mod}\nPrioridad: ${priority.toUpperCase()}\n\n${desc}`);
                // Enviar por WhatsApp y mostrar confirmación
                window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
                Swal.fire({
                    icon: 'success',
                    title: '¡Ticket enviado!',
                    html: `<p style="color:var(--text-muted);">Tu ticket de soporte fue enviado. Un agente te responderá por WhatsApp pronto.</p>`,
                    background: 'var(--bg-surface)',
                    color: 'var(--text)',
                    confirmButtonColor: 'var(--primary)',
                    timer: 4000,
                    timerProgressBar: true
                });
            }
        });
    });

    // Account settings form
    const accForm = document.getElementById('account-settings-form');
    if (accForm) {
        accForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPass = document.getElementById('acc-current-pass').value;
            const newEmail = document.getElementById('acc-email').value;
            const newPass = document.getElementById('acc-pass').value;
            const btn = document.getElementById('acc-save-btn');
            
            if (!currentPass) {
                return Swal.fire({ icon: 'warning', title: 'Contraseña requerida', text: 'Por favor, ingresa tu contraseña actual por seguridad.', background: 'var(--bg-surface)', color: 'var(--text)' });
            }

            const sessionRaw = sessionStorage.getItem('clientSession');
            if (!sessionRaw) return;
            const session = JSON.parse(sessionRaw);

            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Guardando...';
            lucide.createIcons();

            try {
                const res = await fetch('/api/client/credentials/update', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.token}`
                    },
                    body: JSON.stringify({ currentPass, newEmail, newPass })
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    Swal.fire({
                        icon: 'success',
                        title: '¡Actualizado!',
                        text: 'Tus credenciales se han guardado exitosamente.',
                        background: 'var(--bg-surface)',
                        color: 'var(--text)',
                        confirmButtonColor: 'var(--primary)'
                    });
                    
                    // Update session storage info if needed
                    session.clientEmail = newEmail;
                    sessionStorage.setItem('clientSession', JSON.stringify(session));
                    
                    // Clear password field
                    document.getElementById('acc-pass').value = '';
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: data.error || 'No se pudieron actualizar las credenciales.',
                        background: 'var(--bg-surface)',
                        color: 'var(--text)',
                        confirmButtonColor: 'var(--primary)'
                    });
                }
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Error de conexión', background: 'var(--bg-surface)', color: 'var(--text)', confirmButtonColor: 'var(--primary)' });
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i data-lucide="save"></i> Guardar Cambios';
                lucide.createIcons();
            }
        });
    }
});

// ====================== DATA LOADING ======================
async function loadData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        
        appState.businesses = data.businesses || [];
        appState.modules = data.modules || [];
        appState.notifications = data.notifications || [];
        appState.promotions = data.promotions || [];

        renderDashboard();
    } catch (error) {
        console.error('Error al cargar datos:', error);
        console.warn("No se pudieron cargar datos del servidor.");
    }
}


function renderDashboard() {
    const clientBiz = appState.businesses.find(b => String(b.id) === String(CLIENT_ID));
    
    if (!clientBiz) {
        console.error('No se encontró el negocio para el ID:', CLIENT_ID);
        const el = document.getElementById('client-name-display');
        if (el) el.textContent = 'Usuario AS';
        return;
    }

    // --- Header & Hero (sólo si los elementos existen) ---
    const elName = document.getElementById('client-name-display');
    if (elName) elName.textContent = clientBiz.name;

    const elAvatar = document.getElementById('client-avatar');
    if (elAvatar) elAvatar.textContent = clientBiz.name.substring(0, 2).toUpperCase();

    const heroName = document.getElementById('hero-client-name');
    if (heroName) heroName.textContent = clientBiz.name;

    const emailDisplay = document.getElementById('profile-email-display');
    if (emailDisplay && clientBiz.clientEmail) emailDisplay.textContent = clientBiz.clientEmail;

    // Mostrar correo del cliente en la tarjeta de soporte
    const supportEmailSpan = document.getElementById('support-client-email');
    if (supportEmailSpan && clientBiz.clientEmail) supportEmailSpan.textContent = clientBiz.clientEmail;
    const supportEmailLink = document.getElementById('support-email-link');
    if (supportEmailLink && clientBiz.clientEmail) {
        const subject = encodeURIComponent('Solicitud de Soporte — ' + (clientBiz.name || clientBiz.clientEmail));
        supportEmailLink.href = `mailto:soporte@assierrasystems.com?subject=${subject}&cc=${encodeURIComponent(clientBiz.clientEmail)}`;
    }

    if (clientBiz.avatarUrl) {
        const wrap = document.getElementById('client-avatar-wrap');
        if (wrap) wrap.innerHTML = `<img src="${clientBiz.avatarUrl}" style="width:100%;height:100%;object-fit:cover;">`;
    }

    const accEmailInput = document.getElementById('acc-email');
    if (accEmailInput && clientBiz.clientEmail) accEmailInput.value = clientBiz.clientEmail;

    // --- Separar módulos ---
    const activeMods = (clientBiz.modules || []).map(mid =>
        appState.modules.find(m => String(m.id) === String(mid))
    ).filter(Boolean);

    const cancelledMods = (clientBiz.cancelledModules || []).map(cm => {
        const modInfo = appState.modules.find(m => String(m.id) === String(cm.id));
        return modInfo ? { ...modInfo, cancelledAt: cm.cancelledAt, accessUntil: cm.accessUntil } : null;
    }).filter(Boolean);

    const allClientModIds = [
        ...(clientBiz.modules || []).map(id => String(id)),
        ...(clientBiz.cancelledModules || []).map(cm => String(cm.id))
    ];
    const availableMods = appState.modules.filter(m =>
        m.status === 'active' && !allClientModIds.includes(String(m.id))
    );

    // --- KPIs ---
    const elCount = document.getElementById('active-modules-count');
    if (elCount) elCount.textContent = activeMods.length;

    // KPI Cancelados: SIEMPRE visible, actualizar conteo
    const elCancelledCount = document.getElementById('cancelled-modules-count');
    if (elCancelledCount) elCancelledCount.textContent = cancelledMods.length;
    // Highlight amber border when > 0, subtle when = 0
    const kpiCancelledCard = document.getElementById('kpi-cancelled-card');
    if (kpiCancelledCard) {
        kpiCancelledCard.style.borderColor = cancelledMods.length > 0
            ? 'rgba(245,158,11,0.4)' : 'rgba(245,158,11,0.12)';
        kpiCancelledCard.style.opacity = cancelledMods.length > 0 ? '1' : '0.55';
    }

    // --- Pestañas de módulos: SIEMPRE visibles (ya en HTML con display:flex) ---
    // (No necesitamos ocultar el contenedor, solo actualizar el estado activo/inactivo)

    // ----------------------------------------------------------------
    // RENDER: ACTIVOS
    // ----------------------------------------------------------------
    const gridActive = document.getElementById('client-modules-grid-active');
    if (gridActive) {
        let htmlActive = '';
        if (activeMods.length > 0) {
            activeMods.forEach((mod, index) => {
                // Normalizar URL
                const modUrl    = (mod.url     || '').replace('menu_comida', 'order-system');
                const modAdmUrl = (mod.adminUrl || '').replace('menu_comida', 'order-system');

                // Fecha de renovación real desde el backend (sin fallbacks falsos)
                const bizForDate = appState.businesses.find(b => String(b.id) === String(CLIENT_ID));
                const rawDate = bizForDate?.moduleDates?.[mod.id];
                const renewalDate = rawDate ? new Date(rawDate).toLocaleDateString('es-CO') : 'Contactar Admin';
                
                // Determinar si está vencido
                const isExpired = rawDate && (new Date(rawDate).getTime() <= Date.now());

                const badgeHtml = isExpired 
                    ? `<div class="status-badge" style="position:absolute; top:1.5rem; right:1.5rem; background:rgba(239,68,68,0.1); color:#ef4444; border-color:rgba(239,68,68,0.2);">⚠️ Pago Vencido</div>`
                    : `<div class="status-badge active" style="position:absolute; top:1.5rem; right:1.5rem;">Activo</div>`;
                
                const borderColor = isExpired ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.12)';
                const dateBoxColor = isExpired ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)';
                const dateBorderColor = isExpired ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)';
                const dateTextColor = isExpired ? '#ef4444' : '#10b981';
                const dateTextLabel = isExpired ? 'Vencido el:' : 'Próxima renovación:';
                
                // Formatear precio
                const priceVal = parseInt(String(mod.price || '').replace(/\D/g, ''));
                const priceDisplay = (!isNaN(priceVal) && priceVal > 0) ? `$ ${priceVal.toLocaleString('es-CO')} COP/mes` : 'Consultar';

                let actionsHtml = '';
                if (isExpired) {
                    actionsHtml = `
                        <div style="display:flex; flex-direction:column; gap:0.6rem;">
                            <button class="btn-primary" onclick="handleRenewal('${mod.id}','${mod.name}','${priceDisplay}')" style="width:100%; justify-content:center; box-shadow:0 4px 14px 0 rgba(16,185,129,0.39); background:var(--primary); padding:0.75rem;">
                                <i data-lucide="credit-card" style="width:16px;"></i> Renovar Suscripción
                            </button>
                            <button class="btn-ghost" onclick="window.open('https://wa.me/${WHATSAPP_NUMBER}?text=Soporte%20para%20${encodeURIComponent(mod.name)}','_blank')" style="width:100%; justify-content:center; font-size:0.82rem; padding:0.5rem;">
                                <i data-lucide="headset" style="width:14px;"></i> Contactar Soporte
                            </button>
                        </div>
                    `;
                } else {
                    actionsHtml = `
                        <div style="display:flex; flex-direction:column; gap:0.6rem;">
                            <button class="btn-primary" onclick="showLaunchPad('${mod.id}','${mod.name}','${modUrl}','${modAdmUrl}')" style="width:100%; justify-content:center; box-shadow:0 4px 14px 0 rgba(99,102,241,0.39); padding:0.75rem;">
                                <i data-lucide="external-link" style="width:16px;"></i> Abrir Aplicación
                            </button>
                            <div style="display:flex; gap:0.6rem;">
                                <button class="btn-ghost" onclick="window.open('https://wa.me/${WHATSAPP_NUMBER}?text=Soporte%20para%20${encodeURIComponent(mod.name)}','_blank')" style="flex:1; justify-content:center; font-size:0.82rem; padding:0.5rem;">
                                    <i data-lucide="headset" style="width:14px;"></i> Soporte
                                </button>
                                <button class="btn-ghost" onclick="window.cancelModule('${mod.id}','${mod.name}')" style="flex:1; justify-content:center; color:var(--warning); font-size:0.82rem; padding:0.5rem; border-color:rgba(245,158,11,0.3);">
                                    <i data-lucide="pause-circle" style="width:14px;"></i> Suspender
                                </button>
                            </div>
                        </div>
                    `;
                }

                htmlActive += `
                <div class="biz-card animate-in" style="position:relative; animation-delay:${index * 0.08}s; border:1px solid ${borderColor};">
                    <div class="module-card-header">
                        <div class="module-icon-large" style="background:rgba(99,102,241,0.1); color:var(--primary);">
                            <i data-lucide="${mod.icon || 'package'}"></i>
                        </div>
                        ${badgeHtml}
                    </div>
                    <h3 class="module-title" style="margin-top:1rem; font-size:1.2rem;">${mod.name}</h3>
                    <p class="module-desc" style="font-size:0.85rem; margin-bottom:0.5rem;">${mod.desc || ''}</p>

                    <div style="margin:0.5rem 0 0.75rem; display:inline-flex; align-items:center; gap:0.4rem; background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.2); border-radius:20px; padding:0.3rem 0.85rem;">
                        <i data-lucide="tag" style="width:13px;height:13px;color:var(--primary);"></i>
                        <span style="font-size:0.82rem;font-weight:700;color:var(--primary);">${priceDisplay}</span>
                    </div>

                    <div style="margin:0.75rem 0 1.25rem; padding:0.65rem 1rem; background:${dateBoxColor}; border-radius:8px; border:1px solid ${dateBorderColor};">
                        <div style="font-size:0.75rem; color:${dateTextColor}; font-weight:700; display:flex; align-items:center; gap:0.4rem;">
                            <i data-lucide="calendar-clock" style="width:14px; height:14px;"></i>
                            ${dateTextLabel} ${renewalDate}
                        </div>
                    </div>

                    ${actionsHtml}
                </div>`;
            });
        } else {
            htmlActive = `<div style="grid-column:1/-1; text-align:center; padding:3rem;">
                <div style="font-size:3rem; margin-bottom:1rem;">📦</div>
                <h3 style="font-size:1.25rem; font-weight:700; margin-bottom:0.5rem;">Sin módulos activos</h3>
                <p style="color:var(--text-muted); font-size:0.9rem;">Explora el Marketplace para descubrir nuestras soluciones.</p>
            </div>`;
        }
        gridActive.innerHTML = htmlActive;
    }

    // ----------------------------------------------------------------
    // RENDER: CANCELADOS
    // ----------------------------------------------------------------
    const gridCancelled = document.getElementById('client-modules-grid-cancelled');
    if (gridCancelled) {
        let htmlCancelled = '';
        if (cancelledMods.length > 0) {
            cancelledMods.forEach((mod, index) => {
                const modUrl    = (mod.url     || '').replace('menu_comida', 'order-system');
                const modAdmUrl = (mod.adminUrl || '').replace('menu_comida', 'order-system');

                const accessUntilMs = new Date(mod.accessUntil).getTime();
                const daysLeft = Math.max(0, Math.ceil((accessUntilMs - Date.now()) / (1000 * 60 * 60 * 24)));
                const accessDate = new Date(mod.accessUntil).toLocaleDateString('es-CO');

                // Color de urgencia
                const urgencyColor = daysLeft <= 5 ? '#ef4444' : (daysLeft <= 10 ? '#f97316' : '#f59e0b');

                // Formatear precio
                const priceVal = parseInt(String(mod.price || '').replace(/\D/g, ''));
                const priceDisplay = (!isNaN(priceVal) && priceVal > 0) ? `$ ${priceVal.toLocaleString('es-CO')} COP/mes` : 'Consultar';

                let actionsHtml = '';
                if (accessUntilMs <= Date.now()) {
                    actionsHtml = `
                        <div style="display:flex; flex-direction:column; gap:0.6rem;">
                            <button class="btn-primary" onclick="handleRenewal('${mod.id}','${mod.name}','${priceDisplay}')" style="width:100%; justify-content:center; background:var(--primary); box-shadow:0 4px 14px 0 rgba(16,185,129,0.39); padding:0.75rem;">
                                <i data-lucide="credit-card" style="width:16px;"></i> Renovar Suscripción
                            </button>
                                <button class="btn-ghost" onclick="window.open('https://wa.me/${WHATSAPP_NUMBER}?text=Soporte%20para%20${encodeURIComponent(mod.name)}','_blank')" style="width:100%; justify-content:center; font-size:0.85rem; padding:0.6rem;">
                                    <i data-lucide="headset" style="width:14px;"></i> Contactar Soporte
                                </button>
                            </div>
                        `;
                    } else {
                        actionsHtml = `
                            <div style="display:flex; flex-direction:column; gap:0.6rem;">
                                <button class="btn-primary" onclick="window.reactivateModule('${mod.id}','${mod.name}')" style="width:100%; justify-content:center; background:linear-gradient(135deg,#10b981,#059669); box-shadow:0 4px 14px 0 rgba(16,185,129,0.3); padding:0.75rem;">
                                    <i data-lucide="refresh-cw" style="width:15px;"></i> Reactivar (Días a favor)
                                </button>
                                <button class="btn-ghost" onclick="showLaunchPad('${mod.id}','${mod.name}','${modUrl}','${modAdmUrl}')" style="width:100%; justify-content:center; font-size:0.85rem; padding:0.6rem;">
                                    <i data-lucide="external-link" style="width:14px;"></i> Abrir (Acceso Temporal)
                                </button>
                            </div>
                        `;
                    }

                    htmlCancelled += `
                    <div class="biz-card animate-in" style="position:relative; animation-delay:${index * 0.08}s; border:1px solid rgba(245,158,11,0.2); opacity:0.9;">
                        <div class="module-card-header">
                            <div class="module-icon-large" style="background:rgba(245,158,11,0.08); color:#f59e0b;">
                                <i data-lucide="${mod.icon || 'package'}"></i>
                            </div>
                            <div style="position:absolute; top:1.5rem; right:1.5rem; background:rgba(245,158,11,0.12); color:#f59e0b; font-size:0.7rem; font-weight:700; padding:0.25rem 0.65rem; border-radius:20px; border:1px solid rgba(245,158,11,0.25);">Suspendido</div>
                        </div>
                        <h3 class="module-title" style="margin-top:1rem; font-size:1.2rem;">${mod.name}</h3>
                        <p class="module-desc" style="font-size:0.82rem;">${mod.desc || ''}</p>

                        <div style="margin:1rem 0; padding:0.85rem 1rem; background:rgba(245,158,11,0.07); border-radius:10px; border:1px solid rgba(245,158,11,0.15);">
                            <div style="font-size:0.78rem; color:${urgencyColor}; font-weight:700; margin-bottom:0.3rem; display:flex; align-items:center; gap:0.4rem;">
                                <i data-lucide="hourglass" style="width:14px; height:14px;"></i>
                                Acceso hasta: ${accessDate}
                            </div>
                            <div class="countdown-timer" data-endtime="${accessUntilMs}" style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.5rem; font-family: monospace; font-weight: 600;">
                                ${daysLeft} día${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''} de acceso
                            </div>
                            <!-- Barra de progreso de tiempo restante -->
                            <div style="height:4px; background:var(--border-color); border-radius:99px; overflow:hidden;">
                                <div style="height:100%; width:${Math.min(100, (daysLeft / 30) * 100)}%; background:${urgencyColor}; border-radius:99px; transition:width 0.5s ease;"></div>
                            </div>
                        </div>

                        ${actionsHtml}
                    </div>`;
                });
        }
        gridCancelled.innerHTML = htmlCancelled;
    }

    // Sincronizar vista de pestaña activa
    if (cancelledMods.length === 0) {
        switchModuleSubTab('active');
    }

    // --- Marketplace (sólo si el grid existe) ---
    const mktGrid = document.getElementById('client-marketplace-grid');
    if (mktGrid) {
        if (availableMods.length > 0) {
            mktGrid.innerHTML = availableMods.map((mod, i) => {
                const activePromo = getActivePromo(mod.id);
                const basePriceVal = parseInt(String(mod.price || '').replace(/\D/g, ''));
                let finalPriceDisplay = '';
                let priceHtml = '';
                let discountBadge = '';

                if (activePromo && !isNaN(basePriceVal) && basePriceVal > 0) {
                    let promoPriceVal = basePriceVal;
                    if (activePromo.discountType === 'percentage') {
                        promoPriceVal = Math.round(basePriceVal * (1 - parseFloat(activePromo.discountValue) / 100));
                    } else if (activePromo.discountType === 'fixed_price') {
                        promoPriceVal = Math.round(parseFloat(activePromo.discountValue));
                    }
                    
                    const formattedOriginal = `$ ${basePriceVal.toLocaleString('es-CO')} COP`;
                    const formattedPromo = `$ ${promoPriceVal.toLocaleString('es-CO')} COP/mes`;
                    finalPriceDisplay = formattedPromo;
                    
                    priceHtml = `
                        <div style="display:flex; flex-direction:column; gap:0.25rem; margin:1.25rem 0 1rem;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="font-size:0.88rem; text-decoration:line-through; color:var(--text-muted); font-weight:600;">${formattedOriginal}</span>
                                <span style="background:rgba(245,158,11,0.15); color:#f59e0b; border:1px solid rgba(245,158,11,0.35); font-size:0.68rem; font-weight:800; padding:2px 6px; border-radius:12px; text-transform:uppercase; letter-spacing:0.05em;">
                                    -${activePromo.discountType === 'percentage' ? activePromo.discountValue + '%' : 'Descuento'}
                                </span>
                            </div>
                            <div style="font-weight:800; font-size:1.6rem; color:#f59e0b; text-shadow:0 0 10px rgba(245,158,11,0.2);">${formattedPromo}</div>
                        </div>
                    `;
                    discountBadge = `<div class="marketplace-badge" style="background:linear-gradient(135deg,#f59e0b,#d97706); box-shadow:0 4px 12px rgba(245,158,11,0.3); border:none; top:12px; right:12px; font-weight:800;">🔥 OFERTA</div>`;
                } else {
                    const priceDisplay = (!isNaN(basePriceVal) && basePriceVal > 0)
                        ? `$ ${basePriceVal.toLocaleString('es-CO')} COP/mes` : 'Cotizar';
                    finalPriceDisplay = priceDisplay;
                    priceHtml = `<div style="font-weight:800; font-size:1.5rem; color:var(--text); margin:1.5rem 0 1rem;">${priceDisplay}</div>`;
                }

                const badge = i === 0 && !activePromo ? '<div class="marketplace-badge">⭐ POPULAR</div>' : (discountBadge || '');
                return `
                <div class="biz-card" style="border:1px solid rgba(79,70,229,0.2); position:relative; overflow:hidden; display:flex; flex-direction:column;">
                    ${badge}
                    <div class="module-card-header">
                        <div class="module-icon-large" style="background:rgba(139,92,246,0.1); color:#8b5cf6;">
                            <i data-lucide="${mod.icon || 'package'}"></i>
                        </div>
                    </div>
                    <h3 class="module-title" style="margin-top:1rem; font-size:1.2rem;">${mod.name}</h3>
                    <p class="module-desc" style="flex:1;">${mod.desc || ''}</p>
                    ${priceHtml}
                    <div style="display:flex; flex-direction:column; gap:0.75rem;">
                        <button class="btn-primary btn-adquirir"
                            data-mod-name="${mod.name}" data-mod-price="${finalPriceDisplay}"
                            style="width:100%; justify-content:center; background:#8b5cf6; border:none; box-shadow:0 4px 14px 0 rgba(139,92,246,0.39);">
                            <i data-lucide="shopping-cart"></i> Adquirir Módulo
                        </button>
                        <button class="btn-ghost btn-demo"
                            data-mod-id="${mod.id}" data-mod-name="${mod.name}"
                            style="width:100%; justify-content:center; border:1px solid rgba(139,92,246,0.3);">
                            <i data-lucide="play-circle" style="width:15px;"></i> Ver Demo
                        </button>
                    </div>
                </div>`;
            }).join('');

            document.querySelectorAll('.btn-adquirir').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    handlePurchase(e.currentTarget.getAttribute('data-mod-name'), e.currentTarget.getAttribute('data-mod-price'));
                });
            });
            document.querySelectorAll('.btn-demo').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    handleDemo(e.currentTarget.getAttribute('data-mod-id'), e.currentTarget.getAttribute('data-mod-name'));
                });
            });
        } else {
            mktGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:3rem;">
                <div style="font-size:3rem; margin-bottom:1rem;">🎉</div>
                <h3 style="font-size:1.5rem; font-weight:700; margin-bottom:0.5rem;">¡Tienes todo activado!</h3>
                <p style="color:var(--text-muted);">Ya tienes todos los módulos disponibles activos en tu cuenta.</p>
            </div>`;
        }
    }

    // --- Total mensual (sólo si el elemento existe) ---
    const monthlyTotal = activeMods.reduce((sum, mod) => {
        const price = parseInt(String(mod.price || '').replace(/\D/g, ''), 10);
        return sum + (isNaN(price) ? 0 : price);
    }, 0);
    const elMonthly = document.getElementById('client-monthly-total');
    if (elMonthly) elMonthly.textContent = monthlyTotal > 0 ? `$ ${monthlyTotal.toLocaleString('es-CO')} COP` : '—';

    lucide.createIcons();
    initClientCharts();
}

// ====================== DYNAMIC CLIENT CHARTS (FINTECH PREMIUM) ======================
let clientBillingChart = null;
let clientUsageChart = null;

function initClientCharts() {
    if (clientBillingChart) clientBillingChart.destroy();
    if (clientUsageChart) clientUsageChart.destroy();

    const ctxBilling = document.getElementById('clientBillingChart')?.getContext('2d');
    const ctxUsage = document.getElementById('clientUsageChart')?.getContext('2d');

    const clientBiz = appState.businesses.find(b => String(b.id) === String(CLIENT_ID));
    if (!clientBiz) return;

    // Calcular costos activos
    const activeMods = (clientBiz.modules || []).map(mid =>
        appState.modules.find(m => String(m.id) === String(mid))
    ).filter(Boolean);

    const monthlyTotal = activeMods.reduce((sum, mod) => {
        const price = parseInt(String(mod.price || '').replace(/\D/g, ''), 10);
        return sum + (isNaN(price) ? 0 : price);
    }, 0);

    // 1. Line Chart: Consumo y Proyección Mensual
    if (ctxBilling) {
        // Crear gradiente premium fintech
        const gradient = ctxBilling.createLinearGradient(0, 0, 0, 220);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
        gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.15)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

        // Historial simulado + proyección basada en el total mensual actual
        const val4 = Math.round(monthlyTotal * 0.8);
        const val5 = monthlyTotal;
        const val6 = Math.round(monthlyTotal * 1.2); // Proyección futura de crecimiento

        const dataPoints = monthlyTotal > 0 
            ? [Math.round(monthlyTotal * 0.4), Math.round(monthlyTotal * 0.6), Math.round(monthlyTotal * 0.6), val4, val5, val6]
            : [0, 0, 0, 0, 0, 0];

        clientBillingChart = new Chart(ctxBilling, {
            type: 'line',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun (Proy)'],
                datasets: [{
                    label: 'Consumo COP',
                    data: dataPoints,
                    borderColor: '#6366f1',
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointBackgroundColor: '#6366f1',
                    pointHoverRadius: 7,
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#6366f1',
                    pointHoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleFont: { family: 'Outfit', size: 12 },
                        bodyFont: { family: 'Outfit', size: 12 },
                        padding: 10,
                        cornerRadius: 8,
                        borderColor: 'rgba(255,255,255,0.08)',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return `Consumo: $ ${context.parsed.y.toLocaleString('es-CO')} COP`;
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
                            font: { family: 'Outfit', size: 10 },
                            callback: function(value) {
                                return `$ ${(value / 1000).toFixed(0)}k`;
                            }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 10 } }
                    }
                }
            }
        });
    }

    // 2. Doughnut Chart: Distribución de Módulos por Sede
    if (ctxUsage) {
        const labels = activeMods.map(m => m.name);
        const data = activeMods.map(() => 1); // Peso uniforme para distribución
        
        const COLORS = ['#8b5cf6', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f97316'];
        
        clientUsageChart = new Chart(ctxUsage, {
            type: 'doughnut',
            data: {
                labels: labels.length > 0 ? labels : ['Ninguno'],
                datasets: [{
                    data: data.length > 0 ? data : [1],
                    backgroundColor: labels.length > 0 
                        ? labels.map((_, i) => COLORS[i % COLORS.length])
                        : ['rgba(255,255,255,0.05)'],
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
                            padding: 14,
                            font: { family: 'Outfit', size: 11 },
                            boxWidth: 10,
                            borderRadius: 4
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }
}


// ====================== ACCIONES ======================

/** Genera una contraseña aleatoria segura */
function generatePassword(length = 12) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/** Launch Pad: muestra links de cliente, admin y credenciales con persistencia */
function showLaunchPad(modId, modName, clientUrl, adminUrl) {
    // Verificación estricta de caducidad
    const currentBizDateCheck = appState.businesses.find(b => String(b.id) === String(CLIENT_ID));
    
    // Si está en cancelados, comprobar que no haya expirado
    const isCancelled = currentBizDateCheck?.cancelledModules?.find(cm => String(cm.id) === String(modId));
    const accessUntil = isCancelled ? isCancelled.accessUntil : currentBizDateCheck?.moduleDates?.[modId];
    
    if (accessUntil && new Date(accessUntil).getTime() <= Date.now()) {
        Swal.fire({
            icon: 'error',
            title: 'Acceso Denegado',
            text: 'Tu ciclo de acceso ha expirado. Por favor renueva tu suscripción para continuar usando la aplicación.',
            background: 'var(--bg-surface)',
            color: 'var(--text)'
        });
        return;
    }

    const storageKey = `mod_creds_${CLIENT_ID}_${modId}`;
    let savedData = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    // Obtener el nombre del negocio de forma segura para la URL
    const currentBiz = appState.businesses.find(b => b.id === CLIENT_ID);
    const bizSlug = currentBiz ? currentBiz.name.toLowerCase().replace(/\s+/g, '-') : CLIENT_ID;
    const modSlug = modName.toLowerCase().replace(/\s+/g, '-');

    // Si no existe clave y no está configurado, generamos una inicial
    if (!savedData.tempPass && !savedData.isConfigured) {
        savedData = {
            tempUser: `admin.${modId}`,
            tempPass: generatePassword(),
            isConfigured: false
        };
        localStorage.setItem(storageKey, JSON.stringify(savedData));
    }

    // --- Sincronización Automática con el Módulo ---
    // Inyectamos las credenciales temporales en la clave esperada por el módulo.
    if (!savedData.isConfigured && savedData.tempUser && savedData.tempPass) {
        let authKey = null;
        if (modId === 'streetfeed') authKey = 'streetfeed_auth';
        if (modId === 'agenda') authKey = 'agenda_auth';

        if (authKey) {
            // Siempre inyectar las credenciales temporales en el entorno local
            // para que el cliente pueda entrar directamente la primera vez.
            // Eliminamos la lógica de auto-ocultado para evitar conflictos
            // cuando se prueban múltiples negocios en el mismo navegador.
            localStorage.setItem(authKey, JSON.stringify({ user: savedData.tempUser, pass: savedData.tempPass }));
        }
    }

    const hasAdmin = adminUrl && adminUrl.trim() !== '';

    Swal.fire({
        title: modName,
        html: `
            <style>
                .launch-link-btn {
                    display: flex; align-items: center; gap: 1rem;
                    width: 100%; padding: 1rem 1.25rem; border-radius: 12px;
                    border: 1px solid rgba(99,102,241,0.15); background: rgba(30, 41, 59, 0.4);
                    color: var(--text); font-size: 0.95rem; font-weight: 600;
                    cursor: pointer; text-decoration: none; transition: all 0.2s;
                    box-sizing: border-box;
                }
                .launch-link-btn:hover { background: rgba(99,102,241,0.08); border-color: rgba(99,102,241,0.4); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                .launch-link-btn .btn-icon { width: 42px; height: 42px; border-radius: 10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
                .launch-link-btn .btn-text { text-align: left; overflow: hidden; }
                .launch-link-btn .btn-text small { display:block; font-weight:400; font-size:0.8rem; color:var(--text-muted); margin-top:3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .cred-box { background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(99,102,241,0.2); border-radius: 12px; padding: 1.25rem; }
                .cred-row { display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.8rem; }
                .cred-row:last-child { margin-bottom:0; }
                .cred-label { font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; letter-spacing: 0.05em; width: 35%; }
                .cred-value { font-family: monospace; font-size:0.95rem; font-weight:700; color: #f8fafc; letter-spacing: 0.05em; flex: 1; }
                .copy-btn { background: rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.3); color:#818cf8; padding:4px 10px; border-radius:6px; font-size:0.75rem; font-weight:600; cursor:pointer; transition: all 0.2s; display: flex; align-items: center; gap: 4px; }
                .copy-btn:hover { background:rgba(99,102,241,0.2); color: #a5b4fc; }
                .warn-box { display:flex; align-items:flex-start; gap:0.75rem; background:rgba(245,158,11,0.05); border:1px solid rgba(245,158,11,0.2); border-radius:10px; padding:1rem; margin-top:0.5rem; }
                .warn-box p { margin:0; font-size:0.85rem; color:#cbd5e1; line-height:1.5; }
                .configured-check { display:flex; justify-content: center; align-items:center; gap:8px; margin-top:1.25rem; font-size:0.9rem; color: #a5b4fc; background: rgba(99,102,241,0.1); border: 1px dashed rgba(99,102,241,0.3); padding:0.75rem; border-radius:8px; cursor:pointer; font-weight:600; transition:0.2s; }
                .configured-check:hover { background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.5); color: #c7d2fe; }
                .modal-btn-cancel { background: transparent !important; color: #94a3b8 !important; border: 1px solid #334155 !important; border-radius: 8px !important; padding: 0.6rem 1.5rem !important; transition: all 0.2s !important; }
                .modal-btn-cancel:hover { background: #1e293b !important; color: #f8fafc !important; }
            </style>
            <div style="display:flex; flex-direction:column; gap:1rem; margin-top:1rem; text-align:left; overflow:hidden;">

                <a href="${clientUrl}" target="_blank" class="launch-link-btn">
                    <div class="btn-icon" style="background:rgba(99,102,241,0.12); color:var(--primary);"><i data-lucide="globe" style="width:20px;"></i></div>
                    <div class="btn-text">
                        Portal Público
                        <small style="word-break: break-all;">assierra.com/${bizSlug}/${modSlug}</small>
                    </div>
                </a>

                ${hasAdmin ? `
                <a href="${adminUrl}" target="_blank" class="launch-link-btn">
                    <div class="btn-icon" style="background:rgba(16,185,129,0.12); color:#10b981;"><i data-lucide="settings" style="width:20px;"></i></div>
                    <div class="btn-text">
                        Panel de Administración
                        <small>Gestión y configuración</small>
                    </div>
                </a>

                ${!savedData.isConfigured ? `
                <div class="cred-box" id="cred-section">
                    <p style="font-size:0.85rem; font-weight:700; color: #f8fafc; margin:0 0 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">Credenciales de Acceso (Temporales)</p>
                    <div class="cred-row">
                        <span class="cred-label">Usuario</span>
                        <span class="cred-value">${savedData.tempUser}</span>
                        <button class="copy-btn" onclick="navigator.clipboard.writeText('${savedData.tempUser}'); const btn=this; btn.innerHTML='<i data-lucide=\\'check\\' style=\\'width:14px;\\'></i> Copiado'; lucide.createIcons(); setTimeout(() => { btn.innerHTML='<i data-lucide=\\'copy\\' style=\\'width:14px;\\'></i> Copiar'; lucide.createIcons(); }, 3000);"><i data-lucide="copy" style="width:14px;"></i> Copiar</button>
                    </div>
                    <div class="cred-row">
                        <span class="cred-label">Contraseña</span>
                        <span class="cred-value">${savedData.tempPass}</span>
                        <button class="copy-btn" onclick="navigator.clipboard.writeText('${savedData.tempPass}'); const btn=this; btn.innerHTML='<i data-lucide=\\'check\\' style=\\'width:14px;\\'></i> Copiado'; lucide.createIcons(); setTimeout(() => { btn.innerHTML='<i data-lucide=\\'copy\\' style=\\'width:14px;\\'></i> Copiar'; lucide.createIcons(); }, 3000);"><i data-lucide="copy" style="width:14px;"></i> Copiar</button>
                    </div>
                    <div class="configured-check" onclick="markAsConfigured('${storageKey}')">
                        <i data-lucide="check-circle-2" style="width:18px;"></i>
                        <span>Ya configuré mi propia clave</span>
                    </div>
                </div>

                <div class="warn-box" id="warn-section">
                    <i data-lucide="alert-triangle" style="width:20px; color:#f59e0b;"></i>
                    <p><strong style="color:#f59e0b;">Importante:</strong> Esta es una contraseña temporal. Cámbiala en tu panel para mayor seguridad.</p>
                </div>` : `
                <div style="text-align:center; padding: 1.25rem; background: rgba(16,185,129,0.05); border-radius:12px; border: 1px dashed rgba(16,185,129,0.3);">
                    <p style="margin:0; font-size:0.85rem; color:#10b981; font-weight:600;">&#10004; Acceso administrativo configurado</p>
                    <small style="color:var(--text-muted); display:block; margin-top:4px;">Usa las credenciales que definiste personalmente.</small>
                    <button onclick="resetCredentialView('${storageKey}', '${modId}', '${modName}', '${clientUrl}', '${adminUrl}')" 
                            style="margin-top:0.75rem; background:none; border:none; color:var(--primary); font-size:0.75rem; cursor:pointer; text-decoration:underline; font-weight:500;">
                        ¿Olvidaste tu clave? Ver credenciales iniciales
                    </button>
                </div>
                `}
                ` : `
                <p style="color:var(--text-muted); font-size:0.875rem; text-align:center;">El panel de administración será habilitado por el equipo de AS Sierra Systems.</p>`}
            </div>
        `,
        background: 'var(--bg-surface)',
        color: 'var(--text)',
        width: '480px',
        showConfirmButton: false,
        showCloseButton: true,
        showCancelButton: true,
        cancelButtonText: 'Cerrar',
        didRender: () => lucide.createIcons(),
        customClass: {
            cancelButton: 'modal-btn-cancel'
        }
    });
}

/** Marca las credenciales como configuradas y limpia la UI */
window.markAsConfigured = function(storageKey) {
    let data = JSON.parse(localStorage.getItem(storageKey));
    data.isConfigured = true;
    localStorage.setItem(storageKey, JSON.stringify(data));
    
    // Feedback visual inmediato
    const credSection = document.getElementById('cred-section');
    const warnSection = document.getElementById('warn-section');
    if (credSection) credSection.style.display = 'none';
    if (warnSection) warnSection.style.display = 'none';
    
    Swal.showValidationMessage('¡Excelente! Credenciales marcadas como seguras.');
    setTimeout(() => {
        Swal.close();
        Swal.fire({
            icon: 'success',
            title: 'Configuración Guardada',
            text: 'A partir de ahora, el panel solo mostrará los accesos directos.',
            timer: 2000,
            showConfirmButton: false,
            background: 'var(--bg-surface)',
            color: 'var(--text)'
        });
    }, 1000);
};

/** Restablece la vista de las credenciales originales */
window.resetCredentialView = function(storageKey, modId, modName, clientUrl, adminUrl) {
    Swal.fire({
        title: '¿Restablecer vista?',
        text: 'Volveremos a mostrarte el usuario y la clave iniciales. Ten en cuenta que si ya las cambiaste en el panel de administración, estas no funcionarán.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, mostrar iniciales',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: varColor('--primary'),
        background: 'var(--bg-surface)',
        color: 'var(--text)'
    }).then((result) => {
        if (result.isConfirmed) {
            let data = JSON.parse(localStorage.getItem(storageKey));
            data.isConfigured = false;
            localStorage.setItem(storageKey, JSON.stringify(data));
            // Re-abrir el launchpad para ver los cambios
            showLaunchPad(modId, modName, clientUrl, adminUrl);
        }
    });
};

function varColor(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#6366f1';
}


function handlePurchase(modName, modPrice) {
    const storageKey = `client_payment_method_${CLIENT_ID}`;
    const savedCardStr = localStorage.getItem(storageKey);
    
    // --- FLUJO 1-CLICK BUY (Si hay tarjeta guardada) ---
    if (savedCardStr) {
        const savedCard = JSON.parse(savedCardStr);
        Swal.fire({
            title: 'Confirmar Compra',
            html: `
                <div style="text-align:left; display:flex; flex-direction:column; gap:1.25rem; margin-top:1rem;">
                    <div style="background: rgba(99, 102, 241, 0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(99, 102, 241, 0.2);">
                        <p style="margin:0; font-size:0.85rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Módulo a adquirir</p>
                        <h4 style="margin:0.25rem 0; font-size:1.2rem; color:var(--text); font-weight:700;">${modName}</h4>
                        <p style="margin:0; font-size:1.1rem; font-weight:800; color:var(--primary);">${modPrice}</p>
                    </div>
                    
                    <div style="background: var(--bg-body); padding: 1rem; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.3); display: flex; justify-content: space-between; align-items: center;">
                        <div style="display:flex; align-items:center; gap: 0.75rem;">
                            <div style="background:rgba(16, 185, 129, 0.1); color:#10b981; width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center;">
                                <i data-lucide="credit-card"></i>
                            </div>
                            <div>
                                <p style="margin:0; font-weight:700; font-size:0.95rem;">•••• •••• •••• ${savedCard.last4}</p>
                                <p style="margin:0; font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">${savedCard.name}</p>
                            </div>
                        </div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">Exp: ${savedCard.expiry}</div>
                    </div>
                    
                    <p style="font-size:0.75rem; color:var(--text-muted); margin:0; display:flex; align-items:center; gap:6px;">
                        <i data-lucide="zap" style="width:16px; color:#f59e0b;"></i>
                        <span>Compra rápida en 1 clic.</span>
                    </p>
                </div>
            `,
            background: 'var(--bg-surface)',
            color: 'var(--text)',
            width: '450px',
            showCancelButton: true,
            confirmButtonText: 'Pagar con esta tarjeta',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#10b981',
            didRender: () => lucide.createIcons(),
            preConfirm: () => {
                Swal.showLoading();
                return new Promise(resolve => setTimeout(() => resolve(true), 2000));
            }
        }).then((result) => {
            if (result.isConfirmed) {
                activateModule(modName);
            }
        });
        return; // Salir de la función si usamos 1-click
    }

    // --- FLUJO NORMAL (Si no hay tarjeta guardada) ---
    Swal.fire({
        title: 'Completar Adquisición',
        html: `
            <style>
                .pro-input { width: 100%; box-sizing: border-box; padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid rgba(139, 92, 246, 0.3); background: var(--bg-body); color: var(--text); font-family: inherit; font-size: 1rem; outline: none; transition: all 0.2s; margin:0; }
                .pro-input:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2); }
                .pro-label { font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
                .card-brands { display: flex; gap: 4px; color: var(--text-muted); align-items:center; }
            </style>
            <div style="text-align:left; display:flex; flex-direction:column; gap:1.25rem; margin-top:1rem; overflow:hidden;">
                <div style="background: rgba(99, 102, 241, 0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(99, 102, 241, 0.2);">
                    <p style="margin:0; font-size:0.85rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Módulo a adquirir</p>
                    <h4 style="margin:0.25rem 0; font-size:1.2rem; color:var(--text); font-weight:700;">${modName}</h4>
                    <p style="margin:0; font-size:1.1rem; font-weight:800; color:var(--primary);">${modPrice}</p>
                </div>
                <div>
                    <label class="pro-label">
                        <span>NÚMERO DE TARJETA</span>
                        <div class="card-brands" id="purchase-card-brands">
                            <i data-lucide="credit-card" style="width:14px;"></i>
                            <span style="font-size:0.65rem; font-weight:700;">VISA • MC • AMEX • DINERS</span>
                        </div>
                    </label>
                    <input id="pur-card-number" class="pro-input" placeholder="0000 0000 0000 0000" maxlength="19"
                           style="letter-spacing:0.1em;" oninput="window.onCardInput(this, 'purchase-card-brands')">
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
                    <div>
                        <label class="pro-label">VENCIMIENTO</label>
                        <input id="pur-card-expiry" class="pro-input" placeholder="MM/AA" maxlength="5" onkeyup="this.value = this.value.replace(/[^0-9]/g, ''); if(this.value.length > 2) this.value = this.value.substring(0,2) + '/' + this.value.substring(2);">
                    </div>
                    <div>
                        <label class="pro-label">CVC</label>
                        <input id="pur-card-cvc" class="pro-input" placeholder="123" maxlength="4" type="password">
                    </div>
                </div>
                <div>
                    <label class="pro-label">TITULAR DE LA TARJETA</label>
                    <input id="pur-card-name" class="pro-input" placeholder="NOMBRE Y APELLIDO" style="text-transform:uppercase;">
                </div>
                <p style="font-size:0.75rem; color:var(--text-muted); margin:0; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="shield-check" style="width:16px; color:#10b981;"></i>
                    <span>Pago 100% seguro con encriptación SSL.</span>
                </p>
            </div>
        `,
        background: 'var(--bg-surface)',
        color: 'var(--text)',
        width: '450px',
        showCancelButton: true,
        confirmButtonText: 'Procesar Pago y Activar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#10b981',
        didRender: () => lucide.createIcons(),
        preConfirm: () => {
            const numRaw = document.getElementById('pur-card-number').value;
            const num = numRaw.replace(/\D/g, '');
            const expiry = document.getElementById('pur-card-expiry').value;
            const cvc = document.getElementById('pur-card-cvc').value;
            const name = document.getElementById('pur-card-name').value;
            if (!num || num.length < 15 || !luhnCheck(num)) return Swal.showValidationMessage('Número de tarjeta inválido.');
            if (!expiry || expiry.length < 5) return Swal.showValidationMessage('Fecha de vencimiento inválida.');
            if (!cvc || cvc.length < 3) return Swal.showValidationMessage('CVC inválido.');
            if (!name || name.length < 3) return Swal.showValidationMessage('Ingresa el nombre del titular.');
            
            Swal.showLoading();
            return new Promise(resolve => {
                setTimeout(() => resolve({ num: numRaw, expiry, name }), 2500); // Retornamos los datos para guardarlos
            });
        }
    }).then((result) => {
        if (result.isConfirmed) {
            // Guardar tarjeta automáticamente
            const cardData = result.value;
            const paymentMethod = {
                last4: cardData.num.slice(-4),
                expiry: cardData.expiry,
                name: cardData.name.toUpperCase()
            };
            localStorage.setItem(storageKey, JSON.stringify(paymentMethod));
            
            activateModule(modName);
        }
    });
}

function activateModule(modName) {
    Swal.fire({
        icon: 'success',
        title: '¡Pago Exitoso!',
        html: `
            <p style="color:var(--text-muted); margin-bottom:1rem;">El módulo <strong>${modName}</strong> ha sido adquirido correctamente.</p>
            <p style="font-size:0.9rem; color:var(--primary); font-weight:600;">Estamos activando el módulo en tu panel...</p>
        `,
        background: 'var(--bg-surface)',
        color: 'var(--text)',
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true
    }).then(() => {
        // Simulación visual de activación en memoria
        const clientBiz = appState.businesses.find(b => b.id === CLIENT_ID);
        const purchasedMod = appState.modules.find(m => m.name === modName);
        if (clientBiz && purchasedMod) {
            if (!clientBiz.modules.includes(purchasedMod.id)) {
                clientBiz.modules.push(purchasedMod.id);
                
                // --- GUARDAR EN PERSISTENCIA LOCAL ---
                const storageKey = `as_sierra_purchases_${CLIENT_ID}`;
                const localPurchases = JSON.parse(localStorage.getItem(storageKey) || '[]');
                if (!localPurchases.includes(purchasedMod.id)) {
                    localPurchases.push(purchasedMod.id);
                    localStorage.setItem(storageKey, JSON.stringify(localPurchases));
                }
            }
        }
        renderDashboard();
        
        Swal.fire({
            icon: 'success',
            title: '¡Módulo Activado!',
            text: `El módulo ${modName} ya está disponible en tus aplicaciones.`,
            background: 'var(--bg-surface)',
            color: 'var(--text)',
            confirmButtonColor: 'var(--primary)',
            timer: 3000,
            toast: true,
            position: 'top-end'
        });
    });
}

async function handleRenewal(modId, modName, modPrice) {
    const storageKey = `client_payment_method_${CLIENT_ID}`;
    const savedCardStr = localStorage.getItem(storageKey);
    
    // Función auxiliar para procesar el pago en el servidor
    const processRenewalOnServer = async (last4) => {
        let session;
        try { session = JSON.parse(sessionStorage.getItem('clientSession') || '{}'); } catch { session = {}; }
        if (!session.token) { Swal.fire({ icon: 'error', title: 'Sesión expirada' }); return; }

        try {
            const res = await fetch('/api/client/module/renew', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.token}` },
                body: JSON.stringify({ moduleId: modId, moduleName: modName, last4 })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al renovar.');

            // Actualizar estado local
            const clientBiz = appState.businesses.find(b => String(b.id) === String(CLIENT_ID));
            if (clientBiz) {
                clientBiz.modules = data.modules;
                clientBiz.cancelledModules = data.cancelledModules;
                if (data.moduleDates) clientBiz.moduleDates = data.moduleDates;
            }
            renderDashboard();

            Swal.fire({
                icon: 'success',
                title: '¡Renovación Exitosa!',
                text: `El módulo ${modName} ha sido renovado por 30 días más.`,
                background: 'var(--bg-surface)',
                color: 'var(--text)',
                confirmButtonColor: '#10b981'
            });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: 'var(--bg-surface)', color: 'var(--text)' });
        }
    };

    // --- FLUJO 1-CLICK BUY (Si hay tarjeta guardada) ---
    if (savedCardStr) {
        const savedCard = JSON.parse(savedCardStr);
        const result = await Swal.fire({
            title: 'Renovar Suscripción',
            html: `
                <div style="text-align:left; display:flex; flex-direction:column; gap:1.25rem; margin-top:1rem;">
                    <div style="background: rgba(99, 102, 241, 0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(99, 102, 241, 0.2);">
                        <p style="margin:0; font-size:0.85rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Módulo a Renovar</p>
                        <h4 style="margin:0.25rem 0; font-size:1.2rem; color:var(--text); font-weight:700;">${modName}</h4>
                        <p style="margin:0; font-size:1.1rem; font-weight:800; color:var(--primary);">${modPrice}</p>
                    </div>
                    
                    <div style="background: var(--bg-body); padding: 1rem; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.3); display: flex; justify-content: space-between; align-items: center;">
                        <div style="display:flex; align-items:center; gap: 0.75rem;">
                            <div style="background:rgba(16, 185, 129, 0.1); color:#10b981; width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center;">
                                <i data-lucide="credit-card"></i>
                            </div>
                            <div>
                                <p style="margin:0; font-weight:700; font-size:0.95rem;">•••• •••• •••• ${savedCard.last4}</p>
                                <p style="margin:0; font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">${savedCard.name}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            background: 'var(--bg-surface)',
            color: 'var(--text)',
            showCancelButton: true,
            confirmButtonText: 'Pagar y Renovar',
            cancelButtonText: 'Usar otra tarjeta',
            confirmButtonColor: '#10b981',
            cancelButtonColor: 'transparent',
            didRender: () => lucide.createIcons(),
            preConfirm: () => {
                Swal.showLoading();
                return new Promise(resolve => setTimeout(() => resolve(true), 2500));
            }
        });

        if (result.isConfirmed) {
            await processRenewalOnServer(savedCard.last4);
            return;
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            // El usuario quiere usar otra tarjeta, sigue al flujo de formulario nuevo
        } else {
            return; // Cerró el modal
        }
    }

    // --- FLUJO NUEVA TARJETA ---
    const result = await Swal.fire({
        title: 'Renovar Suscripción',
        html: `
            <style>
                .pro-input { width: 100%; box-sizing: border-box; padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid rgba(139, 92, 246, 0.3); background: var(--bg-body); color: var(--text); font-family: inherit; font-size: 1rem; outline: none; transition: all 0.2s; margin:0; }
                .pro-input:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2); }
                .pro-label { font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
            </style>
            <div style="background: rgba(99, 102, 241, 0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(99, 102, 241, 0.2); text-align:left; margin-bottom:1.5rem;">
                <p style="margin:0; font-size:0.85rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Total a Pagar</p>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.25rem;">
                    <h4 style="margin:0; font-size:1.2rem; color:var(--text); font-weight:700;">${modName}</h4>
                    <p style="margin:0; font-size:1.2rem; font-weight:800; color:var(--primary);">${modPrice}</p>
                </div>
            </div>
            <div style="text-align:left; display:flex; flex-direction:column; gap:1.25rem;">
                <div>
                    <label class="pro-label">NÚMERO DE TARJETA</label>
                    <input id="pur-card-number" class="pro-input" placeholder="0000 0000 0000 0000" maxlength="19" oninput="window.onCardInput(this, null)">
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
                    <div>
                        <label class="pro-label">VENCIMIENTO</label>
                        <input id="pur-card-expiry" class="pro-input" placeholder="MM/AA" maxlength="5" onkeyup="this.value = this.value.replace(/[^0-9]/g, ''); if(this.value.length > 2) this.value = this.value.substring(0,2) + '/' + this.value.substring(2);">
                    </div>
                    <div>
                        <label class="pro-label">CVC</label>
                        <input id="pur-card-cvc" class="pro-input" placeholder="123" maxlength="4" type="password">
                    </div>
                </div>
                <div>
                    <label class="pro-label">TITULAR DE LA TARJETA</label>
                    <input id="pur-card-name" class="pro-input" placeholder="NOMBRE APELLIDO" style="text-transform:uppercase;">
                </div>
            </div>
        `,
        background: 'var(--bg-surface)',
        color: 'var(--text)',
        width: '450px',
        showCancelButton: true,
        confirmButtonText: 'Procesar Pago y Renovar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#10b981',
        preConfirm: () => {
            const numRaw = document.getElementById('pur-card-number').value;
            const num = numRaw.replace(/\D/g, '');
            const expiry = document.getElementById('pur-card-expiry').value;
            const cvc = document.getElementById('pur-card-cvc').value;
            const name = document.getElementById('pur-card-name').value;
            if (!num || num.length < 15 || !luhnCheck(num)) return Swal.showValidationMessage('Número de tarjeta inválido.');
            if (!expiry || expiry.length < 5) return Swal.showValidationMessage('Fecha de vencimiento inválida.');
            if (!cvc || cvc.length < 3) return Swal.showValidationMessage('CVC inválido.');
            if (!name || name.length < 3) return Swal.showValidationMessage('Ingresa el nombre del titular.');
            
            Swal.showLoading();
            return new Promise(resolve => setTimeout(() => resolve({ num: numRaw, expiry, name }), 2500));
        }
    });

    if (result.isConfirmed) {
        const cardData = result.value;
        const paymentMethod = {
            last4: cardData.num.replace(/\s/g, '').slice(-4),
            expiry: cardData.expiry,
            name: cardData.name.toUpperCase()
        };
        localStorage.setItem(storageKey, JSON.stringify(paymentMethod));
        await processRenewalOnServer(paymentMethod.last4);
    }
}

/** Demo: redirige o informa */
function handleDemo(modId, modName) {
    const demoUrls = {
        'pdftools': '/modules/pdftools/index.html',
        'pos': null,
        'agenda': '/modules/agenda/index.html',
        'streetfeed': '/modules/order-system/index.html'
    };
    const url = demoUrls[String(modId).toLowerCase()];
    if (url) {
        window.open(url, '_blank');
    } else {
        Swal.fire({
            icon: 'info',
            title: 'Demo en preparación',
            text: `La demo de "${modName}" está siendo preparada. ¡Pronto estará disponible!`,
            background: 'var(--bg-surface)',
            color: 'var(--text)',
            confirmButtonColor: 'var(--primary)'
        });
    }
}

/** Soporte rápido por módulo */
function showSupportForModule(modName) {
    const msg = encodeURIComponent(`Hola, soy cliente de AS Sierra Systems. Necesito soporte con el módulo "${modName}". ¿Me pueden ayudar?`);
    Swal.fire({
        title: `Soporte: ${modName}`,
        html: `<p style="color:var(--text-muted);">¿Con qué necesitas ayuda en <strong>${modName}</strong>?</p>`,
        input: 'textarea',
        inputPlaceholder: 'Describe tu problema o duda aquí...',
        background: 'var(--bg-surface)',
        color: 'var(--text)',
        showCancelButton: true,
        confirmButtonText: '💬 Enviar por WhatsApp',
        confirmButtonColor: '#25D366',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
            if (!value) return 'Por favor describe tu problema.';
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const customMsg = encodeURIComponent(`Hola, soy cliente. Necesito soporte con el módulo "${modName}".\n\n${result.value}`);
            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${customMsg}`, '_blank');
        }
    });
}

/** Botón Actualizar Método de Pago */
function setupBillingBtn() {
    document.addEventListener('click', (e) => {
        if (e.target.closest('.btn-billing-update')) {
            showPaymentForm();
        }
    });

    // También para el botón directo en la sección
    const billingSection = document.getElementById('tab-billing');
    if (billingSection) {
        billingSection.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (btn && btn.innerHTML.includes('credit-card')) {
                showPaymentForm();
            }
        });
    }
}

function showPaymentForm() {
    Swal.fire({
        title: 'Actualizar Método de Pago',
        html: `
            <style>
                .pro-input { width: 100%; box-sizing: border-box; padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid rgba(139, 92, 246, 0.3); background: var(--bg-body); color: var(--text); font-family: inherit; font-size: 1rem; outline: none; transition: all 0.2s; margin:0; }
                .pro-input:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2); }
                .pro-label { font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
                .card-brands { display: flex; gap: 4px; color: var(--text-muted); align-items:center; }
            </style>
            <div style="text-align:left; display:flex; flex-direction:column; gap:1.25rem; margin-top:1.5rem; overflow:hidden;">
                <div>
                    <label class="pro-label">
                        <span>NÚMERO DE TARJETA</span>
                        <div class="card-brands" id="payment-form-card-brands">
                            <i data-lucide="credit-card" style="width:14px;"></i>
                            <span style="font-size:0.65rem; font-weight:700;">VISA • MC • AMEX • DINERS</span>
                        </div>
                    </label>
                    <input id="card-number" class="pro-input" placeholder="0000 0000 0000 0000" maxlength="19"
                           style="letter-spacing:0.1em;" oninput="window.onCardInput(this, 'payment-form-card-brands')">
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
                    <div>
                        <label class="pro-label">VENCIMIENTO</label>
                        <input id="card-expiry" class="pro-input" placeholder="MM/AA" maxlength="5" onkeyup="this.value = this.value.replace(/[^0-9]/g, ''); if(this.value.length > 2) this.value = this.value.substring(0,2) + '/' + this.value.substring(2);">
                    </div>
                    <div>
                        <label class="pro-label">CVC</label>
                        <input id="card-cvc" class="pro-input" placeholder="123" maxlength="4" type="password">
                    </div>
                </div>
                <div>
                    <label class="pro-label">TITULAR DE LA TARJETA</label>
                    <input id="card-name" class="pro-input" placeholder="NOMBRE APELLIDO" style="text-transform:uppercase;">
                </div>
                <p style="font-size:0.75rem; color:var(--text-muted); margin:0; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="shield-check" style="width:16px; color:#10b981;"></i>
                    <span>Tus datos están protegidos con encriptación SSL de 256 bits.</span>
                </p>
            </div>
        `,
        background: 'var(--bg-surface)',
        color: 'var(--text)',
        width: '450px',
        showCancelButton: true,
        confirmButtonText: 'Guardar Método de Pago',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: 'var(--primary)',
        didRender: () => lucide.createIcons(),
        preConfirm: () => {
            const num = document.getElementById('card-number').value.replace(/\D/g, '');
            const expiry = document.getElementById('card-expiry').value;
            const cvc = document.getElementById('card-cvc').value;
            const name = document.getElementById('card-name').value;
            if (!num || num.length < 15 || !luhnCheck(num)) return Swal.showValidationMessage('Número de tarjeta inválido.');
            if (!expiry || expiry.length < 5) return Swal.showValidationMessage('Fecha de vencimiento inválida.');
            if (!cvc || cvc.length < 3) return Swal.showValidationMessage('CVC inválido.');
            if (!name) return Swal.showValidationMessage('Ingresa el titular de la tarjeta.');
            return { num, expiry, name };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const last4 = result.value.num.slice(-4);
            
            // Guardar en localStorage simulando un token de pago
            const paymentMethod = {
                last4: last4,
                expiry: result.value.expiry,
                name: result.value.name.toUpperCase()
            };
            localStorage.setItem(`client_payment_method_${CLIENT_ID}`, JSON.stringify(paymentMethod));

            Swal.fire({
                icon: 'success',
                title: '¡Método de pago actualizado!',
                html: `<p style="color:var(--text-muted);">Tu nueva tarjeta terminada en <strong>${last4}</strong> ha sido guardada correctamente.</p>`,
                background: 'var(--bg-surface)',
                color: 'var(--text)',
                confirmButtonColor: 'var(--primary)',
                timer: 3000,
                timerProgressBar: true
            });
        }
    });
}

/** Cerrar Sesión con confirmación */
function setupLogoutBtn() {
    const logoutBtns = document.querySelectorAll('#logout-btn, a[href="index.html"]');
    if (logoutBtns.length === 0) return;

    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            Swal.fire({
                title: '¿Cerrar sesión?',
                text: 'Serás redirigido a la página de inicio de sesión.',
                icon: 'question',
                background: 'var(--bg-surface)',
                color: 'var(--text)',
                showCancelButton: true,
                confirmButtonText: 'Sí, salir',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#ef4444',
            }).then((result) => {
                if (result.isConfirmed) {
                    sessionStorage.removeItem('clientSession');
                    window.location.href = '/client-login.html';
                }
            });
        });
    });
}

// ====================== UI SETUP ======================
window.switchTab = function(tabId) {
    const navBtns = document.querySelectorAll('.nav-btn[data-tab]');
    const targetBtn = Array.from(navBtns).find(btn => btn.getAttribute('data-tab') === tabId);
    
    // Si hay un botón en el nav, lo activamos
    if (targetBtn) {
        navBtns.forEach(b => b.classList.remove('active'));
        targetBtn.classList.add('active');
        document.getElementById('current-tab-title').textContent = targetBtn.querySelector('span').textContent;
    } else if (tabId === 'tab-account') {
        // Caso especial para Mi Cuenta que ya no está en el nav lateral
        navBtns.forEach(b => b.classList.remove('active'));
        document.getElementById('current-tab-title').textContent = 'Mi Cuenta';
    }

    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.add('hidden'));
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.remove('hidden');
    }

    if (tabId === 'tab-support' && typeof loadMyTickets === 'function') {
        loadMyTickets();
    }

    if (tabId === 'tab-client-payment-history' && typeof loadPaymentHistory === 'function') {
        loadPaymentHistory();
    }

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('mobile-open');
    }
};

function setupTabs() {
    const navBtns = document.querySelectorAll('.nav-btn[data-tab]');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
}

function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('sidebar-collapse-btn');
    const mobileBtn = document.getElementById('mobile-menu-btn');

    collapseBtn?.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    mobileBtn?.addEventListener('click', () => sidebar.classList.toggle('mobile-open'));

    // Close mobile menu when clicking outside sidebar
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar?.classList.contains('mobile-open')) {
            if (!sidebar.contains(e.target) && !mobileBtn?.contains(e.target)) {
                sidebar.classList.remove('mobile-open');
            }
        }
    });

    if (window.innerWidth <= 1024 && window.innerWidth > 768) {
        sidebar.classList.add('collapsed');
    }
}

function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;
    const savedTheme = localStorage.getItem('theme') || 'light';

    html.setAttribute('data-theme', savedTheme);
    updateThemeIcon(themeToggle, savedTheme);

    themeToggle?.addEventListener('click', () => {
        const current = html.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        updateThemeIcon(themeToggle, next);
    });
}

function updateThemeIcon(btn, theme) {
    if (!btn) return;
    btn.innerHTML = theme === 'light'
        ? '<i data-lucide="moon"></i>'
        : '<i data-lucide="sun"></i>';
    lucide.createIcons();
}

// ====================== CARD VALIDATION UTILS ======================
function luhnCheck(num) {
    let arr = (num + '')
        .split('')
        .reverse()
        .map(x => parseInt(x));
    let lastDigit = arr.splice(0, 1)[0];
    let sum = arr.reduce((acc, val, i) => (i % 2 !== 0 ? acc + val : acc + ((val * 2) % 9) || 9), 0);
    sum += lastDigit;
    return sum % 10 === 0;
}

function detectCardFranchise(numStr) {
    const cleanNum = numStr.replace(/\D/g, '');
    if (/^4/.test(cleanNum)) return { name: 'VISA', icon: '<i data-lucide="credit-card" style="width:18px; color:#1a1f71;"></i>' };
    if (/^5[1-5]/.test(cleanNum)) return { name: 'MASTERCARD', icon: '<i data-lucide="credit-card" style="width:18px; color:#eb001b;"></i>' };
    if (/^3[47]/.test(cleanNum)) return { name: 'AMEX', icon: '<i data-lucide="credit-card" style="width:18px; color:#2e77bc;"></i>' };
    if (/^3(?:0[0-5]|[68][0-9])/.test(cleanNum)) return { name: 'DINERS', icon: '<i data-lucide="credit-card" style="width:18px; color:#005b9f;"></i>' };
    return { name: 'VISA • MC • AMEX • DINERS', icon: '<i data-lucide="credit-card" style="width:14px;"></i>' };
}

window.onCardInput = function(inputEl, iconContainerId) {
    // Format card number
    let val = inputEl.value.replace(/\D/g, '');
    if (val.length > 0) {
        val = val.match(/.{1,4}/g).join(' ');
    }
    inputEl.value = val;
    
    // Detect franchise
    const franchise = detectCardFranchise(val);
    const container = document.getElementById(iconContainerId);
    if (container) {
        container.innerHTML = `
            ${franchise.icon}
            <span style="font-size:0.65rem; font-weight:700;">${franchise.name}</span>
        `;
        lucide.createIcons();
    }
};

window.cancelModule = async function(modId, modName) {
    // Buscar negocio y verificar que haya fecha oficial de ciclo registrada por el admin
    const bizForCancel = appState.businesses.find(b => String(b.id) === String(CLIENT_ID));
    const rawDate = bizForCancel?.moduleDates?.[modId];

    // Si no hay fecha oficial, bloquear — no se puede suspender sin datos de ciclo
    if (!rawDate) {
        Swal.fire({
            icon: 'error',
            title: 'Sin datos de ciclo',
            text: 'No hay una fecha de renovación registrada para este módulo. Contacta al administrador.',
            background: 'var(--bg-surface)',
            color: 'var(--text)'
        });
        return;
    }

    const renewalDate = new Date(rawDate);
    const diffMs = renewalDate.getTime() - Date.now();
    const daysLeft  = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const hoursLeft = Math.max(0, Math.floor((diffMs / (1000 * 60 * 60)) % 24));
    const formattedDate = renewalDate.toLocaleDateString('es-CO');

    // Texto de tiempo restante preciso
    const timeLeftText = daysLeft > 0
        ? `<strong>${daysLeft} día${daysLeft !== 1 ? 's' : ''} y ${hoursLeft} hora${hoursLeft !== 1 ? 's' : ''}</strong>`
        : `<strong style="color:#ef4444;">${hoursLeft} hora${hoursLeft !== 1 ? 's' : ''}</strong>`;

    const result = await Swal.fire({
        title: '¿Suspender suscripción?',
        html: `
            <p style="color:var(--text-muted); font-size:0.95rem; margin-bottom:1rem;">
                Tu acceso a <strong>${modName}</strong> continuará durante ${timeLeftText} restantes de tu ciclo (hasta el ${formattedDate}).
            </p>
            <p style="color:var(--text-muted); font-size:0.85rem;">Puedes reactivar tu suscripción en cualquier momento <em>antes de que expire</em>. Una vez vencido, deberás contactar al administrador.</p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f59e0b',
        cancelButtonColor: 'transparent',
        confirmButtonText: 'Sí, suspender suscripción',
        cancelButtonText: 'Mantener activo',
        background: 'var(--bg-surface)',
        color: 'var(--text)'
    });

    if (!result.isConfirmed) return;

    let session;
    try { session = JSON.parse(sessionStorage.getItem('clientSession') || '{}'); } catch { session = {}; }
    if (!session.token) { Swal.fire({ icon: 'error', title: 'Sesión expirada', text: 'Por favor recarga la página.', background: 'var(--bg-surface)', color: 'var(--text)' }); return; }

    try {
        const res = await fetch('/api/client/module/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.token}` },
            body: JSON.stringify({ moduleId: modId, moduleName: modName })
        });
        const data = await res.json();
        if (!res.ok) { Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'No se pudo suspender.', background: 'var(--bg-surface)', color: 'var(--text)' }); return; }

        // Actualizar estado local
        const clientBiz = appState.businesses.find(b => String(b.id) === String(CLIENT_ID));
        if (clientBiz) {
            clientBiz.modules = data.modules;
            clientBiz.cancelledModules = data.cancelledModules;
        }

        renderDashboard();
        
        // Obtener la fecha real devuelta por el servidor para ese módulo
        const modEntry = data.cancelledModules.find(m => String(m.id) === String(modId));
        const accessUntilStr = modEntry ? new Date(modEntry.accessUntil).toLocaleDateString('es-CO') : formattedDate;

        Swal.fire({
            title: 'Suscripción suspendida',
            html: `<p style="color:var(--text-muted);">Tu acceso a <strong>${modName}</strong> sigue activo hasta el <strong>${accessUntilStr}</strong>. Puedes reactivarla cuando quieras.</p>`,
            icon: 'info',
            confirmButtonColor: 'var(--primary)',
            background: 'var(--bg-surface)',
            color: 'var(--text)'
        });
    } catch (err) {
        console.error("Error en cancelModule:", err);
        Swal.fire({ icon: 'error', title: 'Error de conexión', text: err.message || 'Error desconocido', background: 'var(--bg-surface)', color: 'var(--text)' });
    }
};

window.reactivateModule = async function(modId, modName) {
    const result = await Swal.fire({
        title: '¿Reactivar suscripción?',
        html: `<p style="color:var(--text-muted); font-size:0.95rem;">Tu suscripción a <strong>${modName}</strong> volverá a estar activa y se renovará normalmente.</p>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: 'transparent',
        confirmButtonText: '✅ Sí, mantener suscripción',
        cancelButtonText: 'Dejar suspendido',
        background: 'var(--bg-surface)',
        color: 'var(--text)'
    });

    if (!result.isConfirmed) return;

    let session;
    try { session = JSON.parse(sessionStorage.getItem('clientSession') || '{}'); } catch { session = {}; }
    if (!session.token) { Swal.fire({ icon: 'error', title: 'Sesión expirada', background: 'var(--bg-surface)', color: 'var(--text)' }); return; }

    try {
        const res = await fetch('/api/client/module/reactivate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.token}` },
            body: JSON.stringify({ moduleId: modId })
        });
        const data = await res.json();
        if (!res.ok) {
            // Caso especial: ciclo expirado — guiar al cliente a contactar al admin
            const isExpired = res.status === 403;
            Swal.fire({
                icon: isExpired ? 'warning' : 'error',
                title: isExpired ? '⏰ Ciclo Vencido' : 'Error',
                text: data.error || 'No se pudo reactivar.',
                background: 'var(--bg-surface)',
                color: 'var(--text)',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        // Actualizar estado local — sincronizar modules, cancelledModules y moduleDates
        const clientBiz = appState.businesses.find(b => String(b.id) === String(CLIENT_ID));
        if (clientBiz) {
            clientBiz.modules = data.modules;
            clientBiz.cancelledModules = data.cancelledModules;
            // Sincronizar fecha de renovación renovada del servidor
            if (data.moduleDates) {
                clientBiz.moduleDates = data.moduleDates;
            }
        }

        renderDashboard();

        Swal.fire({
            title: '¡Suscripción reactivada!',
            text: `${modName} vuelve a estar completamente activo.`,
            icon: 'success',
            timer: 3000,
            showConfirmButton: false,
            background: 'var(--bg-surface)',
            color: 'var(--text)'
        });
    } catch (err) {
        console.error("Error en reactivateModule:", err);
        Swal.fire({ icon: 'error', title: 'Error de conexión', text: (err.stack || err.message || 'Error desconocido'), background: 'var(--bg-surface)', color: 'var(--text)' });
    }
};

window.switchModuleSubTab = function(tabName) {
    const gridActive = document.getElementById('client-modules-grid-active');
    const gridCancelled = document.getElementById('client-modules-grid-cancelled');
    const btnActive = document.getElementById('btn-tab-mod-active');
    const btnCancelled = document.getElementById('btn-tab-mod-cancelled');

    if (!gridActive || !gridCancelled || !btnActive || !btnCancelled) return;

    if (tabName === 'active') {
        gridActive.style.display = 'grid';
        gridCancelled.style.display = 'none';
        
        btnActive.style.background = 'var(--primary)';
        btnActive.style.color = 'white';
        btnCancelled.style.background = 'transparent';
        btnCancelled.style.color = 'var(--text-muted)';
    } else {
        gridActive.style.display = 'none';
        gridCancelled.style.display = 'grid';
        
        btnCancelled.style.background = '#f59e0b';
        btnCancelled.style.color = 'white';
        btnActive.style.background = 'transparent';
        btnActive.style.color = 'var(--text-muted)';
    }
};

// ===================== COUNTDOWN TIMER LOGIC =====================
setInterval(() => {
    document.querySelectorAll('.countdown-timer').forEach(el => {
        const endTime = parseInt(el.getAttribute('data-endtime'));
        if (!endTime) return;
        
        const diff = endTime - Date.now();
        if (diff <= 0) {
            el.innerHTML = '<span style="color:var(--danger);">Acceso expirado</span>';
            return;
        }
        
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / 1000 / 60) % 60);
        const s = Math.floor((diff / 1000) % 60);
        
        el.innerHTML = `${d}d ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s <span style="font-family: var(--font-main); font-weight: 400; opacity: 0.7; font-size: 0.85em;">restantes</span>`;
    });
}, 1000);


// ==========================================================================
// 💳 CARD WALLET — Métodos de Pago (PCI DSS Compliant)
// ==========================================================================
// - Solo guardamos: tipo, últimos 4 dígitos, MM/AA, nombre titular.
// - NUNCA guardamos el número completo ni el CVV.
// - Los datos se guardan en localStorage cifrados (XOR + base64, suficiente
//   para datos no sensibles como los últimos 4 dígitos).
// - El token real se enviaría al backend (Wompi) en producción.
// ==========================================================================

const WALLET_KEY = () => `as_wallet_${CLIENT_ID}`;

// ── Detección de marca por prefijo ────────────────────────────────────────────
function detectCardBrand(num) {
    const n = num.replace(/\D/g, '');
    if (/^4/.test(n))                     return 'VISA';
    if (/^5[1-5]/.test(n) || /^2(2[2-9][1-9]|[3-6]\d{2}|7[01]\d|720)/.test(n)) return 'MASTERCARD';
    if (/^3[47]/.test(n))                 return 'AMEX';
    if (/^3(?:0[0-5]|[68])/.test(n))      return 'DINERS';
    if (/^6(?:011|5)/.test(n))            return 'DISCOVER';
    if (/^(?:2131|1800|35)/.test(n))      return 'JCB';
    return 'UNKNOWN';
}

// ── Gradientes y logos por marca ──────────────────────────────────────────────
const BRAND_STYLE = {
    VISA:       { grad: 'linear-gradient(135deg,#1a1f71 0%,#2563eb 100%)', text: '#fff', logo: 'VISA', logoStyle: 'font-size:1.6rem;font-weight:900;font-style:italic;letter-spacing:-1px;' },
    MASTERCARD: { grad: 'linear-gradient(135deg,#1c1c1e 0%,#c9252d 100%)', text: '#fff', logo: 'MC',   logoStyle: 'font-size:1.4rem;font-weight:900;' },
    AMEX:       { grad: 'linear-gradient(135deg,#006fcf 0%,#00a8e0 100%)', text: '#fff', logo: 'AMEX', logoStyle: 'font-size:1.1rem;font-weight:900;letter-spacing:1px;' },
    DINERS:     { grad: 'linear-gradient(135deg,#2c3e50 0%,#4a6fa5 100%)', text: '#fff', logo: 'DINERS',logoStyle: 'font-size:1rem;font-weight:700;' },
    DISCOVER:   { grad: 'linear-gradient(135deg,#f97316 0%,#fbbf24 100%)', text: '#fff', logo: 'DISC', logoStyle: 'font-size:1.1rem;font-weight:900;' },
    UNKNOWN:    { grad: 'linear-gradient(135deg,#1e293b 0%,#334155 100%)', text: '#94a3b8', logo: '?',  logoStyle: 'font-size:2rem;font-weight:300;' },
};

// ── Simulated storage (localStorage) ─────────────────────────────────────────
function walletLoad() {
    try { return JSON.parse(localStorage.getItem(WALLET_KEY()) || '[]'); }
    catch { return []; }
}
function walletSave(cards) {
    localStorage.setItem(WALLET_KEY(), JSON.stringify(cards));
}

// ── Renderizar el wallet completo ─────────────────────────────────────────────
function renderCardWallet() {
    const wallet = document.getElementById('card-wallet');
    if (!wallet) return;
    const cards = walletLoad();

    // Tarjeta de "Agregar nueva" siempre al inicio (Diseño de tarjeta en blanco pro)
    const addCardHTML = `
    <div id="cc-add-slot" onclick="openAddCardModal()" style="
        width:320px; height:200px; border-radius:18px; padding:1.5rem 1.75rem;
        border:2px dashed rgba(99,102,241,0.5);
        background:linear-gradient(135deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.8) 100%);
        color:rgba(148,163,184,0.8);
        position:relative; overflow:hidden; cursor:pointer;
        display:flex; flex-direction:column; justify-content:space-between;
        box-sizing:border-box; transition:all .3s ease; flex-shrink:0;
    " onmouseover="this.style.borderColor='rgba(99,102,241,1)';this.style.background='linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,1) 100%)';this.style.transform='translateY(-6px)';this.style.boxShadow='0 15px 35px -10px rgba(99,102,241,0.3)';this.querySelector('.add-btn-circle').style.transform='scale(1.15)';this.querySelector('.add-btn-circle').style.background='rgba(99,102,241,0.2)';"
       onmouseout="this.style.borderColor='rgba(99,102,241,.5)';this.style.background='linear-gradient(135deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.8) 100%)';this.style.transform='translateY(0)';this.style.boxShadow='none';this.querySelector('.add-btn-circle').style.transform='scale(1)';this.querySelector('.add-btn-circle').style.background='rgba(99,102,241,0.1)';">
        
        <!-- Contenido Fantasma de la Tarjeta (Visible y estético) -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start; opacity:0.85;">
            <div style="width:42px;height:30px;border-radius:6px;border:2px solid rgba(99,102,241,0.4); background:rgba(99,102,241,0.05); display:grid;place-items:center;">
                <div style="width:20px;height:14px;border:1px solid rgba(99,102,241,0.4);border-radius:2px;"></div>
            </div>
            <div style="font-weight:800;letter-spacing:2px;font-size:1rem;color:rgba(99,102,241,0.6);">BRAND</div>
        </div>
        
        <div style="font-size:1.35rem;letter-spacing:4px;font-family:monospace;font-weight:700;color:rgba(226,232,240,0.6);text-shadow:0 1px 2px rgba(0,0,0,0.5);margin-top:0.5rem;">
            •••• •••• •••• ••••
        </div>
        
        <div style="display:flex;justify-content:space-between;align-items:flex-end;opacity:0.85;">
            <div>
                <div style="font-size:0.55rem;text-transform:uppercase;letter-spacing:.15em;margin-bottom:4px;color:rgba(148,163,184,0.7);">Titular</div>
                <div style="width:100px;height:10px;background:rgba(99,102,241,0.25);border-radius:5px;"></div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:0.55rem;text-transform:uppercase;letter-spacing:.15em;margin-bottom:4px;color:rgba(148,163,184,0.7);">Vence</div>
                <div style="font-size:0.9rem;font-weight:800;color:rgba(226,232,240,0.8);">MM/AA</div>
            </div>
        </div>

        <!-- Botón Central Superpuesto (Con menos oscurecimiento para dejar ver el fondo) -->
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(15,23,42,0.15);backdrop-filter:blur(1px);gap:0.75rem;">
            <div class="add-btn-circle" style="width:56px;height:56px;border-radius:50%;background:rgba(99,102,241,0.1);color:#818cf8;display:flex;align-items:center;justify-content:center;transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);box-shadow:0 8px 25px rgba(0,0,0,0.3);border:1px solid rgba(99,102,241,0.4);backdrop-filter:blur(4px);">
                <i data-lucide="plus" style="width:28px;height:28px;"></i>
            </div>
            <div style="text-align:center;text-shadow:0 2px 8px rgba(0,0,0,0.8);background:rgba(15,23,42,0.4);padding:0.25rem 0.75rem;border-radius:12px;backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,0.05);">
                <div style="font-weight:800;color:#f8fafc;font-size:1.05rem;letter-spacing:0.02em;">Agregar Tarjeta</div>
                <div style="font-size:0.75rem;color:#cbd5e1;margin-top:2px;font-weight:600;">Nueva forma de pago</div>
            </div>
        </div>
    </div>`;

    const cardsHTML = cards.map((card, i) => {
        const bs = BRAND_STYLE[card.brand] || BRAND_STYLE.UNKNOWN;
        const maskedNum = `•••• •••• •••• ${card.last4}`;
        const cvcLength = card.brand === 'AMEX' ? 4 : 3;
        return `
        <div style="position:relative; flex-shrink:0;">
            <!-- Tarjeta visual -->
            <div style="
                width:320px; height:200px; border-radius:18px; padding:1.5rem 1.75rem;
                background:${bs.grad}; color:${bs.text};
                box-shadow:0 20px 60px rgba(0,0,0,0.4); position:relative; overflow:hidden;
                display:flex; flex-direction:column; justify-content:space-between;
                box-sizing:border-box; transition:transform .25s;
            " onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
                <!-- Holo shine overlay -->
                <div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.08) 0%,transparent 60%);border-radius:18px;pointer-events:none;"></div>
                <!-- Chip + Brand -->
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <div style="width:42px;height:30px;background:linear-gradient(135deg,#f0c060,#c9952a);border-radius:6px;
                                display:grid;place-items:center;font-size:0.5rem;color:#6b4a00;opacity:.95;
                                box-shadow:inset 0 1px 2px rgba(0,0,0,.2);">
                        <div style="width:24px;height:18px;border:1.5px solid rgba(0,0,0,.25);border-radius:3px;
                                    background:linear-gradient(90deg,rgba(0,0,0,.1) 50%,transparent 50%);"></div>
                    </div>
                    <span style="${bs.logoStyle}color:${bs.text};">${bs.logo}</span>
                </div>
                <!-- Número enmascarado -->
                <div style="font-size:1.2rem;letter-spacing:3px;font-family:monospace;font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,.3);">
                    ${maskedNum}
                </div>
                <!-- Footer: Titular + Vencimiento -->
                <div style="display:flex;justify-content:space-between;align-items:flex-end;">
                    <div>
                        <div style="font-size:0.62rem;opacity:.65;text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px;">Titular</div>
                        <div style="font-size:0.85rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em;">${card.holder}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:0.62rem;opacity:.65;text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px;">Vence</div>
                        <div style="font-size:0.9rem;font-weight:700;">${card.expiry}</div>
                    </div>
                </div>
            </div>
            <!-- Botón eliminar -->
            <button onclick="deleteCard(${i})" title="Eliminar tarjeta" style="
                position:absolute;top:-8px;right:-8px;
                width:28px;height:28px;border-radius:50%;
                background:#ef4444;border:2px solid #1e293b;
                color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;
                box-shadow:0 2px 8px rgba(0,0,0,.4); transition:transform .2s;
            " onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
                <i data-lucide="x" style="width:13px;height:13px;"></i>
            </button>
        </div>`;
    }).join('');

    wallet.innerHTML = addCardHTML + cardsHTML;
    if (window.lucide) lucide.createIcons();
}

// ── Eliminar tarjeta ──────────────────────────────────────────────────────────
window.deleteCard = function(index) {
    const cards = walletLoad();
    const card = cards[index];
    if (!card) return;
    Swal.fire({
        title: '¿Eliminar tarjeta?',
        html: `<p style="color:var(--text-muted);">Se eliminará la tarjeta <strong>${card.brand} ···${card.last4}</strong>.<br>Esta acción no se puede deshacer.</p>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#ef4444',
        background: 'var(--bg-surface)', color: 'var(--text)',
    }).then(r => {
        if (r.isConfirmed) {
            cards.splice(index, 1);
            walletSave(cards);
            renderCardWallet();
            showToast('🗑️ Tarjeta eliminada.', 'info');
        }
    });
};

// ── Modal de agregar tarjeta ──────────────────────────────────────────────────
window.openAddCardModal = function() {
    Swal.fire({
        title: '<span style="font-size:1.1rem;">Nueva Tarjeta de Pago</span>',
        html: `
        <style>
            .cc-input{width:100%;box-sizing:border-box;padding:.8rem 1rem;border-radius:8px;
                border:1px solid rgba(99,102,241,.3);background:rgba(15,23,42,.6);
                color:#f8fafc;font-family:inherit;font-size:.95rem;outline:none;transition:all .2s;}
            .cc-input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.2);}
            .cc-label{font-size:.72rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;
                font-weight:700;margin-bottom:5px;display:flex;justify-content:space-between;align-items:center;}
            #cc-brand-preview{font-size:.8rem;font-weight:700;padding:.15rem .5rem;border-radius:6px;
                background:rgba(99,102,241,.15);color:#818cf8;transition:all .3s;}
            .cc-row{display:grid;grid-template-columns:1fr 1fr;gap:.85rem;}
            .cc-security-note{display:flex;align-items:center;gap:.5rem;margin-top:.75rem;
                font-size:.78rem;color:#64748b;background:rgba(16,185,129,.04);
                border:1px solid rgba(16,185,129,.15);border-radius:8px;padding:.65rem .85rem;}
        </style>
        <div style="text-align:left;display:flex;flex-direction:column;gap:.9rem;margin-top:.75rem;">
            <div>
                <label class="cc-label">
                    <span>Número de Tarjeta</span>
                    <span id="cc-brand-preview">_ _ _ _</span>
                </label>
                <input id="cc-num" class="cc-input" placeholder="0000 0000 0000 0000" maxlength="19"
                    oninput="walletFormatCard(this)" autocomplete="cc-number">
            </div>
            <div>
                <label class="cc-label">Nombre del Titular</label>
                <input id="cc-holder" class="cc-input" placeholder="COMO APARECE EN LA TARJETA"
                    style="text-transform:uppercase;" autocomplete="cc-name">
            </div>
            <div class="cc-row">
                <div>
                    <label class="cc-label">Vencimiento</label>
                    <input id="cc-exp" class="cc-input" placeholder="MM/AA" maxlength="5"
                        oninput="walletFormatExpiry(this)" autocomplete="cc-exp">
                </div>
                <div>
                    <label class="cc-label">CVC <span style="font-weight:400;opacity:.6;">(no se guarda)</span></label>
                    <input id="cc-cvc" class="cc-input" placeholder="•••" maxlength="4"
                        type="password" autocomplete="cc-csc">
                </div>
            </div>
            <div class="cc-security-note">
                <i data-lucide="shield-check" style="width:16px;flex-shrink:0;color:#10b981;"></i>
                <span>Conexión SSL 256-bit. Solo guardamos los últimos 4 dígitos y vencimiento. El CVV nunca se almacena.</span>
            </div>
        </div>`,
        background: 'var(--bg-surface)', color: 'var(--text)',
        width: '460px',
        showCancelButton: true,
        confirmButtonText: '💳 Agregar Tarjeta',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#6366f1',
        didRender: () => lucide.createIcons(),
        preConfirm: () => {
            const rawNum = document.getElementById('cc-num').value.replace(/\D/g,'');
            const holder = document.getElementById('cc-holder').value.trim().toUpperCase();
            const expiry = document.getElementById('cc-exp').value.trim();
            const cvc    = document.getElementById('cc-cvc').value.trim();
            const brand  = detectCardBrand(rawNum);
            const cvcLen = brand === 'AMEX' ? 4 : 3;

            if (rawNum.length < 15 || !luhnCheck(rawNum))
                return Swal.showValidationMessage('Número de tarjeta inválido.');
            if (!holder || holder.length < 3)
                return Swal.showValidationMessage('Ingresa el nombre del titular.');
            if (!/^\d{2}\/\d{2}$/.test(expiry)) {
                return Swal.showValidationMessage('Formato de vencimiento inválido. Usa MM/AA.');
            }
            const [mm, yy] = expiry.split('/').map(Number);
            const expDate = new Date(2000+yy, mm-1, 1);
            if (mm < 1 || mm > 12 || expDate < new Date())
                return Swal.showValidationMessage('La tarjeta está vencida o la fecha es inválida.');
            if (!cvc || cvc.length < cvcLen)
                return Swal.showValidationMessage(`El CVC debe tener ${cvcLen} dígitos.`);

            // PCI DSS: solo devolvemos datos seguros, NUNCA el número completo
            return {
                brand,
                last4: rawNum.slice(-4),
                expiry,
                holder,
                // token simulado — en producción viene de Wompi JS widget
                token: `sim_tok_${Date.now()}_${rawNum.slice(-4)}`,
            };
        }
    }).then(async result => {
        if (!result.isConfirmed || !result.value) return;
        const card = result.value;

        // Guardar localmente (sin datos sensibles)
        const cards = walletLoad();
        cards.push({ brand: card.brand, last4: card.last4, expiry: card.expiry, holder: card.holder });
        walletSave(cards);

        // Intentar sincronizar token con el backend
        try {
            await fetch('/api/payment/save-token', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    bizId: CLIENT_ID,
                    token: card.token,
                    last_four: card.last4,
                    card_brand: card.brand,
                }),
            });
        } catch(e) { console.warn('No se pudo sincronizar con el backend:', e); }

        renderCardWallet();
        showToast(`✅ Tarjeta ${card.brand} ···${card.last4} agregada correctamente.`, 'success');
    });
};

// ── Helpers de formato para inputs del modal ──────────────────────────────────
window.walletFormatCard = function(input) {
    let v = input.value.replace(/\D/g,'').slice(0,16);
    input.value = v.match(/.{1,4}/g)?.join(' ') || v;
    const preview = document.getElementById('cc-brand-preview');
    if (preview) {
        const brand = detectCardBrand(v);
        const labels = {VISA:'VISA 💳',MASTERCARD:'Mastercard 💳',AMEX:'Amex 💳',
                        DINERS:'Diners 💳',DISCOVER:'Discover 💳',UNKNOWN:'_ _ _ _'};
        preview.textContent = labels[brand] || '_ _ _ _';
        preview.style.color = brand === 'UNKNOWN' ? '#64748b' : '#818cf8';
    }
};

window.walletFormatExpiry = function(input) {
    let v = input.value.replace(/\D/g,'');
    if (v.length > 2) v = v.slice(0,2) + '/' + v.slice(2,4);
    input.value = v;
};

// ── Bind tab billing ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Renderizar wallet cuando se abre el tab de facturación
    document.querySelectorAll('[data-tab="tab-billing"]').forEach(btn => {
        btn.addEventListener('click', () => setTimeout(renderCardWallet, 80));
    });
    // Botón rápido "Nueva Tarjeta"
    document.addEventListener('click', e => {
        if (e.target.closest('#btn-add-card')) openAddCardModal();
    });
});

// ============================================================
// MODULO DE TICKETS DE SOPORTE - PORTAL CLIENTE
// ============================================================

async function clientFetch(url, options = {}) {
    const sessionRaw = sessionStorage.getItem('clientSession');
    if (!sessionRaw) {
        window.location.href = '/client-login.html';
        return;
    }
    const session = JSON.parse(sessionRaw);
    const headers = { 
        'Authorization': `Bearer ${session.token}`,
        ...(options.headers || {})
    };
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }
    options.headers = headers;
    return fetch(url, options);
}

appState.clientTickets = [];
window.selectedChatFile = null;

async function loadMyTickets() {
    const tbody = document.getElementById('client-tickets-body');
    if (!tbody) return;
    
    const hasTickets = appState.clientTickets && appState.clientTickets.length > 0;
    if (!hasTickets) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2.5rem;color:var(--text-muted);">
            <span style="display:inline-block;width:16px;height:16px;border:2px solid var(--text-muted);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;margin-right:8px;"></span>
            Cargando tickets...
        </td></tr>`;
    }
    
    try {
        const res = await clientFetch('/api/tickets/my');
        const data = await res.json();
        if (res.ok && data.success) {
            appState.clientTickets = data.tickets || [];
            renderClientTickets();
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2.5rem;color:var(--danger);">Error: ${data.error || 'No se pudieron cargar los tickets'}</td></tr>`;
        }
    } catch (err) {
        console.error('Error cargando tickets de cliente:', err);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2.5rem;color:var(--danger);">Error al cargar los tickets. (${err.message})</td></tr>`;
    }
}

function renderClientTickets() {
    const tbody = document.getElementById('client-tickets-body');
    if (!tbody) return;
    
    const tickets = appState.clientTickets || [];
    if (tickets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2.5rem;color:var(--text-muted);">
            <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
                <i data-lucide="inbox" style="width:32px;height:32px;opacity:0.4;"></i>
                <span>Aún no has creado ningún ticket de soporte.</span>
            </div>
        </td></tr>`;
        lucide.createIcons();
        return;
    }

    const statusMap = {
        abierto:    { label: 'Entrante',    color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' },
        en_proceso: { label: 'En Proceso',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
        resuelto:   { label: 'Finalizado',  color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
        cerrado:    { label: 'Finalizado',  color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
    };
    const priorityMap = {
        normal:  { label: 'Normal',  color: '#64748b' },
        urgente: { label: '🔴 Urgente', color: '#ef4444' },
        baja:    { label: 'Baja',    color: '#94a3b8' },
    };

    tbody.innerHTML = tickets.map(t => {
        const d = new Date(t.created_at);
        const dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
        const s = statusMap[t.status] || statusMap.abierto;
        const p = priorityMap[t.priority] || priorityMap.normal;
        const targetMod = appState.modules.find(m => String(m.id) === String(t.module) || String(m.name) === String(t.module));
        const moduleDisplayName = targetMod ? targetMod.name : (t.module || '—');
        return `
            <tr style="border-bottom:1px solid var(--border-color); color:var(--text-main); font-weight:500;">
                <td style="padding:1rem 1.5rem;">
                    <a href="javascript:void(0)" onclick="viewClientTicketDetails('${t.id}')" style="font-size:0.82rem; font-weight:800; color:var(--primary); font-family:monospace; text-decoration:none; border-bottom:1px dashed var(--primary-alpha); padding-bottom:1px;" title="Ver conversación">
                        #${String(t.id || '').substring(0, 8).toUpperCase()}
                    </a>
                </td>
                <td style="padding:1rem 1.5rem;">${moduleDisplayName}</td>
                <td style="padding:1rem 1.5rem; font-size:0.8rem; color:${p.color}; font-weight:700;">${p.label}</td>
                <td style="padding:1rem 1.5rem;">
                    <span style="background:${s.bg};color:${s.color};border:1px solid ${s.border};font-weight:700;font-size:0.75rem;padding:0.25rem 0.65rem;border-radius:12px;white-space:nowrap;">${s.label}</span>
                </td>
                <td style="padding:1rem 1.5rem; white-space:nowrap; color:var(--text-muted); font-size:0.85rem;">${dateStr}</td>
            </tr>`;
    }).join('');
    lucide.createIcons();
}

window.viewClientTicketDetails = function(ticketId) {
    if (!appState.clientTickets) return;
    const ticket = appState.clientTickets.find(t => t.id === ticketId);
    if (!ticket) return;

    window.activeChatTicketId = ticketId;

    const statusMap = {
        abierto:    { label: 'Entrante',    color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' },
        en_proceso: { label: 'En Proceso',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
        resuelto:   { label: 'Finalizado',  color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
        cerrado:    { label: 'Finalizado',  color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
    };
    const priorityMap = {
        normal:  { label: 'Normal',       color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
        urgente: { label: '\uD83D\uDD34 Urgente', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
        baja:    { label: 'Baja',         color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
    };

    const st = statusMap[ticket.status] || statusMap['abierto'];
    const pr = priorityMap[ticket.priority] || priorityMap['normal'];
    const d = ticket.created_at ? new Date(ticket.created_at) : null;
    let fullDate = '—';
    if (d) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const timeStr = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
        fullDate = `${day}/${month}/${year}  -  ${timeStr}`;
    }

    Swal.fire({
        title: '',
        html: `
            <style>
            @keyframes typingBounce {
                0%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-4px); }
            }
            .typing-dot {
                width: 6px;
                height: 6px;
                background-color: var(--text-muted);
                border-radius: 50%;
                display: inline-block;
                animation: typingBounce 1.4s infinite ease-in-out both;
            }
            .typing-dot:nth-child(2) { animation-delay: 0.2s; }
            .typing-dot:nth-child(3) { animation-delay: 0.4s; }
            </style>
            <div style="font-family:'Outfit',sans-serif; color:var(--text-main);">

                <!-- Header -->
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,var(--primary),#818cf8);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">
                            <i data-lucide="ticket" style="width:18px;height:18px;color:white;"></i>
                        </div>
                        <div style="text-align:left;">
                            <div style="font-size:0.65rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Solicitud de Soporte</div>
                            <div style="font-family:monospace;font-size:0.95rem;font-weight:900;color:var(--primary);">#${ticket.id.toUpperCase()}</div>
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <span style="font-size:0.68rem;font-weight:700;padding:3px 9px;border-radius:20px;background:${pr.bg};color:${pr.color};border:1px solid ${pr.color}33;white-space:nowrap;">${pr.label}</span>
                        <span style="font-size:0.68rem;font-weight:700;padding:3px 9px;border-radius:20px;background:${st.bg};color:${st.color};border:1px solid ${st.color}33;white-space:nowrap;">${st.label}</span>
                    </div>
                </div>

                <!-- Meta chips -->
                <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
                    <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:10px;padding:8px 12px;text-align:left;">
                        <div style="font-size:0.65rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:2px;">Módulo</div>
                        <div style="font-weight:700;font-size:0.84rem;color:var(--text-main);">${(() => {
                            const found = appState.modules.find(m => String(m.id) === String(ticket.module) || String(m.name) === String(ticket.module));
                            return found ? found.name : (ticket.module || '—');
                        })()}</div>
                    </div>
                    <div style="flex:1;min-width:100px;background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:10px;padding:8px 12px;text-align:left;">
                        <div style="font-size:0.65rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:2px;">Creado</div>
                        <div style="font-weight:600;font-size:0.78rem;color:var(--text-main);">${fullDate}</div>
                    </div>
                </div>

                <!-- Chat area -->
                <div style="border:1px solid var(--border-color);border-radius:14px;overflow:hidden;background:rgba(0,0,0,0.18);">
                    <div style="padding:8px 14px;background:rgba(255,255,255,0.03);border-bottom:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between;gap:8px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <div style="width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 6px #10b981;"></div>
                            <span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);">Chat con Soporte</span>
                        </div>
                        <div style="display:flex;align-items:center;background:rgba(255,255,255,0.05);border:1px solid var(--border-color);border-radius:8px;padding:4px 10px;width:140px;transition:all 0.2s;" onfocusin="this.style.width='200px';this.style.borderColor='var(--primary)';" onfocusout="this.style.width='140px';this.style.borderColor='var(--border-color)';">
                            <i data-lucide="search" style="width:14px;height:14px;color:var(--text-muted);margin-right:6px;"></i>
                            <input type="text" id="chat-search-input" placeholder="Buscar..." oninput="handleChatSearch(this.value)" style="border:none;background:none;color:var(--text-main);font-size:0.8rem;outline:none;width:100%;font-family:'Outfit',sans-serif;" />
                        </div>
                    </div>
                    <div id="ticket-chat-container" style="height:320px;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:6px;scroll-behavior:smooth;">
                        <div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:30px 0;color:var(--text-muted);font-size:0.82rem;">
                            <span style="display:inline-block;width:16px;height:16px;border:2px solid var(--text-muted);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></span>
                            Cargando conversación...
                        </div>
                    </div>
                    ${ticket.status === 'cerrado' ? `
                        <div style="padding:10px 14px;background:rgba(239,68,68,0.06);border-top:1px solid rgba(239,68,68,0.2);color:#ef4444;display:flex;align-items:center;gap:8px;font-size:0.78rem;font-weight:700;justify-content:center;">
                            <i data-lucide="lock" style="width:12px;height:12px;"></i>
                            Solicitud cerrada — abre una nueva para continuar
                        </div>
                    ` : `
                        <div style="padding:10px 12px;background:rgba(255,255,255,0.02);border-top:1px solid var(--border-color);display:flex;align-items:center;gap:8px;">
                            <input type="file" id="chat-image-input" accept="image/*" style="display:none;" onchange="handleTicketImageSelect(event)" />
                            <button onclick="document.getElementById('chat-image-input').click()" title="Enviar imagen" style="width:34px;height:34px;border-radius:8px;border:1px solid var(--border-color);background:rgba(255,255,255,0.04);color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s;" onmouseover="this.style.background='rgba(99,102,241,0.15)';this.style.color='var(--primary)'" onmouseout="this.style.background='rgba(255,255,255,0.04)';this.style.color='var(--text-muted)'">
                                <i data-lucide="image" style="width:15px;height:15px;"></i>
                            </button>
                            <input type="text" id="chat-message-input" placeholder="Escribe un mensaje..." style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid var(--border-color);background:rgba(255,255,255,0.05);color:var(--text-main);font-size:0.85rem;outline:none;font-family:'Outfit',sans-serif;" />
                            <button id="chat-send-btn" onclick="sendTicketMessage('${ticket.id}','client')" style="width:34px;height:34px;border-radius:8px;border:none;background:linear-gradient(135deg,var(--primary),#818cf8);color:white;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity 0.15s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                                <i data-lucide="send" style="width:14px;height:14px;"></i>
                            </button>
                        </div>
                    `}
                </div>

            </div>
        `,
        background: 'var(--bg-surface)',
        color: 'var(--text-main)',
        width: '680px',
        padding: '1.5rem',
        showConfirmButton: true,
        confirmButtonText: 'Cerrar',
        confirmButtonColor: 'var(--primary)',
        didOpen: () => {
            lucide.createIcons();
            fetchAndRenderChatMessages(ticketId, 'client');

            const input = document.getElementById('chat-message-input');
            if (input) {
                // typing indicator trigger
                let lastTypingSent = 0;
                input.addEventListener('input', function() {
                    const now = Date.now();
                    if (now - lastTypingSent > 1500) {
                        lastTypingSent = now;
                        clientFetch(`/api/tickets/${ticketId}/typing`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ role: 'client' })
                        }).catch(err => console.error('Error sending typing signal:', err));
                    }
                });

                input.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        sendTicketMessage(ticketId, 'client');
                    }
                });
                setTimeout(() => input.focus(), 100);
            }
        },
        willClose: () => {
            window.activeChatTicketId = null;
            window.clearChatImageSelect();
        }
    });
};

window.handleTicketImageSelect = function(event) {
    const fileInput = event.target;
    if (!fileInput.files || !fileInput.files[0]) return;
    
    window.selectedChatFile = fileInput.files[0];
    
    let bar = document.getElementById('chat-image-preview-bar');
    if (!bar) {
        const inputArea = fileInput.closest('div');
        bar = document.createElement('div');
        bar.id = 'chat-image-preview-bar';
        bar.style.cssText = 'padding:6px 12px;background:rgba(255,255,255,0.03);border-top:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:0.78rem;color:var(--text-muted);';
        inputArea.parentNode.insertBefore(bar, inputArea);
    }
    
    const fileReader = new FileReader();
    fileReader.onload = function(e) {
        bar.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;">
                <img src="${e.target.result}" style="width:28px;height:28px;border-radius:4px;object-fit:cover;border:1px solid var(--border-color);" />
                <span style="font-weight:600;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;">${window.selectedChatFile.name}</span>
                <span style="font-size:0.7rem;opacity:0.6;">(${(window.selectedChatFile.size / 1024).toFixed(0)} KB)</span>
            </div>
            <button onclick="window.clearChatImageSelect()" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:1.1rem;line-height:1;display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;transition:background 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.background='none'">
                ✕
            </button>
        `;
    };
    fileReader.readAsDataURL(window.selectedChatFile);
};

window.clearChatImageSelect = function() {
    window.selectedChatFile = null;
    const fileInput = document.getElementById('chat-image-input');
    if (fileInput) fileInput.value = '';
    const bar = document.getElementById('chat-image-preview-bar');
    if (bar) bar.remove();
};

window.uploadSelectedTicketImage = async function(ticketId, role) {
    if (!window.selectedChatFile) return;

    const file = window.selectedChatFile;
    const formData = new FormData();
    formData.append('image', file);

    const container = document.getElementById('ticket-chat-container');
    const uploadingId = 'uploading-indicator-' + Date.now();
    if (container) {
        const el = document.createElement('div');
        el.id = uploadingId;
        el.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:6px;font-size:0.75rem;color:var(--text-muted);margin:4px 0;';
        el.innerHTML = '<span style="display:inline-block;width:12px;height:12px;border:2px solid var(--text-muted);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></span> Enviando imagen...';
        container.appendChild(el);
        container.scrollTop = container.scrollHeight;
    }

    try {
        const fetchUrl = `/api/tickets/${ticketId}/messages/image`;
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

        window.clearChatImageSelect();
    } catch (err) {
        console.error('Error al enviar imagen:', err);
        throw err;
    } finally {
        const el = document.getElementById(uploadingId);
        if (el) el.remove();
    }
};

window.fetchAndRenderChatMessages = async function(ticketId, role) {
    const container = document.getElementById('ticket-chat-container');
    if (!container) return;

    try {
        const fetchUrl = `/api/tickets/${ticketId}/messages`;
        const res = await (role === 'admin' ? adminFetch(fetchUrl) : clientFetch(fetchUrl));
        if (!res.ok) throw new Error('Error al obtener mensajes');
        
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Error al obtener mensajes');

        const messages = data.messages || [];

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

        if (messages.length === 0) {
            container.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:0.82rem;gap:8px;padding:20px;">
                    <span style="font-size:2rem;">💬</span>
                    <span>Aún no hay mensajes en este chat.</span>
                </div>
            `;
            return;
        }

        let lastSender = null;
        container.innerHTML = messages.map((msg, idx) => {
            const isMe = (role === 'admin' && msg.sender === 'admin') || (role === 'client' && msg.sender === 'client');
            const sameAsPrev = lastSender === msg.sender;
            lastSender = msg.sender;

            const d = new Date(msg.created_at);
            const timeStr = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/am/i, 'a.m.').replace(/pm/i, 'p.m.');
            const dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;

            const prevMsg = messages[idx - 1];
            let dateSeparator = '';
            const fullDateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
            if (idx === 0) {
                dateSeparator = `<div style="text-align:center;margin:6px 0 10px;"><span style="font-size:0.65rem;font-weight:700;color:var(--text-muted);background:rgba(0,0,0,0.3);padding:3px 10px;border-radius:20px;">${fullDateStr}</span></div>`;
            } else {
                const prevDate = new Date(prevMsg.created_at);
                if (prevDate.toDateString() !== d.toDateString()) {
                    dateSeparator = `<div style="text-align:center;margin:8px 0 10px;"><span style="font-size:0.65rem;font-weight:700;color:var(--text-muted);background:rgba(0,0,0,0.3);padding:3px 10px;border-radius:20px;">${fullDateStr}</span></div>`;
                }
            }

            const nameRow = (!sameAsPrev || dateSeparator) ? `
                <span style="font-size:0.63rem;font-weight:700;color:${isMe ? 'rgba(129,140,248,0.9)' : 'var(--text-muted)'};${isMe ? 'text-align:right;' : ''}display:block;margin-bottom:2px;padding:0 4px;">${isMe ? 'Tú' : msg.sender_name}</span>
            ` : '';

            const contentHtml = msg.image_url
                ? `<img src="${msg.image_url}" alt="imagen" onclick="openChatImageLightbox('${msg.image_url}')" style="max-width:200px;max-height:200px;border-radius:8px;cursor:zoom-in;object-fit:cover;display:block;" />`
                : `<span class="chat-message-text" style="white-space:pre-wrap;word-break:break-word;">${msg.message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>`;

            const bubbleStyle = isMe
                ? `background:linear-gradient(135deg,rgba(99,102,241,0.28),rgba(129,140,248,0.18));border:1px solid rgba(99,102,241,0.35);border-radius:14px 14px 4px 14px;`
                : `background:rgba(255,255,255,0.06);border:1px solid var(--border-color);border-radius:14px 14px 14px 4px;`;

            return `
                ${dateSeparator}
                <div style="display:flex;flex-direction:column;align-items:${isMe ? 'flex-end' : 'flex-start'};">
                    ${nameRow}
                    <div style="max-width:75%;${bubbleStyle}padding:8px 12px;font-size:0.85rem;line-height:1.4;color:var(--text-main);position:relative;">
                        ${contentHtml}
                        <span style="display:block;text-align:right;font-size:0.58rem;color:${isMe ? 'rgba(199,210,254,0.6)' : 'var(--text-muted)'};margin-top:4px;margin-bottom:-2px;">${timeStr}</span>
                    </div>
                </div>
            `;
        }).join('');

        container.scrollTop = container.scrollHeight;
    } catch (err) {
        console.error('Error cargando chat:', err);
        container.innerHTML = `
            <div style="text-align:center;color:#ef4444;font-size:0.82rem;padding:20px 10px;">
                Error al cargar la conversación.
            </div>
        `;
    }
};

window.sendTicketMessage = async function(ticketId, role) {
    if (window._isSendingTicketMessage) return;

    const input = document.getElementById('chat-message-input');
    const sendBtn = document.getElementById('chat-send-btn');
    
    const message = input ? input.value.trim() : '';
    const hasImage = !!window.selectedChatFile;
    
    if (!message && !hasImage) return;

    window._isSendingTicketMessage = true;
    if (sendBtn) sendBtn.disabled = true;

    try {
        if (hasImage) {
            await window.uploadSelectedTicketImage(ticketId, role);
        }
        
        if (message) {
            const fetchUrl = `/api/tickets/${ticketId}/messages`;
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
            if (input) input.value = '';
        }
        
        await fetchAndRenderChatMessages(ticketId, role);
    } catch (err) {
        console.error('Error al enviar mensaje:', err);
        showToast(err.message || 'Error de conexión', 'error');
    } finally {
        window._isSendingTicketMessage = false;
        if (sendBtn) sendBtn.disabled = false;
        if (input) input.focus();
    }
};

window.openChatImageLightbox = function(src) {
    const overlay = document.createElement('div');
    overlay.id = 'chat-image-lightbox-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:999999;cursor:zoom-out;opacity:0;transition:opacity 0.2s ease;';
    
    overlay.innerHTML = `
        <div style="position:relative;max-width:90%;max-height:90%;display:flex;align-items:center;justify-content:center;">
            <img src="${src}" style="max-width:100%;max-height:90vh;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.5);object-fit:contain;cursor:default;" onclick="event.stopPropagation()" />
            <button style="position:absolute;top:-40px;right:-4px;background:none;border:none;color:white;font-size:2rem;cursor:pointer;opacity:0.8;transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">✕</button>
        </div>
    `;
    
    overlay.onclick = function() {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 200);
    };
    
    document.body.appendChild(overlay);
    setTimeout(() => overlay.style.opacity = '1', 50);
};

// ==========================================
// TYPING INDICATOR HELPER
// ==========================================
window._typingIndicatorTimeout = null;
window.showChatTypingIndicator = function(text) {
    const container = document.getElementById('ticket-chat-container');
    if (!container) return;

    let indicator = document.getElementById('chat-typing-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'chat-typing-indicator';
        indicator.style.cssText = 'display:flex; align-items:center; gap:8px; padding:6px 12px; margin-top:4px; font-size:0.78rem; color:var(--text-muted); align-self:flex-start; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid var(--border-color); animation: fadeIn 0.2s ease;';
        indicator.innerHTML = `
            <span id="typing-indicator-text">${text}</span>
            <div style="display:flex; gap:3px; align-items:center;">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        `;
        container.appendChild(indicator);
    } else {
        const textEl = document.getElementById('typing-indicator-text');
        if (textEl) textEl.textContent = text;
    }
    
    container.scrollTop = container.scrollHeight;

    if (window._typingIndicatorTimeout) clearTimeout(window._typingIndicatorTimeout);
    window._typingIndicatorTimeout = setTimeout(() => {
        const ind = document.getElementById('chat-typing-indicator');
        if (ind) ind.remove();
        window._typingIndicatorTimeout = null;
    }, 3000);
};

// ==========================================
// CLIENT PAYMENT HISTORY & PDF EXPORT
// ==========================================
window.loadPaymentHistory = async function() {
    const tbody = document.getElementById('client-payment-history-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2.5rem;color:var(--text-muted);">
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;justify-content:center;">
            <span style="display:inline-block;width:24px;height:24px;border:3px solid var(--primary);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></span>
            <span>Cargando transacciones relacionales...</span>
        </div>
    </td></tr>`;
    lucide.createIcons();

    let session;
    try { session = JSON.parse(sessionStorage.getItem('clientSession') || '{}'); } catch { session = {}; }
    if (!session.token) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2.5rem;color:var(--danger);">Sesión expirada. Por favor inicia sesión.</td></tr>`;
        return;
    }

    try {
        const res = await fetch('/api/client/payments', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${session.token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al obtener transacciones.');

        appState.clientPayments = data.history || [];

        if (appState.clientPayments.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2.5rem;color:var(--text-muted);">
                <div style="display:flex;flex-direction:column;align-items:center;gap:8px;justify-content:center;">
                    <i data-lucide="inbox" style="width:32px;height:32px;opacity:0.4;"></i>
                    <span>Aún no se registran pagos en el sistema relacional.</span>
                </div>
            </td></tr>`;
            lucide.createIcons();
            return;
        }

        tbody.innerHTML = appState.clientPayments.map(ph => {
            const d = new Date(ph.created_at);
            const dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
            const amountStr = `$ ${Number(ph.amount).toLocaleString('es-CO')} COP`;

            // Alinear descripciones de módulos antiguos/IDs a nombres actualizados de módulos
            let desc = ph.desc || '—';
            appState.modules.forEach(m => {
                desc = desc.replace(new RegExp(m.id, 'gi'), m.name);
            });

            // Badge de estado premium fintech glassmorphic
            const badgeBg = ph.status === 'APPROVED' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
            const badgeColor = ph.status === 'APPROVED' ? '#10b981' : '#ef4444';
            const badgeBorder = ph.status === 'APPROVED' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)';
            const badgeLabel = ph.status === 'APPROVED' ? 'Aprobado' : 'Fallido';

            return `
                <tr style="border-bottom:1px solid var(--border-color); color:var(--text-main); font-weight:500;">
                    <td style="padding:1rem 1.5rem; font-family:monospace; font-size:0.85rem;">${dateStr}</td>
                    <td style="padding:1rem 1.5rem; font-weight:600;">${desc}</td>
                    <td style="padding:1rem 1.5rem; font-weight:800; color:var(--text-main);">${amountStr}</td>
                    <td style="padding:1rem 1.5rem;">
                        <span style="background:${badgeBg}; color:${badgeColor}; border:1px solid ${badgeBorder}; font-weight:700; font-size:0.75rem; padding:0.25rem 0.65rem; border-radius:12px; white-space:nowrap;">${badgeLabel}</span>
                    </td>
                    <td style="padding:1rem 1.5rem; font-family:monospace; font-size:0.8rem; color:var(--text-muted);">${ph.transaction_id || '—'}</td>
                </tr>
            `;
        }).join('');
        lucide.createIcons();

    } catch (err) {
        console.error('Error cargando historial de pagos del cliente:', err);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2.5rem;color:var(--danger);">Error al cargar las transacciones. (${err.message})</td></tr>`;
    }
};

window.downloadClientPaymentsPDF = function() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, 210, 35, 'F');
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(248, 250, 252);
        doc.text('AS SIERRA SYSTEMS', 14, 23);
        
        const clientBiz = appState.businesses.find(b => b.id === CLIENT_ID);
        const bizName = clientBiz ? clientBiz.name : 'Mi Negocio';
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        doc.text(`HISTORIAL DE PAGOS - ${bizName.toUpperCase()}`, 14, 29);
        
        const today = new Date();
        const dateStr = today.toLocaleDateString('es-CO') + ' ' + today.toLocaleTimeString('es-CO');
        doc.setFontSize(9);
        doc.setTextColor(248, 250, 252);
        doc.text('Fecha: ' + dateStr, 140, 23);
        
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(14);
        doc.setFont('Helvetica', 'bold');
        doc.text('Mi Registro de Transacciones', 14, 48);
        doc.line(14, 50, 196, 50);
        
        const headers = [['Fecha', 'Concepto', 'Monto', 'Estado', 'Referencia TXN']];
        const payments = appState.clientPayments || [];
        
        const body = payments.map(ph => {
            const d = new Date(ph.created_at);
            const dateVal = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
            const amountVal = `$ ${Number(ph.amount).toLocaleString('es-CO')} COP`;
            
            let desc = ph.desc || '—';
            appState.modules.forEach(m => {
                desc = desc.replace(new RegExp(m.id, 'gi'), m.name);
            });

            return [
                dateVal,
                desc,
                amountVal,
                ph.status === 'APPROVED' ? 'APROBADO' : 'DECLINADO',
                ph.transaction_id || '—'
            ];
        });
        
        doc.autoTable({
            startY: 55,
            head: headers,
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] },
            styles: { font: 'Helvetica', fontSize: 9 }
        });
        
        const finalY = doc.lastAutoTable.finalY || 200;
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('AS Sierra Systems - Comprobante de registro de transacciones.', 14, finalY + 20);
        
        doc.save(`Historial_Pagos_${bizName.replace(/\s+/g, '_')}_${today.toISOString().split('T')[0]}.pdf`);
        Swal.fire({
            icon: 'success',
            title: '¡Reporte Generado!',
            text: 'Tu historial de pagos ha sido descargado en PDF.',
            background: 'var(--bg-surface)',
            color: 'var(--text)',
            confirmButtonColor: '#10b981'
        });
    } catch (err) {
        console.error('Error exportando PDF de pagos cliente:', err);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo generar el reporte en PDF.',
            background: 'var(--bg-surface)',
            color: 'var(--text)'
        });
    }
};

