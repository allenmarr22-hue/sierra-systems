const fs = require('fs');
const path = require('path');

const clientAppPath = 'frontend/js/client-app.js';
let content = fs.readFileSync(clientAppPath, 'utf8');

// 1. Re-define TICKET_STATUS_MAP in client-app.js to show "Entrante" and "Finalizado"
const oldStatusMap = `    const statusMap = {
        abierto:    { label: 'Abierto',     color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' },
        en_proceso: { label: 'En Proceso',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
        resuelto:   { label: 'Resuelto',    color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
        cerrado:    { label: 'Cerrado',     color: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.25)' },
    };`;

const newStatusMap = `    const statusMap = {
        abierto:    { label: 'Entrante',    color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' },
        en_proceso: { label: 'En Proceso',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
        resuelto:   { label: 'Finalizado',  color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
        cerrado:    { label: 'Finalizado',  color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
    };`;

if (content.includes(oldStatusMap)) {
    content = content.replace(oldStatusMap, newStatusMap);
    console.log('Successfully updated statusMap in client-app.js');
} else {
    // try normalizing line breaks
    const normalizedOld = oldStatusMap.replace(/\r?\n/g, '\r\n');
    if (content.includes(normalizedOld)) {
        content = content.replace(normalizedOld, newStatusMap.replace(/\r?\n/g, '\r\n'));
        console.log('Successfully updated statusMap (CRLF) in client-app.js');
    }
}

// 2. Add selectedChatFile variable inside client-app.js
if (!content.includes('window.selectedChatFile = null;')) {
    // Append it right before viewClientTicketDetails
    content = content.replace('window.viewClientTicketDetails = function(ticketId) {', 'window.selectedChatFile = null;\n\nwindow.viewClientTicketDetails = function(ticketId) {');
}

// 3. Update Swal.fire in viewClientTicketDetails: image input change event and willClose
content = content.replace(`onchange="handleTicketImageUpload('\${ticket.id}','client')"`, `onchange="handleTicketImageSelect(event)"`);
content = content.replace(`onchange="handleTicketImageUpload('\${ticket.id}', 'client')"`, `onchange="handleTicketImageSelect(event)"`);

const oldWillClose = `        willClose: () => {
            window.activeChatTicketId = null;
        }`;
const newWillClose = `        willClose: () => {
            window.activeChatTicketId = null;
            window.clearChatImageSelect();
        }`;
if (content.includes(oldWillClose)) {
    content = content.replace(oldWillClose, newWillClose);
} else {
    const normalized = oldWillClose.replace(/\r?\n/g, '\r\n');
    if (content.includes(normalized)) {
        content = content.replace(normalized, newWillClose.replace(/\r?\n/g, '\r\n'));
    }
}

// 4. Add the selection helpers inside client-app.js (let's append them right before fetchAndRenderChatMessages)
const helperCode = `
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
        bar.innerHTML = \`
            <div style="display:flex;align-items:center;gap:8px;">
                <img src="\${e.target.result}" style="width:28px;height:28px;border-radius:4px;object-fit:cover;border:1px solid var(--border-color);" />
                <span style="font-weight:600;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;">\${window.selectedChatFile.name}</span>
                <span style="font-size:0.7rem;opacity:0.6;">(\${(window.selectedChatFile.size / 1024).toFixed(0)} KB)</span>
            </div>
            <button onclick="window.clearChatImageSelect()" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:1.1rem;line-height:1;display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;transition:background 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.background='none'">
                ✕
            </button>
        \`;
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

        window.clearChatImageSelect();
    } catch (err) {
        console.error('Error al enviar imagen:', err);
        throw err;
    } finally {
        const el = document.getElementById(uploadingId);
        if (el) el.remove();
    }
};
`;

if (!content.includes('window.handleTicketImageSelect')) {
    content = content.replace('window.fetchAndRenderChatMessages = async function(ticketId, role) {', helperCode + '\n\nwindow.fetchAndRenderChatMessages = async function(ticketId, role) {');
    console.log('Successfully added helper selection functions to client-app.js');
}

// 5. Replace sendTicketMessage in client-app.js
const oldSend = `window.sendTicketMessage = async function(ticketId, role) {
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
        showToast(err.message || 'Error de conexi\u00f3n', 'error');
    } finally {
        input.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        input.focus();
    }
};`;

const newSend = `window.sendTicketMessage = async function(ticketId, role) {
    const input = document.getElementById('chat-message-input');
    const sendBtn = document.getElementById('chat-send-btn');
    
    const message = input ? input.value.trim() : '';
    const hasImage = !!window.selectedChatFile;
    
    if (!message && !hasImage) return;

    if (input) input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    try {
        if (hasImage) {
            await window.uploadSelectedTicketImage(ticketId, role);
        }
        
        if (message) {
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
            if (input) input.value = '';
        }
        
        await fetchAndRenderChatMessages(ticketId, role);
    } catch (err) {
        console.error('Error al enviar mensaje:', err);
        showToast(err.message || 'Error de conexión', 'error');
    } finally {
        if (input) { input.disabled = false; input.focus(); }
        if (sendBtn) sendBtn.disabled = false;
    }
};`;

if (content.includes(oldSend)) {
    content = content.replace(oldSend, newSend);
    console.log('Successfully updated sendTicketMessage in client-app.js');
} else {
    const normalized = oldSend.replace(/\r?\n/g, '\r\n');
    if (content.includes(normalized)) {
        content = content.replace(normalized, newSend.replace(/\r?\n/g, '\r\n'));
        console.log('Successfully updated sendTicketMessage (CRLF) in client-app.js');
    }
}

// 6. Replace openChatImageLightbox in client-app.js
const oldLightbox = `window.openChatImageLightbox = function(src) {
    Swal.fire({
        html: \`<img src="\${src}" style="max-width:100%;max-height:80vh;border-radius:10px;object-fit:contain;" />\`,
        background: 'rgba(0,0,0,0.92)',
        showConfirmButton: false,
        showCloseButton: true,
        width: 'auto',
        padding: '1rem',
    });
};`;

const newLightbox = `window.openChatImageLightbox = function(src) {
    const overlay = document.createElement('div');
    overlay.id = 'chat-image-lightbox-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:999999;cursor:zoom-out;opacity:0;transition:opacity 0.2s ease;';
    
    overlay.innerHTML = \`
        <div style="position:relative;max-width:90%;max-height:90%;display:flex;align-items:center;justify-content:center;">
            <img src="\${src}" style="max-width:100%;max-height:90vh;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.5);object-fit:contain;cursor:default;" onclick="event.stopPropagation()" />
            <button style="position:absolute;top:-40px;right:-4px;background:none;border:none;color:white;font-size:2rem;cursor:pointer;opacity:0.8;transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">✕</button>
        </div>
    \`;
    
    overlay.onclick = function() {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 200);
    };
    
    document.body.appendChild(overlay);
    setTimeout(() => overlay.style.opacity = '1', 50);
};`;

if (content.includes(oldLightbox)) {
    content = content.replace(oldLightbox, newLightbox);
    console.log('Successfully updated openChatImageLightbox in client-app.js');
} else {
    const normalized = oldLightbox.replace(/\r?\n/g, '\r\n');
    if (content.includes(normalized)) {
        content = content.replace(normalized, newLightbox.replace(/\r?\n/g, '\r\n'));
        console.log('Successfully updated openChatImageLightbox (CRLF) in client-app.js');
    }
}

fs.writeFileSync(clientAppPath, content, 'utf8');
console.log('Done with client fixes!');
