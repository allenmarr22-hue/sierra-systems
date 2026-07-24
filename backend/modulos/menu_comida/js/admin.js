// ====== AISLAMIENTO MULTI-SEDE (TENANT ISOLATION MONKEY PATCH) ======
(function() {
    if (Storage.prototype.getItem.__isPatched) return;
    const urlParams = new URLSearchParams(window.location.search);
    const instanceId = urlParams.get('instanceId');
    if (instanceId) {
        const suffix = `_${instanceId}`;
        const prefixes = ['streetfeed_', 'agenda_'];
        const shouldAiso = (key) => key && prefixes.some(p => key.startsWith(p));
        const originalGetItem = Storage.prototype.getItem;
        const originalSetItem = Storage.prototype.setItem;
        const originalRemoveItem = Storage.prototype.removeItem;
        Storage.prototype.getItem = function(key) {
            return shouldAiso(key) ? originalGetItem.call(this, key + suffix) : originalGetItem.call(this, key);
        };
        Storage.prototype.setItem = function(key, value) {
            return shouldAiso(key) ? originalSetItem.call(this, key + suffix, value) : originalSetItem.call(this, key, value);
        };
        Storage.prototype.removeItem = function(key) {
            return shouldAiso(key) ? originalRemoveItem.call(this, key + suffix) : originalRemoveItem.call(this, key);
        };
        Storage.prototype.getItem.__isPatched = true;
    }
})();

/* =========================================
   ADMIN DASHBOARD LOGIC
   ========================================= */

/**
 * Renders the main inventory table in the admin panel
 * @param {Array} openCatIds - IDs of categories that should remain expanded
 */
function renderAdmin(openCatIds = null) {
    const container = document.getElementById('admin-inventory-accordion');
    if (!container) return;
    
    // Capture current open states if not provided
    if (!openCatIds) {
        openCatIds = Array.from(container.querySelectorAll('.admin-cat-group.active'))
            .map(group => group.dataset.catId);
    }

    container.innerHTML = '';
    
    // Update stats
    const totalDishes = state.dishes.length;
    const totalCats = state.categories.length - 1; // Exclude 'todos'
    
    const statDishes = document.getElementById('stat-total-dishes');
    const statCats = document.getElementById('stat-total-cats');
    if (statDishes) statDishes.textContent = totalDishes;
    if (statCats) statCats.textContent = totalCats;

    const dishesByCategory = {};
    state.dishes.forEach(dish => {
        if (!dishesByCategory[dish.cat]) dishesByCategory[dish.cat] = [];
        dishesByCategory[dish.cat].push(dish);
    });

    const activeCats = state.categories.filter(c => c.id !== 'todos');
    const hasExtrasCat = state.categories.some(c => c.isExtras);

    activeCats.forEach(cat => {
        const catDishes = dishesByCategory[cat.id] || [];
        const isOpen = openCatIds.includes(cat.id);
        const group = document.createElement('div');
        group.className = `admin-cat-group ${isOpen ? 'active' : ''}`;
        group.dataset.catId = cat.id;
        
        group.innerHTML = `
            <div class="admin-cat-header">
                <div class="admin-cat-title" style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                    <i data-lucide="folder"></i>
                    <span>${cat.name}</span>
                    <span class="admin-cat-count">${catDishes.length}</span>
                    ${cat.isExtras ? `
                        <span class="badge-extras" style="background: #2196f3; color: #fff; font-size: 0.6rem; padding: 0.2rem 0.5rem; border-radius: 6px; font-weight: 900; letter-spacing: 0.5px; display: inline-flex; align-items: center; gap: 3px;">
                            <i data-lucide="plus-circle" style="width: 10px; height: 10px;"></i> EXTRAS
                        </span>
                    ` : ''}
                </div>
                <div style="display: flex; align-items: center; gap: 0.6rem;">
                    <button class="cat-action-btn add-to-cat-btn" data-id="${cat.id}" title="Agregar Producto a esta Categoría" style="background: #4caf50; color: #fff; border: none;">
                        <i data-lucide="plus-circle"></i>
                    </button>
                    ${cat.isExtras ? `
                        <button class="cat-action-btn toggle-menu-visibility" data-id="${cat.id}" title="${cat.showOnMenu ? 'Ocultar del Menú Principal' : 'Mostrar también en el Menú Principal'}" style="${cat.showOnMenu ? 'color: #4caf50; opacity: 1;' : 'opacity: 0.5;'}">
                            <i data-lucide="${cat.showOnMenu ? 'eye' : 'eye-off'}"></i>
                        </button>
                    ` : `
                        <button class="cat-action-btn toggle-extras" data-id="${cat.id}" title="${hasExtrasCat ? (cat.allowExtras ? 'Ocultar Extras en los platos de esta categoría' : 'Permitir Extras en los platos de esta categoría') : 'Debes crear una Categoría de Extras primero'}" style="${hasExtrasCat ? (cat.allowExtras ? 'color: #ff9800; opacity: 1;' : 'opacity: 0.5;') : 'opacity: 0.2; cursor: not-allowed;'}">
                            <i data-lucide="layers"></i>
                        </button>
                    `}
                    <button class="cat-action-btn edit-cat" data-id="${cat.id}" data-name="${cat.name}" title="Renombrar Categoría">
                        <i data-lucide="pencil"></i>
                    </button>
                    <button class="cat-action-btn delete-cat" data-id="${cat.id}" title="Eliminar Categoría">
                        <i data-lucide="trash-2"></i>
                    </button>
                    <i data-lucide="chevron-down" class="toggle-icon"></i>
                </div>
            </div>
            <div class="admin-cat-content">
                <div class="admin-table-header">
                    <span class="col-img"></span>
                    <span class="col-info">Producto</span>
                    <span class="col-price">Precio</span>
                    <span class="col-status">Estado</span>
                    <span class="col-actions">Acciones</span>
                </div>
                <div class="admin-items-list">
                    ${catDishes.length === 0 ? '<p style="padding: 1.5rem; text-align: center; color: var(--text-dim);">No hay productos en esta categoría</p>' : ''}
                    ${catDishes.map(dish => `
                        <div class="admin-item-row">
                            <img src="${dish.img}" class="admin-item-img" alt="${dish.name}">
                            <div class="admin-item-info">
                                <h4>${dish.name}</h4>
                                <p>${dish.desc.substring(0, 50)}${dish.desc.length > 50 ? '...' : ''}</p>
                            </div>
                            <div class="admin-item-price">$ ${dish.price.toLocaleString('es-CO')}</div>
                            <div class="admin-item-status">
                                <button class="status-badge-btn toggle-active ${dish.active !== false ? 'active' : 'inactive'}" data-id="${dish.id}">
                                    ${dish.active !== false ? 'Activo' : 'Inactivo'}
                                </button>
                            </div>
                            <div class="admin-item-actions">
                                <button class="btn-secondary icon-btn edit-item" data-id="${dish.id}" title="Editar">
                                    <i data-lucide="edit-3"></i>
                                </button>
                                <button class="btn-secondary icon-btn delete-item" data-id="${dish.id}" title="Eliminar" style="color: #ff5252;">
                                    <i data-lucide="trash-2"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        container.appendChild(group);
    });

    // Re-initialize icons
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    // Add toggle event listeners
    container.querySelectorAll('.admin-cat-header').forEach(header => {
        header.addEventListener('click', (e) => {
            // Prevent toggle if delete button was clicked
            if (e.target.closest('.delete-cat')) return;
            
            const group = header.parentElement;
            const wasActive = group.classList.contains('active');
            
            group.classList.toggle('active');
            
            // Si se acaba de abrir, centrar suavemente en pantalla
            if (!wasActive) {
                setTimeout(() => {
                    group.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        });
    });

    // CRUD Listeners
    container.querySelectorAll('.toggle-active').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const dish = state.dishes.find(d => d.id == id);
            if (!dish) return;
            dish.active = dish.active !== false ? false : true;
            saveStateToLocal();
            renderAdmin();
            if (typeof renderMenu === 'function') renderMenu();
            showToast(dish.active ? 'Producto activado' : 'Producto desactivado');
        });
    });

    container.querySelectorAll('.edit-item').forEach(btn => {
        btn.addEventListener('click', () => openAdminModal(parseInt(btn.dataset.id)));
    });

    container.querySelectorAll('.delete-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const dish = state.dishes.find(d => d.id == id);
            if (!dish) return;
            showConfirm(`¿Estás seguro de eliminar "${dish.name}"?`, () => {
                state.dishes = state.dishes.filter(d => d.id != id);
                saveStateToLocal();
                renderAdmin();
                if (typeof renderMenu === 'function') renderMenu();
                showToast('Producto eliminado');
            });
        });
    });

    container.querySelectorAll('.delete-cat').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            const cat = state.categories.find(c => c.id === id);
            const catDishes = state.dishes.filter(d => d.cat === id);
            
            if (catDishes.length > 0) {
                showToast('No puedes eliminar una categoría con productos. Muévelos o elimínalos primero.', 'error');
                return;
            }
            
            showConfirm(`¿Eliminar la categoría "${cat.name}"?`, () => {
                state.categories = state.categories.filter(c => c.id !== id);
                saveStateToLocal();
                renderAdmin();
                if (typeof renderCategories === 'function') renderCategories();
                showToast('Categoría eliminada');
            });
        });
    });

    container.querySelectorAll('.toggle-extras').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const hasExtrasCategory = state.categories.some(c => c.isExtras);
            if (!hasExtrasCategory) {
                showToast('Primero debes crear una Categoría de Extras', 'error');
                return;
            }

            const id = btn.dataset.id;
            const cat = state.categories.find(c => c.id === id);
            if (cat) {
                cat.allowExtras = !cat.allowExtras;
                saveStateToLocal();
                renderAdmin();
                if (typeof renderCategories === 'function') renderCategories();
                if (typeof renderMenu === 'function') renderMenu();
                showToast(cat.allowExtras ? 'Los extras se mostrarán en esta categoría ✅' : 'Extras ocultos en esta categoría');
            }
        });
    });

    container.querySelectorAll('.toggle-menu-visibility').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            const cat = state.categories.find(c => c.id === id);
            if (cat) {
                cat.showOnMenu = !cat.showOnMenu;
                saveStateToLocal();
                renderAdmin();
                if (typeof renderCategories === 'function') renderCategories();
                if (typeof renderMenu === 'function') renderMenu();
                showToast(cat.showOnMenu ? 'Categoría visible en el menú principal ✅' : 'Categoría oculta del menú principal');
            }
        });
    });

    container.querySelectorAll('.add-to-cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openAdminModal(null, btn.dataset.id);
        });
    });

    container.querySelectorAll('.edit-cat').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            const currentName = btn.dataset.name;
            
            showPrompt(`Renombrar categoría`, currentName, (newName) => {
                if (!newName || newName.trim() === '' || newName.trim() === currentName) return;
                const cat = state.categories.find(c => c.id === id);
                if (cat) {
                    cat.name = newName.trim();
                    saveStateToLocal();
                    renderAdmin();
                    if (typeof renderCategories === 'function') renderCategories();
                    showToast('Categoría renombrada ✅');
                }
            });
        });
    });
}



function prefillConfigForm() {
    if (!state.config) return;

    if (state.config.waTemplateOrder && !state.config.waTemplateOrder.includes('{emojis_inicio}')) {
        state.config.waTemplateOrder = state.config.waTemplateOrder.replace('*NUEVO PEDIDO - {negocio}*', '{emojis_inicio} *NUEVO PEDIDO - {negocio}* {emojis_fin}');
    }

    const fields = {
        'conf-name': state.config.restaurantName,
        'conf-whatsapp': state.config.whatsappNumber,
        'conf-tagline': state.config.tagline,
        'conf-instagram': state.config.instagram,
        'conf-facebook': state.config.facebook,
        'conf-hero-t1': state.config.heroTitleT1,
        'conf-hero-highlight': state.config.heroTitleHighlight,
        'conf-hero-t2': state.config.heroTitleT2,
        'conf-hero-desc': state.config.heroDesc,
        'conf-hero-time': state.config.heroTime,
        'conf-hero-rating': state.config.heroRating,
        'conf-footer': state.config.footerText,
        'conf-admin-user': '', // Start empty for better UX
        'conf-expenses-pass': state.auth.expensePass || '',
        'conf-closed-from': state.config.storeClosedFrom,
        'conf-closed-until': state.config.storeClosedUntil,
        'conf-closed-msg': state.config.storeClosedMsg,
        'conf-wa-template': state.config.waTemplateOrder || `{emojis_inicio} *NUEVO PEDIDO - {negocio}* {emojis_fin}
--------------------------
👤 *CLIENTE:* {cliente}
📞 *TELÉFONO:* {telefono}
🚚 *ENTREGA:* {entrega}
📍 {detalles_entrega}
💵 *PAGO:* {pago}
📝 *NOTA:* {nota}
--------------------------

🛒 *RESUMEN DEL PEDIDO:*
{resumen_pedido}

--------------------------
{precios}
💵 *TOTAL A PAGAR: {total}*
--------------------------

🚀 _Enviado desde el Menú Digital_`
    };

    for (const [id, value] of Object.entries(fields)) {
        const el = document.getElementById(id);
        if (el) el.value = (value === undefined || value === 'undefined') ? '' : value;
    }
    
    const storeToggle = document.getElementById('conf-store-open');
    if (storeToggle) storeToggle.checked = state.config.storeOpen !== false;
    
    const logoAnimToggle = document.getElementById('conf-logo-anim');
    if (logoAnimToggle) logoAnimToggle.checked = state.config.logoAnimationEnabled !== false;

    // Preview hero image
    const heroPreview = document.getElementById('hero-img-preview');
    if (heroPreview && state.config.heroImg) {
        if (window.setPreviewImage) {
            window.setPreviewImage('hero-img-preview', state.config.heroImg, 'Sin imagen seleccionada');
        } else {
            heroPreview.style.backgroundImage = `url('${state.config.heroImg}')`;
            heroPreview.innerHTML = '';
        }
    }
    
    // Render business type selector
    renderBizTypeSelector();
}

/* ================================================
   BUSINESS TYPE SELECTOR
   ================================================ */
const BIZ_TYPES = [
    { id: 'burgers',    label: 'Hamburguesas', emoji: String.fromCodePoint(0x1F354), emojis: `${String.fromCodePoint(0x1F354)} ${String.fromCodePoint(0x1F35F)}`, tagline: 'Las mejores hamburguesas de la ciudad' },
    { id: 'icecream',   label: 'Heladería',    emoji: String.fromCodePoint(0x1F366), emojis: `${String.fromCodePoint(0x1F366)} ${String.fromCodePoint(0x1F368)}`, tagline: 'El sabor más frío y delicioso' },
    { id: 'pizza',      label: 'Pizzería',     emoji: String.fromCodePoint(0x1F355), emojis: `${String.fromCodePoint(0x1F355)} ${String.fromCodePoint(0x1FAD5)}`, tagline: 'Pizza artesanal hecha con amor' },
    { id: 'coffee',     label: 'Cafetería',    emoji: String.fromCodePoint(0x2615), emojis: `${String.fromCodePoint(0x2615)} ${String.fromCodePoint(0x1F950)}`, tagline: 'El mejor café de tu día' },
    { id: 'bakery',     label: 'Panadería',    emoji: String.fromCodePoint(0x1F956), emojis: `${String.fromCodePoint(0x1F956)} ${String.fromCodePoint(0x1F9C1)}`, tagline: 'Recién horneado cada mañana' },
    { id: 'sushi',      label: 'Sushi',        emoji: String.fromCodePoint(0x1F363), emojis: `${String.fromCodePoint(0x1F363)} ${String.fromCodePoint(0x1F371)}`, tagline: 'Sushi fresco y auténtico' },
    { id: 'seafood',    label: 'Mariscos',     emoji: String.fromCodePoint(0x1F99E), emojis: `${String.fromCodePoint(0x1F99E)} ${String.fromCodePoint(0x1F41F)}`, tagline: 'Lo mejor del mar en tu mesa' },
    { id: 'chicken',    label: 'Pollo',        emoji: String.fromCodePoint(0x1F357), emojis: `${String.fromCodePoint(0x1F357)} ${String.fromCodePoint(0x1F969)}`, tagline: 'Crujiente por fuera, jugoso por dentro' },
    { id: 'tacos',      label: 'Tacos / Mex',  emoji: String.fromCodePoint(0x1F32E), emojis: `${String.fromCodePoint(0x1F32E)} ${String.fromCodePoint(0x1F32F)}`, tagline: 'Sabores auténticos de México' },
    { id: 'desserts',   label: 'Postres',      emoji: String.fromCodePoint(0x1F382), emojis: `${String.fromCodePoint(0x1F382)} ${String.fromCodePoint(0x1F370)}`, tagline: 'El dulce final perfecto' },
    { id: 'healthy',    label: 'Saludable',    emoji: String.fromCodePoint(0x1F957), emojis: `${String.fromCodePoint(0x1F957)} ${String.fromCodePoint(0x1F966)}`, tagline: 'Come bien, vive mejor' },
    { id: 'custom',     label: 'Otro',         emoji: String.fromCodePoint(0x270F), emojis: '',       tagline: '' },
];

function renderBizTypeSelector() {
    const grid = document.getElementById('biz-type-grid');
    if (!grid) return;

    const currentType = state.config.bizType || 'burgers';

    grid.innerHTML = BIZ_TYPES.map(biz => `
        <div class="biz-type-card ${biz.id === currentType ? 'active' : ''}" 
             data-biz-id="${biz.id}"
             title="${biz.label}">
            <span class="biz-check">✓</span>
            <span class="biz-emoji">${biz.emoji}</span>
            <span class="biz-label">${biz.label}</span>
        </div>
    `).join('');

    // Inject preview below the grid
    if (!document.getElementById('biz-type-preview')) {
        const preview = document.createElement('div');
        preview.className = 'biz-type-preview';
        preview.id = 'biz-type-preview';
        grid.parentNode.insertBefore(preview, grid.nextSibling);
    }

    updateBizPreview(currentType);

    // Custom emoji row visibility
    const customRow = document.getElementById('custom-emoji-row');
    const customEmojisInput = document.getElementById('conf-order-emojis');
    if (customRow) customRow.style.display = currentType === 'custom' ? 'block' : 'none';
    if (customEmojisInput && currentType !== 'custom') {
        const found = BIZ_TYPES.find(b => b.id === currentType);
        if (found) customEmojisInput.value = found.emojis;
    }

    // Click handlers
    grid.querySelectorAll('.biz-type-card').forEach(card => {
        card.addEventListener('click', () => {
            const bizId = card.dataset.bizId;
            grid.querySelectorAll('.biz-type-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            state.config.bizType = bizId;
            state.config.waManualMode = false;

            const biz = BIZ_TYPES.find(b => b.id === bizId);
            if (!biz) return;

            // Auto-fill emojis (unless custom)
            if (bizId !== 'custom') {
                if (customEmojisInput) customEmojisInput.value = biz.emojis;
                if (customRow) customRow.style.display = 'none';
                // Suggest tagline only if empty
                const taglineInput = document.getElementById('conf-tagline');
                if (taglineInput && (!taglineInput.value || taglineInput.value === state.config.tagline)) {
                    taglineInput.value = biz.tagline;
                }
            } else {
                if (customRow) customRow.style.display = 'block';
                if (customEmojisInput) { customEmojisInput.value = state.config.orderEmojis || ''; customEmojisInput.focus(); }
            }

            updateBizPreview(bizId);
        });
    });
}

function updateBizPreview(bizId) {
    const preview = document.getElementById('biz-type-preview');
    if (!preview) return;
    const biz = BIZ_TYPES.find(b => b.id === bizId);
    if (!biz) return;

    const name = document.getElementById('conf-name')?.value || state.config.restaurantName || 'Tu Negocio';
    
    // Check if custom mode is active
    const isManual = state.config.waManualMode === true;
    const customText = state.config.waCustomText || 'Nuevo Pedido';
    const customEmojis = state.config.waCustomEmojis || biz.emojis;

    const displayEmojis = isManual ? customEmojis : (bizId === 'custom' ? (document.getElementById('conf-order-emojis')?.value || '✏️') : biz.emojis);
    const displayText = 'Nuevo Pedido'; // Hardcoded as user requested to remove text editing

    preview.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1.2rem; width: 100%;">
            <span class="preview-emojis">${displayEmojis || biz.emoji}</span>
            <div class="preview-text">
                <strong>Vista previa del WhatsApp</strong>
                ${displayEmojis.split(' ')[0] || biz.emoji} ${displayText} - ${name.toUpperCase()} ${displayEmojis.split(' ')[1] || ''}
            </div>
            <button type="button" id="toggle-wa-edit" class="btn-secondary" style="padding: 0.5rem 0.8rem; font-size: 0.75rem; border-radius: 10px; border: 1.5px solid ${isManual ? 'var(--theme-accent)' : 'var(--glass-border)'}; color: var(--text); background: ${isManual ? 'rgba(var(--primary-rgb, 247, 147, 30), 0.1)' : 'transparent'}; white-space: nowrap; transition: all 0.2s ease;">
                <i data-lucide="${isManual ? 'settings-2' : 'edit-3'}" style="width: 14px; height: 14px; margin-right: 4px; color: ${isManual ? 'var(--theme-accent)' : 'var(--text-dim)'};"></i>
                ${isManual ? 'Editar Manual' : 'Personalizar'}
            </button>
        </div>

        ${isManual ? `
            <div id="wa-edit-panel" style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px dashed var(--glass-border); display: flex; flex-direction: column; gap: 1rem; animation: slideDown 0.3s ease;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.65rem;">Emojis Personalizados (inicio y fin)</label>
                    <input type="text" id="wa-custom-emojis-inp" value="${customEmojis}" placeholder="Ej: 🍔 🍟" style="padding: 0.6rem; font-size: 0.9rem;">
                </div>
                <div style="display: flex; justify-content: flex-end; margin-top: 0.5rem;">
                    <button type="button" id="reset-wa-auto" style="background: none; border: none; color: var(--accent); font-size: 0.75rem; cursor: pointer; text-decoration: underline;">Volver a Modo Automático</button>
                </div>
            </div>
        ` : ''}
    `;

    // Re-create icons for the new content
    if (window.lucide) lucide.createIcons();

    // Event Listeners for the new editor
    const editBtn = document.getElementById('toggle-wa-edit');
    if (editBtn) {
        editBtn.onclick = () => {
            state.config.waManualMode = true;
            if (!state.config.waCustomEmojis) {
                state.config.waCustomEmojis = biz.emojis;
            }
            state.config.orderEmojis = state.config.waCustomEmojis;
            updateBizPreview(bizId);
        };
    }

    const resetBtn = document.getElementById('reset-wa-auto');
    if (resetBtn) {
        resetBtn.onclick = () => {
            state.config.waManualMode = false;
            state.config.orderEmojis = biz.emojis;
            updateBizPreview(bizId);
        };
    }

    const emojisInp = document.getElementById('wa-custom-emojis-inp');
    if (emojisInp) {
        emojisInp.oninput = (e) => {
            state.config.waCustomEmojis = e.target.value;
            state.config.orderEmojis = e.target.value;
            // Update preview icons
            const previewText = preview.querySelector('.preview-text');
            const previewIcon = preview.querySelector('.preview-emojis');
            if (previewText && previewIcon) {
                const text = state.config.waCustomText || 'Nuevo Pedido';
                const e0 = e.target.value.split(' ')[0] || '';
                const e1 = e.target.value.split(' ')[1] || '';
                previewText.innerHTML = `<strong>Vista previa del WhatsApp</strong> ${e0} ${text} - ${name.toUpperCase()} ${e1}`;
                previewIcon.textContent = e.target.value || '✏️';
            }
        };
    }
}


const PROMO_BOXES = [
    { id: 'promo-box-1',  name: 'Clásica Roja',   svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#e53935" stroke="#b71c1c" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#ef9a9a" stroke="#b71c1c" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#c62828"/><rect x="8" y="22" width="44" height="4" fill="#c62828"/><path d="M30 18 Q20 10 14 14 Q8 18 12 22 Q18 22 30 18Z" fill="#ff5252"/><path d="M30 18 Q40 10 46 14 Q52 18 48 22 Q42 22 30 18Z" fill="#ff5252"/><circle cx="30" cy="18" r="3" fill="#ffcdd2"/></svg>` },
    { id: 'promo-box-2',  name: 'Dorada Lujo',    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#f9a825" stroke="#f57f17" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#fff9c4" stroke="#f57f17" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#f57f17"/><rect x="8" y="22" width="44" height="4" fill="#f57f17"/><path d="M30 18 Q20 8 13 13 Q7 18 11 23 Q18 22 30 18Z" fill="#ffd54f"/><path d="M30 18 Q40 8 47 13 Q53 18 49 23 Q42 22 30 18Z" fill="#ffd54f"/><circle cx="30" cy="18" r="3.5" fill="#fff176"/></svg>` },
    { id: 'promo-box-3',  name: 'Turquesa Gala',  svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#00897b" stroke="#004d40" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#b2dfdb" stroke="#004d40" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#00695c"/><rect x="8" y="22" width="44" height="4" fill="#00695c"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#4db6ac"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#4db6ac"/><circle cx="30" cy="18" r="3" fill="#e0f2f1"/></svg>` },
    { id: 'promo-box-4',  name: 'Índigo Real',    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#3949ab" stroke="#1a237e" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#c5cae9" stroke="#1a237e" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#283593"/><rect x="8" y="22" width="44" height="4" fill="#283593"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#7986cb"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#7986cb"/><circle cx="30" cy="18" r="3" fill="#e8eaf6"/></svg>` },
    { id: 'promo-box-5',  name: 'Rosa Perlado',   svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#d81b60" stroke="#880e4f" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#fce4ec" stroke="#880e4f" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#ad1457"/><rect x="8" y="22" width="44" height="4" fill="#ad1457"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#f48fb1"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#f48fb1"/><circle cx="30" cy="18" r="3" fill="#fce4ec"/></svg>` },
    { id: 'promo-box-6',  name: 'Esmeralda',      svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#2e7d32" stroke="#1b5e20" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#c8e6c9" stroke="#1b5e20" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#1b5e20"/><rect x="8" y="22" width="44" height="4" fill="#1b5e20"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#66bb6a"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#66bb6a"/><circle cx="30" cy="18" r="3" fill="#e8f5e9"/></svg>` },
    { id: 'promo-box-7',  name: 'Naranja Flame',  svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#e65100" stroke="#bf360c" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#ffe0b2" stroke="#bf360c" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#bf360c"/><rect x="8" y="22" width="44" height="4" fill="#bf360c"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#ff8a65"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#ff8a65"/><circle cx="30" cy="18" r="3" fill="#fff3e0"/></svg>` },
    { id: 'promo-box-8',  name: 'Violeta Magic',  svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#6a1b9a" stroke="#4a148c" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#e1bee7" stroke="#4a148c" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#4a148c"/><rect x="8" y="22" width="44" height="4" fill="#4a148c"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#ce93d8"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#ce93d8"/><circle cx="30" cy="18" r="3" fill="#f3e5f5"/></svg>` },
    { id: 'promo-box-9',  name: 'Cian Neon',      svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#006064" stroke="#004d40" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#b2ebf2" stroke="#004d40" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#00838f"/><rect x="8" y="22" width="44" height="4" fill="#00838f"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#4dd0e1"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#4dd0e1"/><circle cx="30" cy="18" r="3" fill="#e0f7fa"/></svg>` },
    { id: 'promo-box-10', name: 'Gris Titanio',   svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#455a64" stroke="#263238" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#cfd8dc" stroke="#263238" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#263238"/><rect x="8" y="22" width="44" height="4" fill="#263238"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#90a4ae"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#90a4ae"/><circle cx="30" cy="18" r="3" fill="#eceff1"/></svg>` },
    { id: 'promo-box-11', name: 'Coral Sunset',   svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#ff5722" stroke="#bf360c" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#fbe9e7" stroke="#bf360c" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#dd2c00"/><rect x="8" y="22" width="44" height="4" fill="#dd2c00"/><path d="M30 18 Q22 6 14 11 Q8 18 13 23 Q20 21 30 18Z" fill="#ffab91"/><path d="M30 18 Q38 6 46 11 Q52 18 47 23 Q40 21 30 18Z" fill="#ffab91"/><circle cx="30" cy="17" r="4" fill="#fbe9e7"/><line x1="28" y1="13" x2="32" y2="13" stroke="#dd2c00" stroke-width="1.5"/></svg>` },
    { id: 'promo-box-12', name: 'Azul Zafiro',    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#1565c0" stroke="#0d47a1" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#bbdefb" stroke="#0d47a1" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#0d47a1"/><rect x="8" y="22" width="44" height="4" fill="#0d47a1"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#64b5f6"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#64b5f6"/><circle cx="30" cy="18" r="3" fill="#e3f2fd"/></svg>` },
    { id: 'promo-box-13', name: 'Lima Fresco',    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#558b2f" stroke="#33691e" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#f1f8e9" stroke="#33691e" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#33691e"/><rect x="8" y="22" width="44" height="4" fill="#33691e"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#aed581"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#aed581"/><circle cx="30" cy="18" r="3" fill="#f1f8e9"/></svg>` },
    { id: 'promo-box-14', name: 'Blanco Cristal', svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#f5f5f5" stroke="#9e9e9e" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#fff" stroke="#9e9e9e" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#bdbdbd"/><rect x="8" y="22" width="44" height="4" fill="#bdbdbd"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#e0e0e0"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#e0e0e0"/><circle cx="30" cy="18" r="3" fill="#fff"/></svg>` },
    { id: 'promo-box-15', name: 'Fucsia Noche',   svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#ad1457" stroke="#880e4f" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#fce4ec" stroke="#880e4f" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#880e4f"/><rect x="8" y="22" width="44" height="4" fill="#880e4f"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#f06292"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#f06292"/><circle cx="30" cy="18" r="3" fill="#fce4ec"/></svg>` },
    { id: 'promo-box-16', name: 'Café Premium',   svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#4e342e" stroke="#3e2723" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#d7ccc8" stroke="#3e2723" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#3e2723"/><rect x="8" y="22" width="44" height="4" fill="#3e2723"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#a1887f"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#a1887f"/><circle cx="30" cy="18" r="3" fill="#efebe9"/></svg>` },
    { id: 'promo-box-17', name: 'Aqua Marina',    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#0277bd" stroke="#01579b" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#b3e5fc" stroke="#01579b" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#01579b"/><rect x="8" y="22" width="44" height="4" fill="#01579b"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#4fc3f7"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#4fc3f7"/><circle cx="30" cy="18" r="3" fill="#e1f5fe"/></svg>` },
    { id: 'promo-box-18', name: 'Ámbar Vintage',  svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#ff8f00" stroke="#e65100" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#fff8e1" stroke="#e65100" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#e65100"/><rect x="8" y="22" width="44" height="4" fill="#e65100"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#ffca28"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#ffca28"/><circle cx="30" cy="18" r="3" fill="#fff8e1"/></svg>` },
    { id: 'promo-box-19', name: 'Champán Dorado', svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#c8a951" stroke="#9a7b2f" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#fdf5dc" stroke="#9a7b2f" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#9a7b2f"/><rect x="8" y="22" width="44" height="4" fill="#9a7b2f"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#e8c96a"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#e8c96a"/><circle cx="30" cy="18" r="3" fill="#fff9e6"/></svg>` },
    { id: 'promo-box-20', name: 'Bronce Antiguo', svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#8d6e63" stroke="#5d4037" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#d7ccc8" stroke="#5d4037" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#5d4037"/><rect x="8" y="22" width="44" height="4" fill="#5d4037"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#bcaaa4"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#bcaaa4"/><circle cx="30" cy="18" r="3" fill="#efebe9"/></svg>` },
    { id: 'promo-box-21', name: 'Lavanda Real',   svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#7c4dff" stroke="#4a148c" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#ede7f6" stroke="#4a148c" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#4527a0"/><rect x="8" y="22" width="44" height="4" fill="#4527a0"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#b39ddb"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#b39ddb"/><circle cx="30" cy="18" r="3" fill="#ede7f6"/></svg>` },
    { id: 'promo-box-22', name: 'Obsidiana',      svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#212121" stroke="#000000" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#616161" stroke="#000000" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#757575"/><rect x="8" y="22" width="44" height="4" fill="#757575"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#9e9e9e"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#9e9e9e"/><circle cx="30" cy="18" r="3" fill="#e0e0e0"/></svg>` },
    { id: 'promo-box-23', name: 'Platino',        svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#90a4ae" stroke="#546e7a" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#cfd8dc" stroke="#546e7a" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#546e7a"/><rect x="8" y="22" width="44" height="4" fill="#546e7a"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#b0bec5"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#b0bec5"/><circle cx="30" cy="18" r="3" fill="#ffffff"/></svg>` },
    { id: 'promo-box-24', name: 'Verde Noche',    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#1b5e20" stroke="#0a3d0a" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#c8e6c9" stroke="#0a3d0a" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#0a3d0a"/><rect x="8" y="22" width="44" height="4" fill="#0a3d0a"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#388e3c"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#388e3c"/><circle cx="30" cy="18" r="3" fill="#e8f5e9"/></svg>` }
];

const PROMO_ANIMS = [
    { id: 'anim-3d-spinner',    name: '3D Spinner' },
    { id: 'anim-atomic-heart',  name: 'Latido Atómico' },
    { id: 'anim-magnetic',      name: 'Magnetismo' },
    { id: 'anim-elastic',       name: 'Gelatina' },
    { id: 'anim-orbital',       name: 'Órbita Solar' },
    { id: 'anim-glitch',        name: 'Glitch Pro' },
    { id: 'anim-solar',         name: 'Explosión Solar' },
    { id: 'anim-cosmic',        name: 'Deriva Cósmica' },
    { id: 'anim-radar',         name: 'Pulso Radar' },
    { id: 'anim-flip-glide',    name: 'Flip & Glide' },
    { id: 'anim-vortex',        name: 'Vórtice Cuántico' },
    { id: 'anim-cosmic-bounce', name: 'Rebote Cósmico' }
];


function renderPromoConfig() {
    const iconGrid = document.getElementById('promo-icon-selector');
    const animGrid = document.getElementById('promo-anim-selector');
    if (!iconGrid || !animGrid) return;

    const currentIcon = state.config.promoIcon || 'promo-box-1';
    const currentAnim = state.config.promoAnim || 'anim-3d-spinner';

    // Boxes — render as transparent SVG gift boxes (no background color)
    iconGrid.innerHTML = PROMO_BOXES.map(box => `
        <div class="promo-svg-box ${box.id === currentIcon ? 'active' : ''}" 
             title="${box.name}"
             onclick="setPromoIcon('${box.id}')">
             ${box.svg}
             <span class="promo-box-label">${box.name}</span>
        </div>
    `).join('');

    // Animations
    animGrid.innerHTML = PROMO_ANIMS.map(anim => `
        <div class="anim-card ${anim.id === currentAnim ? 'active' : ''}" onclick="setPromoAnim('${anim.id}')">
            <div class="anim-card-title">${anim.name}</div>
        </div>
    `).join('');
}

window.setPromoIcon = function(id) {
    state.config.promoIcon = id;
    const box = PROMO_BOXES.find(b => b.id === id);
    if (box) state.config.promoIconSvg = box.svg;
    saveStateToLocal();
    renderPromoConfig();
    if (typeof updatePromoBubbleUI === 'function') updatePromoBubbleUI();
};


window.setPromoAnim = function(id) {
    state.config.promoAnim = id;
    saveStateToLocal();
    renderPromoConfig();
    if (typeof updatePromoBubbleUI === 'function') updatePromoBubbleUI();
};





// Centralized showConfirm is now in script.js

function showPrompt(title, defaultVal, onConfirm) {
    const modal = document.getElementById('prompt-modal');
    const titleEl = document.getElementById('prompt-title');
    const inputEl = document.getElementById('prompt-input');
    const okBtn = document.getElementById('prompt-ok');
    const cancelBtn = document.getElementById('prompt-cancel');
    if (!modal || !titleEl || !inputEl) return;
    
    titleEl.textContent = title;
    inputEl.value = defaultVal || '';
    modal.classList.remove('hidden');
    inputEl.focus();
    inputEl.select();
    
    const finish = () => {
        onConfirm(inputEl.value);
        modal.classList.add('hidden');
    };

    okBtn.onclick = finish;
    inputEl.onkeydown = (e) => { if (e.key === 'Enter') finish(); };
    cancelBtn.onclick = () => { modal.classList.add('hidden'); };
}

function updateCatSelects() {
    const catSelect = document.getElementById('dish-cat');
    if (!catSelect) return;
    catSelect.innerHTML = state.categories
        .filter(c => c.id !== 'todos')
        .map(c => `<option value="${c.id}">${c.name}</option>`)
        .join('');
}

function openAdminModal(id = null, prefillCatId = null) {
    const modal = document.getElementById('admin-modal');
    const form = document.getElementById('item-form');
    if (!modal || !form) return;
    
    updateCatSelects();
    window.currentItemImageB64 = ''; // Clear any previous temporary image

    if (id) {
        const dish = state.dishes.find(d => d.id === id);
        document.getElementById('edit-id').value = dish.id;
        document.getElementById('item-name').value = dish.name;
        document.getElementById('dish-cat').value = dish.cat;
        document.getElementById('item-price').value = dish.price.toLocaleString('es-CO');
        document.getElementById('item-desc').value = dish.desc;
        
        if (window.setPreviewImage) {
            window.setPreviewImage('item-img-preview', dish.img, 'Click para seleccionar foto');
        } else {
            const preview = document.getElementById('item-img-preview');
            preview.style.backgroundImage = `url('${dish.img}')`;
            preview.innerHTML = '';
        }
    } else {
        form.reset();
        document.getElementById('edit-id').value = '';
        
        // Pre-fill category if provided
        if (prefillCatId) {
            document.getElementById('dish-cat').value = prefillCatId;
        }

        if (window.setPreviewImage) {
            window.setPreviewImage('item-img-preview', '', 'Click para seleccionar foto');
        } else {
            const preview = document.getElementById('item-img-preview');
            preview.style.backgroundImage = '';
            preview.innerHTML = '<span>Click para seleccionar foto</span>';
        }
    }
    

    
    modal.classList.remove('hidden');
}



window.setPreviewImage = (previewId, url, defaultText = 'Sin imagen seleccionada') => {
    const preview = document.getElementById(previewId);
    if (!preview) return;
    
    if (url) {
        preview.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;">`;
        preview.style.background = 'none';
        preview.classList.add('has-image');
    } else {
        preview.innerHTML = `<span style="color:var(--text-dim); font-size:0.85rem;">${defaultText}</span>`;
        preview.style.background = 'rgba(255,255,255,0.02)';
        preview.classList.remove('has-image');
    }
};

async function handleFileUpload(inputId, previewId, callback) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input || !preview) return;
    
    input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                preview.innerHTML = '<span style="color:var(--text-dim); font-size:0.85rem;">Optimizando...</span>';
                // Modo Ahorro Extremo: 40KB max y 600px (ideal para móviles y no saturar los 5MB del navegador)
                const options = { 
                    maxSizeMB: 0.04, 
                    maxWidthOrHeight: 600, 
                    initialQuality: 0.7, 
                    useWebWorker: true 
                };
                const compressedFile = await imageCompression(file, options);
                const reader = new FileReader();
                reader.onload = (event) => {
                    const b64 = event.target.result;
                    
                    // Verificar tamaño real del string Base64 (los 5MB se agotan rápido)
                    if (b64.length > 150000) { // Si aún así pesa más de 150KB (raro)
                         showToast('⚠️ Imagen muy pesada. Intenta con otra.', 'error');
                         window.setPreviewImage(previewId, '');
                         return;
                    }

                    window.setPreviewImage(previewId, b64);
                    callback(b64);
                    showToast('✅ Imagen optimizada para ahorro de espacio');
                };
                reader.readAsDataURL(compressedFile);
            } catch (error) {
                console.error("Error en compresión:", error);
                showToast('Error al procesar la imagen', 'error');
                window.setPreviewImage(previewId, '');
            }
        }
    });
}

// --- Initialize Admin Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Only run if we are on the admin page
    if (!window.location.pathname.endsWith('admin.html')) return;
    if (window.lucide) lucide.createIcons();

    // Sidebar Tabs navigation
    document.querySelectorAll('.sidebar-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.admin-tab-content').forEach(tab => tab.classList.add('hidden'));
            const targetTab = document.getElementById(tabId);
            if (targetTab) targetTab.classList.remove('hidden');
            
            if (tabId === 'stats-tab') {
                if (typeof window.reRenderCurrentStats === 'function') {
                    window.reRenderCurrentStats();
                } else if (typeof renderStats === 'function') {
                    renderStats('today');
                }
            }
            if (tabId === 'my-metrics-tab') {
                if (typeof window.reRenderCurrentMyMetrics === 'function') {
                    window.reRenderCurrentMyMetrics();
                } else if (typeof renderMyMetrics === 'function') {
                    renderMyMetrics('today');
                }
            }
            if (tabId === 'driver-metrics-tab') {
                if (typeof window.reRenderCurrentDriverMetrics === 'function') {
                    window.reRenderCurrentDriverMetrics();
                } else if (typeof renderDriverMetrics === 'function') {
                    renderDriverMetrics('today');
                }
            }
            if (tabId === 'orders-tab') {
                if (typeof renderOrders === 'function') renderOrders();
            }
            if (tabId === 'history-tab') {
                if (typeof renderOrders === 'function') renderOrders();
            }
            if (tabId === 'expenses-tab') {
                if (typeof checkExpensesLockState === 'function') checkExpensesLockState();
            }
            if (tabId === 'employees-tab') {
                if (typeof loadEmployees === 'function') loadEmployees();
            }
            if (tabId === 'domicilios-tab') {
                if (typeof renderDriverDeliveriesSection === 'function') renderDriverDeliveriesSection();
            }
        });
    });

    // Sub-tabs navigation
    // --- Global State for Staged Config ---
    let stagedAccent = state.config.themeAccent || '#f7931e';
    let stagedBg = state.config.themeBg || (typeof SAVORY_GALLERY !== 'undefined' ? SAVORY_GALLERY[0].url : '');
    let stagedIcon = state.config.cartIcon || 'shopping-bag';
    let stagedLogo = state.config.themeLogo || 'assets/logo-default.png';

    // Global Config Form
    const configForm = document.getElementById('global-config-form');
    if (configForm) {
        configForm.addEventListener('submit', (e) => {
            e.preventDefault();
            state.config.restaurantName = document.getElementById('conf-name').value;
            const logoAnimEl = document.getElementById('conf-logo-anim');
            if (logoAnimEl) state.config.logoAnimationEnabled = logoAnimEl.checked;
            state.config.tagline = document.getElementById('conf-tagline').value;
            state.config.heroTitleT1 = document.getElementById('conf-hero-t1').value;
            state.config.heroTitleHighlight = document.getElementById('conf-hero-highlight').value;
            state.config.heroTitleT2 = document.getElementById('conf-hero-t2').value;
            state.config.heroDesc = document.getElementById('conf-hero-desc').value;
            state.config.heroTime = document.getElementById('conf-hero-time').value;
            state.config.heroRating = document.getElementById('conf-hero-rating').value;
            state.config.whatsappNumber = document.getElementById('conf-whatsapp').value;
            state.config.footerText = document.getElementById('conf-footer').value;
            
            const waTemplateEl = document.getElementById('conf-wa-template');
            if (waTemplateEl) state.config.waTemplateOrder = waTemplateEl.value;
            state.config.instagram = document.getElementById('conf-instagram').value;
            state.config.facebook = document.getElementById('conf-facebook').value;
            
            // Resolve emojis from selected business type
            const activeBizCard = document.querySelector('.biz-type-card.active');
            const bizId = activeBizCard ? activeBizCard.dataset.bizId : (state.config.bizType || 'burgers');
            state.config.bizType = bizId;
            if (state.config.waManualMode === true && state.config.waCustomEmojis) {
                state.config.orderEmojis = state.config.waCustomEmojis;
            } else if (bizId === 'custom') {
                state.config.orderEmojis = document.getElementById('conf-order-emojis').value;
            } else {
                const biz = BIZ_TYPES.find(b => b.id === bizId);
                state.config.orderEmojis = biz ? biz.emojis : '🍔 🍟';
            }
            
            // Sync staged visual settings
            state.config.themeAccent = stagedAccent;
            state.config.themeBg = stagedBg;
            state.config.cartIcon = stagedIcon;

            const storeToggle = document.getElementById('conf-store-open');
            const statusLabel = document.getElementById('current-status-label');
            if (storeToggle) {
                state.config.storeOpen = storeToggle.checked;
                if (statusLabel) statusLabel.textContent = storeToggle.checked ? 'ABIERTO AHORA' : 'CERRADO TEMPORALMENTE';
            }
            
            state.config.storeClosedFrom = document.getElementById('conf-closed-from').value;
            state.config.storeClosedUntil = document.getElementById('conf-closed-until').value;
            state.config.storeClosedMsg = document.getElementById('conf-closed-msg').value;

            // Security Changes
            const newUser = document.getElementById('conf-admin-user').value.trim();
            const newPass = document.getElementById('conf-admin-pass').value;
            const newExpensesPass = document.getElementById('conf-expenses-pass').value;
            const oldPassInput = document.getElementById('conf-admin-old-pass').value;

            const isUserChanging = newUser !== '' && newUser !== state.auth.user;
            const isPassChanging = newPass !== '';
            const isExpensesPassChanging = newExpensesPass !== (state.auth.expensePass || '');

            if (isUserChanging || isPassChanging || isExpensesPassChanging) {
                if (oldPassInput !== state.auth.pass) {
                    showToast('Contraseña actual incorrecta. No se guardaron cambios de seguridad.', 'error');
                    return;
                }
                if (isUserChanging) state.auth.user = newUser;
                if (isPassChanging) state.auth.pass = newPass;
                if (isExpensesPassChanging) {
                    state.auth.expensePass = newExpensesPass;
                    if (newExpensesPass === '') {
                        sessionStorage.setItem('streetfeed_expenses_unlocked', 'true');
                    } else {
                        sessionStorage.removeItem('streetfeed_expenses_unlocked');
                    }
                }
                
                document.getElementById('conf-admin-user').value = ''; // Reset after change
                document.getElementById('conf-admin-old-pass').value = '';
                document.getElementById('conf-admin-pass').value = '';
            }
            
            if (typeof updateUIFromConfig === 'function') updateUIFromConfig();
            saveStateToLocal();
            
            // Auto-cerrar el overlay de settings-pane si en móvil
            const settingsPane = document.getElementById('settings-pane');
            if (window.innerWidth <= 768 && settingsPane) {
                settingsPane.classList.remove('active');
            }
            
            showToast('Configuración actualizada ✅');
        });
        
        // Auto-save just for the logo animation toggle for immediate feedback
        const logoAnimToggle = document.getElementById('conf-logo-anim');
        if (logoAnimToggle) {
            logoAnimToggle.addEventListener('change', () => {
                state.config.logoAnimationEnabled = logoAnimToggle.checked;
                saveStateToLocal();
                if (typeof updateUIFromConfig === 'function') updateUIFromConfig();
                showToast(logoAnimToggle.checked ? '✨ Animación activada' : '⏸️ Animación desactivada', 'success');
            });
        }
    }

    // Category Modal
    const addCatBtn = document.getElementById('add-cat-btn');
    const catForm = document.getElementById('cat-form');
    const catModal = document.getElementById('cat-modal');
    const closeCatModal = document.getElementById('close-cat-modal');

    if (addCatBtn) {
        addCatBtn.addEventListener('click', () => {
            requireSecurityAuth(() => {
                catForm.reset();
                catModal.classList.remove('hidden');
            });
        });
    }
    if (closeCatModal) {
        closeCatModal.addEventListener('click', () => catModal.classList.add('hidden'));
    }

    if (catForm) {
        catForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('cat-name').value;
            const id = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
            
            const isExtras = document.getElementById('cat-is-extras').checked;
            
            if (state.categories.find(c => c.id === id)) {
                showToast('Esa categoría ya existe', 'error');
                return;
            }

            state.categories.push({ id, name: name, icon: 'folder', isExtras: isExtras });
            saveStateToLocal();
            if (typeof renderCategories === 'function') renderCategories();
            renderAdmin();
            updateCatSelects();
            catModal.classList.add('hidden');
            showToast('Categoría creada ✅');
        });
    }

    // Item Modal
    const addItemBtn = document.getElementById('add-item-btn');
    const closeAdminModal = document.getElementById('close-admin-modal');
    if (addItemBtn) addItemBtn.addEventListener('click', () => requireSecurityAuth(() => openAdminModal()));
    if (closeAdminModal) closeAdminModal.addEventListener('click', () => document.getElementById('admin-modal').classList.add('hidden'));

    // Item Form Submit
    const itemForm = document.getElementById('item-form');
    if (itemForm) {
        itemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-id').value;
            const dish = id ? state.dishes.find(d => d.id === parseInt(id)) : null;
            
            const newItem = {
                id: id ? parseInt(id) : Date.now(),
                name: document.getElementById('item-name').value,
                cat: document.getElementById('dish-cat').value,
                price: parseFloat(document.getElementById('item-price').value.replace(/\./g, '')),
                desc: document.getElementById('item-desc').value,
                img: window.currentItemImageB64 || (dish ? dish.img : ''),
                extras: []
            };

            if (id) {
                const index = state.dishes.findIndex(d => d.id === parseInt(id));
                state.dishes[index] = newItem;
            } else {
                state.dishes.push(newItem);
            }

            window.currentItemImageB64 = ''; 
            document.getElementById('admin-modal').classList.add('hidden');
            saveStateToLocal();
            renderAdmin();
            if (typeof renderMenu === 'function') renderMenu();
            showToast(id ? 'Producto actualizado ✅' : 'Nuevo producto creado ✅');
        });
    }

    // Price input formatting (thousands separators)
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('price-input') || e.target.id === 'item-price') {
            // Remove non-digits
            let val = e.target.value.replace(/\D/g, '');
            if (val) {
                e.target.value = new Intl.NumberFormat('es-CO').format(parseInt(val));
            } else {
                e.target.value = '';
            }
        }
    });

    // Config Sub-tabs navigation
    document.querySelectorAll('.subtab-btn:not(.promo-subtab-btn)').forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionId = btn.dataset.section;
            document.querySelectorAll('.subtab-btn:not(.promo-subtab-btn)').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.config-sub-section').forEach(sec => sec.classList.add('hidden'));
            document.getElementById(sectionId).classList.remove('hidden');
            
            // Trigger specific renders
            if (sectionId === 'appearance-sec') renderAppearancePanel();
        });
    });

    // Promo Sub-tabs navigation
    document.querySelectorAll('.promo-subtab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionId = btn.dataset.section;
            document.querySelectorAll('.promo-subtab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.promo-sub-section').forEach(sec => sec.classList.add('hidden'));
            document.getElementById(sectionId).classList.remove('hidden');
        });
    });

    // ==========================================
    // GLOBAL ACCORDION BINDINGS
    // ==========================================

    // 0b. Master Themes Accordion Toggle Logic
    const surfaceToggleBtn = document.getElementById('toggle-surface-btn');
    const surfaceWrapper   = document.getElementById('appearance-wrapper'); // Updated to new wrapper ID
    const surfaceAccordion = document.getElementById('surface-accordion');
    if (surfaceToggleBtn && surfaceWrapper) {
        surfaceToggleBtn.onclick = () => {
            const isOpen = surfaceWrapper.style.display === 'block';
            surfaceWrapper.style.display = isOpen ? 'none' : 'block';
            if (surfaceAccordion) surfaceAccordion.classList.toggle('active', !isOpen);
            const icon = surfaceToggleBtn.querySelector('.accordion-icon');
            if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
            if (!isOpen) requestAnimationFrame(() => surfaceAccordion.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        };
    }

    // 0. Logo Accordion Toggle Logic
    const logoToggleBtn = document.getElementById('toggle-logo-btn');
    const logoWrapper = document.getElementById('logo-upload-wrapper');
    const logoAccordion = document.getElementById('logo-accordion');
    if (logoToggleBtn && logoWrapper) {
        logoToggleBtn.onclick = () => {
            const isOpen = logoWrapper.style.display === 'block';
            logoWrapper.style.display = isOpen ? 'none' : 'block';
            if (logoAccordion) logoAccordion.classList.toggle('active', !isOpen);
            const icon = logoToggleBtn.querySelector('.accordion-icon');
            if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
            if (!isOpen) requestAnimationFrame(() => logoAccordion.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        };
    }

    // 1.0 Biz Type Accordion Toggle Logic
    const bizToggleBtn = document.getElementById('toggle-biz-btn');
    const bizWrapper = document.getElementById('biz-type-wrapper');
    const bizAccordion = document.getElementById('biz-accordion');
    if (bizToggleBtn && bizWrapper) {
        bizToggleBtn.onclick = () => {
            const isOpen = bizWrapper.style.display === 'block';
            bizWrapper.style.display = isOpen ? 'none' : 'block';
            if (bizAccordion) bizAccordion.classList.toggle('active', !isOpen);
            const icon = bizToggleBtn.querySelector('.accordion-icon');
            if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
            if (!isOpen) requestAnimationFrame(() => bizAccordion.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        };
    }

    // 1.05 Promo Bubble Accordion Toggle Logic
    const promoToggleBtn = document.getElementById('toggle-promo-btn');
    const promoWrapper = document.getElementById('promo-wrapper');
    const promoAccordionGroup = document.getElementById('promo-accordion');
    if (promoToggleBtn && promoWrapper) {
        promoToggleBtn.onclick = () => {
            const isOpen = promoWrapper.style.display === 'block';
            promoWrapper.style.display = isOpen ? 'none' : 'block';
            if (promoAccordionGroup) promoAccordionGroup.classList.toggle('active', !isOpen);
            const icon = promoToggleBtn.querySelector('.accordion-icon');
            if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
            if (!isOpen) requestAnimationFrame(() => promoAccordionGroup.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        };
    }

    // 1.2 Wallpapers Accordion Toggle Logic
    const wpToggleBtn = document.getElementById('toggle-wp-btn');
    const wpWrapper = document.getElementById('wp-wrapper');
    const wpAccordion = document.getElementById('wallpaper-accordion');
    if (wpToggleBtn && wpWrapper) {
        wpToggleBtn.onclick = () => {
            const isOpen = wpWrapper.style.display === 'block';
            wpWrapper.style.display = isOpen ? 'none' : 'block';
            if (wpAccordion) wpAccordion.classList.toggle('active', !isOpen);
            const icon = wpToggleBtn.querySelector('.accordion-icon');
            if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
            if (!isOpen) requestAnimationFrame(() => wpAccordion.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        };
    }

    // 1.3 Icons Accordion Toggle Logic
    const iconsToggleBtn = document.getElementById('toggle-icons-btn');
    const iconsWrapper = document.getElementById('icons-wrapper');
    const iconsAccordion = document.getElementById('icons-accordion');
    if (iconsToggleBtn && iconsWrapper) {
        iconsToggleBtn.onclick = () => {
            const isOpen = iconsWrapper.style.display === 'block';
            iconsWrapper.style.display = isOpen ? 'none' : 'block';
            if (iconsAccordion) iconsAccordion.classList.toggle('active', !isOpen);
            const icon = iconsToggleBtn.querySelector('.accordion-icon');
            if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
            if (!isOpen) requestAnimationFrame(() => iconsAccordion.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        };
    }

    const ICON_LIBRARY = {
        comida: ['utensils', 'pizza', '🍔', '🍕', '🍖', '🍗', '🥩', '🥓', '🍟', '🥪', '🌮', '🌯', '🥙', '🧆', '🍳', '🥘', '🍲', '🥗', '🍿', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍣', '🍤', '🍥', '🍡', '🥟', '🥠', '🥡', '🍱', '🥨', '🥯', '🥞', '🧇'],
        dulces: ['ice-cream', 'cake-slice', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '🥐', '🍞', '🥖', '🥨', '🥯', '🥞', '🧇', '🧀', '🍓', '🍒', '🍎', '🍉', '🍑', '🍍', '🥭'],
        bebidas: ['cup-soda', 'coffee', '🥤', '🧋', '🧃', '🧉', '🥛', '☕', '🍵', '🍶', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🧊', '🍶', '🍾', '🧂'],
        tienda: ['shopping-bag', 'shopping-cart', 'shopping-basket', '🛍️', '🛒', '🧺', '🚚', '🚛', '🚀', '🏪', '📦', '🎁', '📍', '🗺️', '⌚', '📅', '🔔', '📣', '📞', '🎧', '📱', '💳', '💰', '💸', '💎', '🔑', '🔒', '🛡️', '✅', '🏠', '🏢'],
        premium: ['shopping-cart', 'shopping-bag', 'shopping-basket', 'package', 'store', 'star', 'crown', 'diamond', 'flame', 'zap', 'trophy', 'medal', '👑', '💎', '⭐', '🔥', '⚡', '🏆', '🎖️', '✨', '🪄', '💖', '💝', '💘', '🤩', '😎', '🥳', '🚀', '🌈', '🍀', '🧿', '🧿', '💎', '🎨', '🎬', '🎧', '🎸', '🎹']
    };

    let iconCat = 'comida';
    let iconPage = 0;
    const ICONS_PER_PAGE = 12;

    // ── LOGO UPLOAD (independent — never blocked by other accordion states) ──
    function initLogoUpload() {
        const logoInput    = document.getElementById('conf-logo-file');
        const logoPreviewImg = document.getElementById('logo-preview-img');
        if (!logoInput) return;

        // Show saved logo on open
        if (state.config.themeLogo && logoPreviewImg) {
            logoPreviewImg.src = state.config.themeLogo;
        }

        logoInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                showToast('Procesando logo...');

                // Compress via Canvas — no external library needed
                const base64 = await new Promise((resolve, reject) => {
                    const img = new Image();
                    const url = URL.createObjectURL(file);
                    img.onload = () => {
                        URL.revokeObjectURL(url);
                        const MAX = 200; // max px per side — enough for navbar logo
                        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
                        const canvas = document.createElement('canvas');
                        canvas.width  = Math.round(img.width  * scale);
                        canvas.height = Math.round(img.height * scale);
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        resolve(canvas.toDataURL('image/png', 0.9));
                    };
                    img.onerror = reject;
                    img.src = url;
                });

                stagedLogo = base64;
                state.config.themeLogo = base64;
                saveStateToLocal();
                applyTheme(stagedAccent, stagedBg, stagedLogo);
                if (logoPreviewImg) logoPreviewImg.src = base64;
                showToast('Logo actualizado ✅');
            } catch (err) {
                console.error('Logo upload error:', err);
                showToast('Error al subir logo', 'error');
            }
        };
    }
    initLogoUpload();

    function renderAppearancePanel() {
        try {
            const iconContainer = document.getElementById('cart-icon-selector');
            const catFilter = document.getElementById('icon-cat-filter');
            
            // 0a. Render Master Themes (50 Curated Professional Templates)
            const themeContainer = document.getElementById('theme-gallery-grid');
            if (themeContainer) {
                // 50 hand-crafted, carefully contrasted themes
                const MASTER_THEMES = [
                    // ── DARK SERIES (dark surface) ──────────────────────────────────────
                    { name: 'Fuego Callejero', surface: '#0f0f0f', surfaceCard: '#1c1c1e', accent: '#FF6B35', text: '#ffffff', textDim: 'rgba(255,255,255,0.55)' },
                    { name: 'Naranja Éxito',   surface: '#111111', surfaceCard: '#1e1e1e', accent: '#F7931E', text: '#ffffff', textDim: 'rgba(255,255,255,0.55)' },
                    { name: 'Oro Premium',      surface: '#0d0d0d', surfaceCard: '#1a1a1a', accent: '#FFD700', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Rojo Royal',       surface: '#110000', surfaceCard: '#1f0b0b', accent: '#E53935', text: '#ffffff', textDim: 'rgba(255,255,255,0.55)' },
                    { name: 'Coral Verano',     surface: '#130d0a', surfaceCard: '#201510', accent: '#FF8A65', text: '#ffffff', textDim: 'rgba(255,255,255,0.55)' },
                    { name: 'Verde Lima',       surface: '#0a110a', surfaceCard: '#131c13', accent: '#76C442', text: '#ffffff', textDim: 'rgba(255,255,255,0.55)' },
                    { name: 'Menta Fresca',     surface: '#091411', surfaceCard: '#0f1e1a', accent: '#26A69A', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Esmeralda',        surface: '#08100c', surfaceCard: '#101a14', accent: '#00C853', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Azul Índigo',      surface: '#090d18', surfaceCard: '#111828', accent: '#5C6BC0', text: '#ffffff', textDim: 'rgba(255,255,255,0.55)' },
                    { name: 'Cielo Neón',       surface: '#050e1a', surfaceCard: '#0a1830', accent: '#29B6F6', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    // ── NAVY / MIDNIGHT SERIES ────────────────────────────────────────
                    { name: 'Medianoche',       surface: '#0b0d1a', surfaceCard: '#131626', accent: '#7C83FD', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Púrpura Oscuro',   surface: '#100a1a', surfaceCard: '#1a1028', accent: '#AB47BC', text: '#ffffff', textDim: 'rgba(255,255,255,0.55)' },
                    { name: 'Rosa Neón',        surface: '#160010', surfaceCard: '#22011a', accent: '#F06292', text: '#ffffff', textDim: 'rgba(255,255,255,0.55)' },
                    { name: 'Fucsia Eléctrico', surface: '#140010', surfaceCard: '#1f001a', accent: '#E040FB', text: '#ffffff', textDim: 'rgba(255,255,255,0.55)' },
                    { name: 'Lavanda Noche',    surface: '#0f0e1c', surfaceCard: '#17163a', accent: '#9575CD', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Azul Marino Pro',  surface: '#080e1c', surfaceCard: '#0e1a36', accent: '#1565C0', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Teal Profundo',    surface: '#081414', surfaceCard: '#0f2020', accent: '#00897B', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Cian Galaxia',     surface: '#050e10', surfaceCard: '#091820', accent: '#00BCD4', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Lima Explosión',   surface: '#0a1002', surfaceCard: '#141e04', accent: '#C6FF00', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Amarillo Neón',    surface: '#110f00', surfaceCard: '#1e1a00', accent: '#FFEB3B', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    // ── WARM DARK SERIES ─────────────────────────────────────────────
                    { name: 'Café Intenso',     surface: '#100800', surfaceCard: '#1e1000', accent: '#FF8F00', text: '#ffffff', textDim: 'rgba(255,255,255,0.55)' },
                    { name: 'Marrón Cacao',     surface: '#120a05', surfaceCard: '#1e1008', accent: '#A1887F', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Ámbar Antorcha',   surface: '#120e00', surfaceCard: '#1e1800', accent: '#FFB300', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Bronce Élite',     surface: '#0f0b06', surfaceCard: '#1c1508', accent: '#CD7F32', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Tierra Urbana',    surface: '#10100a', surfaceCard: '#1a1a10', accent: '#8D6E63', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    // ── CHARCOAL SERIES ───────────────────────────────────────────────
                    { name: 'Grafito Eléctrico',surface: '#1a1a1a', surfaceCard: '#262626', accent: '#FF5722', text: '#ffffff', textDim: 'rgba(255,255,255,0.55)' },
                    { name: 'Plata Oscura',     surface: '#1c1c1e', surfaceCard: '#28282c', accent: '#90CAF9', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Acero Frío',       surface: '#161c22', surfaceCard: '#222c36', accent: '#78909C', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Pizarra Pro',      surface: '#1a1e24', surfaceCard: '#262c34', accent: '#546E7A', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Titanio Urban',    surface: '#181818', surfaceCard: '#242424', accent: '#B0BEC5', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    // ── DEEP BLUE / ROYAL SERIES ─────────────────────────────────────
                    { name: 'Zafiro Real',      surface: '#080f1f', surfaceCard: '#101a36', accent: '#1E88E5', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Océano Profundo',  surface: '#05101a', surfaceCard: '#081a2c', accent: '#0288D1', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Azul Cobalto',     surface: '#060c1e', surfaceCard: '#0c163a', accent: '#3F51B5', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Índigo Suave',     surface: '#0d0f22', surfaceCard: '#161840', accent: '#9FA8DA', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Azul Medianoche',  surface: '#050a18', surfaceCard: '#0a1228', accent: '#42A5F5', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    // ── DEEP GREEN SERIES ─────────────────────────────────────────────
                    { name: 'Bosque Premium',   surface: '#081208', surfaceCard: '#0f1e10', accent: '#43A047', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Jungla Oscura',    surface: '#071208', surfaceCard: '#0d1e0d', accent: '#66BB6A', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Aguacate Pro',     surface: '#0a1205', surfaceCard: '#141e08', accent: '#8BC34A', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Oliva Élite',      surface: '#0c120a', surfaceCard: '#181e14', accent: '#9CCC65', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    // ── ULTRA DARK / PREMIUM SERIES ──────────────────────────────────
                    { name: 'Negro Absoluto',   surface: '#000000', surfaceCard: '#0d0d0d', accent: '#F7931E', text: '#ffffff', textDim: 'rgba(255,255,255,0.45)' },
                    { name: 'Onyx Diamond',     surface: '#080808', surfaceCard: '#141414', accent: '#E040FB', text: '#ffffff', textDim: 'rgba(255,255,255,0.45)' },
                    { name: 'Obsidiana',        surface: '#070707', surfaceCard: '#111111', accent: '#7C4DFF', text: '#ffffff', textDim: 'rgba(255,255,255,0.45)' },
                    { name: 'Carbón Royal',     surface: '#060606', surfaceCard: '#101010', accent: '#FF1744', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    // ── DARK WINE / BURGUNDY SERIES ──────────────────────────────────
                    { name: 'Vino Tinto',       surface: '#120306', surfaceCard: '#1e0508', accent: '#C62828', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Ciruela Oscura',   surface: '#120010', surfaceCard: '#1e001a', accent: '#AD1457', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Borgoña Pro',      surface: '#100010', surfaceCard: '#1c001c', accent: '#880E4F', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    // ── SUNSET / GRADIENT-ACCENT SERIES ─────────────────────────────
                    { name: 'Puesta de Sol',    surface: '#110808', surfaceCard: '#1c1010', accent: '#FF7043', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Aurora Borealis',  surface: '#080f10', surfaceCard: '#10181a', accent: '#26C6DA', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Crepúsculo',       surface: '#0e0814', surfaceCard: '#160e22', accent: '#CE93D8', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Galaxia Rosa',     surface: '#100812', surfaceCard: '#1a0e1e', accent: '#F48FB1', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Neón Cyber',       surface: '#060614', surfaceCard: '#0e0e28', accent: '#00E5FF', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    { name: 'Salmon Glow',      surface: '#120809', surfaceCard: '#1e1010', accent: '#EF9A9A', text: '#ffffff', textDim: 'rgba(255,255,255,0.5)'  },
                    // ── PREMIUM WHITE / LIGHT SERIES ─────────────────────────────────
                    { name: 'Mármol Blanco',    surface: '#f5f5f7', surfaceCard: '#efefef',  accent: '#1a1a1a', text: '#111111', textDim: 'rgba(0,0,0,0.5)', light: true },
                    { name: 'Perla Pura',       surface: '#f0f4ff', surfaceCard: '#e8eeff',  accent: '#5856D6', text: '#111111', textDim: 'rgba(0,0,0,0.5)', light: true },
                    { name: 'Nube Suave',       surface: '#f5f7fa', surfaceCard: '#ebf0f5',  accent: '#007AFF', text: '#111111', textDim: 'rgba(0,0,0,0.5)', light: true },
                    { name: 'Crema Vainilla',   surface: '#fdfbf7', surfaceCard: '#f4efe6',  accent: '#FF3B30', text: '#111111', textDim: 'rgba(0,0,0,0.5)', light: true },
                    { name: 'Menta Fresca',     surface: '#f2fbf5', surfaceCard: '#e6f7eb',  accent: '#34C759', text: '#111111', textDim: 'rgba(0,0,0,0.5)', light: true },
                    { name: 'Acero Platino',    surface: '#f0f1f5', surfaceCard: '#e4e6ee',  accent: '#0A2540', text: '#111111', textDim: 'rgba(0,0,0,0.5)', light: true },
                    { name: 'Rosa Almendra',    surface: '#fff0f5', surfaceCard: '#ffe4e1',  accent: '#C2185B', text: '#111111', textDim: 'rgba(0,0,0,0.5)', light: true },
                    { name: 'Oro Marfil',       surface: '#fcfbf4', surfaceCard: '#f4f1e1',  accent: '#D4AF37', text: '#111111', textDim: 'rgba(0,0,0,0.5)', light: true },
                    { name: 'Lino Terroso',     surface: '#fdfbf7', surfaceCard: '#f4f0e6',  accent: '#8D6E63', text: '#111111', textDim: 'rgba(0,0,0,0.5)', light: true },
                    { name: 'Brisa Marina',     surface: '#f0f8ff', surfaceCard: '#e1f0fa',  accent: '#008080', text: '#111111', textDim: 'rgba(0,0,0,0.5)', light: true },
                    { name: 'Pétalo Lila',      surface: '#f8f4fa', surfaceCard: '#efe6f5',  accent: '#673AB7', text: '#111111', textDim: 'rgba(0,0,0,0.5)', light: true },
                    { name: 'Alba Cítrica',     surface: '#fff9f0', surfaceCard: '#ffefd6',  accent: '#F57C00', text: '#111111', textDim: 'rgba(0,0,0,0.5)', light: true },
                    { name: 'Gris Pizarra',     surface: '#f5f6f8', surfaceCard: '#ebecef',  accent: '#455A64', text: '#111111', textDim: 'rgba(0,0,0,0.5)', light: true },
                    { name: 'Blanco Ártico',    surface: '#ffffff', surfaceCard: '#f0f5fa',  accent: '#00B0FF', text: '#111111', textDim: 'rgba(0,0,0,0.5)', light: true },
                    { name: 'Bambú Fresco',     surface: '#f4f9f4', surfaceCard: '#e6f2e6',  accent: '#558B2F', text: '#111111', textDim: 'rgba(0,0,0,0.5)', light: true },
                    { name: 'Café con Leche',   surface: '#faf7f2', surfaceCard: '#f0eae1',  accent: '#5D4037', text: '#111111', textDim: 'rgba(0,0,0,0.5)', light: true },
                    { name: 'Rojo Carmesí',     surface: '#fff5f5', surfaceCard: '#ffeaea',  accent: '#D32F2F', text: '#111111', textDim: 'rgba(0,0,0,0.5)', light: true },
                    { name: 'Amanecer Coral',   surface: '#fff6f2', surfaceCard: '#ffebdf',  accent: '#FF7043', text: '#111111', textDim: 'rgba(0,0,0,0.5)', light: true },
                    { name: 'Gema Amatista',    surface: '#f9f6fe', surfaceCard: '#ede4fc',  accent: '#8E24AA', text: '#111111', textDim: 'rgba(0,0,0,0.5)', light: true },
                    { name: 'Jade Brillante',   surface: '#f2faf8', surfaceCard: '#e0f4ee',  accent: '#00897B', text: '#111111', textDim: 'rgba(0,0,0,0.5)', light: true },
                ];

                themeContainer.innerHTML = MASTER_THEMES.map((theme, index) => {
                    const isActive = state.config.themeAccent === theme.accent && state.config.surfaceColor === theme.surface;
                    
                    return `
                        <div class="master-theme-card" data-index="${index}" title="${theme.name}" style="
                            cursor: pointer;
                            border-radius: 14px;
                            overflow: hidden;
                            border: 2.5px solid ${isActive ? theme.accent : 'transparent'};
                            box-shadow: ${isActive ? `0 0 0 1px ${theme.accent}40, 0 6px 24px rgba(0,0,0,0.6)` : '0 4px 16px rgba(0,0,0,0.4)'};
                            background: ${theme.surface};
                            transition: transform 0.2s cubic-bezier(0.175,0.885,0.32,1.275), box-shadow 0.2s ease;
                            outline: 1px solid ${theme.light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'};
                            position: relative;
                        ">
                            <!-- Mini Navbar Bar -->
                            <div style="
                                height: 14px;
                                background: ${theme.surfaceCard};
                                display: flex;
                                align-items: center;
                                padding: 0 6px;
                                gap: 3px;
                                border-bottom: 1px solid ${theme.light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'};
                            ">
                                <div style="width: 4px;height: 4px;border-radius: 50%;background:${theme.accent};"></div>
                                <div style="flex:1;height:3px;border-radius:4px;background:${theme.light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)'};"></div>
                                <div style="width:12px;height:3px;border-radius:4px;background:${theme.light ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)'};"></div>
                            </div>
                            <!-- Fake Cards Area -->
                            <div style="padding: 5px; display: flex; gap: 4px;">
                                <div style="flex:1;border-radius:6px;overflow:hidden;background:${theme.light ? '#f0f0f2' : theme.surfaceCard};border:1px solid ${theme.light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)'};">
                                    <div style="height:20px;background:linear-gradient(135deg,${theme.accent}33,${theme.accent}15);"></div>
                                    <div style="padding:3px 4px;">
                                        <div style="height:3px;border-radius:3px;background:${theme.light ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.12)'};margin-bottom:2px;"></div>
                                        <div style="height:2px;border-radius:3px;background:${theme.light ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.07)'};width:70%;margin-bottom:3px;"></div>
                                        <div style="height:6px;border-radius:4px;background:${theme.accent};"></div>
                                    </div>
                                </div>
                                <div style="flex:1;border-radius:6px;overflow:hidden;background:${theme.light ? '#f0f0f2' : theme.surfaceCard};border:1px solid ${theme.light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)'};">
                                    <div style="height:20px;background:linear-gradient(135deg,${theme.accent}22,${theme.accent}08);"></div>
                                    <div style="padding:3px 4px;">
                                        <div style="height:3px;border-radius:3px;background:${theme.light ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.12)'};margin-bottom:2px;"></div>
                                        <div style="height:2px;border-radius:3px;background:${theme.light ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.07)'};width:60%;margin-bottom:3px;"></div>
                                        <div style="height:6px;border-radius:4px;background:${theme.accent};opacity:0.8;"></div>
                                    </div>
                                </div>
                            </div>
                            <!-- Theme name badge -->
                            <div style="
                                padding: 3px 6px 5px;
                                text-align: center;
                                font-size: 0.48rem;
                                font-weight: 700;
                                letter-spacing: 0.3px;
                                text-transform: uppercase;
                                color: ${theme.accent};
                                white-space: nowrap;
                                overflow: hidden;
                                text-overflow: ellipsis;
                            ">${theme.name}</div>
                            ${isActive ? `<div style="position:absolute;top:4px;right:4px;width:10px;height:10px;border-radius:50%;background:${theme.accent};box-shadow:0 0 6px ${theme.accent};border:1.5px solid ${theme.light ? '#ccc' : '#fff'};"></div>` : ''}
                        </div>
                    `;
                }).join('');

                themeContainer.querySelectorAll('.master-theme-card').forEach(card => {
                    card.onmouseenter = () => {
                        card.style.transform = 'translateY(-4px) scale(1.04)';
                        card.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6)';
                    };
                    card.onmouseleave = () => {
                        card.style.transform = 'translateY(0) scale(1)';
                        const theme = MASTER_THEMES[parseInt(card.dataset.index)];
                        const isAct = state.config.themeAccent === theme.accent && state.config.surfaceColor === theme.surface;
                        card.style.boxShadow = isAct ? `0 0 0 1px ${theme.accent}40, 0 6px 24px rgba(0,0,0,0.6)` : '0 4px 16px rgba(0,0,0,0.4)';
                    };
                    card.onclick = () => {
                        const theme = MASTER_THEMES[parseInt(card.dataset.index)];
                        stagedAccent = theme.accent;
                        state.config.surfaceColor = theme.surface;
                        state.config.themeAccent = theme.accent;
                        state.config.themeSurfaceCard = theme.surfaceCard;
                        state.config.themeText = theme.text;
                        state.config.themeTextDim = theme.textDim;
                        
                        // Save all theme data to state.config
                        // applyTheme in script.js handles the light/admin guard automatically
                        applyTheme(stagedAccent, stagedBg, stagedLogo);
                        saveStateToLocal();
                        if (theme.light) {
                            showToast(`✅ "${theme.name}" guardado — ve al menú para verla`);
                        }
                        
                        // Update selection highlight on all cards
                        themeContainer.querySelectorAll('.master-theme-card').forEach(c => {
                            const t = MASTER_THEMES[parseInt(c.dataset.index)];
                            c.style.borderColor = 'transparent';
                            c.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)';
                            // Remove checkmark dot if present
                            const dot = c.querySelector('.active-dot');
                            if (dot) dot.remove();
                        });
                        card.style.borderColor = theme.accent;
                        card.style.boxShadow = `0 0 0 1px ${theme.accent}40, 0 8px 28px rgba(0,0,0,0.7)`;
                        // Add checkmark dot
                        const dot = document.createElement('div');
                        dot.className = 'active-dot';
                        // For light themes the active-dot border should be dark
                        dot.style.cssText = `position:absolute;top:4px;right:4px;width:10px;height:10px;border-radius:50%;background:${theme.accent};box-shadow:0 0 6px ${theme.accent}88;border:1.5px solid ${theme.light ? '#ccc' : '#fff'};`;
                        card.appendChild(dot);

                        if (!theme.light) {
                            showToast(`✅ "${theme.name}" aplicado`);
                        }
                    };
                });
            }

            // 0. Base configs
            renderBizTypeSelector();
            renderPromoConfig();

            // 1. Icon Selector (Customization that remains separate from master themes)
            if (iconContainer && catFilter) {
                catFilter.value = iconCat;
                catFilter.onchange = (e) => {
                    iconCat = e.target.value;
                    iconPage = 0;
                    renderIconsPage();
                };

                function renderIconsPage() {
                    const currentIcons = ICON_LIBRARY[iconCat] || [];
                    const start = iconPage * ICONS_PER_PAGE;
                    const slice = currentIcons.slice(start, start + ICONS_PER_PAGE);
                    const totalPages = Math.ceil(currentIcons.length / ICONS_PER_PAGE);

                    iconContainer.innerHTML = slice.map(iconVal => {
                        const isEmoji = /\p{Emoji}/u.test(iconVal);
                        const currentIcon = state.config.cartIcon || 'shopping-bag';
                        return `
                            <button type="button" class="icon-item-btn ${iconVal === currentIcon ? 'active' : ''}" data-icon="${iconVal}">
                                ${isEmoji ? `<span style="font-size: 1.8rem;">${iconVal}</span>` : `<i data-lucide="${iconVal}" style="width: 22px; height: 22px;"></i>`}
                            </button>
                        `;
                    }).join('');

                    if (window.lucide) lucide.createIcons();

                    const pageInd = document.getElementById('icon-page-indicator');
                    if (pageInd) pageInd.textContent = `Página ${iconPage + 1} de ${Math.max(1, totalPages)}`;
                    
                    const prevBtn = document.getElementById('prev-icon-pg');
                    const nextBtn = document.getElementById('next-icon-pg');
                    if (prevBtn) {
                        prevBtn.disabled = iconPage === 0;
                        prevBtn.onclick = () => { if (iconPage > 0) { iconPage--; renderIconsPage(); } };
                    }
                    if (nextBtn) {
                        nextBtn.disabled = iconPage >= totalPages - 1;
                        nextBtn.onclick = () => { if (iconPage < totalPages - 1) { iconPage++; renderIconsPage(); } };
                    }

                    iconContainer.querySelectorAll('.icon-item-btn').forEach(btn => {
                        btn.onclick = () => {
                            const icon = btn.dataset.icon;
                            state.config.cartIcon = icon;
                            saveStateToLocal();
                            iconContainer.querySelectorAll('.icon-item-btn').forEach(b => b.classList.remove('active'));
                            btn.classList.add('active');
                            
                            const mainCartIcon = document.querySelector('.cart-icon-main');
                            if (mainCartIcon) {
                                if (/\p{Emoji}/u.test(icon)) {
                                    mainCartIcon.innerHTML = `<span style="font-size: 24px;">${icon}</span>`;
                                } else {
                                    mainCartIcon.innerHTML = `<i data-lucide="${icon}" style="width: 28px; height: 28px; color: var(--accent);"></i>`;
                                    if (window.lucide) lucide.createIcons();
                                }
                            }
                            showToast('Ícono del carrito actualizado ✅');
                        };
                    });
                }
                renderIconsPage();
            }
            // 3. Paginated wallpaper carousel (Restored)
            const wallpaperContainer = document.getElementById('wallpaper-grid-container');
            const galleryList = typeof SAVORY_GALLERY !== 'undefined' ? SAVORY_GALLERY : [];
            
            if (wallpaperContainer && galleryList.length > 0) {
                const PER_PAGE = 6;
                let wpPage = Math.floor(galleryList.findIndex(w => w.url === stagedBg) / PER_PAGE);
                if (wpPage < 0) wpPage = 0;

                function renderWallpaperPage() {
                    const start = wpPage * PER_PAGE;
                    const slice = galleryList.slice(start, start + PER_PAGE);
                    const totalPages = Math.ceil(galleryList.length / PER_PAGE);
                    const isLocal = (url) => !url.startsWith('http');

                    wallpaperContainer.innerHTML = `
                        <div class="wallpaper-carousel-wrapper">
                            <button type="button" class="wp-arrow wp-prev" id="wp-prev-btn" ${wpPage === 0 ? 'disabled' : ''} title="Anterior">&#8592;</button>
                            <div class="wallpaper-grid" id="wp-thumb-grid">
                                ${slice.map(wp => `
                                    <div 
                                        class="wallpaper-thumb ${wp.url === stagedBg ? 'active' : ''}"
                                        style="background-image: url('${isLocal(wp.url) ? wp.url : wp.url + '?q=80&w=400&auto=format&fit=crop'}');"
                                        title="${wp.name}"
                                        data-url="${wp.url}"
                                    ></div>
                                `).join('')}
                            </div>
                            <button type="button" class="wp-arrow wp-next" id="wp-next-btn" ${wpPage >= totalPages - 1 ? 'disabled' : ''} title="Siguiente">&#8594;</button>
                        </div>
                        <p class="wp-page-indicator" style="text-align: center; font-size: 0.75rem; color: var(--text-dim); margin-top: 0.5rem;">Página ${wpPage + 1} de ${totalPages}</p>
                    `;

                    const prevBtn = document.getElementById('wp-prev-btn');
                    const nextBtn = document.getElementById('wp-next-btn');
                    if (prevBtn) prevBtn.onclick = () => { if (wpPage > 0) { wpPage--; renderWallpaperPage(); } };
                    if (nextBtn) nextBtn.onclick = () => { if (wpPage < totalPages - 1) { wpPage++; renderWallpaperPage(); } };

                    document.querySelectorAll('.wallpaper-thumb').forEach(thumb => {
                        thumb.onclick = () => {
                            state.config.themeBg = thumb.dataset.url;
                            saveStateToLocal();
                            applyTheme(state.config.themeAccent, state.config.themeBg, state.config.themeLogo);
                            document.querySelectorAll('.wallpaper-thumb').forEach(t => t.classList.remove('active'));
                            thumb.classList.add('active');
                            showToast('Fondo aplicado ✨');
                        };
                    });
                }
                renderWallpaperPage();
            }

            // Custom background upload handler
            const customBgPreview = document.getElementById('custom-bg-preview');
            if (customBgPreview) {
                if (stagedBg && (stagedBg.startsWith('data:image') || stagedBg.startsWith('http'))) {
                    window.setPreviewImage('custom-bg-preview', stagedBg, 'Sin fondo seleccionado');
                } else {
                    window.setPreviewImage('custom-bg-preview', '', 'Sin fondo seleccionado');
                }
            }

            handleFileUpload('conf-custom-bg-file', 'custom-bg-preview', (b64) => {
                state.config.themeBg = b64;
                saveStateToLocal();
                applyTheme(state.config.themeAccent, state.config.themeBg, state.config.themeLogo);
                document.querySelectorAll('.wallpaper-thumb').forEach(t => t.classList.remove('active'));
                showToast('Fondo personalizado aplicado ✨');
            });

        } catch (err) {
            console.error('Error rendering appearance panel:', err);
        }
    }

    // Make datetime-local inputs open on click anywhere
    document.querySelectorAll('input[type="datetime-local"]').forEach(input => {
        input.onclick = () => {
            try { if (typeof input.showPicker === 'function') input.showPicker(); } 
            catch (e) { console.log('showPicker not supported', e); }
        };
    });

    handleFileUpload('conf-hero-img-file', 'hero-img-preview', (b64) => {
        state.config.heroImg = b64;
    });
    handleFileUpload('item-img-file', 'item-img-preview', (b64) => {
        window.currentItemImageB64 = b64;
    });
    handleFileUpload('combo-img-file', 'combo-img-preview', (b64) => {
        window.currentComboImageB64 = b64;
    });

    // --- Combos & Discounts Admin Setup ---
    renderAdminCombos();
    renderAdminDiscounts();

    const addComboBtn = document.getElementById('add-combo-btn');
    if (addComboBtn) addComboBtn.addEventListener('click', () => requireSecurityAuth(() => openComboModal()));

    const closeComboModalBtn = document.getElementById('close-combo-modal');
    if (closeComboModalBtn) closeComboModalBtn.addEventListener('click', () => {
        document.getElementById('combo-modal').classList.add('hidden');
    });

    const comboForm = document.getElementById('combo-form');
    if (comboForm) {
        comboForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const editId = document.getElementById('combo-edit-id').value;
            const items = [...(window.currentComboItems || [])];

            let finalImg = '';
            if (window.currentComboImageB64) {
                finalImg = window.currentComboImageB64;
            } else if (editId) {
                const existing = state.combos.find(c => c.id === parseInt(editId));
                finalImg = existing ? existing.img : '';
            }

            const comboData = {
                id: editId ? parseInt(editId) : Date.now(),
                name: document.getElementById('combo-name').value.trim(),
                desc: document.getElementById('combo-desc').value.trim(),
                price: parseInt(document.getElementById('combo-price').value.replace(/\./g, '')) || 0,
                originalPrice: parseInt(document.getElementById('combo-original-price').value.replace(/\./g, '')) || 0,
                items,
                img: finalImg,
                emoji: document.getElementById('combo-emoji').value.trim() || '🔥',
                expiresAt: document.getElementById('combo-expires').value,
                active: document.getElementById('combo-active').checked,
                limited: document.getElementById('combo-limited').checked,
                showInModal: document.getElementById('combo-show-modal').checked,
            };

            if (editId) {
                const idx = state.combos.findIndex(c => c.id === parseInt(editId));
                if (idx !== -1) state.combos[idx] = comboData;
            } else {
                state.combos.push(comboData);
            }

            saveStateToLocal();
            renderAdminCombos();
            if (typeof renderCombos === 'function') renderCombos();
            if (typeof checkAndShowPromoModal === 'function') checkAndShowPromoModal();
            window.currentComboImageB64 = ''; // Clear after save
            document.getElementById('combo-modal').classList.add('hidden');
            showToast(editId ? 'Combo actualizado ✅' : 'Combo creado ✅');
        });
    }

    // --- Admin Discounts UI ---
    const addDiscountBtn = document.getElementById('add-discount-btn');
    if (addDiscountBtn) addDiscountBtn.addEventListener('click', () => requireSecurityAuth(() => openDiscountModal()));

    const closeDiscountBtn = document.getElementById('close-discount-modal');
    if (closeDiscountBtn) closeDiscountBtn.addEventListener('click', () => {
        document.getElementById('discount-modal').classList.add('hidden');
    });

    const discountForm = document.getElementById('discount-form');
    if (discountForm) {
        discountForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const dishId = parseInt(document.getElementById('discount-dish-id').value);
            const dish = state.dishes.find(d => d.id === dishId);
            if (!dish) {
                showToast('Por favor selecciona un producto válido', 'error');
                return;
            }

            const newPrice = parseInt(document.getElementById('discount-new-price').value.replace(/\./g, '')) || 0;
            
            if (newPrice >= dish.price) {
                showToast('El precio de descuento debe ser menor al original', 'error');
                return;
            }

            dish.discountPrice = newPrice;
            dish.discountActive = document.getElementById('discount-active').checked;
            
            saveStateToLocal();
            renderAdminDiscounts();
            if (typeof renderMenu === 'function') renderMenu();
            document.getElementById('discount-modal').classList.add('hidden');
            showToast('Descuento aplicado ✅');
        });
    }

    setupDiscountAutocomplete();

    // Auto-format discount input
    const discountInput = document.getElementById('discount-new-price');
    if (discountInput) {
        discountInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '');
            if (val) {
                e.target.value = new Intl.NumberFormat('es-CO').format(parseInt(val));
            }
        });
    }
});

// ============================================
// ADMIN COMBOS RENDER & MODAL
// ============================================

function renderAdminCombos() {
    const list = document.getElementById('admin-combos-list');
    if (!list) return;

    const combos = state.combos || [];
    if (combos.length === 0) {
        list.innerHTML = `<p style="padding: 2rem; text-align:center; color: var(--text-dim);">No hay combos creados aún. Crea el primero con el botón de arriba.</p>`;
        return;
    }

    list.innerHTML = combos.map(combo => {
        const savings = (combo.originalPrice && combo.originalPrice > combo.price)
            ? Math.round((1 - combo.price / combo.originalPrice) * 100)
            : 0;
        return `
            <div class="combo-admin-card">
                <div style="width:56px; height:56px; border-radius:8px; overflow:hidden; background:var(--surface-light); display:flex; align-items:center; justify-content:center; font-size:2rem; flex-shrink:0;">
                    ${combo.img
                        ? `<img src="${combo.img}" style="width:100%;height:100%;object-fit:cover;" alt="">`
                        : (combo.emoji || '🔥')}
                </div>
                <div class="combo-admin-info">
                    <div class="combo-admin-name">${combo.name}</div>
                    <div class="combo-admin-meta">
                        <span>💰 $${combo.price.toLocaleString('es-CO')}</span>
                        ${savings > 0 ? `<span style="color:#ff5252;">-${savings}% OFF</span>` : ''}
                        ${combo.limited ? '<span>⏰ Limitado</span>' : ''}
                        ${combo.showInModal ? '<span>🪟 Pop-up</span>' : ''}
                    </div>
                </div>
                <div class="combo-admin-actions">
                    <button class="status-badge-btn ${combo.active !== false ? 'active' : 'inactive'}" 
                            onclick="toggleComboActive(${combo.id})" 
                            title="${combo.active ? 'Desactivar' : 'Activar'}"
                            style="width: 85px; font-size: 0.7rem; padding: 0.4rem;">
                        ${combo.active !== false ? 'Activo' : 'Inactivo'}
                    </button>
                    <button class="btn-secondary icon-btn" onclick="openComboModal(${combo.id})" title="Editar">
                        <i data-lucide="edit-3"></i>
                    </button>
                    <button class="btn-secondary icon-btn" onclick="deleteCombo(${combo.id})" title="Eliminar" style="color:#ff5252;">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

window.openComboModal = function(comboId = null) {
    const modal = document.getElementById('combo-modal');
    const form = document.getElementById('combo-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('combo-edit-id').value = '';
    document.getElementById('combo-active').checked = true;
    
    window.currentComboImageB64 = ''; // Clear any previous
    const preview = document.getElementById('combo-img-preview');
    if (preview) preview.innerHTML = `<span>Click para seleccionar foto del combo</span>`;
    document.getElementById('combo-img-file').value = '';

    if (comboId) {
        const combo = (state.combos || []).find(c => c.id === comboId);
        if (!combo) return;
        document.getElementById('combo-edit-id').value = combo.id;
        document.getElementById('combo-name').value = combo.name || '';
        document.getElementById('combo-desc').value = combo.desc || '';
        document.getElementById('combo-price').value = combo.price ? new Intl.NumberFormat('es-CO').format(combo.price) : '';
        document.getElementById('combo-original-price').value = combo.originalPrice ? new Intl.NumberFormat('es-CO').format(combo.originalPrice) : '';
        
        window.currentComboItems = [...(combo.items || [])];
        
        window.currentComboImageB64 = '';
        const preview = document.getElementById('combo-img-preview');
        if (preview) {
            if (combo.img) {
                preview.innerHTML = `<img src="${combo.img}" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-sm);">`;
            } else {
                preview.innerHTML = `<span>Click para seleccionar foto del combo</span>`;
            }
        }
        document.getElementById('combo-img-file').value = '';
        
        document.getElementById('combo-emoji').value = combo.emoji || '';
        document.getElementById('combo-expires').value = combo.expiresAt || '';
        document.getElementById('combo-active').checked = combo.active !== false;
        document.getElementById('combo-limited').checked = !!combo.limited;
        document.getElementById('combo-show-modal').checked = !!combo.showInModal;
    } else {
        window.currentComboItems = [];
    }

    modal.classList.remove('hidden');
    
    renderComboTags();
    setupComboAutocomplete();

    if (window.lucide) lucide.createIcons();
}

function renderComboTags() {
    const container = document.getElementById('combo-tags-container');
    const input = document.getElementById('combo-items-input');
    if (!container || !input) return;
    
    // Remove existing tags
    container.querySelectorAll('.tag-chip').forEach(el => el.remove());
    
    window.currentComboItems = window.currentComboItems || [];
    
    // Insert tags before the input
    window.currentComboItems.forEach((item, index) => {
        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        chip.innerHTML = `
            ${item} 
            <span class="remove-tag" onclick="removeComboTag(${index})">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </span>
        `;
        container.insertBefore(chip, input);
    });
}

window.removeComboTag = function(index) {
    window.currentComboItems.splice(index, 1);
    renderComboTags();
};

function setupComboAutocomplete() {
    const input = document.getElementById('combo-items-input');
    const dropdown = document.getElementById('combo-autocomplete-dropdown');
    if (!input || !dropdown) return;
    
    const closeDropdown = () => {
        dropdown.classList.remove('active');
    };
    
    const addTag = (text) => {
        text = text.trim();
        if (text && !window.currentComboItems.includes(text)) {
            window.currentComboItems.push(text);
            renderComboTags();
        }
        input.value = '';
        closeDropdown();
    };

    // Click outside to close
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            closeDropdown();
        }
    });

    input.onfocus = () => {
        triggerAutocomplete(input.value);
    };

    input.oninput = (e) => {
        const val = e.target.value;
        if (val.includes(',')) {
            const parts = val.split(',');
            parts.slice(0, -1).forEach(part => addTag(part));
            input.value = parts[parts.length - 1].trim();
        }
        triggerAutocomplete(input.value);
    };
    
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission
            if (dropdown.classList.contains('active')) {
                const selected = dropdown.querySelector('.autocomplete-item.selected');
                if (selected) {
                    addTag(selected.dataset.name);
                    return;
                }
            }
            if (input.value.trim()) addTag(input.value);
        } else if (e.key === 'Backspace' && input.value === '') {
            if (window.currentComboItems.length > 0) {
                window.currentComboItems.pop();
                renderComboTags();
            }
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!dropdown.classList.contains('active')) return;
            const items = Array.from(dropdown.querySelectorAll('.autocomplete-item'));
            if (!items.length) return;
            const currentIdx = items.findIndex(i => i.classList.contains('selected'));
            items.forEach(i => i.classList.remove('selected'));
            let nextIdx = e.key === 'ArrowDown' ? currentIdx + 1 : currentIdx - 1;
            if (nextIdx >= items.length) nextIdx = 0;
            if (nextIdx < 0) nextIdx = items.length - 1;
            items[nextIdx].classList.add('selected');
            items[nextIdx].scrollIntoView({ block: 'nearest' });
        }
    };
    
    function triggerAutocomplete(query) {
        query = query.toLowerCase().trim();
        const dishes = state.dishes || [];
        // Filter out already added items
        let matches = dishes.filter(d => 
            !window.currentComboItems.includes(d.name) && 
            d.name.toLowerCase().includes(query)
        );
        
        if (matches.length === 0 && !query) {
            closeDropdown();
            return;
        }
        if (matches.length === 0) {
            dropdown.innerHTML = `<div style="padding:1rem; color:var(--text-dim); text-align:center; font-size:0.85rem;">Presiona Enter para agregar "${query}"</div>`;
            dropdown.classList.add('active');
            return;
        }
        
        // Show max 8 suggestions
        matches = matches.slice(0, 8);
        
        dropdown.innerHTML = matches.map((d, idx) => `
            <div class="autocomplete-item ${idx === 0 ? 'selected' : ''}" data-name="${d.name}">
                <img src="${d.img}" alt="${d.name}">
                <div>
                    <div style="font-weight:600; font-size:0.9rem;">${d.name}</div>
                    <div style="font-size:0.75rem; color:var(--text-dim);">$${d.price.toLocaleString('es-CO')}</div>
                </div>
            </div>
        `).join('');
        
        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.onmouseover = () => {
                dropdown.querySelectorAll('.autocomplete-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
            };
            item.onclick = () => addTag(item.dataset.name);
        });
        
        dropdown.classList.add('active');
    }
};

window.toggleComboActive = function(comboId) {
    const combo = (state.combos || []).find(c => c.id === comboId);
    if (!combo) return;
    combo.active = !combo.active;
    saveStateToLocal();
    renderAdminCombos();
    if (typeof renderCombos === 'function') renderCombos();
    if (typeof checkAndShowPromoModal === 'function') checkAndShowPromoModal();
    showToast(combo.active ? 'Combo activado ✅' : 'Combo desactivado');
};

window.deleteCombo = function(comboId) {
    const combo = (state.combos || []).find(c => c.id === comboId);
    if (!combo) return;
    showConfirm(`¿Eliminar el combo "${combo.name}"?`, () => {
        state.combos = state.combos.filter(c => c.id !== comboId);
        saveStateToLocal();
        renderAdminCombos();
        if (typeof renderCombos === 'function') renderCombos();
        if (typeof checkAndShowPromoModal === 'function') checkAndShowPromoModal();
        showToast('Combo eliminado');
    });
};

// ============================================
// ADMIN DISCOUNTS RENDER & MODAL
// ============================================

window.openDiscountModal = function(dishId = null) {
    const modal = document.getElementById('discount-modal');
    const form = document.getElementById('discount-form');
    const catFilter = document.getElementById('discount-cat-filter');
    if (!modal || !form || !catFilter) return;

    form.reset();
    document.getElementById('discount-dish-id').value = '';
    
    // Populate category filter
    catFilter.innerHTML = '<option value="todos">Todas las categorías</option>' + 
        state.categories.filter(c => c.id !== 'todos')
            .map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    if (dishId) {
        const dish = state.dishes.find(d => d.id === dishId);
        if (dish) {
            document.getElementById('discount-dish-id').value = dish.id;
            document.getElementById('discount-dish-search').value = dish.name;
            document.getElementById('discount-original-price').value = new Intl.NumberFormat('es-CO').format(dish.price);
            document.getElementById('discount-new-price').value = dish.discountPrice ? new Intl.NumberFormat('es-CO').format(dish.discountPrice) : '';
            document.getElementById('discount-active').checked = dish.discountActive !== false;
        }
    }

    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
};

function setupDiscountAutocomplete() {
    const input = document.getElementById('discount-dish-search');
    const dropdown = document.getElementById('discount-autocomplete-dropdown');
    const catFilter = document.getElementById('discount-cat-filter');
    const idInput = document.getElementById('discount-dish-id');
    const originalPriceInput = document.getElementById('discount-original-price');

    if (!input || !dropdown || !catFilter) return;

    const closeDropdown = () => dropdown.classList.remove('active');

    const selectDish = (dish) => {
        input.value = dish.name;
        idInput.value = dish.id;
        originalPriceInput.value = new Intl.NumberFormat('es-CO').format(dish.price);
        closeDropdown();
    };

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) closeDropdown();
    });

    input.onfocus = () => triggerAutocomplete(input.value);
    input.oninput = (e) => {
        idInput.value = ''; // Reset ID while typing
        originalPriceInput.value = '';
        triggerAutocomplete(e.target.value);
    };

    function triggerAutocomplete(query) {
        query = query.toLowerCase().trim();
        const selectedCat = catFilter.value;
        
        let matches = state.dishes.filter(d => {
            const matchesCat = selectedCat === 'todos' || d.cat === selectedCat;
            const matchesQuery = d.name.toLowerCase().includes(query);
            return matchesCat && matchesQuery;
        });

        if (matches.length === 0) {
            dropdown.innerHTML = '<div style="padding:1rem; color:var(--text-dim); text-align:center;">No se encontraron productos</div>';
            dropdown.classList.add('active');
            return;
        }

        matches = matches.slice(0, 8);
        dropdown.innerHTML = matches.map((d, idx) => `
            <div class="autocomplete-item ${idx === 0 ? 'selected' : ''}" data-id="${d.id}">
                <img src="${d.img}" alt="${d.name}">
                <div>
                    <div style="font-weight:600;">${d.name}</div>
                    <div style="font-size:0.8rem; color:var(--text-dim);">$${d.price.toLocaleString('es-CO')}</div>
                </div>
            </div>
        `).join('');

        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.onclick = () => {
                const dish = state.dishes.find(d => d.id === parseInt(item.dataset.id));
                if (dish) selectDish(dish);
            };
        });
        dropdown.classList.add('active');
    }
}

function renderAdminDiscounts() {
    const list = document.getElementById('admin-discounts-list');
    if (!list) return;

    const discountedDishes = state.dishes.filter(d => d.discountPrice > 0);
    if (discountedDishes.length === 0) {
        list.innerHTML = `<p style="padding: 2rem; text-align:center; color: var(--text-dim);">No hay productos con descuento individual. Aplica el primero con el botón de arriba.</p>`;
        return;
    }

    list.innerHTML = discountedDishes.map(dish => {
        const savings = Math.round((1 - dish.discountPrice / dish.price) * 100);
        return `
            <div class="combo-admin-card">
                <div style="width:56px; height:56px; border-radius:8px; overflow:hidden; background:var(--surface-light); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <img src="${dish.img}" style="width:100%;height:100%;object-fit:cover;" alt="">
                </div>
                <div class="combo-admin-info">
                    <div class="combo-admin-name">${dish.name}</div>
                    <div class="combo-admin-meta">
                        <span>💰 $${dish.discountPrice.toLocaleString('es-CO')}</span>
                        <span style="color:#ff5252; text-decoration:line-through;">$${dish.price.toLocaleString('es-CO')}</span>
                        <span style="color:var(--success);">-${savings}% OFF</span>
                    </div>
                </div>
                <div class="combo-admin-actions">
                    <button class="status-badge-btn ${dish.discountActive ? 'active' : 'inactive'}" 
                            onclick="toggleDiscountActive(${dish.id})" 
                            title="${dish.discountActive ? 'Desactivar' : 'Activar'}"
                            style="width: 85px; font-size: 0.7rem; padding: 0.4rem;">
                        ${dish.discountActive ? 'Activo' : 'Inactivo'}
                    </button>
                    <button class="btn-secondary icon-btn" onclick="openDiscountModal(${dish.id})" title="Editar Descuento">
                        <i data-lucide="edit-3"></i>
                    </button>
                    <button class="btn-secondary icon-btn" onclick="deleteDiscount(${dish.id})" title="Quitar Descuento" style="color:#ff5252;">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

window.toggleDiscountActive = function(dishId) {
    const dish = state.dishes.find(d => d.id === dishId);
    if (!dish) return;
    dish.discountActive = !dish.discountActive;
    saveStateToLocal();
    renderAdminDiscounts();
    if (typeof renderMenu === 'function') renderMenu();
    showToast(dish.discountActive ? 'Descuento activado ✅' : 'Descuento desactivado');
};

window.deleteDiscount = function(dishId) {
    const dish = state.dishes.find(d => d.id === dishId);
    if (!dish) return;
    showConfirm(`¿Quitar el descuento a "${dish.name}"?`, () => {
        delete dish.discountPrice;
        delete dish.discountActive;
        saveStateToLocal();
        renderAdminDiscounts();
        if (typeof renderMenu === 'function') renderMenu();
        showToast('Descuento eliminado');
    });
};

/**
 * Utility to convert file to Base64 string
 */
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// --- Mobile Layout Selector Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const layoutBtns = document.querySelectorAll('.layout-toggle-btn');
    if (layoutBtns.length > 0) {
        
        function updateLayoutBtns(layout) {
            layoutBtns.forEach(btn => {
                const isActive = btn.dataset.layout === layout;
                btn.style.borderColor = isActive ? 'var(--primary)' : 'var(--glass-border)';
                btn.style.color = isActive ? 'var(--primary)' : 'var(--text-dim)';
                btn.style.background = isActive ? 'var(--primary-glow)' : 'var(--surface)';
                btn.style.boxShadow = isActive ? '0 4px 12px rgba(0,0,0,0.1)' : 'none';
            });
        }

        // Set initial value
        const initialLayout = state.config.mobileHeroLayout || 'background';
        updateLayoutBtns(initialLayout);

        layoutBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const layout = btn.dataset.layout;
                state.config.mobileHeroLayout = layout;
                updateLayoutBtns(layout);
                saveStateToLocal();
                // applyTheme will read the new config value
                applyTheme(state.config.themeAccent, state.config.themeBg, state.config.themeLogo);
                showToast('Diseño móvil actualizado');
            });
        });
    }

    // --- PEXELS IMAGE SEARCH LOGIC ---
    const PEXELS_API_KEY = 'J7w7Wv5JncFq57c8HVQ6MIIOFac5bc0YtyVmwCVOlau27zBToiCHzPgO'; 
    const pexelsSearchInput = document.getElementById('pexels-search-input');
    const pexelsSearchBtn = document.getElementById('pexels-search-btn');
    const pexelsBgInput = document.getElementById('pexels-bg-input');
    const pexelsBgBtn = document.getElementById('pexels-bg-btn');

    if (pexelsSearchBtn) {
        pexelsSearchBtn.onclick = () => {
            const query = pexelsSearchInput.value.trim();
            if (!query) return showToast('Escribe algo para buscar', 'error');
            searchPexelsPhotos(query, 'hero');
        };

        pexelsSearchInput.onkeypress = (e) => {
            if (e.key === 'Enter') pexelsSearchBtn.click();
        };
    }

    if (pexelsBgBtn) {
        pexelsBgBtn.onclick = () => {
            const query = pexelsBgInput.value.trim();
            if (!query) return showToast('Escribe algo para buscar', 'error');
            searchPexelsPhotos(query, 'bg');
        };

        pexelsBgInput.onkeypress = (e) => {
            if (e.key === 'Enter') pexelsBgBtn.click();
        };
    }

    const FOOD_DICT = {
        'hamburguesa': 'hamburger',
        'perro caliente': 'hot dog',
        'perro': 'hot dog',
        'pizza': 'pizza',
        'papas fritas': 'french fries',
        'papas': 'french fries',
        'carne': 'steak',
        'pollo': 'chicken',
        'ensalada': 'salad',
        'postre': 'dessert',
        'bebida': 'drink',
        'cerveza': 'beer',
        'vino': 'wine',
        'tacos': 'tacos',
        'pasta': 'pasta',
        'comida': 'food',
        'malteada': 'milkshake',
        'helado': 'ice cream'
    };

    async function searchPexelsPhotos(query, target) {
        // Pro-Processing: Translate common terms and add context
        let searchTerms = query.toLowerCase();
        for (const [es, en] of Object.entries(FOOD_DICT)) {
            searchTerms = searchTerms.replace(new RegExp(`\\b${es}\\b`, 'g'), en);
        }
        
        // Pre-Processing: Translate common terms and ensure landscape orientation
        const finalQuery = encodeURIComponent(searchTerms);

        if (PEXELS_API_KEY === 'YOUR_PEXELS_API_KEY' || !PEXELS_API_KEY || PEXELS_API_KEY.includes('YOUR_')) {
            showToast('Modo demo: Usando imágenes de muestra', 'info');
            renderPexelsPlaceholders(query, target);
            return;
        }

        try {
            showToast('Buscando imágenes optimizadas...');
            const response = await fetch(`https://api.pexels.com/v1/search?query=${finalQuery}&per_page=40&orientation=landscape`, {
                headers: { Authorization: PEXELS_API_KEY }
            });
            const data = await response.json();
            renderPexelsResults(data.photos, target);
        } catch (err) {
            console.error('Pexels error:', err);
            showToast('Error al conectar con Pexels', 'error');
        }
    }

    function renderPexelsResults(photos, target) {
        const wrapper = target === 'hero' ? document.getElementById('pexels-results-wrapper') : document.getElementById('pexels-bg-wrapper');
        const grid = target === 'hero' ? document.getElementById('pexels-results-grid') : document.getElementById('pexels-bg-grid');

        if (!photos || photos.length === 0) {
            wrapper.style.display = 'none';
            return showToast('No se encontraron imágenes', 'error');
        }

        wrapper.style.display = 'block';
        grid.innerHTML = photos.map(photo => `
            <div class="pexels-thumb" 
                 onclick="applyPexelsPhoto('${photo.src.original}', '${target}')"
                 title="Foto por ${photo.photographer}">
                 <img src="${photo.src.large}" loading="lazy" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;">
            </div>
        `).join('');
    }

    function renderPexelsPlaceholders(query, target) {
        const wrapper = target === 'hero' ? document.getElementById('pexels-results-wrapper') : document.getElementById('pexels-bg-wrapper');
        const grid = target === 'hero' ? document.getElementById('pexels-results-grid') : document.getElementById('pexels-bg-grid');

        wrapper.style.display = 'block';
        const placeholders = [
            'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=800',
            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800',
            'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=800',
            'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800',
            'https://images.unsplash.com/photo-1567620905732-2d1ec7bb7445?q=80&w=800',
            'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=800'
        ];
        grid.innerHTML = placeholders.map(url => `
            <div class="pexels-thumb" 
                 onclick="applyPexelsPhoto('${url}', '${target}')">
                 <img src="${url}" loading="lazy" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;">
            </div>
        `).join('');
    }

    window.applyPexelsPhoto = (url, target) => {
        if (target === 'hero') {
            state.config.heroImg = url;
            
            // Actualizar header principal
            const hero = document.querySelector('.hero');
            if (hero) hero.style.backgroundImage = `url('${url}')`;
            
            // Actualizar previsualización del admin
            if (window.setPreviewImage) {
                window.setPreviewImage('hero-img-preview', url, 'Sin imagen seleccionada');
            }
            showToast('Portada aplicada 📸');
        } else if (target === 'bg') {
            state.config.themeBg = url;
            
            // Actualizar fondo global
            applyTheme(state.config.themeAccent, state.config.themeBg, state.config.themeLogo);
            
            // Actualizar previsualización del admin
            if (window.setPreviewImage) {
                window.setPreviewImage('custom-bg-preview', url, 'Sin fondo seleccionado');
            }
            showToast('Fondo aplicado 📸');
        }

        saveStateToLocal();
    };
});

// ============================================
// PRO BUSINESS DASHBOARD LOGIC (V2.0)
// ============================================
let charts = {
    categories: null,
    topProducts: null,
    monthlyRevenue: null,
    salesTrend: null,
    mySalesTrend: null,
    myMonthlyRevenue: null,
    myPayments: null,
    myHours: null,
    myTopProducts: null
};

function generateMockData() {
    const mockOrders = [];
    const dishes = state.dishes || [];
    if (dishes.length === 0) return [];
    
    const now = new Date();
    // Generar datos para todo el año actual
    for (let i = 0; i < 400; i++) {
        const orderDate = new Date();
        // Distribuir en los últimos 12 meses
        orderDate.setMonth(now.getMonth() - Math.floor(Math.random() * 12));
        orderDate.setDate(Math.floor(Math.random() * 28) + 1);
        
        const numItems = Math.floor(Math.random() * 3) + 1;
        const items = [];
        let total = 0;
        
        for (let j = 0; j < numItems; j++) {
            const randomDish = dishes[Math.floor(Math.random() * dishes.length)];
            items.push({ id: randomDish.id, name: randomDish.name, price: randomDish.price, cat: randomDish.cat });
            total += randomDish.price;
        }
        
        // Los datos de prueba ya vienen "Aceptados" para que el BI no salga vacío
        mockOrders.push({ id: 'MOCK-' + (1000 + i), date: orderDate.toISOString(), items, total, status: 'accepted' });
    }
    localStorage.setItem('streetfeed_orders', JSON.stringify(mockOrders));
    return mockOrders;
}

if (!localStorage.getItem('streetfeed_orders')) {
    generateMockData();
}

function getOrders() {
    return JSON.parse(localStorage.getItem('streetfeed_orders')) || [];
}

function renderStats(range = 'today', specificMonth = null, specificDate = null) {
    if (!document.getElementById('stats-tab')) return;

    const dishes = state.dishes || [];
    const categories = state.categories.filter(c => c.id !== 'todos');
    const allOrders = getOrders();
    // CLAVE: Solo procesar pedidos ACEPTADOS para el BI
    const acceptedOrders = allOrders.filter(o => o.status === 'accepted' || !o.status); // !o.status para compatibilidad con datos viejos
    const isLight = document.body.classList.contains('light-mode');
    const chartText = isLight ? '#1a1a2e' : '#ffffff';
    const chartGrid = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
    const chartDim = isLight ? '#5c5c70' : '#888888';

    const now = new Date();
    
    // 1. Filter Orders by Range
    const filteredOrders = acceptedOrders.filter(order => {
        const orderDate = new Date(order.date);

        // Prioridad 1: Fecha específica del calendario
        if (specificDate) {
            const targetDate = new Date(specificDate + 'T00:00:00');
            return orderDate.toDateString() === targetDate.toDateString();
        }

        // Prioridad 2: Mes específico
        if (specificMonth !== null && specificMonth !== "") {
            return orderDate.getMonth() === parseInt(specificMonth) && orderDate.getFullYear() === now.getFullYear();
        }

        // Prioridad 3: Rangos predefinidos
        if (range === 'today') return orderDate.toDateString() === now.toDateString();
        if (range === 'week') {
            // Rango de 7 días calendario (hoy + 6 atrás) para que coincida con la gráfica
            const startOfRange = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            startOfRange.setDate(startOfRange.getDate() - 6);
            return orderDate >= startOfRange;
        }
        if (range === 'fortnight') {
            // Rango de 15 días calendario
            const startOfRange = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            startOfRange.setDate(startOfRange.getDate() - 14);
            return orderDate >= startOfRange;
        }
        return true;
    });

    // 2. Financial KPIs
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const avgTicket = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;
    
    const itemCounts = {};
    filteredOrders.forEach(o => {
        o.items.forEach(item => {
            itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
        });
    });
    const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);
    const topSeller = sortedItems[0]?.[0] || '---';

    document.getElementById('stat-revenue').textContent = '$' + totalRevenue.toLocaleString('es-CO');
    document.getElementById('stat-avg-ticket').textContent = '$' + Math.round(avgTicket).toLocaleString('es-CO');
    document.getElementById('stat-top-seller').textContent = topSeller;

    // --- CHART 1: TOP 5 PRODUCTS (Grouped Horizontal Bar - Pro Model) ---
    const top5 = sortedItems.slice(0, 5);
    const labels = top5.map(i => i[0]);
    
    // Calcular 3 dimensiones para cada producto
    const unitsData = top5.map(i => i[1]);
    const revenueData = top5.map(i => {
        const dish = dishes.find(d => d.name === i[0]);
        return dish ? (dish.price * i[1]) : 0;
    });

    const ctxTop = document.getElementById('chart-top-products').getContext('2d');
    if (charts.topProducts) charts.topProducts.destroy();
    charts.topProducts = new Chart(ctxTop, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Unidades',
                    data: unitsData,
                    backgroundColor: '#00b5ad',
                    borderRadius: 3,
                    barThickness: 12,
                    xAxisID: 'xUnits'
                },
                {
                    label: 'Ingresos ($)',
                    data: revenueData,
                    backgroundColor: '#3d3e3f',
                    borderRadius: 3,
                    barThickness: 12,
                    xAxisID: 'xRevenue'
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                xUnits: {
                    type: 'linear',
                    position: 'bottom',
                    beginAtZero: true,
                    title: { display: true, text: 'Cant. Vendida', color: chartDim, font: { size: 9 } },
                    grid: { display: false },
                    ticks: { color: '#00b5ad', font: { size: 9 } }
                },
                xRevenue: {
                    type: 'linear',
                    position: 'top',
                    beginAtZero: true,
                    title: { display: true, text: 'Total Ingresos ($)', color: chartDim, font: { size: 9 } },
                    grid: { color: chartGrid },
                    ticks: { 
                        color: chartText, 
                        font: { size: 9 },
                        callback: v => '$' + (v >= 1000 ? (v/1000).toFixed(0) + 'k' : v)
                    }
                },
                y: { 
                    ticks: { color: chartText, font: { size: 11, weight: 'bold' } },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: { color: chartText, boxWidth: 10, font: { size: 10 } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            let value = context.raw;
                            if (label.includes('$')) {
                                return label + ': $' + value.toLocaleString('es-CO');
                            }
                            return label + ': ' + value;
                        }
                    }
                }
            }
        }
    });

    // --- CHART 2: CATEGORY SALES (Doughnut) ---
    const catSales = categories.map(c => {
        const catId = c.id.toLowerCase();
        return filteredOrders.reduce((acc, o) => {
            return acc + o.items.filter(i => {
                // Si el item ya tiene cat, lo usamos. Si no, lo buscamos en dishes por nombre o ID.
                let itemCat = (i.cat || '').toLowerCase();
                if (!itemCat) {
                    const foundDish = dishes.find(d => d.id === i.id || d.name === i.name);
                    if (foundDish) itemCat = (foundDish.cat || '').toLowerCase();
                }
                return itemCat === catId;
            }).length;
        }, 0);
    });

    // --- CHART 2: CATEGORY SALES (Doughnut) ---
    const totalItems = catSales.reduce((a, b) => a + b, 0);
    const catLabels = categories.map((c, idx) => {
        const val = catSales[idx];
        const pct = totalItems > 0 ? Math.round((val / totalItems) * 100) : 0;
        return `${c.name} (${pct}%)`;
    });

    const ctxCat = document.getElementById('chart-categories').getContext('2d');
    if (charts.categories) charts.categories.destroy();
    charts.categories = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
            labels: catLabels,
            datasets: [{
                data: catSales,
                backgroundColor: [
                    '#f7931e', // 🟠 Naranja — Hamburguesas
                    '#4caf50', // 🟢 Verde — Salchipapas
                    '#2196f3', // 🔵 Azul — Perros
                    '#e91e63', // 🩷 Rosa — Mazorcadas
                    '#9c27b0', // 🟣 Morado — Snacks
                    '#00bcd4', // 🩵 Cian — Postres
                    '#ffeb3b', // 🟡 Amarillo — Bebidas
                    '#ff5722', // 🔴 Rojo-naranja — Extras
                    '#009688', // 🩶 Verde azulado — extra cat 9
                    '#3f51b5', // 💙 Índigo — extra cat 10
                ],
                borderWidth: 0,
                hoverOffset: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        color: chartText, 
                        boxWidth: 8, 
                        padding: 15,
                        font: { size: 10, weight: '500' } 
                    } 
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const pct = totalItems > 0 ? ((value / totalItems) * 100).toFixed(1) : 0;
                            return ` ${label}: ${value} und. (${pct}%)`;
                        }
                    }
                }
            }
        }
    });

    // --- CHART 3: MONTHLY REVENUE (Vertical Bar) ---
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthlyData = months.map((_, i) => {
        return acceptedOrders
            .filter(o => new Date(o.date).getMonth() === i)
            .reduce((sum, o) => sum + o.total, 0);
    });

    const maxMonthly = Math.max(...monthlyData, 100000); 

    const ctxMonth = document.getElementById('chart-monthly-revenue').getContext('2d');
    if (charts.monthlyRevenue) charts.monthlyRevenue.destroy();
    charts.monthlyRevenue = new Chart(ctxMonth, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Ventas ($)',
                data: monthlyData,
                backgroundColor: 'rgba(33, 150, 243, 0.6)',
                hoverBackgroundColor: 'rgba(33, 150, 243, 0.8)',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    beginAtZero: true, 
                    grace: '15%',
                    grid: { color: chartGrid }, 
                    ticks: { 
                        color: chartDim, 
                        callback: v => v >= 1000 ? '$' + (v/1000).toFixed(0) + 'k' : '$' + v 
                    } 
                },
                x: { ticks: { color: chartText, font: { size: 10 } } }
            },
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` Ventas: $${ctx.raw.toLocaleString('es-CO')}`
                    }
                }
            }
        }
    });

    // --- CHART 4: SALES TREND (Line) ---
    let trendLabels = [];
    let trendValues = [];
    if (specificMonth !== null && specificMonth !== "") {
        const daysInMonth = new Date(now.getFullYear(), parseInt(specificMonth) + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            trendLabels.push(i.toString());
            trendValues.push(filteredOrders.filter(o => new Date(o.date).getDate() === i).reduce((s, o) => s + o.total, 0));
        }
    } else {
        for (let i = 0; i < 7; i++) {
            const d = new Date(); d.setDate(now.getDate() - (6 - i));
            trendLabels.push(d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }));
            trendValues.push(acceptedOrders.filter(o => new Date(o.date).toDateString() === d.toDateString()).reduce((s, o) => s + o.total, 0));
        }
    }

    const ctxTrend = document.getElementById('chart-sales-trend').getContext('2d');
    if (charts.salesTrend) charts.salesTrend.destroy();
    charts.salesTrend = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: trendLabels,
            datasets: [{
                label: 'Flujo',
                data: trendValues,
                borderColor: '#4caf50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    beginAtZero: true, 
                    grace: '10%',
                    grid: { color: chartGrid }, 
                    ticks: { 
                        color: chartDim,
                        callback: v => v >= 1000 ? '$' + (v/1000).toFixed(0) + 'k' : '$' + v
                    } 
                },
                x: { ticks: { color: chartText, font: { size: 10 } } }
            },
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` $${ctx.raw.toLocaleString('es-CO')}`
                    }
                }
            }
        }
    });
}

// Logic for Filter & Reset Buttons (Robust Delegation)
document.addEventListener('click', (e) => {
    // 1. Handle Reset Button (Opens Selective Modal)
    const resetBtn = e.target.closest('#reset-stats-btn');
    if (resetBtn) {
        // Reset modal state
        document.querySelectorAll('.delete-opt-btn').forEach(b => b.classList.remove('selected'));
        document.getElementById('execute-delete-btn').classList.add('disabled');
        document.getElementById('delete-range-modal').classList.remove('hidden');
        return;
    }

    // 1b. Handle Order Sub-Tabs (incoming, preparing, unpaid)
    const subTabBtn = e.target.closest('.sub-tab-btn');
    if (subTabBtn) {
        const subtab = subTabBtn.dataset.subtab;

        document.querySelectorAll('.sub-tab-btn').forEach(b => {
            b.classList.remove('active');
            b.style.background = 'transparent';
            b.style.color = 'var(--text-dim)';
            b.style.border = '1px solid var(--glass-border)';
        });
        subTabBtn.classList.add('active');
        subTabBtn.style.background = 'var(--theme-accent)';
        subTabBtn.style.color = '#fff';
        subTabBtn.style.border = '1px solid transparent';

        const incEl = document.getElementById('incoming-orders-list');
        const prepEl = document.getElementById('preparing-orders-list');
        const unpEl = document.getElementById('unpaid-orders-list');

        if (incEl) incEl.classList.toggle('hidden', subtab !== 'incoming');
        if (prepEl) prepEl.classList.toggle('hidden', subtab !== 'preparing');
        if (unpEl) unpEl.classList.toggle('hidden', subtab !== 'unpaid');

        renderOrders();
        return;
    }

    // 1c. Handle Order Actions
    if (e.target.closest('.btn-accept')) {
        const id = e.target.closest('.order-card-pro').dataset.id;
        updateOrderStatus(id, 'accepted');
    }
    if (e.target.closest('.btn-reject')) {
        const id = e.target.closest('.order-card-pro').dataset.id;
        updateOrderStatus(id, 'cancelled');
    }
    if (e.target.closest('.btn-details')) {
        const id = e.target.closest('.order-card-pro').dataset.id;
        showOrderDetails(id);
    }
    if (e.target.id === 'close-order-details' || e.target.closest('#close-order-details')) {
        document.getElementById('order-details-modal').classList.add('hidden');
    }

    // 3. Handle Selective Delete Options (Selecting only)
    const optBtn = e.target.closest('.delete-opt-btn');
    if (optBtn) {
        document.querySelectorAll('.delete-opt-btn').forEach(b => b.classList.remove('selected'));
        optBtn.classList.add('selected');
        
        const execBtn = document.getElementById('execute-delete-btn');
        execBtn.classList.remove('disabled');
        execBtn.dataset.range = optBtn.dataset.range;
    }
    
    // 4. Handle Execute Delete Button
    const execDeleteBtn = e.target.closest('#execute-delete-btn:not(.disabled)');
    if (execDeleteBtn) {
        document.getElementById('delete-range-modal').classList.add('hidden'); // Cerrar primero el de selección
        handleSelectiveDelete(execDeleteBtn.dataset.range);
    }
    
    // 5. Close Selective Modal
    if (e.target.id === 'close-delete-range' || e.target.closest('#x-close-delete-range')) {
        document.getElementById('delete-range-modal').classList.add('hidden');
    }
});

/**
 * Lógica para borrar ventas por rango específico
 */
function handleSelectiveDelete(range) {
    let orders = getOrders();
    const now = new Date();
    let msg = "";

    showConfirm(
        `¿Estás seguro de que deseas borrar este periodo? Esta acción no se puede deshacer.`,
        () => {
            if (range === 'today') {
                orders = orders.filter(o => new Date(o.date).toDateString() !== now.toDateString());
                msg = "Ventas de hoy borradas 🗓️";
            } else if (range === 'week') {
                const weekAgo = new Date(); 
                weekAgo.setDate(now.getDate() - 7);
                orders = orders.filter(o => new Date(o.date) < weekAgo);
                msg = "Ventas de la última semana borradas 📅";
            } else if (range === 'month') {
                orders = orders.filter(o => {
                    const d = new Date(o.date);
                    return d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear();
                });
                msg = "Ventas de este mes borradas 📊";
            } else if (range === 'all') {
                orders = [];
                msg = "Historial completo borrado 🗑️";
            }

            state.orders = orders;
            localStorage.setItem('streetfeed_orders', JSON.stringify(orders));
            renderStats('today');
            showToast(msg);
        },
        'Borrar Ahora',
        '#ff5252',
        'Confirmar Limpieza',
        () => {
            // Si cancela el segundo modal, vuelve a mostrar el primero
            document.getElementById('delete-range-modal').classList.remove('hidden');
        }
    );
}


// --- NEW: Custom Dropdown Logic (Range & Months) ---
function initCustomDropdowns() {
    const dropdowns = document.querySelectorAll('.custom-dropdown');
    
    dropdowns.forEach(dropdown => {
        const trigger = dropdown.querySelector('.dropdown-trigger');
        const menu = dropdown.querySelector('.dropdown-menu');
        const items = dropdown.querySelectorAll('li');
        const display = dropdown.querySelector('span');

        // Toggle Open/Close
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close others
            document.querySelectorAll('.custom-dropdown').forEach(d => {
                if (d !== dropdown) d.classList.remove('open');
            });
            dropdown.classList.toggle('open');
        });

        // Select Item
        items.forEach(item => {
            item.addEventListener('click', () => {
                const value = item.dataset.value;
                const text = item.textContent;

                // Update UI
                display.textContent = text;
                items.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                // Active trigger style and label reset
                if (dropdown.id === 'range-dropdown') {
                    trigger.classList.add('active-trigger');
                    const monthDisplay = document.querySelector('#current-month');
                    if (monthDisplay) monthDisplay.textContent = "Meses...";
                    document.querySelectorAll('#month-dropdown li').forEach(li => li.classList.remove('active'));
                } else if (dropdown.id === 'month-dropdown') {
                    const rangeDisplay = document.querySelector('#current-range');
                    if (rangeDisplay) rangeDisplay.textContent = "Rango...";
                    document.querySelectorAll('#range-dropdown li').forEach(li => li.classList.remove('active'));
                    trigger.classList.add('active-trigger');
                } else if (dropdown.id === 'my-range-dropdown') {
                    trigger.classList.add('active-trigger');
                    const monthDisplay = document.querySelector('#my-current-month');
                    if (monthDisplay) monthDisplay.textContent = "Meses...";
                    document.querySelectorAll('#my-month-dropdown li').forEach(li => li.classList.remove('active'));
                } else if (dropdown.id === 'emp-preset-dropdown') {
                    trigger.classList.add('active-trigger');
                    const monthDisplay = document.querySelector('#emp-current-month');
                    if (monthDisplay) monthDisplay.textContent = "Meses...";
                    document.querySelectorAll('#emp-month-dropdown li').forEach(li => li.classList.remove('active'));
                    window._activeEmpPresetValue = value;
                    window._activeEmpMonthValue = '';
                } else if (dropdown.id === 'emp-month-dropdown') {
                    const rangeDisplay = document.querySelector('#emp-current-preset');
                    if (rangeDisplay) rangeDisplay.textContent = "Todo el tiempo";
                    document.querySelectorAll('#emp-preset-dropdown li').forEach(li => li.classList.remove('active'));
                    trigger.classList.add('active-trigger');
                    window._activeEmpMonthValue = value;
                    window._activeEmpPresetValue = 'all';
                }

                // Clear date input
                const dateInput = document.getElementById('stats-date-filter');
                if (dateInput && (dropdown.id === 'range-dropdown' || dropdown.id === 'month-dropdown')) dateInput.value = "";
                const myDateInput = document.getElementById('my-stats-date-filter');
                if (myDateInput && (dropdown.id === 'my-range-dropdown' || dropdown.id === 'my-month-dropdown')) myDateInput.value = "";
                const empDateInput = document.getElementById('emp-filter-date');
                if (empDateInput && (dropdown.id === 'emp-preset-dropdown' || dropdown.id === 'emp-month-dropdown')) empDateInput.value = "";

                // Trigger Logic
                if (dropdown.id === 'range-dropdown') {
                    renderStats(value);
                } else if (dropdown.id === 'month-dropdown') {
                    renderStats('month', value);
                } else if (dropdown.id === 'my-range-dropdown') {
                    renderMyMetrics(value);
                } else if (dropdown.id === 'my-month-dropdown') {
                    renderMyMetrics('month', value);
                } else if (dropdown.id === 'emp-preset-dropdown' || dropdown.id === 'emp-month-dropdown') {
                    renderActiveProfileMetrics();
                }

                dropdown.classList.remove('open');
            });
        });
    });

    // Close on outside click
    document.addEventListener('click', () => {
        dropdowns.forEach(d => d.classList.remove('open'));
    });
}

// Specific Date Picker - Unified logic Admin
const dateFilter = document.getElementById('stats-date-filter');
if (dateFilter) {
    dateFilter.addEventListener('change', (e) => {
        if (e.target.value !== "") {
            document.querySelectorAll('#range-dropdown li, #month-dropdown li').forEach(li => li.classList.remove('active'));
            document.querySelectorAll('#range-trigger, #month-trigger').forEach(tr => tr.classList.remove('active-trigger'));
            const rangeDisp = document.querySelector('#current-range');
            const monthDisp = document.querySelector('#current-month');
            if (rangeDisp) rangeDisp.textContent = "Rango...";
            if (monthDisp) monthDisp.textContent = "Meses...";

            renderStats(null, null, e.target.value);
        }
    });
}

// Specific Date Picker - Unified logic Mis Métricas
const myDateFilter = document.getElementById('my-stats-date-filter');
if (myDateFilter) {
    myDateFilter.addEventListener('change', (e) => {
        if (e.target.value !== "") {
            document.querySelectorAll('#my-range-dropdown li, #my-month-dropdown li').forEach(li => li.classList.remove('active'));
            document.querySelectorAll('#my-range-trigger, #my-month-trigger').forEach(tr => tr.classList.remove('active-trigger'));
            const rangeDisp = document.querySelector('#my-current-range');
            const monthDisp = document.querySelector('#my-current-month');
            if (rangeDisp) rangeDisp.textContent = "Rango...";
            if (monthDisp) monthDisp.textContent = "Meses...";

            renderMyMetrics(null, null, e.target.value);
        }
    });
}

// Reset Button - Mis Métricas
const myResetBtn = document.getElementById('my-reset-stats-btn');
if (myResetBtn) {
    myResetBtn.addEventListener('click', () => {
        const dateInput = document.getElementById('my-stats-date-filter');
        if (dateInput) dateInput.value = "";
        document.querySelectorAll('#my-range-dropdown li, #my-month-dropdown li').forEach(li => li.classList.remove('active'));
        const rangeToday = document.querySelector('#my-range-dropdown li[data-value="today"]');
        if (rangeToday) rangeToday.classList.add('active');
        const rangeDisp = document.querySelector('#my-current-range');
        const monthDisp = document.querySelector('#my-current-month');
        if (rangeDisp) rangeDisp.textContent = "Hoy";
        if (monthDisp) monthDisp.textContent = "Meses...";
        renderMyMetrics('today');
    });
}

// Re-init dropdowns after content load or render
initCustomDropdowns();

// --- Driver Metrics filter init ---
const driverResetBtn = document.getElementById('driver-reset-stats-btn');
if (driverResetBtn) {
    driverResetBtn.addEventListener('click', () => {
        const dateInput = document.getElementById('driver-stats-date-filter');
        if (dateInput) dateInput.value = '';
        document.querySelectorAll('#driver-range-dropdown li, #driver-month-dropdown li').forEach(li => li.classList.remove('active'));
        const rangeToday = document.querySelector('#driver-range-dropdown li[data-value="today"]');
        if (rangeToday) rangeToday.classList.add('active');
        const rangeDisp = document.getElementById('driver-current-range');
        const monthDisp = document.getElementById('driver-current-month');
        if (rangeDisp) rangeDisp.textContent = 'Hoy';
        if (monthDisp) monthDisp.textContent = 'Meses...';
        renderDriverMetrics('today');
    });
}

const driverDateInput = document.getElementById('driver-stats-date-filter');
if (driverDateInput) {
    driverDateInput.addEventListener('change', () => {
        if (driverDateInput.value) renderDriverMetrics(null, null, driverDateInput.value);
    });
}

document.querySelectorAll('#driver-range-dropdown li').forEach(li => {
    li.addEventListener('click', () => {
        document.querySelectorAll('#driver-range-dropdown li').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('#driver-month-dropdown li').forEach(x => x.classList.remove('active'));
        const firstMonth = document.querySelector('#driver-month-dropdown li[data-value=""]');
        if (firstMonth) firstMonth.classList.add('active');
        li.classList.add('active');
        const rangeDisp = document.getElementById('driver-current-range');
        if (rangeDisp) rangeDisp.textContent = li.textContent;
        const monthDisp = document.getElementById('driver-current-month');
        if (monthDisp) monthDisp.textContent = 'Meses...';
        const dateInput = document.getElementById('driver-stats-date-filter');
        if (dateInput) dateInput.value = '';
        renderDriverMetrics(li.dataset.value);
    });
});

document.querySelectorAll('#driver-month-dropdown li').forEach(li => {
    li.addEventListener('click', () => {
        if (li.dataset.value === '') return;
        document.querySelectorAll('#driver-range-dropdown li').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('#driver-month-dropdown li').forEach(x => x.classList.remove('active'));
        li.classList.add('active');
        const monthDisp = document.getElementById('driver-current-month');
        if (monthDisp) monthDisp.textContent = li.textContent;
        const rangeDisp = document.getElementById('driver-current-range');
        if (rangeDisp) rangeDisp.textContent = 'Rango...';
        const dateInput = document.getElementById('driver-stats-date-filter');
        if (dateInput) dateInput.value = '';
        renderDriverMetrics('month', li.dataset.value);
    });
});

window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('streetfeed_')) {
        const statsTab = document.getElementById('stats-tab');
        if (statsTab && !statsTab.classList.contains('hidden')) {
            if (typeof window.reRenderCurrentStats === 'function') window.reRenderCurrentStats();
        }
        
        const myMetricsTab = document.getElementById('my-metrics-tab');
        if (myMetricsTab && !myMetricsTab.classList.contains('hidden')) {
            if (typeof window.reRenderCurrentMyMetrics === 'function') window.reRenderCurrentMyMetrics();
        }

        const driverMetricsTab = document.getElementById('driver-metrics-tab');
        if (driverMetricsTab && !driverMetricsTab.classList.contains('hidden')) {
            if (typeof window.reRenderCurrentDriverMetrics === 'function') window.reRenderCurrentDriverMetrics();
        }

        // Actualizar la vista de pedidos en tiempo real
        if (typeof window.renderOrders === 'function') {
            window.renderOrders();
        }
    }
});

// --- ORDER MANAGEMENT SYSTEM ---

// Sistema Global de Confirmación Pro
window.confirmAction = function(message, onConfirm, buttonText = "Confirmar", buttonColor = null, title = "¿Estás seguro?") {
    const modal = document.getElementById('confirm-modal');
    const msgEl = document.getElementById('confirm-msg');
    const titleEl = document.getElementById('confirm-title');
    const actionBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const iconContainer = modal?.querySelector('.confirm-icon');

    if (!modal || !msgEl || !titleEl || !actionBtn || !cancelBtn) {
        if (confirm(message)) onConfirm();
        return;
    }

    // Configurar contenido
    titleEl.textContent = title;
    msgEl.textContent = message;
    actionBtn.textContent = buttonText;
    actionBtn.style.background = buttonColor || 'var(--theme-accent)';
    
    // Cambiar icono y sombra dinámicamente según el tipo de acción
    const isDanger = buttonColor === '#d32f2f' || buttonColor === '#ef4444' || buttonText.toLowerCase().includes('eliminar') || buttonText.toLowerCase().includes('vaciar') || buttonText.toLowerCase().includes('todo');
    
    if (isDanger) {
        actionBtn.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.35)';
    } else if (buttonColor === '#f59e0b') {
        actionBtn.style.boxShadow = '0 4px 16px rgba(245, 158, 11, 0.35)';
    } else if (buttonColor === '#3b82f6') {
        actionBtn.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.35)';
    } else {
        actionBtn.style.boxShadow = '0 4px 16px rgba(16, 185, 129, 0.35)';
    }

    if (iconContainer) {
        if (isDanger) {
            iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ff5252" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;
            iconContainer.style.background = 'rgba(255, 82, 82, 0.1)';
            iconContainer.style.color = '#ff5252';
            iconContainer.style.animation = 'pulse-alert 2s infinite';
        } else {
            // Icono de Check (Chuli) siempre verde para acciones positivas
            iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><polyline points="20 6 9 17 4 12"/></svg>`;
            iconContainer.style.background = 'rgba(76, 175, 80, 0.1)';
            iconContainer.style.color = '#4caf50';
            iconContainer.style.borderColor = 'rgba(76, 175, 80, 0.2)';
            iconContainer.style.animation = 'pulse-success 2s infinite';
        }
    }

    // Mostrar modal
    modal.classList.remove('hidden');

    // Asignar nuevos eventos
    actionBtn.onclick = () => {
        modal.classList.add('hidden');
        onConfirm();
        actionBtn.onclick = null;
        cancelBtn.onclick = null;
    };

    cancelBtn.onclick = () => {
        modal.classList.add('hidden');
        actionBtn.onclick = null;
        cancelBtn.onclick = null;
    };
    
};

function getCurrentActiveEmployeeName() {
    try {
        const empStr = localStorage.getItem('streetfeed_employee_user') || localStorage.getItem('streetfeed_employee') || localStorage.getItem('sf_current_emp');
        if (empStr) {
            const emp = JSON.parse(empStr);
            if (emp && emp.name) return formatShortName(emp.name);
        }
    } catch(e) {}

    const badgeName = document.getElementById('admin-name-display');
    if (badgeName) {
        const text = badgeName.textContent || '';
        const clean = text.replace(/\s*\([^)]*\)/g, '').trim();
        if (clean && clean !== 'Administrador' && clean !== 'Propietario') {
            return clean;
        }
    }

    return localStorage.getItem('sf_current_emp_name') || (typeof state !== 'undefined' && state.currentEmployee) || '';
}

let historyDateFilter = null;
window.historySearchQuery = null;
window.historyScope = 'all';

window.setHistoryScope = function(scope) {
    window.historyScope = scope;
    const btnAll = document.getElementById('history-scope-all');
    const btnMine = document.getElementById('history-scope-mine');
    if (btnAll && btnMine) {
        if (scope === 'all') {
            btnAll.style.background = 'var(--theme-accent)';
            btnAll.style.color = '#fff';
            btnMine.style.background = 'transparent';
            btnMine.style.color = 'var(--text-dim)';
        } else {
            btnMine.style.background = 'var(--theme-accent)';
            btnMine.style.color = '#fff';
            btnAll.style.background = 'transparent';
            btnAll.style.color = 'var(--text-dim)';
        }
    }
    window.renderOrders();
};

function renderMyMetrics(range = 'today', specificMonth = null, specificDate = null) {
    const tabEl = document.getElementById('my-metrics-tab');
    if (!tabEl) return;

    const activeEmpName = getCurrentActiveEmployeeName() || 'Administrador';
    const isLight = document.body.classList.contains('light-mode');
    const chartText = isLight ? '#0f172a' : '#ffffff';
    const chartGrid = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.08)';

    // Stats for Active Filter
    const filterStats = getEmployeeStats(activeEmpName, {
        preset: range,
        month: specificMonth,
        specificDate: specificDate
    });

    // Stats for Today
    const todayStats = getEmployeeStats(activeEmpName, { preset: 'today' });

    // Stats for Current Month
    const now = new Date();
    const monthStats = getEmployeeStats(activeEmpName, { month: now.getMonth().toString() });

    const headerTitle = document.getElementById('my-metrics-header-title');
    const headerSubtitle = document.getElementById('my-metrics-header-subtitle');

    if (headerTitle) headerTitle.textContent = `Mis Métricas — ${activeEmpName}`;
    if (headerSubtitle) headerSubtitle.textContent = `Resumen de ventas del día, ventas del mes y comisiones (${filterStats.commissionRate}%).`;

    // 1. Update KPI Cards (Dinámico según el filtro seleccionado)
    const salesEl = document.getElementById('my-stat-sales');
    if (salesEl) salesEl.textContent = '$' + filterStats.totalSales.toLocaleString('es-CO');

    const commRateEl = document.getElementById('my-stat-comm-rate');
    if (commRateEl) commRateEl.textContent = `Comisión (${filterStats.commissionRate}%)`;

    const commEl = document.getElementById('my-stat-commission');
    if (commEl) commEl.textContent = '$' + filterStats.commission.toLocaleString('es-CO');

    const ordersCountEl = document.getElementById('my-stat-orders-count');
    if (ordersCountEl) ordersCountEl.textContent = filterStats.acceptedOrders;

    const itemCounts = {};
    (filterStats.recentOrders || []).forEach(o => {
        if (o.status === 'accepted') {
            (o.items || []).forEach(item => {
                const name = item.name || 'Producto';
                itemCounts[name] = (itemCounts[name] || 0) + (item.quantity || 1);
            });
        }
    });
    const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);
    const topDish = sortedItems[0]?.[0] || '---';

    const topDishEl = document.getElementById('my-stat-top-dish');
    if (topDishEl) topDishEl.textContent = topDish;

    // Helper local date key (para evitar desfase UTC en Colombia UTC-5)
    const toLocalKey = (dObj) => {
        const y = dObj.getFullYear();
        const m = String(dObj.getMonth() + 1).padStart(2, '0');
        const d = String(dObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    // 2. Chart 1: Ventas & Comisiones del Día / Tendencia Diaria
    const ctxTrend = document.getElementById('chart-my-sales-trend');
    if (ctxTrend) {
        const dateMap = {};

        let daysToCover = 7;
        if (range === 'today') daysToCover = 1;
        else if (range === 'yesterday') daysToCover = 2;
        else if (range === 'week') daysToCover = 7;
        else if (range === 'fortnight') daysToCover = 15;
        else if (range === 'month' || specificMonth !== null || range === 'all') daysToCover = 30;

        for (let i = daysToCover - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const key = toLocalKey(d);
            dateMap[key] = { sales: 0, comm: 0, label: d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) };
        }

        (filterStats.recentOrders || []).forEach(o => {
            if (o.status === 'accepted' && o.date) {
                const dObj = new Date(o.date);
                if (!isNaN(dObj.getTime())) {
                    const dKey = toLocalKey(dObj);
                    if (!dateMap[dKey]) {
                        dateMap[dKey] = {
                            sales: 0,
                            comm: 0,
                            label: dObj.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
                        };
                    }
                    const total = o.total || 0;
                    dateMap[dKey].sales += total;
                    dateMap[dKey].comm += Math.round(total * (filterStats.commissionRate / 100));
                }
            }
        });

        const sortedDates = Object.keys(dateMap).sort();
        const trendLabels = sortedDates.map(k => dateMap[k].label);
        const trendSales = sortedDates.map(k => dateMap[k].sales);
        const trendComms = sortedDates.map(k => dateMap[k].comm);

        const maxSalesVal = Math.max(...trendSales, ...trendComms, 0);
        const suggestedMaxTrend = maxSalesVal > 0 ? Math.ceil(maxSalesVal * 1.25) : 100000;

        if (charts.mySalesTrend) charts.mySalesTrend.destroy();
        charts.mySalesTrend = new Chart(ctxTrend.getContext('2d'), {
            type: 'bar',
            data: {
                labels: trendLabels,
                datasets: [
                    {
                        type: 'bar',
                        label: 'Ventas ($)',
                        data: trendSales,
                        backgroundColor: 'rgba(76, 175, 80, 0.75)',
                        borderColor: '#4caf50',
                        borderWidth: 1,
                        borderRadius: 6
                    },
                    {
                        type: 'line',
                        label: `Comisión (${filterStats.commissionRate}%)`,
                        data: trendComms,
                        borderColor: '#ec4899',
                        backgroundColor: 'rgba(236, 72, 153, 0.15)',
                        borderWidth: 3,
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: '#ec4899',
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: chartText, font: { weight: 'bold' } } },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                return ctx.dataset.label + ': $' + Math.round(ctx.parsed.y).toLocaleString('es-CO');
                            }
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: chartText, font: { weight: 'bold' } }, grid: { color: chartGrid } },
                    y: {
                        beginAtZero: true,
                        suggestedMax: suggestedMaxTrend,
                        ticks: {
                            color: chartText,
                            font: { weight: 'bold' },
                            callback: function(v) {
                                if (v % 1 !== 0) return '';
                                if (v >= 1000000) return '$' + (v / 1000000).toFixed(1) + 'M';
                                if (v >= 1000) return '$' + Math.round(v / 1000).toLocaleString('es-CO') + 'k';
                                return '$' + Math.round(v).toLocaleString('es-CO');
                            }
                        },
                        grid: { color: chartGrid }
                    }
                }
            }
        });
    }

    // 3. Chart 2: Rendimiento de Ventas del Mes
    const ctxMonth = document.getElementById('chart-my-monthly-revenue');
    if (ctxMonth) {
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const monthlySales = Array(12).fill(0);
        const monthlyComms = Array(12).fill(0);

        const allEmpOrders = getEmployeeStats(activeEmpName, { preset: 'all' }).recentOrders || [];
        allEmpOrders.forEach(o => {
            if (o.status === 'accepted' && o.date) {
                const d = new Date(o.date);
                if (!isNaN(d.getTime()) && d.getFullYear() === now.getFullYear()) {
                    const m = d.getMonth();
                    const total = o.total || 0;
                    monthlySales[m] += total;
                    monthlyComms[m] += Math.round(total * (filterStats.commissionRate / 100));
                }
            }
        });

        const maxMonthVal = Math.max(...monthlySales, ...monthlyComms, 0);
        const suggestedMaxMonth = maxMonthVal > 0 ? Math.ceil(maxMonthVal * 1.25) : 100000;

        if (charts.myMonthlyRevenue) charts.myMonthlyRevenue.destroy();
        charts.myMonthlyRevenue = new Chart(ctxMonth.getContext('2d'), {
            type: 'bar',
            data: {
                labels: monthNames,
                datasets: [
                    {
                        label: 'Ventas Mensuales ($)',
                        data: monthlySales,
                        backgroundColor: 'rgba(33, 150, 243, 0.75)',
                        borderColor: '#2196f3',
                        borderWidth: 1,
                        borderRadius: 6
                    },
                    {
                        label: 'Comisiones ($)',
                        data: monthlyComms,
                        backgroundColor: 'rgba(171, 71, 188, 0.75)',
                        borderColor: '#ab47bc',
                        borderWidth: 1,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: chartText, font: { weight: 'bold' } } },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                return ctx.dataset.label + ': $' + Math.round(ctx.parsed.y).toLocaleString('es-CO');
                            }
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: chartText, font: { weight: 'bold' } }, grid: { color: chartGrid } },
                    y: {
                        beginAtZero: true,
                        suggestedMax: suggestedMaxMonth,
                        ticks: {
                            color: chartText,
                            font: { weight: 'bold' },
                            callback: function(v) {
                                if (v % 1 !== 0) return '';
                                if (v >= 1000000) return '$' + (v / 1000000).toFixed(1) + 'M';
                                if (v >= 1000) return '$' + Math.round(v / 1000).toLocaleString('es-CO') + 'k';
                                return '$' + Math.round(v).toLocaleString('es-CO');
                            }
                        },
                        grid: { color: chartGrid }
                    }
                }
            }
        });
    }

    // 4. Render History Table
    const tbody = document.getElementById('my-metrics-table-body');
    if (tbody) {
        const acceptedList = (filterStats.recentOrders || []).filter(o => o.status === 'accepted');
        if (acceptedList.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-dim); font-size: 0.9rem;">
                        <i data-lucide="inbox" style="width: 32px; height: 32px; display: block; margin: 0 auto 0.5rem; opacity: 0.5;"></i>
                        No tienes órdenes atendidas en este período de filtro.
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = acceptedList.map(o => {
                const total = o.total || 0;
                const orderComm = Math.round(total * (filterStats.commissionRate / 100));
                const dateStr = o.date ? new Date(o.date).toLocaleString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Reciente';
                const clientOrTable = escapeHtml(o.table ? `Mesa ${o.table}` : (o.customer?.name || 'Cliente'));
                const payMethod = escapeHtml(o.paymentMethod || o.payment || 'Efectivo');
                const isTransf = payMethod.toLowerCase().includes('transf') || payMethod.toLowerCase().includes('nequi');
                const badgeBg = isTransf ? 'rgba(33, 150, 243, 0.15)' : 'rgba(76, 175, 80, 0.15)';
                const badgeColor = isTransf ? '#2196f3' : '#4caf50';

                return `
                    <tr style="border-bottom: 1px solid var(--glass-border); transition: background 0.2s;">
                        <td style="padding: 0.9rem 1rem; font-weight: 800; color: var(--text);">#ORD-${o.id}</td>
                        <td style="padding: 0.9rem 1rem; color: var(--text-dim); font-size: 0.85rem;">${dateStr}</td>
                        <td style="padding: 0.9rem 1rem; font-weight: 700; color: var(--text);">${clientOrTable}</td>
                        <td style="padding: 0.9rem 1rem;">
                            <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 0.25rem 0.65rem; border-radius: 8px; font-weight: 800; font-size: 0.72rem; text-transform: uppercase;">
                                ${payMethod}
                            </span>
                        </td>
                        <td style="padding: 0.9rem 1rem; text-align: right; font-weight: 900; color: var(--text);">$${total.toLocaleString('es-CO')}</td>
                        <td style="padding: 0.9rem 1rem; text-align: right; font-weight: 900; color: #ec4899;">+$${orderComm.toLocaleString('es-CO')}</td>
                    </tr>
                `;
            }).join('');
        }
    }

    if (window.lucide) lucide.createIcons();
}
window.renderMyMetrics = renderMyMetrics;

// ====== DRIVER METRICS (Domiciliario) ======

function renderDriverMetrics(range = 'today', specificMonth = null, specificDate = null) {
    const tabEl = document.getElementById('driver-metrics-tab');
    if (!tabEl) return;

    const driverName = getCurrentActiveEmployeeName() || '';
    const isLight = document.body.classList.contains('light-mode');
    const chartText = isLight ? '#0f172a' : '#ffffff';
    const chartGrid = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.08)';

    // Get all completed delivery orders assigned to this driver
    const allOrders = JSON.parse(localStorage.getItem('streetfeed_orders') || '[]');
    const now = new Date();

    const getLocalStr = (dObj) => {
        const d = new Date(dObj);
        if (isNaN(d.getTime())) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    // Filter: completed deliveries by this driver
    let deliveries = allOrders.filter(o => {
        const isDelivery = (o.deliveryType === 'delivery' || o.type === 'domicilio' || (o.address && typeof o.address === 'string' && o.address.length > 2) || (o.deliveryFee && o.deliveryFee > 0) || (o.customer?.deliveryType === 'delivery'));
        const isCompleted = (o.status === 'completed' || o.status === 'accepted');
        // Check attendedBy or deliveredBy matching driver name
        const attended = (o.attendedBy || o.deliveredBy || o.customer?.attendedBy || '').toLowerCase().trim();
        const cleanDriver = driverName.toLowerCase().trim();
        const firstName = cleanDriver.split(' ')[0];
        // Bug fix: byDriver was declared but never applied — now actually filtering by driver
        const byDriver = !cleanDriver || attended.includes(cleanDriver) || (firstName && attended.includes(firstName));
        return isDelivery && isCompleted && byDriver;
    });

    // Apply time filter
    if (specificDate) {
        deliveries = deliveries.filter(o => o.date && getLocalStr(o.date) === specificDate);
    } else if (specificMonth !== null && specificMonth !== '') {
        const targetMonth = parseInt(specificMonth, 10);
        deliveries = deliveries.filter(o => {
            if (!o.date) return false;
            const d = new Date(o.date);
            return !isNaN(d.getTime()) && d.getMonth() === targetMonth;
        });
    } else if (range && range !== 'all') {
        let daysBack = 0;
        if (range === 'today') {
            const todayStr = getLocalStr(now);
            deliveries = deliveries.filter(o => o.date && getLocalStr(o.date) === todayStr);
        } else if (range === 'yesterday') {
            const yest = new Date(now); yest.setDate(now.getDate() - 1);
            const yestStr = getLocalStr(yest);
            deliveries = deliveries.filter(o => o.date && getLocalStr(o.date) === yestStr);
        } else {
            if (range === 'week') daysBack = 6;
            else if (range === 'fortnight') daysBack = 14;
            else if (range === 'month') daysBack = 29;
            if (daysBack > 0) {
                const startOfRange = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                startOfRange.setDate(startOfRange.getDate() - daysBack);
                startOfRange.setHours(0, 0, 0, 0);
                deliveries = deliveries.filter(o => {
                    if (!o.date) return false;
                    const d = new Date(o.date);
                    return !isNaN(d.getTime()) && d >= startOfRange;
                });
            }
        }
    }

    // KPI calculations
    const totalDeliveries = deliveries.length;
    const totalValue = deliveries.reduce((s, o) => s + (o.total || 0), 0);
    const totalFee = deliveries.reduce((s, o) => s + (o.deliveryFee || 0), 0);
    const avgValue = totalDeliveries > 0 ? Math.round(totalValue / totalDeliveries) : 0;

    const headerTitle = document.getElementById('driver-metrics-header-title');
    const headerSubtitle = document.getElementById('driver-metrics-header-subtitle');
    if (headerTitle) headerTitle.textContent = `Mis Métricas — ${driverName || 'Domiciliario'}`;
    if (headerSubtitle) headerSubtitle.textContent = `Resumen de tus entregas, valor transportado y cobro de domicilios.`;

    const delivEl = document.getElementById('driver-stat-deliveries');
    if (delivEl) delivEl.textContent = totalDeliveries;

    const valEl = document.getElementById('driver-stat-value');
    if (valEl) valEl.textContent = '$' + totalValue.toLocaleString('es-CO');

    const feeEl = document.getElementById('driver-stat-fee');
    if (feeEl) feeEl.textContent = '$' + totalFee.toLocaleString('es-CO');

    const avgEl = document.getElementById('driver-stat-avg');
    if (avgEl) avgEl.textContent = '$' + avgValue.toLocaleString('es-CO');

    const toLocalKey = (dObj) => {
        const y = dObj.getFullYear();
        const m = String(dObj.getMonth() + 1).padStart(2, '0');
        const d = String(dObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    // Chart 1: Entregas por día (trend)
    const ctxTrend = document.getElementById('chart-driver-deliveries-trend');
    if (ctxTrend) {
        const dateMap = {};
        let daysToCover = range === 'today' ? 1 : range === 'yesterday' ? 2 : range === 'week' ? 7 : range === 'fortnight' ? 15 : 30;
        for (let i = daysToCover - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const key = toLocalKey(d);
            dateMap[key] = { count: 0, value: 0, label: d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) };
        }
        deliveries.forEach(o => {
            if (o.date) {
                const dObj = new Date(o.date);
                if (!isNaN(dObj.getTime())) {
                    const dKey = toLocalKey(dObj);
                    if (!dateMap[dKey]) dateMap[dKey] = { count: 0, value: 0, label: dObj.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) };
                    dateMap[dKey].count += 1;
                    dateMap[dKey].value += (o.total || 0);
                }
            }
        });
        const sortedDates = Object.keys(dateMap).sort();
        const trendLabels = sortedDates.map(k => dateMap[k].label);
        const trendCounts = sortedDates.map(k => dateMap[k].count);
        const trendValues = sortedDates.map(k => dateMap[k].value);
        const maxVal = Math.max(...trendValues, 0);
        const suggestedMax = maxVal > 0 ? Math.ceil(maxVal * 1.25) : 100000;

        if (charts.driverDeliveriesTrend) charts.driverDeliveriesTrend.destroy();
        charts.driverDeliveriesTrend = new Chart(ctxTrend.getContext('2d'), {
            type: 'bar',
            data: {
                labels: trendLabels,
                datasets: [
                    { type: 'bar', label: 'Entregas', data: trendCounts, backgroundColor: 'rgba(16,185,129,0.75)', borderColor: '#10b981', borderWidth: 1, borderRadius: 6, yAxisID: 'y1' },
                    { type: 'line', label: 'Valor ($)', data: trendValues, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 3, tension: 0.3, pointRadius: 4, pointBackgroundColor: '#f59e0b', fill: true, yAxisID: 'y' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: chartText, font: { weight: 'bold' } } },
                    tooltip: { callbacks: { label: function(ctx) { return ctx.dataset.label + (ctx.datasetIndex === 1 ? ': $' + Math.round(ctx.parsed.y).toLocaleString('es-CO') : ': ' + ctx.parsed.y); } } }
                },
                scales: {
                    x: { ticks: { color: chartText, font: { weight: 'bold' } }, grid: { color: chartGrid } },
                    y: { position: 'left', beginAtZero: true, suggestedMax, ticks: { color: chartText, font: { weight: 'bold' }, callback: v => v >= 1000 ? '$' + Math.round(v / 1000) + 'k' : '$' + v }, grid: { color: chartGrid } },
                    y1: { position: 'right', beginAtZero: true, ticks: { color: '#10b981', font: { weight: 'bold' }, stepSize: 1 }, grid: { drawOnChartArea: false } }
                }
            }
        });
    }

    // Chart 2: Valor por mes
    const ctxMonth = document.getElementById('chart-driver-monthly-value');
    if (ctxMonth) {
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const monthlyValues = Array(12).fill(0);
        const monthlyCounts = Array(12).fill(0);
        const allDeliveries = allOrders.filter(o => {
            const isDelivery = (o.deliveryType === 'delivery' || o.type === 'domicilio' || (o.address && typeof o.address === 'string' && o.address.length > 2) || (o.deliveryFee && o.deliveryFee > 0));
            return isDelivery && (o.status === 'completed' || o.status === 'accepted');
        });
        allDeliveries.forEach(o => {
            if (o.date) {
                const d = new Date(o.date);
                if (!isNaN(d.getTime()) && d.getFullYear() === now.getFullYear()) {
                    monthlyValues[d.getMonth()] += (o.total || 0);
                    monthlyCounts[d.getMonth()] += 1;
                }
            }
        });
        const maxMonthVal = Math.max(...monthlyValues, 0);
        const suggestedMaxMonth = maxMonthVal > 0 ? Math.ceil(maxMonthVal * 1.25) : 100000;

        if (charts.driverMonthlyValue) charts.driverMonthlyValue.destroy();
        charts.driverMonthlyValue = new Chart(ctxMonth.getContext('2d'), {
            type: 'bar',
            data: {
                labels: monthNames,
                datasets: [
                    { label: 'Valor Entregado ($)', data: monthlyValues, backgroundColor: 'rgba(59,130,246,0.75)', borderColor: '#3b82f6', borderWidth: 1, borderRadius: 6 },
                    { label: 'Nº Entregas', data: monthlyCounts, backgroundColor: 'rgba(16,185,129,0.6)', borderColor: '#10b981', borderWidth: 1, borderRadius: 6 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: chartText, font: { weight: 'bold' } } },
                    tooltip: { callbacks: { label: function(ctx) { return ctx.datasetIndex === 0 ? 'Valor: $' + Math.round(ctx.parsed.y).toLocaleString('es-CO') : 'Entregas: ' + ctx.parsed.y; } } }
                },
                scales: {
                    x: { ticks: { color: chartText, font: { weight: 'bold' } }, grid: { color: chartGrid } },
                    y: { beginAtZero: true, suggestedMax: suggestedMaxMonth, ticks: { color: chartText, font: { weight: 'bold' }, callback: v => v >= 1000 ? '$' + Math.round(v / 1000) + 'k' : '$' + v }, grid: { color: chartGrid } }
                }
            }
        });
    }

    // Table
    const tbody = document.getElementById('driver-metrics-table-body');
    if (tbody) {
        if (deliveries.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-dim); font-size: 0.9rem;"><i data-lucide="inbox" style="width: 32px; height: 32px; display: block; margin: 0 auto 0.5rem; opacity: 0.5;"></i>No hay entregas registradas en este período.</td></tr>`;
        } else {
            tbody.innerHTML = deliveries.slice().reverse().map(o => {
                const total = o.total || 0;
                const fee = o.deliveryFee || 0;
                const dateStr = o.date ? new Date(o.date).toLocaleString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Reciente';
                const clientName = escapeHtml(o.customer?.name || o.customerName || 'Cliente');
                const address = escapeHtml(o.customer?.address || o.address || '—');
                return `
                    <tr style="border-bottom: 1px solid var(--glass-border);">
                        <td style="padding: 0.9rem 1rem; font-weight: 800; color: var(--text);">#ORD-${o.id || o.orderId}</td>
                        <td style="padding: 0.9rem 1rem; color: var(--text-dim); font-size: 0.85rem;">${dateStr}</td>
                        <td style="padding: 0.9rem 1rem; font-weight: 700; color: var(--text);">${clientName}</td>
                        <td style="padding: 0.9rem 1rem; color: var(--text-dim); font-size: 0.82rem;">${address}</td>
                        <td style="padding: 0.9rem 1rem; text-align: right; font-weight: 900; color: var(--text);">$${total.toLocaleString('es-CO')}</td>
                        <td style="padding: 0.9rem 1rem; text-align: right; font-weight: 900; color: #ec4899;">${fee > 0 ? '+$' + fee.toLocaleString('es-CO') : '—'}</td>
                    </tr>
                `;
            }).join('');
        }
    }

    if (window.lucide) lucide.createIcons();
}
window.renderDriverMetrics = renderDriverMetrics;

window.reRenderCurrentDriverMetrics = function() {
    const activeRangeLi = document.querySelector('#driver-range-dropdown li.active');
    const activeMonthLi = document.querySelector('#driver-month-dropdown li.active');
    const dateInput = document.getElementById('driver-stats-date-filter');
    if (dateInput && dateInput.value) {
        renderDriverMetrics(null, null, dateInput.value);
    } else if (activeMonthLi && activeMonthLi.dataset.value !== '') {
        renderDriverMetrics('month', activeMonthLi.dataset.value);
    } else if (activeRangeLi && activeRangeLi.dataset.value) {
        renderDriverMetrics(activeRangeLi.dataset.value);
    } else {
        renderDriverMetrics('today');
    }
};

window.reRenderCurrentMyMetrics = function() {
    const activeRangeLi = document.querySelector('#my-range-dropdown li.active');
    const activeMonthLi = document.querySelector('#my-month-dropdown li.active');
    const dateInput = document.getElementById('my-stats-date-filter');

    if (dateInput && dateInput.value) {
        renderMyMetrics(null, null, dateInput.value);
    } else if (activeMonthLi && activeMonthLi.dataset.value !== "") {
        renderMyMetrics('month', activeMonthLi.dataset.value);
    } else if (activeRangeLi && activeRangeLi.dataset.value) {
        renderMyMetrics(activeRangeLi.dataset.value);
    } else {
        renderMyMetrics('today');
    }
};

window.reRenderCurrentStats = function() {
    const activeRangeLi = document.querySelector('#range-dropdown li.active');
    const activeMonthLi = document.querySelector('#month-dropdown li.active');
    const dateInput = document.getElementById('stats-date-filter');
    const activeBtn = document.querySelector('.filter-btn.active');

    if (dateInput && dateInput.value) {
        renderStats(null, null, dateInput.value);
    } else if (activeMonthLi && activeMonthLi.dataset.value !== "") {
        renderStats('month', activeMonthLi.dataset.value);
    } else if (activeRangeLi && activeRangeLi.dataset.value) {
        renderStats(activeRangeLi.dataset.value);
    } else if (activeBtn) {
        renderStats(activeBtn.dataset.range);
    } else {
        renderStats('today');
    }
};

window.openMyMetricsModal = function() {
    const navBtn = document.getElementById('nav-btn-my-metrics');
    if (navBtn) {
        navBtn.click();
    } else {
        const targetTab = document.getElementById('my-metrics-tab');
        if (targetTab) {
            document.querySelectorAll('.admin-tab-content').forEach(tab => tab.classList.add('hidden'));
            targetTab.classList.remove('hidden');
            if (typeof window.reRenderCurrentMyMetrics === 'function') {
                window.reRenderCurrentMyMetrics();
            } else {
                renderMyMetrics('today');
            }
        }
    }
};

window.closeMyMetricsModal = function() {
    const modal = document.getElementById('employeeMetricsModal');
    if (modal) modal.style.display = 'none';
};

// ====== DOMICILIOS BADGE (always in-sync, called by renderOrders) ======
// Only counts delivery orders that have been DISPATCHED by the owner.
// Orders in Entrantes (pending) or En Preparación (confirmed) are NOT shown
// because the domiciliario should only see orders ready to pick up.
function updateDomiciliosBadge() {
    const badge = document.getElementById('domicilios-count-badge');
    if (!badge) return;
    const allOrders = getOrders();
    const count = allOrders.filter(o => {
        // Only dispatched orders go to the Domicilios section
        if (o.status !== 'dispatched') return false;
        const isDeliv = (
            o.deliveryType === 'delivery' ||
            o.type === 'domicilio' ||
            o.customer?.deliveryType === 'delivery' ||
            (o.deliveryFee && o.deliveryFee > 0) ||
            (o.address && typeof o.address === 'string' && o.address.trim().length > 2)
        );
        return isDeliv;
    }).length;
    badge.textContent = count;
    if (count > 0) {
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}
window.updateDomiciliosBadge = updateDomiciliosBadge;

window.renderOrders = function() {
    const orders = getOrders();
    const incomingList = document.getElementById('incoming-orders-list');
    const preparingList = document.getElementById('preparing-orders-list');
    const unpaidList = document.getElementById('unpaid-orders-list');
    const historyList = document.getElementById('history-list-content');
    if (!incomingList || !preparingList || !unpaidList || !historyList) return;

    // Filter by 3 active statuses + history
    let incoming = orders.filter(o => o.status === 'pending' || !o.status).reverse();
    let preparing = orders.filter(o => o.status === 'confirmed').reverse();
    let unpaid = orders.filter(o => o.status === 'dispatched').reverse();
    let history = orders.filter(o => o.status === 'accepted' || o.status === 'cancelled').reverse();

    if (window._prevIncomingCount !== undefined && incoming.length > window._prevIncomingCount) {
        if (typeof window.playNewOrderChime === 'function') {
            window.playNewOrderChime();
        }
    }
    window._prevIncomingCount = incoming.length;

    // Filter History by Scope (Todos vs Mis Pedidos)
    if (window.historyScope === 'mine') {
        const activeName = getCurrentActiveEmployeeName().toLowerCase().trim();
        const firstName = activeName.split(' ')[0];
        if (activeName) {
            history = history.filter(o => {
                const attended = (o.attendedBy || o.customer?.attendedBy || '').toLowerCase().trim();
                if (!attended) return false;
                if (activeName.includes('propietario') || activeName.includes('administrador')) {
                    return attended.includes('propietario') || attended.includes('administrador') || (firstName && attended.includes(firstName));
                }
                return attended.includes(activeName) || (firstName && attended.includes(firstName));
            });
        }
    }

    // For domiciliario role: only show delivery-type orders in history
    if (window.driverDeliveryOnlyHistory) {
        history = history.filter(o => {
            return (
                o.deliveryType === 'delivery' ||
                o.type === 'domicilio' ||
                (o.address && typeof o.address === 'string' && o.address.trim().length > 2) ||
                (o.deliveryFee && o.deliveryFee > 0) ||
                (o.customer && o.customer.address && typeof o.customer.address === 'string' && o.customer.address.trim().length > 2)
            );
        });
    }

    // Filtro por Búsqueda principal (Pedidos: Entrantes, En Preparación y Por Cobrar)
    const mainSearchInput = document.getElementById('orders-search-input');
    if (mainSearchInput && mainSearchInput.value.trim() !== '') {
        const q = mainSearchInput.value.toLowerCase().trim();
        const filterFn = o => {
            const nameMatch = (o.customer?.name || '').toLowerCase().includes(q);
            const phoneMatch = (o.customer?.phone || '').toLowerCase().includes(q);
            const idMatch = String(o.id || '').toLowerCase().includes(q);
            return nameMatch || phoneMatch || idMatch;
        };
        incoming = incoming.filter(filterFn);
        preparing = preparing.filter(filterFn);
        unpaid = unpaid.filter(filterFn);
    }

    // Filtro por Búsqueda (Nombre o Teléfono) - Solo para historial
    if (window.historySearchQuery) {
        const q = window.historySearchQuery.toLowerCase();
        history = history.filter(o => {
            const nameMatch = (o.customer?.name || '').toLowerCase().includes(q);
            const phoneMatch = (o.customer?.phone || '').toLowerCase().includes(q);
            return nameMatch || phoneMatch;
        });
    }

    // Actualizar Badges de Pestañas y Sidebar
    const badge = document.getElementById('order-count-badge');
    const badgeInc = document.getElementById('badge-incoming');
    const badgePrep = document.getElementById('badge-preparing');
    const badgeUnp = document.getElementById('badge-unpaid');

    if (badgeInc) {
        badgeInc.textContent = incoming.length;
        badgeInc.style.display = incoming.length > 0 ? 'inline-block' : 'none';
    }
    if (badgePrep) {
        badgePrep.textContent = preparing.length;
        badgePrep.style.display = preparing.length > 0 ? 'inline-block' : 'none';
    }
    if (badgeUnp) {
        badgeUnp.textContent = unpaid.length;
        badgeUnp.style.display = unpaid.length > 0 ? 'inline-block' : 'none';
    }

    if (badge) {
        const totalActive = incoming.length + preparing.length + unpaid.length;
        badge.textContent = totalActive;
        if (totalActive > 0) badge.classList.remove('hidden');
        else badge.classList.add('hidden');
    }

    // Calcular Ventas Totales (Solo Pedidos Cobrados / Aceptados)
    const totalAccepted = orders.filter(o => o.status === 'accepted').reduce((sum, o) => sum + (o.total || 0), 0);
    const histTotalEl = document.getElementById('hist-total-earnings');
    if (histTotalEl) histTotalEl.textContent = '$' + totalAccepted.toLocaleString();

    // Filtrar Historial por Fecha si aplica
    if (historyDateFilter) {
        history = history.filter(o => {
            const orderDate = new Date(o.date).toISOString().split('T')[0];
            return orderDate === historyDateFilter;
        });
    }

    // Calcular Ventas del Día (o Filtrado)
    const filteredAccepted = history.filter(o => o.status === 'accepted').reduce((sum, o) => sum + (o.total || 0), 0);
    const histDayEl = document.getElementById('hist-day-earnings');
    if (histDayEl) histDayEl.textContent = '$' + filteredAccepted.toLocaleString();

    // Render 1. Entrantes
    if (incoming.length === 0) {
        incomingList.innerHTML = `<div class="empty-state-orders" style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: var(--text-dim);"><i data-lucide="coffee" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.3;"></i><p>No hay pedidos entrantes.</p></div>`;
    } else {
        incomingList.innerHTML = incoming.map(o => createOrderCard(o)).join('');
    }

    // Render 2. En Preparación
    if (preparing.length === 0) {
        preparingList.innerHTML = `<div class="empty-state-orders" style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: var(--text-dim);"><i data-lucide="chef-hat" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.3;"></i><p>No hay pedidos en preparación.</p></div>`;
    } else {
        preparingList.innerHTML = preparing.map(o => createOrderCard(o)).join('');
    }

    // Render 3. Por Cobrar
    if (unpaid.length === 0) {
        unpaidList.innerHTML = `<div class="empty-state-orders" style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: var(--text-dim);"><i data-lucide="receipt" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.3;"></i><p>No hay pedidos pendientes de cobro.</p></div>`;
    } else {
        unpaidList.innerHTML = unpaid.map(o => createOrderCard(o)).join('');
    }

    // Render 4. Historial
    if (history.length === 0) {
        historyList.innerHTML = `<div class="empty-state-orders" style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: var(--text-dim);"><i data-lucide="archive" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.3;"></i><p>${historyDateFilter ? 'No hay pedidos para esta fecha.' : 'El historial está vacío.'}</p></div>`;
    } else {
        historyList.innerHTML = history.map(o => createOrderCard(o)).join('');
    }
    
    if (window.lucide) lucide.createIcons();

    // Always keep the Domicilios sidebar badge in sync
    updateDomiciliosBadge();
}

window.isCleaningMode = false;

window.toggleCleaningMode = function() {
    requireSecurityAuth(() => {
        _performToggleCleaningMode();
    });
};

function _performToggleCleaningMode() {
    window.isCleaningMode = !window.isCleaningMode;
    
    const clearBtn = document.getElementById('clear-all-history');
    const toolsContainer = clearBtn?.parentElement;

    if (clearBtn && toolsContainer) {
        if (window.isCleaningMode) {
            clearBtn.innerHTML = '<i data-lucide="trash-2"></i> TODO';
            clearBtn.style.background = '#d32f2f';
            clearBtn.style.color = '#fff';
            clearBtn.title = "Borrar todo el historial permanentemente";
            
            if (!document.getElementById('cancel-cleaning-btn')) {
                const cancelBtn = document.createElement('button');
                cancelBtn.id = 'cancel-cleaning-btn';
                cancelBtn.className = 'btn-primary';
                cancelBtn.style.cssText = 'height: 42px; padding: 0 1.2rem; border-radius: 10px; font-weight: 800; font-size: 0.75rem; background: #37474f; border: none; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0; color: #fff;';
                cancelBtn.innerHTML = '<i data-lucide="x-circle"></i> SALIR';
                cancelBtn.onclick = () => window.toggleCleaningMode();
                toolsContainer.appendChild(cancelBtn);
            }
        } else {
            clearBtn.innerHTML = '<i data-lucide="trash-2"></i> LIMPIAR';
            clearBtn.style.background = '#d32f2f';
            clearBtn.title = "";
            
            const cancelBtn = document.getElementById('cancel-cleaning-btn');
            if (cancelBtn) cancelBtn.remove();
        }
        if (window.lucide) lucide.createIcons();
    }
    
    window.renderOrders();
};

function createOrderCard(order) {
    const isIncoming = order.status === 'pending' || !order.status;
    const isPreparing = order.status === 'confirmed';
    const isUnpaid = order.status === 'dispatched';
    const isHistory = order.status === 'accepted' || order.status === 'cancelled';
    const statusClass = `status-${order.status || 'pending'}`;
    const date = new Date(order.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    const isCocina = currentEmployeeRole === 'cocina';
    const isMesero = currentEmployeeRole === 'mesero';

    const printBtn = `<button onclick="window.printThermalTicket('${order.id}')" style="width: ${isHistory ? '34px' : '44px'}; height: ${isHistory ? '34px' : '44px'}; border-radius: ${isHistory ? '8px' : '12px'}; background: rgba(var(--primary-rgb, 247, 147, 30), 0.08); border: 1px solid rgba(var(--primary-rgb, 247, 147, 30), 0.25); color: var(--theme-accent); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Imprimir Ticket Térmico POS"><i data-lucide="printer" style="width: ${isHistory ? '16px' : '20px'}; height: ${isHistory ? '16px' : '20px'};"></i></button>`;

    let gridCols = isHistory
        ? 'auto 175px 190px 130px auto'
        : '240px 175px 190px 130px auto';

    if (isPreparing || isUnpaid) {
        gridCols = '240px 175px 190px 110px auto';
    }

    const totalDisplay = isCocina
        ? `<span style="font-size: 0.78rem; font-weight: 800; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(245,158,11,0.12); padding: 0.25rem 0.5rem; border-radius: 6px;">Comanda</span>`
        : `<span style="font-size: 1.1rem; font-weight: 950; color: var(--text); letter-spacing: -0.5px;">$${order.total.toLocaleString()}</span>`;

    let actionsHtml = '';
    if (isMesero) {
        if (isIncoming) {
            actionsHtml = `
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.6rem;">
                    <div style="padding: 0.35rem 0.75rem; border-radius: 8px; background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3); text-align: center; white-space: nowrap;">
                        <span style="font-size: 0.65rem; font-weight: 900; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.5px;">EN ESPERA</span>
                    </div>
                    <button onclick="window.showOrderDetails('${order.id}')" style="width: 44px; height: 44px; border-radius: 12px; background: rgba(var(--text-rgb), 0.05); border: 1px solid var(--glass-border); color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Ver Detalle">
                        <i data-lucide="eye" style="width: 20px; height: 20px;"></i>
                    </button>
                </div>`;
        } else if (isPreparing) {
            actionsHtml = `
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.6rem;">
                    <div style="padding: 0.35rem 0.75rem; border-radius: 8px; background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.3); text-align: center; white-space: nowrap;">
                        <span style="font-size: 0.65rem; font-weight: 900; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.5px;">EN COCINA</span>
                    </div>
                    <button onclick="window.showOrderDetails('${order.id}')" style="width: 44px; height: 44px; border-radius: 12px; background: rgba(var(--text-rgb), 0.05); border: 1px solid var(--glass-border); color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Ver Detalle">
                        <i data-lucide="eye" style="width: 20px; height: 20px;"></i>
                    </button>
                </div>`;
        } else if (isUnpaid) {
            actionsHtml = `
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.6rem;">
                    <div style="padding: 0.35rem 0.75rem; border-radius: 8px; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); text-align: center; white-space: nowrap;">
                        <span style="font-size: 0.65rem; font-weight: 900; color: #10b981; text-transform: uppercase; letter-spacing: 0.5px;">POR COBRAR</span>
                    </div>
                    <button onclick="window.showOrderDetails('${order.id}')" style="width: 44px; height: 44px; border-radius: 12px; background: rgba(var(--text-rgb), 0.05); border: 1px solid var(--glass-border); color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Ver Detalle">
                        <i data-lucide="eye" style="width: 20px; height: 20px;"></i>
                    </button>
                </div>`;
        } else {
            const statusLabel = order.status === 'accepted' ? 'COBRADO' : 'CANCELADO';
            const statusBg    = order.status === 'accepted' ? '#4caf50' : '#d32f2f';
            const statusShadow = order.status === 'accepted' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(211, 47, 47, 0.2)';
            actionsHtml = `
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.6rem;">
                    <div style="padding: 0.3rem 0.6rem; border-radius: 8px; background: ${statusBg}; box-shadow: 0 4px 10px ${statusShadow}; text-align: center; white-space: nowrap;">
                        <span style="font-size: 0.65rem; font-weight: 900; color: #fff; text-transform: uppercase; letter-spacing: 1px;">${statusLabel}</span>
                    </div>
                    <button onclick="window.showOrderDetails('${order.id}')" style="width: 34px; height: 34px; border-radius: 8px; background: rgba(var(--text-rgb), 0.05); border: 1px solid var(--glass-border); color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Ver Detalle">
                        <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
                    </button>
                </div>`;
        }
    } else if (isCocina) {
        if (isIncoming) {
            actionsHtml = `
                <button onclick="window.updateOrderStatus('${order.id}', 'confirmed')" style="padding: 0 1.2rem; height: 44px; border-radius: 12px; background: #4caf50; border: none; color: #fff; cursor: pointer; font-weight: 900; font-size: 0.8rem; letter-spacing: 0.5px; transition: all 0.2s; box-shadow: 0 4px 10px rgba(76, 175, 80, 0.2);">
                    ACEPTAR
                </button>
                <button onclick="window.showOrderDetails('${order.id}')" style="width: 44px; height: 44px; border-radius: 12px; background: rgba(var(--text-rgb), 0.05); border: 1px solid var(--glass-border); color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Ver Detalle">
                    <i data-lucide="eye" style="width: 20px; height: 20px;"></i>
                </button>`;
        } else if (isPreparing) {
            actionsHtml = `
                <button onclick="window.updateOrderStatus('${order.id}', 'dispatched')" style="padding: 0 1.2rem; height: 44px; border-radius: 12px; background: #f59e0b; border: none; color: #fff; cursor: pointer; font-weight: 900; font-size: 0.8rem; letter-spacing: 0.5px; transition: all 0.2s; box-shadow: 0 4px 10px rgba(245, 158, 11, 0.2);">
                    DESPACHAR
                </button>
                <button onclick="window.showOrderDetails('${order.id}')" style="width: 44px; height: 44px; border-radius: 12px; background: rgba(var(--text-rgb), 0.05); border: 1px solid var(--glass-border); color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Ver Detalle">
                    <i data-lucide="eye" style="width: 20px; height: 20px;"></i>
                </button>`;
        } else if (isUnpaid) {
            actionsHtml = `
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.6rem;">
                    <div style="padding: 0.35rem 0.75rem; border-radius: 8px; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); text-align: center; white-space: nowrap;">
                        <span style="font-size: 0.65rem; font-weight: 900; color: #10b981; text-transform: uppercase; letter-spacing: 0.5px;">POR COBRAR</span>
                    </div>
                    <button onclick="window.showOrderDetails('${order.id}')" style="width: 44px; height: 44px; border-radius: 12px; background: rgba(var(--text-rgb), 0.05); border: 1px solid var(--glass-border); color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Ver Detalle">
                        <i data-lucide="eye" style="width: 20px; height: 20px;"></i>
                    </button>
                </div>`;
        } else {
            const statusLabel = order.status === 'accepted' ? 'COBRADO' : 'CANCELADO';
            const statusBg    = order.status === 'accepted' ? '#4caf50' : '#d32f2f';
            const statusShadow = order.status === 'accepted' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(211, 47, 47, 0.2)';
            actionsHtml = `
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.6rem;">
                    <div style="padding: 0.3rem 0.6rem; border-radius: 8px; background: ${statusBg}; box-shadow: 0 4px 10px ${statusShadow}; text-align: center; white-space: nowrap;">
                        <span style="font-size: 0.65rem; font-weight: 900; color: #fff; text-transform: uppercase; letter-spacing: 1px;">${statusLabel}</span>
                    </div>
                    <button onclick="window.showOrderDetails('${order.id}')" style="width: 34px; height: 34px; border-radius: 8px; background: rgba(var(--text-rgb), 0.05); border: 1px solid var(--glass-border); color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Ver Detalle">
                        <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
                    </button>
                </div>`;
        }
    } else if (isIncoming) {
        actionsHtml = `
            <button onclick="window.updateOrderStatus('${order.id}', 'confirmed')" style="padding: 0 1.2rem; height: 44px; border-radius: 12px; background: #4caf50; border: none; color: #fff; cursor: pointer; font-weight: 900; font-size: 0.8rem; letter-spacing: 0.5px; transition: all 0.2s; box-shadow: 0 4px 10px rgba(76, 175, 80, 0.2);">
                ACEPTAR
            </button>
            <button onclick="window.updateOrderStatus('${order.id}', 'cancelled')" style="width: 44px; height: 44px; border-radius: 12px; background: #d32f2f; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; box-shadow: 0 4px 10px rgba(211, 47, 47, 0.2);" title="Rechazar Pedido">
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="white" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <button onclick="window.showOrderDetails('${order.id}')" style="width: 44px; height: 44px; border-radius: 12px; background: rgba(var(--text-rgb), 0.05); border: 1px solid var(--glass-border); color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Ver Detalle">
                <i data-lucide="eye" style="width: 20px; height: 20px;"></i>
            </button>`;
    } else if (isPreparing) {
        actionsHtml = `
            <button onclick="window.updateOrderStatus('${order.id}', 'dispatched')" style="padding: 0 1.2rem; height: 44px; border-radius: 12px; background: #f59e0b; border: none; color: #fff; cursor: pointer; font-weight: 900; font-size: 0.8rem; letter-spacing: 0.5px; transition: all 0.2s; box-shadow: 0 4px 10px rgba(245, 158, 11, 0.2);">
                DESPACHAR
            </button>
            ${!isCocina ? `
            <button onclick="window.updateOrderStatus('${order.id}', 'cancelled')" style="width: 44px; height: 44px; border-radius: 12px; background: #d32f2f; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; box-shadow: 0 4px 10px rgba(211, 47, 47, 0.2);" title="Cancelar Pedido">
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="white" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>` : ''}
            <button onclick="window.showOrderDetails('${order.id}')" style="width: 44px; height: 44px; border-radius: 12px; background: rgba(var(--text-rgb), 0.05); border: 1px solid var(--glass-border); color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Ver Detalle">
                <i data-lucide="eye" style="width: 20px; height: 20px;"></i>
            </button>`;
    } else if (isUnpaid) {
        actionsHtml = `
            <button onclick="window.updateOrderStatus('${order.id}', 'accepted')" style="padding: 0 1.2rem; height: 44px; border-radius: 12px; background: #10b981; border: none; color: #fff; cursor: pointer; font-weight: 900; font-size: 0.8rem; letter-spacing: 0.5px; transition: all 0.2s; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2);">
                COBRAR
            </button>
            <button onclick="window.updateOrderStatus('${order.id}', 'cancelled')" style="width: 44px; height: 44px; border-radius: 12px; background: #d32f2f; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; box-shadow: 0 4px 10px rgba(211, 47, 47, 0.2);" title="Cancelar Pedido">
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="white" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <button onclick="window.showOrderDetails('${order.id}')" style="width: 44px; height: 44px; border-radius: 12px; background: rgba(var(--text-rgb), 0.05); border: 1px solid var(--glass-border); color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Ver Detalle">
                <i data-lucide="eye" style="width: 20px; height: 20px;"></i>
            </button>`;
    } else {
        const statusLabel = order.status === 'accepted' ? 'COBRADO' : 'CANCELADO';
        const statusBg    = order.status === 'accepted' ? '#4caf50' : '#d32f2f';
        const statusShadow = order.status === 'accepted' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(211, 47, 47, 0.2)';
        const deleteBtn = window.isCleaningMode ? `
            <button onclick="window.deleteHistoryOrder('${order.id}')" style="width: 34px; height: 34px; border-radius: 8px; background: rgba(211, 47, 47, 0.15); border: 1px solid rgba(211, 47, 47, 0.3); color: #ff5252; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Eliminar este pedido">
                <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
            </button>` : '';
        actionsHtml = `
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.6rem;">
                <div style="padding: 0.3rem 0.6rem; border-radius: 8px; background: ${statusBg}; box-shadow: 0 4px 10px ${statusShadow}; text-align: center; white-space: nowrap;">
                    <span style="font-size: 0.65rem; font-weight: 900; color: #fff; text-transform: uppercase; letter-spacing: 1px;">${statusLabel}</span>
                </div>
                <button onclick="window.showOrderDetails('${order.id}')" style="width: 34px; height: 34px; border-radius: 8px; background: rgba(var(--text-rgb), 0.05); border: 1px solid var(--glass-border); color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Ver Detalle">
                    <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
                </button>
                ${deleteBtn}
            </div>`;
    }

    const paymentBadge = !isCocina ? `
        <div style="display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; padding: 0.35rem 0.7rem; border-radius: 6px; background: ${order.customer?.payment === 'Efectivo' ? '#4caf50' : '#2563eb'}; box-shadow: 0 4px 10px ${order.customer?.payment === 'Efectivo' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(37, 99, 235, 0.2)'}; white-space: nowrap;">
            <i data-lucide="${order.customer?.payment === 'Efectivo' ? 'banknote' : 'smartphone'}" style="width: 12px; color: #fff;"></i>
            <span style="font-size: 0.65rem; font-weight: 900; color: #fff; text-transform: uppercase; letter-spacing: 0.5px;">${order.customer?.payment === 'Efectivo' ? 'EFECTIVO' : 'TRANSF.'}</span>
        </div>` : '';

    return `
        <div class="order-card-pro ${statusClass}" data-id="${order.id}" style="position: relative; display: grid; grid-template-columns: ${gridCols}; align-items: center; background: var(--surface-light); border: 1px solid var(--glass-border); border-radius: 16px; margin-bottom: 1rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: var(--shadow); min-height: ${isHistory ? '55px' : '85px'}; overflow: hidden; padding-right: ${isHistory ? '0.8rem' : '1.2rem'};">

            <!-- 1. Identidad -->
            <div style="padding: 0 0.4rem 0 1.5rem; display: flex; flex-direction: ${isHistory ? 'row' : 'column'}; align-items: ${isHistory ? 'center' : 'flex-start'}; justify-content: flex-start; gap: ${isHistory ? '1.2rem' : '0.2rem'}; height: 100%; min-width: ${isHistory ? '120px' : '220px'}; flex-shrink: 0;">
                <div style="display: flex; align-items: center; gap: ${isHistory ? '0.6rem' : '0.8rem'}; overflow: hidden; width: ${isHistory ? 'auto' : '100%'}; flex-shrink: 0;">
                    <div style="width: 85px; flex-shrink: 0;">
                        <span style="font-size: 0.65rem; color: var(--text-dim); font-weight: 800; background: rgba(var(--text-rgb), 0.08); padding: 0.15rem 0.4rem; border-radius: 4px; display: inline-block; width: 100%; text-align: center;">#${order.id}</span>
                    </div>
                    <div style="${isHistory ? 'width: 100px; overflow: hidden; flex-shrink: 0;' : 'flex: 1; overflow: hidden;'}">
                        <h4 style="margin: 0; font-size: ${isHistory ? '0.85rem' : '1.1rem'}; font-weight: 800; color: var(--text); white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${isHistory ? (order.customer?.name || 'Cliente').split(' ')[0] : (order.customer?.name || 'Cliente')}</h4>
                    </div>
                </div>
                ${isHistory ? `
                    <span class="history-time-cell" style="font-size: 0.95rem; color: var(--text); font-weight: 800; opacity: 1; white-space: nowrap; flex-shrink: 0;">${date}</span>
                ` : `
                    <div style="display: flex; align-items: center; gap: 0.4rem; color: var(--text-dim); font-size: 0.85rem;">
                        <i data-lucide="clock" style="width: 13px; height: 13px; color: var(--theme-accent);"></i>
                        <span style="font-weight: 700; color: var(--text-dim);">${date}</span>
                    </div>
                `}
            </div>

            <!-- 2. Ubicación -->
            <div class="order-location-cell" style="display: flex; align-items: center; gap: 0.6rem; border-left: 1px solid var(--glass-border); padding: 0 0.3rem 0 0.6rem; width: 175px; flex-shrink: 0; overflow: hidden;">
                <div style="color: var(--theme-accent); flex-shrink: 0;"><i data-lucide="map-pin" style="width: 14px;"></i></div>
                <span style="font-weight: 700; color: var(--text); font-size: 0.8rem; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${order.customer?.address || 'Mesa 1'}</span>
            </div>

            <!-- 3. Pedido (Productos + Pago) -->
            <div style="display: flex; align-items: center; gap: 0.8rem; border-left: 1px solid var(--glass-border); padding: 0 1rem; width: 100%; flex-shrink: 0;">
                <div style="display: flex; align-items: center; gap: 0.4rem; white-space: nowrap;">
                    <i data-lucide="shopping-bag" style="width: 13px; color: var(--theme-accent);"></i>
                    <span style="font-weight: 800; font-size: 0.8rem; color: var(--text);">${order.items.length} Product.</span>
                </div>
                ${paymentBadge}
            </div>

            <!-- 4. Total -->
            <div class="order-total-cell" style="display: flex; align-items: center; justify-content: flex-start; border-left: ${isHistory ? '1px solid var(--glass-border)' : 'none'}; padding: 0 0.8rem; align-self: stretch; width: 130px; flex-shrink: 0;">
                ${totalDisplay}
            </div>

            <!-- 5. Acciones -->
            <div style="display: flex; align-items: center; gap: 0.6rem; padding: 0 0.5rem; justify-content: flex-end; width: auto; flex-shrink: 0;">
                ${actionsHtml}
            </div>

        </div>
    `;
}

window.updateOrderStatus = function(id, newStatus) {
    let actionMsg = '¿Realizar esta acción?';
    let confirmBtn = 'Confirmar';
    let confirmColor = '#4caf50';

    if (newStatus === 'confirmed') {
        actionMsg = '¿Aceptar este pedido y pasarlo a preparación en cocina?';
        confirmBtn = 'Pasar a Preparación';
        confirmColor = '#4caf50';
    } else if (newStatus === 'dispatched') {
        actionMsg = '¿Marcar este pedido como despachado por cocina y pasarlo a Por Cobrar?';
        confirmBtn = 'Despachar Pedido';
        confirmColor = '#f59e0b';
    } else if (newStatus === 'accepted') {
        actionMsg = '¿Registrar el cobro y finalizar la cuenta de este pedido?';
        confirmBtn = 'Registrar Cobro';
        confirmColor = '#10b981';
    } else if (newStatus === 'cancelled') {
        actionMsg = '¿Cancelar este pedido?';
        confirmBtn = 'Cancelar Pedido';
        confirmColor = '#d32f2f';
    }

    window.confirmAction(
        actionMsg,
        () => {
            const orders = getOrders();
            const orderIndex = orders.findIndex(o => String(o.id) === String(id));
            if (orderIndex === -1) {
                console.error("Order not found:", id);
                return;
            }

            orders[orderIndex].status = newStatus;
            state.orders = orders;
            localStorage.setItem('streetfeed_orders', JSON.stringify(orders));
            
            let toastMsg = '✅ Pedido actualizado';
            if (newStatus === 'accepted') toastMsg = '💰 Cobro registrado y cuenta cerrada';
            if (newStatus === 'dispatched') toastMsg = '🔔 Pedido despachado por cocina';
            if (newStatus === 'confirmed') toastMsg = '🍳 Pedido en preparación';
            if (newStatus === 'cancelled') toastMsg = '⚠️ Pedido cancelado';
            
            showToast(toastMsg);
            
            window.renderOrders();
            if (typeof renderStats === 'function') renderStats();

            // Impresión automática al aceptar pedido para comanda de cocina
            if (newStatus === 'confirmed' && typeof window.printThermalTicket === 'function') {
                setTimeout(() => window.printThermalTicket(id), 200);
            }
        },
        confirmBtn,
        confirmColor
    );
};

// --- AUDIO NOTIFICATIONS & THERMAL POS TICKET PRINTING ---
window.isSoundEnabled = function() {
    const saved = localStorage.getItem('streetfeed_sound_enabled');
    return saved === null ? true : saved === 'true';
};

window.playNewOrderChime = function() {
    if (!window.isSoundEnabled()) return;
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        const now = ctx.currentTime;
        [1046.50, 1567.98].forEach((freq, idx) => {
            const startTime = now + (idx * 0.18);
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.3, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.85);
        });
    } catch (e) {
        console.warn("Audio chime error:", e);
    }
};

window.printThermalTicket = function(id) {
    const orders = getOrders();
    const order = orders.find(o => String(o.id) === String(id));
    if (!order) {
        if (typeof showToast === 'function') showToast("Pedido no encontrado para imprimir", "error");
        console.error("Order not found for printing:", id);
        return;
    }

    const dateObj = order.date ? new Date(order.date) : new Date();
    const formattedDate = dateObj.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
    const formattedTime = dateObj.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });

    const storeName = (typeof state !== 'undefined' && state.config && state.config.storeName) || 'STREETFEED';
    const customerName = order.customer?.name || 'Cliente';
    const locationStr = order.customer?.address || 'Mesa 1';
    const paymentType = order.customer?.payment || 'Efectivo';
    const attendedBy = order.attendedBy || order.customer?.attendedBy || (order.isManual ? 'Propietario / Admin' : 'Cliente (Menú Digital)');

    let itemsTotal = 0;
    const itemsHtml = (order.items || []).map(item => {
        const qty = item.qty || item.quantity || 1;
        const price = item.price || 0;
        let extraSum = 0;
        if (item.extras && item.extras.length > 0) {
            extraSum = item.extras.reduce((acc, e) => acc + (e.price || 0), 0);
        }
        const totalItem = qty * (price + extraSum);
        itemsTotal += totalItem;

        let extrasStr = '';
        if (item.extras && item.extras.length > 0) {
            extrasStr = `<div style="font-size: 10px; font-style: italic; padding-left: 8px;">+ ${item.extras.map(e => e.name).join(', ')}</div>`;
        }
        return `
            <div style="display: flex; justify-content: space-between; margin-top: 4px; font-weight: bold; font-size: 12px;">
                <span>${qty}x ${item.name}</span>
                <span>$${totalItem.toLocaleString('es-CO')}</span>
            </div>
            ${extrasStr}
        `;
    }).join('');

    const notesHtml = order.customer?.note ? `
        <div style="margin-top: 6px; border-top: 1px dashed #000; padding-top: 4px; font-size: 11px;">
            <strong>NOTAS:</strong> ${order.customer.note}
        </div>
    ` : '';

    let deliveryFee = order.deliveryFee || 0;
    if (!deliveryFee && (order.customer?.deliveryType === 'delivery' || order.customer?.address) && order.total > itemsTotal) {
        deliveryFee = order.total - itemsTotal;
    }

    const subtotalDeliveryHtml = deliveryFee > 0 ? `
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 2px;">
            <span>SUBTOTAL:</span>
            <span>$${itemsTotal.toLocaleString('es-CO')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 2px; margin-bottom: 2px;">
            <span>DOMICILIO:</span>
            <span>$${deliveryFee.toLocaleString('es-CO')}</span>
        </div>
        <div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
    ` : '';

    const ticketContent = `
        <div style="text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 4px;">
            ${storeName.toUpperCase()}
        </div>
        <div style="text-align: center; font-size: 11px; margin-bottom: 6px; letter-spacing: 1px;">
            *** COMANDA DE COCINA ***
        </div>
        <div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
        <div style="display: flex; justify-content: space-between;">
            <span><strong>PEDIDO:</strong> #${order.id}</span>
            <span>${formattedTime}</span>
        </div>
        <div><strong>FECHA:</strong> ${formattedDate}</div>
        <div><strong>UBICACIÓN:</strong> ${locationStr}</div>
        <div><strong>CLIENTE:</strong> ${customerName}</div>
        <div><strong>ATENDIDO:</strong> ${attendedBy}</div>
        <div><strong>PAGO:</strong> ${paymentType}</div>
        <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>
        <div><strong>PRODUCTOS:</strong></div>
        ${itemsHtml}
        ${notesHtml}
        <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>
        ${subtotalDeliveryHtml}
        <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; margin-top: 4px;">
            <span>TOTAL:</span>
            <span>$${(order.total || 0).toLocaleString('es-CO')}</span>
        </div>
        <div style="border-top: 1px dashed #000; margin: 8px 0 4px 0;"></div>
        <div style="text-align: center; font-size: 10px; margin-bottom: 10px;">
            ¡Gracias por su preferencia!
        </div>
    `;

    // 1. Set fallback print area in DOM
    const printArea = document.getElementById('thermal-ticket-print-area');
    if (printArea) {
        printArea.innerHTML = ticketContent;
    }

    // 2. Open clean print window for instant printing
    const printDoc = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Ticket - ${order.id}</title>
            <style>
                @page { size: auto; margin: 0mm; }
                body {
                    margin: 0;
                    padding: 8px;
                    width: 78mm;
                    font-family: 'Courier New', Courier, monospace, sans-serif;
                    font-size: 12px;
                    color: #000;
                    background: #fff;
                    box-sizing: border-box;
                }
            </style>
        </head>
        <body>
            ${ticketContent}
            <script>
                window.onload = function() {
                    window.focus();
                    window.print();
                    setTimeout(function() { window.close(); }, 600);
                };
            </script>
        </body>
        </html>
    `;

    try {
        const printWin = window.open('', '_blank', 'width=420,height=600,scrollbars=yes');
        if (printWin) {
            printWin.document.open();
            printWin.document.write(printDoc);
            printWin.document.close();
            return;
        }
    } catch(e) {
        console.warn("Print window open blocked, using main window print fallback:", e);
    }

    // Fallback if popup blocked
    setTimeout(() => {
        window.print();
    }, 150);
};

window.showOrderDetails = function(id) {
    const orders = getOrders();
    const order = orders.find(o => String(o.id) === String(id));
    if (!order) {
        console.error("Order not found:", id);
        return;
    }

    document.getElementById('detail-order-id').textContent = `Pedido ${order.id}`;
    const rawName = order.customer?.name || 'No especificado';
    const formattedName = rawName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    const custNameEl = document.getElementById('detail-customer-name');
    if (custNameEl) custNameEl.textContent = formattedName;

    const orderDateObj = order.date ? new Date(order.date) : new Date();
    const formattedDateStr = !isNaN(orderDateObj.getTime())
        ? orderDateObj.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
        : '---';
    const formattedTimeStr = !isNaN(orderDateObj.getTime())
        ? orderDateObj.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })
        : '';
    const fullDateTimeStr = formattedTimeStr ? `${formattedDateStr} • ${formattedTimeStr}` : formattedDateStr;

    const modalDateEl = document.getElementById('detail-order-date');
    if (modalDateEl) {
        modalDateEl.innerHTML = `<i data-lucide="calendar" style="width: 14px; height: 14px; color: var(--theme-accent); vertical-align: middle; margin-right: 4px;"></i><span>${fullDateTimeStr}</span>`;
    }
    document.getElementById('detail-customer-phone').innerHTML = order.customer?.phone ? `<a href="https://wa.me/57${order.customer.phone.replace(/\D/g,'')}" target="_blank" style="color: #25d366; text-decoration: none; border-bottom: 1px dashed #25d366; padding-bottom: 1px;" title="Abrir WhatsApp">${order.customer.phone}</a>` : '---';
    document.getElementById('detail-customer-address').textContent = order.customer?.address || '---';
    const noteEl = document.getElementById('detail-customer-note');
    if (noteEl) noteEl.textContent = order.customer?.note || 'Sin notas adicionales.';
    
    const paymentEl = document.getElementById('detail-customer-payment');
    if (paymentEl) paymentEl.textContent = order.customer?.payment || 'No especificado';

    const waiterEl = document.getElementById('detail-customer-waiter');
    if (waiterEl) {
        const attendedBy = order.attendedBy || order.customer?.attendedBy || (order.isManual ? 'Propietario / Administrador' : 'Cliente (Menú Digital)');
        waiterEl.textContent = attendedBy;
    }
    
    const delFeeEl = document.getElementById('detail-customer-delivery-fee');
    if (delFeeEl) {
        if (order.customer?.deliveryType === 'delivery') {
            const fee = order.deliveryFee || 0;
            delFeeEl.textContent = fee > 0 ? `$${fee.toLocaleString('es-CO')}` : 'Gratis';
            delFeeEl.style.setProperty('color', fee > 0 ? '#ff9800' : '#4caf50', 'important');
        } else {
            delFeeEl.textContent = 'Gratis';
            delFeeEl.style.setProperty('color', '#4caf50', 'important');
        }
    }

    document.getElementById('detail-total-price').textContent = '$' + order.total.toLocaleString();

    const list = document.getElementById('detail-items-list');
    list.innerHTML = order.items.map(item => {
        const extras = item.extras || [];
        const extrasHtml = extras.length > 0 
            ? `<div style="margin-top: 0.4rem; padding-left: 1rem; border-left: 2px solid var(--theme-accent); opacity: 0.9;">
                 ${extras.map(ex => `
                    <div style="font-size: 0.75rem; display: flex; justify-content: space-between; color: var(--text-dim); margin-bottom: 2px;">
                        <span>+ ${ex.name}</span>
                        <span>$${ex.price.toLocaleString()}</span>
                    </div>
                 `).join('')}
               </div>`
            : '';

        return `
            <div class="detail-item-row" style="padding: 1rem; background: rgba(var(--text-rgb), 0.03); border: 1px solid var(--glass-border); border-radius: 14px; margin-bottom: 0.75rem; display: flex; align-items: flex-start; gap: 1rem;">
                <!-- Miniatura del Producto -->
                <div style="width: 50px; height: 50px; border-radius: 10px; overflow: hidden; flex-shrink: 0; border: 1px solid var(--glass-border);">
                    <img src="${item.img || 'img/placeholder.png'}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>

                <div style="flex-grow: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${extras.length > 0 ? '0.5rem' : '0'};">
                        <span style="font-weight: 800; font-size: 0.95rem; color: var(--text);">${item.qty || 1}x ${item.name}</span>
                        <span style="font-weight: 900; font-size: 1rem; color: var(--text);">$${((item.qty || 1) * item.price).toLocaleString()}</span>
                    </div>
                    ${extrasHtml}
                </div>
            </div>
        `;
    }).join('');

    const printActionBtn = `
        <button class="admin-btn-action" style="grid-column: span 2; height: 46px; border-radius: 12px; background: rgba(var(--primary-rgb, 247, 147, 30), 0.12); color: var(--theme-accent); border: 1px solid rgba(var(--primary-rgb, 247, 147, 30), 0.3); font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 0.5rem;" onclick="window.printThermalTicket('${order.id}')">
            <i data-lucide="printer" style="width: 18px; height: 18px;"></i>
            <span>IMPRIMIR TICKET DE COMANDA</span>
        </button>
    `;

    const footer = document.getElementById('order-action-footer');
    if (currentEmployeeRole === 'mesero') {
        footer.innerHTML = printActionBtn + `<button class="admin-btn-action" style="grid-column: span 2; height: 50px; border-radius: 12px; background: rgba(var(--text-rgb), 0.1); color: var(--text); border: 1px solid var(--glass-border); font-weight: 800; cursor: pointer;" onclick="document.getElementById('order-details-modal').classList.add('hidden')">CERRAR DETALLES</button>`;
    } else if (order.status === 'pending' || !order.status) {
        footer.innerHTML = printActionBtn + `
            <button class="admin-btn-action" style="width:100%; height: 50px; border-radius: 12px; border:1px solid #ff5252; color:#ff5252; background: transparent; font-weight: 800; cursor: pointer;" onclick="window.updateOrderStatus('${order.id}', 'cancelled'); document.getElementById('order-details-modal').classList.add('hidden');">CANCELAR</button>
            <button class="admin-btn-action" style="width:100%; height: 50px; border-radius: 12px; background:#4caf50; color:white; border: none; font-weight: 900; cursor: pointer; box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);" onclick="window.updateOrderStatus('${order.id}', 'confirmed'); document.getElementById('order-details-modal').classList.add('hidden');">ACEPTAR</button>
        `;
    } else if (order.status === 'confirmed') {
        footer.innerHTML = printActionBtn + `
            ${currentEmployeeRole !== 'cocina' ? `<button class="admin-btn-action" style="width:100%; height: 50px; border-radius: 12px; border:1px solid #ff5252; color:#ff5252; background: transparent; font-weight: 800; cursor: pointer;" onclick="window.updateOrderStatus('${order.id}', 'cancelled'); document.getElementById('order-details-modal').classList.add('hidden');">CANCELAR</button>` : ''}
            <button class="admin-btn-action" style="width:100%; height: 50px; border-radius: 12px; background:#f59e0b; color:white; border: none; font-weight: 900; cursor: pointer; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);" onclick="window.updateOrderStatus('${order.id}', 'dispatched'); document.getElementById('order-details-modal').classList.add('hidden');">DESPACHAR</button>
        `;
    } else if (order.status === 'dispatched') {
        footer.innerHTML = printActionBtn + `
            ${currentEmployeeRole !== 'cocina' ? `<button class="admin-btn-action" style="width:100%; height: 50px; border-radius: 12px; border:1px solid #ff5252; color:#ff5252; background: transparent; font-weight: 800; cursor: pointer;" onclick="window.updateOrderStatus('${order.id}', 'cancelled'); document.getElementById('order-details-modal').classList.add('hidden');">CANCELAR</button>` : ''}
            <button class="admin-btn-action" style="width:100%; height: 50px; border-radius: 12px; background:#10b981; color:white; border: none; font-weight: 900; cursor: pointer; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);" onclick="window.updateOrderStatus('${order.id}', 'accepted'); document.getElementById('order-details-modal').classList.add('hidden');">COBRAR</button>
        `;
    } else {
        footer.innerHTML = printActionBtn + `<button class="admin-btn-action" style="grid-column: span 2; height: 50px; border-radius: 12px; background: rgba(var(--text-rgb), 0.1); color: var(--text); border: 1px solid var(--glass-border); font-weight: 800; cursor: pointer;" onclick="document.getElementById('order-details-modal').classList.add('hidden')">CERRAR DETALLES</button>`;
    }

    document.getElementById('order-details-modal').classList.remove('hidden');
    const modalBody = document.querySelector('#order-details-modal .modal-body-pro');
    if (modalBody) modalBody.scrollTop = 0;
    if (window.lucide) lucide.createIcons();
}

// --- HISTORY ACTIONS & EXPORT ---
window.deleteHistoryOrder = function(id) {
    requireSecurityAuth(() => {
        window.confirmAction(
            `¿Eliminar el pedido #${id} del historial?`,
            () => {
                let orders = getOrders();
                orders = orders.filter(o => String(o.id) !== String(id));
                state.orders = orders;
                localStorage.setItem('streetfeed_orders', JSON.stringify(orders));
                window.renderOrders();
                if (typeof renderStats === 'function') renderStats();
                showToast("Pedido eliminado 🗑️");
            },
            'Eliminar',
            '#d32f2f'
        );
    });
};

window.clearAllHistory = function() {
    requireSecurityAuth(() => {
        window.confirmAction(
            "¿Estás seguro de que quieres BORRAR TODO el historial de pedidos?",
            () => {
                let orders = getOrders();
                // Mantener solo los pendientes
                orders = orders.filter(o => o.status === 'pending');
                state.orders = orders;
                localStorage.setItem('streetfeed_orders', JSON.stringify(orders));
                window.renderOrders();
                if (typeof renderStats === 'function') renderStats();
                showToast("Historial vaciado 🧹");
            },
            'Vaciar Ahora',
            '#d32f2f',
            '¡Cuidado!'
        );
    });
};

window.pdfScope = 'all';

window.setPdfScope = function(scope) {
    window.pdfScope = scope;
    const btnAll = document.getElementById('pdf-scope-all');
    const btnMine = document.getElementById('pdf-scope-mine');
    if (btnAll && btnMine) {
        if (scope === 'all') {
            btnAll.style.background = 'var(--theme-accent)';
            btnAll.style.color = '#fff';
            btnMine.style.background = 'transparent';
            btnMine.style.color = 'var(--text-dim)';
        } else {
            btnMine.style.background = 'var(--theme-accent)';
            btnMine.style.color = '#fff';
            btnAll.style.background = 'transparent';
            btnAll.style.color = 'var(--text-dim)';
        }
    }
};

window.exportHistoryPDF = function() {
    const modal = document.getElementById('month-picker-modal');
    const grid = modal ? modal.querySelector('.month-grid') : null;
    const allBtn = document.getElementById('month-all-btn');
    if (!modal || !grid) return;

    // Sync pdfScope with current historyScope
    window.setPdfScope(window.historyScope || 'all');

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const currentMonth = new Date().getMonth();

    // Generar botones de meses
    grid.innerHTML = monthNames.map((n, i) => `
        <button class="month-btn ${i === currentMonth ? 'active' : ''}" data-month="${i}">${n}</button>
    `).join('');

    // Mostrar modal
    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();

    // Eventos de clic
    grid.querySelectorAll('.month-btn').forEach(btn => {
        btn.onclick = () => {
            const monthIdx = parseInt(btn.dataset.month);
            const monthName = monthNames[monthIdx];
            const isMine = window.pdfScope === 'mine';
            const activeEmpName = getCurrentActiveEmployeeName();

            let ordersForMonth = getOrders().filter(o =>
                o.status !== 'pending' && new Date(o.date).getMonth() === monthIdx
            );

            if (isMine && activeEmpName) {
                const activeName = activeEmpName.toLowerCase().trim();
                const firstName = activeName.split(' ')[0];
                ordersForMonth = ordersForMonth.filter(o => {
                    const attended = (o.attendedBy || o.customer?.attendedBy || '').toLowerCase().trim();
                    if (!attended) return false;
                    if (activeName.includes('propietario') || activeName.includes('administrador')) {
                        return attended.includes('propietario') || attended.includes('administrador') || (firstName && attended.includes(firstName));
                    }
                    return attended.includes(activeName) || (firstName && attended.includes(firstName));
                });
            }

            if (ordersForMonth.length === 0) {
                const targetText = isMine ? `de "Mis Ventas" (${activeEmpName})` : '';
                showToast(`No hay ventas registradas ${targetText} para ${monthName}.`, 'error');
                return;
            }

            const promptMsg = isMine
                ? `¿Deseas descargar el reporte PDF de "Mis Ventas" (${activeEmpName}) del mes de ${monthName}?`
                : `¿Deseas descargar el reporte PDF General de todas las ventas del mes de ${monthName}?`;

            showConfirm(
                promptMsg,
                () => {
                    generatePDF(monthIdx);
                    modal.classList.add('hidden');
                },
                'Descargar',
                '#4caf50',
                `📅 Historial de ${monthName}`
            );
        };
    });

    allBtn.onclick = () => {
        const isMine = window.pdfScope === 'mine';
        const activeEmpName = getCurrentActiveEmployeeName();

        let allOrders = getOrders().filter(o => o.status !== 'pending');
        if (isMine && activeEmpName) {
            const activeName = activeEmpName.toLowerCase().trim();
            const firstName = activeName.split(' ')[0];
            allOrders = allOrders.filter(o => {
                const attended = (o.attendedBy || o.customer?.attendedBy || '').toLowerCase().trim();
                if (!attended) return false;
                if (activeName.includes('propietario') || activeName.includes('administrador')) {
                    return attended.includes('propietario') || attended.includes('administrador') || (firstName && attended.includes(firstName));
                }
                return attended.includes(activeName) || (firstName && attended.includes(firstName));
            });
        }

        if (allOrders.length === 0) {
            showToast('No hay ventas registradas para descargar.', 'error');
            return;
        }

        const promptMsg = isMine
            ? `¿Deseas descargar el reporte completo de "Mis Ventas" (${activeEmpName})?`
            : '¿Deseas descargar el reporte completo General de todas las ventas del negocio?';

        showConfirm(
            promptMsg,
            () => {
                generatePDF(null);
                modal.classList.add('hidden');
            },
            'Descargar',
            '#4caf50',
            '📄 Todo el Historial'
        );
    };
};

function generatePDF(monthIdx) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let orders = getOrders().filter(o => o.status !== 'pending');

    const isMine = window.pdfScope === 'mine';
    const activeEmpName = getCurrentActiveEmployeeName();

    if (isMine && activeEmpName) {
        const activeName = activeEmpName.toLowerCase().trim();
        const firstName = activeName.split(' ')[0];
        orders = orders.filter(o => {
            const attended = (o.attendedBy || o.customer?.attendedBy || '').toLowerCase().trim();
            if (!attended) return false;
            if (activeName.includes('propietario') || activeName.includes('administrador')) {
                return attended.includes('propietario') || attended.includes('administrador') || (firstName && attended.includes(firstName));
            }
            return attended.includes(activeName) || (firstName && attended.includes(firstName));
        });
    }

    if (orders.length === 0) {
        showToast('No hay pedidos que coincidan con el filtro seleccionado.', 'error');
        return;
    }

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    let reportTitleMonth = "HISTORIAL COMPLETO";

    if (monthIdx !== null) {
        orders = orders.filter(o => new Date(o.date).getMonth() === monthIdx);
        reportTitleMonth = `MES DE ${monthNames[monthIdx].toUpperCase()}`;
    }

    if (orders.length === 0) {
        const periodLabel = monthIdx !== null ? monthNames[monthIdx] : 'el periodo seleccionado';
        showToast(`No hay pedidos registrados para ${periodLabel}.`, 'warning');
        return;
    }

    const restName = (state.config.restaurantName || "STREETFEED").toUpperCase();
    const scopeLabel = isMine ? `MIS VENTAS (${activeEmpName.toUpperCase()})` : 'GENERAL (TODAS LAS VENTAS)';
    const title = `REPORTE DE VENTAS - ${restName}`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(title, 105, 20, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Periodo: ${reportTitleMonth}`, 14, 35);
    doc.text(`Alcance: ${scopeLabel}`, 14, 40);
    doc.text(`Establecimiento: ${state.config.restaurantName || "STREETFEED"}`, 14, 40);

    const tableData = orders.map(o => [
        o.id,
        new Date(o.date).toLocaleString([], {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}),
        o.customer?.name || '---',
        o.attendedBy || o.customer?.attendedBy || (o.isManual ? 'Propietario' : 'Menú Digital'),
        o.customer?.payment?.toUpperCase() || '---',
        o.status === 'accepted' ? 'ACEPTADO' : 'CANCELADO',
        `$${o.total.toLocaleString()}`
    ]);

    doc.autoTable({
        startY: 45,
        head: [['ID', 'Fecha/Hora', 'Cliente', 'Atendido Por', 'Método Pago', 'Estado', 'Total']],
        body: tableData,
        headStyles: { fillColor: [38, 50, 56], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            4: { fontStyle: 'bold' },
            5: { halign: 'right', fontStyle: 'bold' }
        }
    });

    const totalAccepted = orders.filter(o => o.status === 'accepted').reduce((sum, o) => sum + (o.total || 0), 0);
    const finalY = (doc.lastAutoTable?.finalY || 45) + 15;
    
    doc.setDrawColor(200, 200, 200);
    doc.line(14, finalY - 5, 196, finalY - 5);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(38, 50, 56);
    doc.text(`RESUMEN FINANCIERO`, 14, finalY);
    
    doc.setFontSize(12);
    doc.setTextColor(76, 175, 80);
    doc.text(`GANANCIAS TOTALES (Pedidos Aceptados): $${totalAccepted.toLocaleString()}`, 14, finalY + 10);

    doc.save(`reporte_ventas_${reportTitleMonth.replace(/ /g, '_').toLowerCase()}.pdf`);
    showToast("📊 PDF Generado con éxito");
}

// Inicializar sistema de pedidos y herramientas de historial
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.endsWith('admin.html')) {
        renderOrders();

        // Listeners Herramientas Historial
        const dateFilter = document.getElementById('history-date-filter');
        const searchFilter = document.getElementById('history-search-filter');
        const clearFilter = document.getElementById('clear-history-filter');
        const clearAll = document.getElementById('clear-all-history');
        const exportPDF = document.getElementById('export-pdf-btn');

        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                historyDateFilter = e.target.value;
                window.renderOrders();
            });
        }

        if (searchFilter) {
            searchFilter.addEventListener('input', (e) => {
                historySearchQuery = e.target.value;
                window.renderOrders();
            });
        }

        if (clearFilter) {
            clearFilter.addEventListener('click', () => {
                if (dateFilter) dateFilter.value = "";
                if (searchFilter) searchFilter.value = "";
                historyDateFilter = null;
                historySearchQuery = null;
                window.renderOrders();
            });
        }

        if (clearAll) {
            clearAll.addEventListener('click', () => {
                if (!window.isCleaningMode) {
                    window.toggleCleaningMode();
                } else {
                    window.clearAllHistory();
                }
            });
        }

        if (exportPDF) {
            exportPDF.addEventListener('click', window.exportHistoryPDF);
        }

        // Logic for Sound Notification Toggle (Icon Only)
        const soundToggle = document.getElementById('sound-toggle');
        const updateSoundUI = () => {
            const enabled = window.isSoundEnabled ? window.isSoundEnabled() : true;
            const iconContainer = document.getElementById('sound-icon-container');
            const isLight = document.body.classList.contains('light-mode');

            if (soundToggle) {
                if (isLight) {
                    soundToggle.style.setProperty('background', '#ffffff', 'important');
                    soundToggle.style.setProperty('border', '1.5px solid rgba(255,255,255,0.8)', 'important');
                    soundToggle.style.setProperty('box-shadow', '0 4px 12px rgba(0,0,0,0.12)', 'important');
                } else {
                    soundToggle.style.background = enabled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 82, 82, 0.12)';
                    soundToggle.style.border = enabled ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 82, 82, 0.3)';
                    soundToggle.style.boxShadow = 'none';
                }
                soundToggle.title = enabled ? 'Alarma de Pedidos: ACTIVADA (Clic para silenciar)' : 'Alarma de Pedidos: SILENCIADA (Clic para activar)';
            }

            if (iconContainer) {
                const iconName = enabled ? 'bell' : 'bell-off';
                const iconColor = isLight
                    ? (enabled ? '#059669' : '#dc2626')
                    : (enabled ? '#10b981' : '#ff5252');
                iconContainer.innerHTML = `<i data-lucide="${iconName}" id="sound-icon" style="color: ${iconColor} !important; width: 20px; height: 20px;"></i>`;
            }
            if (window.lucide) lucide.createIcons();
        };

        updateSoundUI();

        if (soundToggle) {
            soundToggle.addEventListener('click', () => {
                const current = window.isSoundEnabled ? window.isSoundEnabled() : true;
                localStorage.setItem('streetfeed_sound_enabled', (!current).toString());
                updateSoundUI();
                if (!current && typeof window.playNewOrderChime === 'function') {
                    window.playNewOrderChime();
                }
            });
        }

        // Logic for Theme Toggle (Icon Only - Sun/Moon)
        const themeToggle = document.getElementById('theme-toggle');

        const updateThemeUI = (isLight) => {
            const iconContainer = document.getElementById('theme-icon-container');

            if (themeToggle) {
                if (isLight) {
                    themeToggle.style.setProperty('background', '#ffffff', 'important');
                    themeToggle.style.setProperty('border', '1.5px solid rgba(255,255,255,0.8)', 'important');
                    themeToggle.style.setProperty('box-shadow', '0 4px 12px rgba(0,0,0,0.12)', 'important');
                    themeToggle.title = 'Cambiar a Modo Noche';
                } else {
                    themeToggle.style.background = 'rgba(255, 255, 255, 0.08)';
                    themeToggle.style.border = '1px solid var(--glass-border)';
                    themeToggle.style.boxShadow = 'none';
                    themeToggle.title = 'Cambiar a Modo Día';
                }
            }

            if (iconContainer) {
                const iconName = isLight ? 'sun' : 'moon';
                const iconColor = isLight ? '#d97706' : '#ffffff';
                iconContainer.innerHTML = `<i data-lucide="${iconName}" id="theme-icon" style="color: ${iconColor} !important; width: 20px; height: 20px;"></i>`;
            }
            if (window.lucide) lucide.createIcons();
        };

        const savedTheme = localStorage.getItem('streetfeed_admin_theme') || 'dark';
        const isLightInitial = savedTheme === 'light';
        
        // Set color-scheme on html element immediately so OS uses correct I-beam cursor color
        document.documentElement.style.colorScheme = isLightInitial ? 'light' : 'dark';
        
        if (typeof applyTheme === 'function') {
            applyTheme(state.config.themeAccent, state.config.themeBg, state.config.themeLogo);
        }
        
        updateThemeUI(isLightInitial);

        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const current = localStorage.getItem('streetfeed_admin_theme') || 'dark';
                const nextIsLight = current !== 'light';
                
                localStorage.setItem('streetfeed_admin_theme', nextIsLight ? 'light' : 'dark');
                
                // Force color-scheme on html element so OS switches I-beam cursor color
                document.documentElement.style.colorScheme = nextIsLight ? 'light' : 'dark';
                
                if (typeof applyTheme === 'function') {
                    applyTheme(state.config.themeAccent, state.config.themeBg, state.config.themeLogo);
                }
                
                updateThemeUI(nextIsLight);
                updateSoundUI();
                
                if (typeof window.reRenderCurrentStats === 'function') {
                    window.reRenderCurrentStats();
                }
                if (typeof window.reRenderCurrentMyMetrics === 'function') {
                    window.reRenderCurrentMyMetrics();
                }
                if (typeof renderExpenses === 'function') {
                    renderExpenses();
                }
            });
        }
    }
});

window.switchOrderSettingsTab = function(tab) {
    const secDelivery = document.getElementById('modal-sec-delivery');
    const secWa = document.getElementById('modal-sec-wa');
    const btnDelivery = document.getElementById('modal-tab-btn-delivery');
    const btnWa = document.getElementById('modal-tab-btn-wa');

    if (tab === 'wa') {
        if (secDelivery) secDelivery.classList.add('hidden');
        if (secWa) secWa.classList.remove('hidden');
        if (btnDelivery) {
            btnDelivery.style.background = 'transparent';
            btnDelivery.style.color = 'var(--text-dim)';
            btnDelivery.style.border = '1px solid var(--glass-border)';
        }
        if (btnWa) {
            btnWa.style.background = 'var(--theme-accent)';
            btnWa.style.color = '#fff';
            btnWa.style.border = 'none';
        }
        const textarea = document.getElementById('conf-wa-template');
        if (textarea && typeof state !== 'undefined' && state.config) {
            textarea.value = state.config.waTemplateOrder || `{emojis_inicio} *NUEVO PEDIDO - {negocio}* {emojis_fin}
--------------------------
👤 *CLIENTE:* {cliente}
📞 *TELÉFONO:* {telefono}
🚚 *ENTREGA:* {entrega}
📍 {detalles_entrega}
💵 *PAGO:* {pago}
📝 *NOTA:* {nota}
--------------------------

🛒 *RESUMEN DEL PEDIDO:*
{resumen_pedido}

--------------------------
{precios}
💵 *TOTAL A PAGAR: {total}*
--------------------------

🚀 _Enviado desde el Menú Digital_`;
        }
    } else {
        if (secWa) secWa.classList.add('hidden');
        if (secDelivery) secDelivery.classList.remove('hidden');
        if (btnWa) {
            btnWa.style.background = 'transparent';
            btnWa.style.color = 'var(--text-dim)';
            btnWa.style.border = '1px solid var(--glass-border)';
        }
        if (btnDelivery) {
            btnDelivery.style.background = 'var(--theme-accent)';
            btnDelivery.style.color = '#fff';
            btnDelivery.style.border = 'none';
        }
    }
};

window.openOrderSettingsModal = function(initialTab = 'delivery') {
    const modal = document.getElementById('order-settings-modal');
    if (!modal) return;
    const currentFee = (typeof state !== 'undefined' && state.config && state.config.deliveryFee !== undefined) ? state.config.deliveryFee : 5000;
    const currentTables = (typeof state !== 'undefined' && state.config && state.config.tableCount !== undefined) ? state.config.tableCount : 10;
    
    const priceInput = document.getElementById('config-delivery-price');
    const tableInput = document.getElementById('config-table-count');
    
    if (priceInput) priceInput.value = currentFee.toLocaleString('es-CO');
    if (tableInput) tableInput.value = currentTables;

    window.switchOrderSettingsTab(initialTab);
    modal.classList.remove('hidden');
};

window.openWhatsAppTemplateModal = function() {
    window.openOrderSettingsModal('wa');
};

// Order Settings Persistence
document.addEventListener('click', (e) => {
    if (e.target.id === 'save-order-settings' || e.target.closest('#save-order-settings')) {
        const priceStr = document.getElementById('config-delivery-price').value.replace(/\./g, '');
        const price = parseInt(priceStr) || 0;
        const tables = parseInt(document.getElementById('config-table-count').value) || 10;
        
        state.config.deliveryFee = price;
        state.config.tableCount = tables;
        
        saveStateToLocal();
        showToast('Configuración de domicilio guardada');
        document.getElementById('order-settings-modal').classList.add('hidden');
    }

    // Close settings modal
    if (e.target.id === 'close-order-settings' || e.target.closest('#close-order-settings')) {
        document.getElementById('order-settings-modal').classList.add('hidden');
    }
});

// =====================================================
// MANUAL ORDER SYSTEM
// =====================================================
(function() {
    const modal        = document.getElementById('manual-order-modal');
    const btnOpen      = document.getElementById('btn-new-manual-order');
    const btnClose     = document.getElementById('close-manual-order-modal');
    const btnConfirm   = document.getElementById('btn-confirm-manual-order');
    const catContainer = document.getElementById('manual-order-categories');
    const prodContainer= document.getElementById('manual-order-products');
    const cartSection  = document.getElementById('manual-order-cart-section');
    const cartItems    = document.getElementById('manual-order-cart-items');
    const totalEl      = document.getElementById('manual-order-total');
    const deliveryDetailEl = document.getElementById('manual-delivery-detail');

    // Listen for search input in the permanently visible search bar
    const searchInput = document.getElementById('orders-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                if (typeof window.renderOrders === 'function') window.renderOrders();
            });
        }
    if (!modal || !btnOpen) return;

    // --- State ---
    let manualCart = [];      // { id, name, price, qty }
    let selectedDelivery = '';

    // --- Open / Close ---
    btnOpen.addEventListener('click', openManualModal);
    btnClose.addEventListener('click', closeManualModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeManualModal(); });

    function openManualModal() {
        manualCart = [];
        selectedDelivery = '';
        document.getElementById('manual-cust-name').value = '';
        document.getElementById('manual-cust-phone').value = '';
        document.getElementById('manual-cust-payment').value = '';
        document.getElementById('manual-cust-note').value = '';
        deliveryDetailEl.style.display = 'none';
        deliveryDetailEl.innerHTML = '';
        document.querySelectorAll('.manual-delivery-btn, .manual-pay-btn').forEach(b => {
            b.style.background = 'transparent';
            b.style.borderColor = 'var(--glass-border)';
            b.style.color = 'var(--text-dim)';
        });
        renderManualCategories();
        updateManualCart();
        modal.classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function closeManualModal() {
        modal.classList.add('hidden');
    }

    // --- Categories dropdown ---
    function renderManualCategories() {
        const cats = (state.categories || []).filter(c => c.id !== 'todos');
        const catMenu = document.getElementById('manual-cat-menu');
        const catCurrent = document.getElementById('manual-cat-current');
        const hiddenInput = document.getElementById('manual-order-cat-filter');
        const catDropdown = document.getElementById('manual-cat-dropdown');

        if (cats.length > 0) {
            const initialCat = cats[0];
            if (catCurrent) catCurrent.textContent = initialCat.name;
            if (hiddenInput) hiddenInput.value = initialCat.id;

            if (catMenu) {
                catMenu.innerHTML = cats.map((c, i) => `
                    <li data-value="${c.id}" class="${i === 0 ? 'active' : ''}">${c.name}</li>
                `).join('');

                catMenu.querySelectorAll('li').forEach(li => {
                    li.onclick = (e) => {
                        e.stopPropagation();
                        catMenu.querySelectorAll('li').forEach(l => l.classList.remove('active'));
                        li.classList.add('active');
                        if (catCurrent) catCurrent.textContent = li.textContent;
                        if (hiddenInput) hiddenInput.value = li.dataset.value;
                        if (catDropdown) catDropdown.classList.remove('open');
                        renderManualProducts();
                    };
                });
            }
        }

        const trigger = document.getElementById('manual-cat-trigger');
        if (trigger && catDropdown) {
            trigger.onclick = (e) => {
                e.stopPropagation();
                document.querySelectorAll('.custom-dropdown').forEach(d => {
                    if (d !== catDropdown) d.classList.remove('open');
                });
                catDropdown.classList.toggle('open');
            };
        }

        const searchEl = document.getElementById('manual-product-search');
        if (searchEl) {
            searchEl.oninput = () => renderManualProducts();
        }
        renderManualProducts();
    }

    // --- Products as compact rows ---
    function renderManualProducts() {
        const catFilter = document.getElementById('manual-order-cat-filter');
        const searchEl  = document.getElementById('manual-product-search');
        const catId  = catFilter ? catFilter.value : null;
        const query  = searchEl  ? searchEl.value.toLowerCase().trim() : '';

        let dishes = (state.dishes || []).filter(d => d.active !== false);
        
        // Si hay búsqueda, ignoramos la categoría para que busque en todo el menú
        if (query) {
            dishes = dishes.filter(d => d.name.toLowerCase().includes(query));
        } else if (catId) {
            dishes = dishes.filter(d => String(d.cat) === String(catId));
        }

        prodContainer.innerHTML = '';

        if (dishes.length === 0) {
            prodContainer.innerHTML = '<p style="color:var(--text-dim);font-size:0.85rem;text-align:center;padding:2rem 0;">Sin productos</p>';
            return;
        }

        dishes.forEach(dish => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:0.7rem;padding:0.45rem 0.8rem;border-bottom:1px solid rgba(255,255,255,0.04);transition:background 0.15s;';
            row.innerHTML = `
                <div style="width:36px;height:36px;border-radius:8px;overflow:hidden;background:rgba(255,255,255,0.05);flex-shrink:0;border:1px solid var(--glass-border);">
                    <img src="${dish.img || 'img/placeholder.jpg'}" style="width:100%;height:100%;object-fit:cover;">
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:0.88rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${dish.name}</div>
                    <div style="font-size:0.78rem;color:var(--theme-accent);font-weight:800;">$${(dish.price||0).toLocaleString('es-CO')}</div>
                </div>
                <div style="display:flex;align-items:center;gap:0.5rem;flex-shrink:0;">
                    <button class="manual-minus" style="width:24px;height:24px;border-radius:50%;border:1px solid var(--glass-border);background:transparent;color:var(--text-dim);cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;font-weight:700;line-height:1;">−</button>
                    <span class="manual-qty-display" style="font-weight:800;font-size:0.9rem;min-width:18px;text-align:center;">0</span>
                    <button class="manual-plus" style="width:24px;height:24px;border-radius:50%;border:none;background:#4caf50;color:#fff;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;font-weight:700;line-height:1;">+</button>
                </div>
            `;

            row.querySelector('.manual-plus').addEventListener('click', (e) => { e.stopPropagation(); changeQty(dish, 1); refreshCardQty(row, dish.id); });
            row.querySelector('.manual-minus').addEventListener('click', (e) => { e.stopPropagation(); changeQty(dish, -1); refreshCardQty(row, dish.id); });

            refreshCardQty(row, dish.id);
            prodContainer.appendChild(row);
        });
    }

    function refreshCardQty(card, dishId) {
        const item = manualCart.find(i => i.id === dishId);
        const qty = item ? item.qty : 0;
        const display = card.querySelector('.manual-qty-display');
        if (display) display.textContent = qty;
        card.style.borderColor = qty > 0 ? 'var(--theme-accent)' : 'var(--glass-border)';
        card.style.background = qty > 0 ? 'rgba(247,147,30,0.08)' : 'rgba(255,255,255,0.03)';
    }

    function changeQty(dish, delta) {
        let item = manualCart.find(i => i.id === dish.id);
        if (!item) {
            if (delta < 1) return;
            manualCart.push({ id: dish.id, name: dish.name, price: dish.price || 0, qty: 1, img: dish.img || '' });
        } else {
            item.qty += delta;
            if (item.qty <= 0) manualCart = manualCart.filter(i => i.id !== dish.id);
        }
        updateManualCart();
    }

    function updateManualCart() {
        const hasItems = manualCart.length > 0;
        cartSection.style.display = 'flex'; // Always show side column

        if (!hasItems) {
            cartItems.innerHTML = `
                <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--text-dim); gap:0.5rem; opacity:0.5; padding-top:2rem;">
                    <i data-lucide="shopping-cart" style="width:24px; height:24px;"></i>
                    <span style="font-size:0.75rem;">Sin productos</span>
                </div>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } else {
            cartItems.innerHTML = manualCart.map(item => `
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.82rem;padding:0.4rem 0.6rem;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.02);">
                    <span style="color:var(--text-dim);font-weight:600;">${item.qty}x ${item.name}</span>
                    <div style="display:flex;align-items:center;gap:0.7rem;">
                        <span style="font-weight:800;color:var(--theme-accent);">$${(item.price * item.qty).toLocaleString('es-CO')}</span>
                        <button type="button" class="manual-cart-del" data-id="${item.id}" style="background:rgba(255,0,0,0.1);border:none;color:#ff4444;cursor:pointer;padding:4px;border-radius:6px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;"><i data-lucide="x" style="width:14px;height:14px;"></i></button>
                    </div>
                </div>
            `).join('');
        }

        // Listeners for cart item deletion (must re-bind after each render)
        cartItems.querySelectorAll('.manual-cart-del').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                manualCart = manualCart.filter(i => String(i.id) !== String(id));
                updateManualCart();
                renderManualProducts();
            };
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();

        const baseTotal = manualCart.reduce((s, i) => s + i.price * i.qty, 0);
        const delFee = selectedDelivery === 'delivery' ? (state.config.deliveryFee || 0) : 0;
        totalEl.textContent = '$' + (baseTotal + delFee).toLocaleString('es-CO');
    }

    // --- Delivery buttons ---
    document.querySelectorAll('.manual-delivery-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Reset previous data
            selectedDelivery = btn.dataset.type;
            
            document.querySelectorAll('.manual-delivery-btn').forEach(b => {
                b.style.background = 'transparent';
                b.style.borderColor = 'var(--glass-border)';
                b.style.color = 'var(--text-dim)';
            });
            btn.style.background = 'rgba(247,147,30,0.15)';
            btn.style.borderColor = 'var(--theme-accent)';
            btn.style.color = '#fff';

            // Clear dynamic inputs area to ensure fresh state
            deliveryDetailEl.innerHTML = '';
            deliveryDetailEl.style.display = 'block';
            if (selectedDelivery === 'dine-in') {
                const tables = state.config.tableCount || 10;
                let btns = '';
                for (let i = 1; i <= tables; i++) {
                    btns += `<button type="button" class="manual-table-num-btn" data-num="${i}" style="min-width:42px; height:42px; border-radius:10px; border:1px solid var(--glass-border); background:rgba(255,255,255,0.03); color:var(--text-dim); cursor:pointer; font-weight:800; font-size:0.95rem; flex-shrink:0; transition:all 0.2s; display:flex; align-items:center; justify-content:center;">${i}</button>`;
                }
                deliveryDetailEl.innerHTML = `
                    <div style="display:flex; flex-direction:column; gap:0.6rem; margin-bottom:0.4rem;">
                        <label style="font-size:0.78rem; color:var(--theme-accent); font-weight:800; text-transform:uppercase; letter-spacing:0.5px;">Seleccionar Mesa:</label>
                        <div id="manual-table-list" style="display:flex; gap:0.6rem; overflow-x:auto; padding: 0.4rem 0.2rem 0.8rem 0; scrollbar-width:none; -ms-overflow-style:none;">
                            ${btns}
                        </div>
                        <input type="hidden" id="manual-table-val" value="">
                    </div>`;

                // Add style to hide scrollbar
                const styleId = 'hide-manual-scroll';
                if (!document.getElementById(styleId)) {
                    const style = document.createElement('style');
                    style.id = styleId;
                    style.textContent = '#manual-table-list::-webkit-scrollbar { display: none; }';
                    document.head.appendChild(style);
                }
                
                deliveryDetailEl.querySelectorAll('.manual-table-num-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        deliveryDetailEl.querySelectorAll('.manual-table-num-btn').forEach(b => {
                            b.style.borderColor = 'var(--glass-border)';
                            b.style.background = 'rgba(255,255,255,0.03)';
                            b.style.color = 'var(--text-dim)';
                        });
                        this.style.borderColor = 'var(--theme-accent)';
                        this.style.background = 'rgba(247,147,30,0.12)';
                        this.style.color = '#fff';
                        document.getElementById('manual-table-val').value = 'Mesa ' + this.dataset.num;
                    });
                });
            } else if (selectedDelivery === 'takeout') {
                deliveryDetailEl.innerHTML = `<label style="font-size:0.75rem;color:var(--theme-accent);font-weight:700;display:block;margin-bottom:0.3rem;">¿Cuándo recoge?</label><div style="display:flex;gap:0.5rem;"><button type="button" id="manual-tkout-here" style="flex:1;padding:0.55rem;border-radius:10px;border:1px solid var(--glass-border);background:transparent;color:var(--text-dim);cursor:pointer;font-weight:700;font-size:0.82rem;">Estoy aquí</button><button type="button" id="manual-tkout-later" style="flex:1;padding:0.55rem;border-radius:10px;border:1px solid var(--glass-border);background:transparent;color:var(--text-dim);cursor:pointer;font-weight:700;font-size:0.82rem;">Paso por ella</button></div><input type="hidden" id="manual-takeout-val" value="">`;
                document.getElementById('manual-tkout-here').addEventListener('click', function(){ selectTakeout(this, 'Estoy aquí'); });
                document.getElementById('manual-tkout-later').addEventListener('click', function(){ selectTakeout(this, 'Paso por ella'); });
            } else if (selectedDelivery === 'delivery') {
                deliveryDetailEl.innerHTML = `<label style="font-size:0.75rem;color:var(--theme-accent);font-weight:700;display:block;margin-bottom:0.3rem;">Dirección (máx. 30 caracteres)</label><input type="text" id="manual-address-inp" maxlength="30" placeholder="Ej: Calle 10 #5-23" style="width:100%;padding:0.65rem 0.9rem;border-radius:10px;border:1px solid var(--glass-border);background:rgba(255,255,255,0.05);color:inherit;font-size:0.85rem;box-sizing:border-box;"><p style="font-size:0.72rem;color:var(--text-dim);margin-top:0.4rem;font-weight:600;">+ Costo domicilio: <span style="color:var(--theme-accent);">$${(state.config.deliveryFee||0).toLocaleString('es-CO')}</span></p>`;
            }

            updateManualCart();
        });
    });

    function selectTakeout(btn, val) {
        document.querySelectorAll('#manual-tkout-here, #manual-tkout-later').forEach(b => {
            b.style.background = 'transparent';
            b.style.borderColor = 'var(--glass-border)';
            b.style.color = 'var(--text-dim)';
        });
        btn.style.background = 'rgba(247,147,30,0.15)';
        btn.style.borderColor = 'var(--theme-accent)';
        btn.style.color = '#fff';
        document.getElementById('manual-takeout-val').value = val;
    }

    // --- Confirm ---
    btnConfirm.addEventListener('click', () => {
        if (manualCart.length === 0) { showToast('Agrega al menos un producto', 'error'); return; }
        if (!selectedDelivery) { showToast('Selecciona cómo recibirá el pedido', 'error'); return; }

        let address = '';
        if (selectedDelivery === 'dine-in') {
            address = (document.getElementById('manual-table-val') || {}).value || '';
            if (!address) { showToast('Selecciona el número de mesa', 'error'); return; }
        } else if (selectedDelivery === 'takeout') {
            address = (document.getElementById('manual-takeout-val') || {}).value || '';
            if (!address) { showToast('Selecciona cuándo recoge el pedido', 'error'); return; }
        } else if (selectedDelivery === 'delivery') {
            address = (document.getElementById('manual-address-inp') || {}).value || '';
            if (!address) { showToast('Ingresa la dirección de entrega', 'error'); return; }
        }

        const name    = document.getElementById('manual-cust-name').value.trim() || 'Presencial';
        const phone   = document.getElementById('manual-cust-phone').value.trim() || '---';
        const payment = document.getElementById('manual-cust-payment').value;
        const note    = document.getElementById('manual-cust-note').value.trim();

        if (!payment) { showToast('Selecciona el método de pago', 'error'); return; }

        const baseTotal = manualCart.reduce((s, i) => s + i.price * i.qty, 0);
        const delFee = selectedDelivery === 'delivery' ? (state.config.deliveryFee || 0) : 0;

        let orderCounter = parseInt(localStorage.getItem('streetfeed_order_counter') || '0');
        orderCounter++;
        localStorage.setItem('streetfeed_order_counter', orderCounter.toString());

        const getAttendedByInfo = (isManual = false) => {
            try {
                const empStr = localStorage.getItem('streetfeed_employee_user');
                if (empStr) {
                    const emp = JSON.parse(empStr);
                        const rMap = { 'mesero': 'Mesero', 'cajero': 'Cajero', 'cocina': 'Cocina', 'domiciliario': 'Domiciliario', 'owner': 'Propietario', 'propietario': 'Propietario', 'admin': 'Administrador' };
                        const roleTitle = rMap[emp.role] || 'Colaborador';
                        return `${formatShortName(emp.name)} (${roleTitle})`;
                }
            } catch(e) {}
            if (localStorage.getItem('streetfeed_isLoggedIn') === 'true') {
                return 'Propietario / Administrador';
            }
            return isManual ? 'Propietario / Administrador' : 'Cliente (Menú Digital)';
        };

        const orderData = {
            id: 'ORD-' + orderCounter,
            date: new Date().toISOString(),
            items: manualCart.map(i => ({ ...i, extras: [] })),
            baseTotal: baseTotal,
            deliveryFee: delFee,
            total: baseTotal + delFee,
            isManual: true,
            attendedBy: getAttendedByInfo(true),
            status: 'confirmed',   // Va directo a Pendientes (Preparación)
            customer: {
                name, phone, address,
                deliveryType: selectedDelivery,
                payment: payment || 'No especificado',
                note: note || ''
            }
        };

        const orders = JSON.parse(localStorage.getItem('streetfeed_orders') || '[]');
        orders.push(orderData);
        state.orders = orders;
        localStorage.setItem('streetfeed_orders', JSON.stringify(orders));

        // Switch to Pendientes and refresh
        const pendingBtn = document.querySelector('.sub-tab-btn[data-subtab="pending"]');
        if (pendingBtn) pendingBtn.click();

        closeManualModal();
        if (typeof window.renderOrders === 'function') window.renderOrders();
        if (typeof renderStats === 'function') renderStats();
        showToast('✅ Pedido manual creado y agregado a En Preparación');
        if (typeof window.printThermalTicket === 'function') {
            setTimeout(() => window.printThermalTicket(orderData.id), 200);
        }
    });
})();

// =============================================
// LIBRETITA DE GASTOS - LOGIC & PERSISTENCE
// =============================================
window.checkExpensesLockState = function() {
    const configuredPass = state.auth.expensePass || '';
    if (configuredPass === '') {
        sessionStorage.setItem('streetfeed_expenses_unlocked', 'true');
    }

    const isUnlocked = sessionStorage.getItem('streetfeed_expenses_unlocked') === 'true';
    const lockscreen = document.getElementById('expenses-lockscreen');
    const content = document.getElementById('expenses-ledger-content');
    
    if (isUnlocked) {
        if (lockscreen) lockscreen.classList.add('hidden');
        if (content) content.classList.remove('hidden');
        renderExpenses();
    } else {
        if (lockscreen) lockscreen.classList.remove('hidden');
        if (content) content.classList.add('hidden');
        const passInp = document.getElementById('expenses-pass-input');
        if (passInp) {
            passInp.value = '';
            passInp.focus();
        }
    }
};

window.verifyExpensesPassword = function() {
    const passInp = document.getElementById('expenses-pass-input');
    if (!passInp) return;
    const password = passInp.value.trim();
    const configuredPass = state.auth.expensePass || '';
    
    if (configuredPass === '') {
        sessionStorage.setItem('streetfeed_expenses_unlocked', 'true');
        checkExpensesLockState();
        return;
    }
    
    if (password === configuredPass) {
        sessionStorage.setItem('streetfeed_expenses_unlocked', 'true');
        showToast('¡Acceso autorizado con éxito!', 'success');
        checkExpensesLockState();
    } else {
        showToast('Contraseña incorrecta. Inténtalo de nuevo.', 'error');
        passInp.value = '';
        passInp.focus();
    }
};

// Listener para desbloquear con tecla Enter en el lockscreen
document.addEventListener('DOMContentLoaded', () => {
    const passInp = document.getElementById('expenses-pass-input');
    if (passInp) {
        passInp.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                verifyExpensesPassword();
            }
        });
    }
});

window.formatCurrencyInput = function(input) {
    let value = input.value.replace(/\D/g, "");
    if (value === "") { input.value = ""; return; }
    value = parseInt(value);
    input.value = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
};

window.toggleNewExpenseModal = function() {
    const modal = document.getElementById('newExpenseModal');
    if (modal) {
        const isShowing = modal.style.display === 'flex';
        modal.style.display = isShowing ? 'none' : 'flex';
        modal.classList.toggle('hidden', isShowing);
        if (!isShowing) {
            document.getElementById('expense-desc').value = '';
            document.getElementById('expense-amount').value = '';
            document.getElementById('expense-date').value = new Date().toLocaleDateString('sv-SE');
            document.getElementById('expense-category').value = 'Ingredientes';
        }
    }
};

window.saveNewExpense = async function() {
    const desc = document.getElementById('expense-desc').value.trim();
    const amountStr = document.getElementById('expense-amount').value.trim();
    const date = document.getElementById('expense-date').value;
    const cat = document.getElementById('expense-category').value;

    const amount = parseInt(amountStr.replace(/\D/g, '')) || 0;

    if (!desc || amount <= 0 || !date) {
        showToast('Completa todos los campos con valores válidos.', 'error');
        return;
    }

    let expenses = JSON.parse(localStorage.getItem('streetfeed_expenses')) || [];
    expenses.unshift({
        id: Date.now(),
        desc,
        amount,
        date,
        cat
    });

    localStorage.setItem('streetfeed_expenses', JSON.stringify(expenses));

    // Persistencia simulada en Firestore (gastos_comida_v2) similar a firebase_app.js
    localStorage.setItem('_local_list_gastos_comida_v2', JSON.stringify(expenses));
    if (window.saveListToCloud) {
        await window.saveListToCloud('gastos_comida_v2', expenses);
    }

    showToast('¡Gasto registrado con éxito!', 'success');
    window.toggleNewExpenseModal();
    renderExpenses();
};

window.renderExpenses = function() {
    const container = document.getElementById('expenses-list-container');
    if (!container) return;

    const expenses = JSON.parse(localStorage.getItem('streetfeed_expenses')) || [];
    const searchQuery = document.getElementById('expense-search-input').value.toLowerCase();
    const monthFilter = document.getElementById('expense-month-filter').value;

    const filtered = expenses.filter(e => {
        const matchSearch = e.desc.toLowerCase().includes(searchQuery) || e.cat.toLowerCase().includes(searchQuery);
        const expDate = new Date(e.date + 'T00:00:00');
        const matchMonth = monthFilter === 'all' || expDate.getMonth().toString() === monthFilter;
        return matchSearch && matchMonth;
    });

    const now = new Date();
    const curM = now.getMonth();
    const curY = now.getFullYear();
    let totalM = 0;
    const catTotals = {};

    expenses.forEach(e => {
        const d = new Date(e.date + 'T00:00:00');
        if (d.getMonth() === curM && d.getFullYear() === curY) {
            totalM += e.amount;
        }
        catTotals[e.cat] = (catTotals[e.cat] || 0) + e.amount;
    });

    const fmt = (num) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
    document.getElementById('expense-total-month').innerText = fmt(totalM);

    let topC = 'Ninguna';
    let maxV = 0;
    for (const c in catTotals) {
        if (catTotals[c] > maxV) {
            maxV = catTotals[c];
            topC = c;
        }
    }
    document.getElementById('expense-top-category').innerText = topC;
    document.getElementById('expense-last-date').innerText = expenses.length > 0 ? expenses[0].date : '--';

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:50px; color:var(--text-dim); border:2px dashed var(--glass-border); border-radius:20px;">
                <i data-lucide="receipt-text" style="width:48px; height:48px; margin-bottom:15px; opacity:0.3; stroke: var(--theme-accent);"></i>
                <br>No se encontraron registros de gastos.
            </div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }

    container.innerHTML = filtered.map(e => `
        <div class="chart-card glass" style="padding:15px 20px; display:flex; align-items:center; justify-content:space-between; gap:15px; border-left:4px solid var(--theme-accent); margin-bottom:0px;">
            <div style="display:flex; align-items:center; gap:15px;">
                <div style="background:rgba(255, 107, 0, 0.1); width:45px; height:45px; border-radius:12px; display:flex; align-items:center; justify-content:center; color:var(--theme-accent); font-size:1.2rem;">
                    <i data-lucide="${getExpenseIcon(e.cat)}"></i>
                </div>
                <div>
                    <h4 style="margin:0; font-size:1rem; color:#fff;">${e.desc}</h4>
                    <small style="color:var(--text-dim);">${e.cat} • <i data-lucide="calendar" style="width:12px; display:inline-block; vertical-align:middle;"></i> ${e.date}</small>
                </div>
            </div>
            <div style="text-align:right; display:flex; align-items:center; gap:20px;">
                <div style="font-size:1.15rem; font-weight:800; color:var(--theme-accent);">${fmt(e.amount)}</div>
                <button onclick="deleteExpense(${e.id})" style="background:rgba(239, 68, 68, 0.12); border:1px solid rgba(239, 68, 68, 0.25); color:#ef4444; width:36px; height:36px; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition: all 0.3s;" title="Eliminar registro">
                    <i data-lucide="trash-2" style="width: 16px;"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    if (window.lucide) lucide.createIcons();
};

function getExpenseIcon(cat) {
    const icons = {
        'Ingredientes': 'shopping-basket',
        'Bebidas': 'wine',
        'Renta': 'home',
        'Servicios': 'zap',
        'Salarios': 'users',
        'Marketing': 'megaphone',
        'Mantenimiento': 'wrench',
        'Otros': 'circle-ellipsis'
    };
    return icons[cat] || 'receipt';
}

window.deleteExpense = function(id) {
    const doDelete = () => {
        let expenses = JSON.parse(localStorage.getItem('streetfeed_expenses')) || [];
        expenses = expenses.filter(e => e.id !== id);
        
        localStorage.setItem('streetfeed_expenses', JSON.stringify(expenses));
        localStorage.setItem('_local_list_gastos_comida_v2', JSON.stringify(expenses));
        if (window.saveListToCloud) window.saveListToCloud('gastos_comida_v2', expenses);
        
        showToast('Registro de gasto eliminado.', 'success');
        renderExpenses();
    };

    if (typeof showConfirm === 'function') {
        showConfirm('¿Estás seguro de eliminar este registro de gasto?', doDelete, 'Eliminar', '#ef4444', 'Eliminar Gasto');
    } else if (confirm('¿Estás seguro de eliminar este registro de gasto?')) {
        doDelete();
    }
};

window.exportExpensesToExcel = function() {
    const expenses = JSON.parse(localStorage.getItem('streetfeed_expenses')) || [];
    if (expenses.length === 0) return showToast('No hay datos para exportar.', 'error');

    const businessName = "StreetFeed Comida";
    const reportDate = new Date().toLocaleDateString();
    
    let total = 0;
    let rowsHtml = "";
    expenses.forEach((e, index) => {
        total += e.amount;
        const rowBg = index % 2 === 0 ? '#ffffff' : '#fcfcfa';
        rowsHtml += `
            <tr style="background-color: ${rowBg};">
                <td style="border:1px solid #eeeeee; padding:12px; color:#444;">${e.date}</td>
                <td style="border:1px solid #eeeeee; padding:12px; color:#444;">${e.cat}</td>
                <td style="border:1px solid #eeeeee; padding:12px; color:#444;">${e.desc}</td>
                <td style="border:1px solid #eeeeee; padding:12px; text-align:right; font-weight:bold; color:#1a1a1a;">$ ${e.amount.toLocaleString()}</td>
            </tr>`;
    });

    const tableHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="UTF-8">
            <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Reporte de Gastos</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        </head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px;">
            <table style="width:100%; margin-bottom: 20px;">
                <tr>
                    <td colspan="2" style="text-align: left; font-size: 24px; font-weight: bold; color: #ff6b00; padding-top: 20px;">REPORTE DE GASTOS STREETFEED</td>
                    <td colspan="2" style="text-align: center; font-size: 24px; font-weight: bold; color: #000000; padding-top: 20px;">${businessName}</td>
                </tr>
                <tr>
                    <td colspan="4" style="text-align: left; color: #666; font-size: 14px; padding-bottom: 20px;">Generado el: ${reportDate}</td>
                </tr>
            </table>

            <table style="border-collapse: collapse; width: 100%; border: 1px solid #dddddd;">
                <thead>
                    <tr style="background-color: #ff6b00; color: #ffffff;">
                        <th style="padding:15px; text-align:left; border:1px solid #ff6b00;">FECHA</th>
                        <th style="padding:15px; text-align:left; border:1px solid #ff6b00;">CATEGORÍA</th>
                        <th style="padding:15px; text-align:left; border:1px solid #ff6b00;">DESCRIPCIÓN</th>
                        <th style="padding:15px; text-align:right; border:1px solid #ff6b00;">MONTO (COP)</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
                <tfoot>
                    <tr style="background-color: #f7931e; color: #ffffff; font-weight: bold;">
                        <td colspan="3" style="padding:15px; border: 1px solid #f7931e; text-align: right;">GASTO TOTAL PROYECTADO:</td>
                        <td style="padding:15px; border: 1px solid #f7931e; text-align: right;">$ ${total.toLocaleString()}</td>
                    </tr>
                </tfoot>
            </table>
        </body>
        </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_Gastos_StreetFeed_${reportDate.replace(/\//g, '-')}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Reporte Excel descargado con éxito.', 'success');
};

window.insertTag = function(textareaId, tag) {
    const el = document.getElementById(textareaId);
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    el.value = text.substring(0, start) + tag + text.substring(end);
    el.focus({ preventScroll: true });
    el.selectionStart = el.selectionEnd = start + tag.length;
};

window.resetStreetFeedWATemplate = function() {
    const el = document.getElementById('conf-wa-template');
    if (el) {
        el.value = `{emojis_inicio} *NUEVO PEDIDO - {negocio}* {emojis_fin}
--------------------------
👤 *CLIENTE:* {cliente}
📞 *TELÉFONO:* {telefono}
🚚 *ENTREGA:* {entrega}
📍 {detalles_entrega}
💵 *PAGO:* {pago}
📝 *NOTA:* {nota}
--------------------------

🛒 *RESUMEN DEL PEDIDO:*
{resumen_pedido}

--------------------------
{precios}
💵 *TOTAL A PAGAR: {total}*
--------------------------

🚀 _Enviado desde el Menú Digital_`;
        if (typeof state !== 'undefined' && state.config) {
            state.config.waTemplateOrder = el.value;
        }
        showToast("Plantilla restablecida por defecto.");
    }
};


window.initializeCustomAdminSelect = function(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel || sel.dataset.customSelectInit) return;
    sel.dataset.customSelectInit = '1';
    sel.style.display = 'none';

    const wrap = document.createElement('div');
    wrap.className = 'admin-custom-select-wrap';

    const trigger = document.createElement('div');
    trigger.className = 'admin-custom-select-trigger';

    const label = document.createElement('span');
    label.className = 'admin-custom-select-label';
    trigger.appendChild(label);

    const chevron = document.createElement('span');
    chevron.className = 'admin-custom-select-chevron';
    chevron.innerHTML = `<i data-lucide="chevron-down" style="width:14px;height:14px;color:var(--text-dim, #94a3b8);transition:transform 0.2s;display:block;"></i>`;
    trigger.appendChild(chevron);

    const panel = document.createElement('div');
    panel.className = 'admin-custom-select-panel';

    const options = Array.from(sel.options);
    options.forEach(opt => {
        const item = document.createElement('div');
        item.className = 'admin-custom-select-item';
        item.textContent = opt.text;
        item.dataset.value = opt.value;
        if (opt.selected) {
            item.classList.add('selected');
            label.textContent = opt.text;
        }

        item.addEventListener('click', (e) => {
            e.stopPropagation();
            sel.value = opt.value;
            
            wrap.querySelectorAll('.admin-custom-select-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            label.textContent = opt.text;
            
            panel.style.display = 'none';
            const iconSvg = chevron.querySelector('svg');
            if (iconSvg) iconSvg.style.transform = 'rotate(0deg)';
            
            sel.dispatchEvent(new Event('change'));
        });

        panel.appendChild(item);
    });

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = panel.style.display === 'block';
        document.querySelectorAll('.admin-custom-select-panel').forEach(p => {
            if (p !== panel) {
                p.style.display = 'none';
                const parentChevron = p.parentNode.querySelector('.admin-custom-select-chevron svg');
                if (parentChevron) parentChevron.style.transform = 'rotate(0deg)';
            }
        });

        if (isOpen) {
            panel.style.display = 'none';
            const iconSvg = chevron.querySelector('svg');
            if (iconSvg) iconSvg.style.transform = 'rotate(0deg)';
        } else {
            panel.style.display = 'block';
            const iconSvg = chevron.querySelector('svg');
            if (iconSvg) iconSvg.style.transform = 'rotate(180deg)';
        }
    });

    document.addEventListener('click', () => {
        panel.style.display = 'none';
        const iconSvg = chevron.querySelector('svg');
        if (iconSvg) iconSvg.style.transform = 'rotate(0deg)';
    });

    // Sincronizar cambios programáticos del valor del select con el trigger personalizado
    sel.addEventListener('change', () => {
        const selectedOpt = Array.from(sel.options).find(o => o.value === sel.value);
        if (selectedOpt) {
            label.textContent = selectedOpt.text;
            wrap.querySelectorAll('.admin-custom-select-item').forEach(el => {
                el.classList.toggle('selected', el.dataset.value === sel.value);
            });
        }
    });

    wrap.appendChild(trigger);
    wrap.appendChild(panel);
    sel.parentNode.insertBefore(wrap, sel.nextSibling);

    if (window.lucide) {
        window.lucide.createIcons({ node: wrap });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (!window.location.pathname.endsWith('admin.html')) return;

    // Convertir los selectores nativos de gastos y personal a selectores modernizados
    if (typeof window.initializeCustomAdminSelect === 'function') {
        window.initializeCustomAdminSelect('expense-month-filter');
        window.initializeCustomAdminSelect('expense-category');
        window.initializeCustomAdminSelect('stats-month-filter');
        window.initializeCustomAdminSelect('emp-role');
        window.initializeCustomAdminSelect('emp-gender');
    }

    const waTemplateForm = document.getElementById('wa-template-form');
    if (waTemplateForm) {
        waTemplateForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const waTemplateEl = document.getElementById('conf-wa-template');
            if (waTemplateEl) {
                state.config.waTemplateOrder = waTemplateEl.value;
                saveStateToLocal();
                if (typeof updateUIFromConfig === 'function') updateUIFromConfig();
                showToast("Plantilla de WhatsApp guardada ✅");
                const modal = document.getElementById('order-settings-modal');
                if (modal) modal.classList.add('hidden');
            }
        });
    }

    // Inicializar listener de pestaña empleados y validación en tiempo real
    const navEmpBtn = document.getElementById('nav-btn-employees');
    if (navEmpBtn) {
        navEmpBtn.addEventListener('click', () => {
            loadEmployees();
        });
    }

    const empUsernameInput = document.getElementById('emp-username');
    const empPinInput = document.getElementById('emp-pin');
    if (empUsernameInput) {
        empUsernameInput.addEventListener('input', checkUsernameAvailability);
    }
    if (empPinInput) {
        empPinInput.addEventListener('input', checkPinAvailability);
    }

    try {
        const savedEmpRaw = localStorage.getItem('streetfeed_employee_user');
        if (savedEmpRaw) {
            const savedEmp = JSON.parse(savedEmpRaw);
            if (savedEmp && savedEmp.role) {
                applyRolePermissions(savedEmp.role, savedEmp.name);
            } else {
                applyRolePermissions('owner', 'Propietario');
            }
        } else {
            applyRolePermissions('owner', 'Propietario');
        }
    } catch (e) {
        applyRolePermissions('owner', 'Propietario');
    }
});

/* =========================================
   GUEST & EMPLOYEE ROLES SYSTEM (RBAC)
   ========================================= */


let currentEmployeeRole = 'admin'; // 'admin', 'mesero', 'cajero', 'cocina'
let employeesList = [];

// Helper para formatear nombre a Nombre + Primer Apellido (Máx 2 palabras)
function formatShortName(fullName) {
    if (!fullName || typeof fullName !== 'string') return '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 2) return fullName.trim();
    return `${parts[0]} ${parts[1]}`;
}
window.formatShortName = formatShortName;

// Helper para obtener únicamente el primer nombre
function formatFirstName(fullName) {
    if (!fullName || typeof fullName !== 'string') return '';
    const parts = fullName.trim().split(/\s+/);
    return parts[0] || '';
}
window.formatFirstName = formatFirstName;

// Función utilitaria para escapar HTML y evitar XSS
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}



// Helper para obtener instanceId de la URL
function getInstanceId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('instanceId') || '';
}

// Cargar empleados desde el servidor
async function loadEmployees() {
    const tbody = document.getElementById('employees-table-body');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-dim);">Cargando colaboradores...</td></tr>`;
    }
    try {
        const instanceId = getInstanceId();
        const token = localStorage.getItem('streetfeed_employee_token') || sessionStorage.getItem('clientSession');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const params = new URLSearchParams();
        if (instanceId) params.append('instanceId', instanceId);

        const res = await fetch(`/api/modules/streetfeed/employees?${params.toString()}`, { headers });
        if (res.ok) {
            const data = await res.json();
            const metaStr = localStorage.getItem('streetfeed_employees_meta') || '{}';
            let metaObj = {};
            try { metaObj = JSON.parse(metaStr); } catch (e) {}

            employeesList = (data.employees || []).map(emp => {
                const meta = metaObj[emp.id] || metaObj[emp.username] || metaObj[(emp.name || '').toLowerCase()] || {};
                return {
                    ...emp,
                    avatarUrl: emp.avatarUrl || emp.avatar || emp.avatar_url || meta.avatarUrl || '',
                    commissionRate: (emp.commissionRate !== undefined && emp.commissionRate !== '') ? emp.commissionRate : (meta.commissionRate !== undefined ? meta.commissionRate : 10),
                    gender: emp.gender || meta.gender || '',
                    age: emp.age || meta.age || '',
                    phone: emp.phone || meta.phone || '',
                    address: emp.address || meta.address || '',
                    neighborhood: emp.neighborhood || meta.neighborhood || ''
                };
            });
            renderEmployeesTable();
        } else {
            const err = await res.json().catch(() => ({}));
            console.error('Error del servidor al cargar empleados:', err);
            if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#ef4444;">Error al cargar personal: ${err.error || res.status}</td></tr>`;
        }
    } catch (err) {
        console.error('Error cargando empleados:', err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#ef4444;">Error de conexión al cargar personal.</td></tr>`;
    }
}

// Employee view state
window._empView = localStorage.getItem('sf_emp_view') || 'grid';

window.setEmployeeView = function(view) {
    window._empView = view;
    localStorage.setItem('sf_emp_view', view);
    const gridBtn = document.getElementById('emp-view-grid-btn');
    const tableBtn = document.getElementById('emp-view-table-btn');
    const gridEl = document.getElementById('employees-grid');
    const tableEl = document.getElementById('employees-table-wrapper');
    if (!gridEl || !tableEl) return;
    if (view === 'grid') {
        gridEl.style.display = 'grid';
        tableEl.style.display = 'none';
        if (gridBtn) { gridBtn.style.background = 'var(--theme-accent)'; gridBtn.style.color = '#fff'; }
        if (tableBtn) { tableBtn.style.background = 'transparent'; tableBtn.style.color = 'var(--text-dim)'; }
    } else {
        gridEl.style.display = 'none';
        tableEl.style.display = 'block';
        if (tableBtn) { tableBtn.style.background = 'var(--theme-accent)'; tableBtn.style.color = '#fff'; }
        if (gridBtn) { gridBtn.style.background = 'transparent'; gridBtn.style.color = 'var(--text-dim)'; }
    }
    if (window.lucide) lucide.createIcons();
};

function getEmployeeStats(empName, filter = {}) {
    const orders = JSON.parse(localStorage.getItem('streetfeed_orders') || '[]');
    const cleanEmpName = (empName || '').toLowerCase().trim();

    let empOrders = orders.filter(o => {
        const attended = (o.attendedBy || '').toLowerCase().trim();
        if (!attended) return false;
        return attended.includes(cleanEmpName) || cleanEmpName.includes(attended);
    });

    const now = new Date();
    const getLocalStr = (dObj) => {
        const d = new Date(dObj);
        if (isNaN(d.getTime())) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    if (filter.specificDate) {
        empOrders = empOrders.filter(o => {
            if (!o.date) return false;
            return getLocalStr(o.date) === filter.specificDate;
        });
    } else if (filter.month !== undefined && filter.month !== null && filter.month !== '') {
        const targetMonth = parseInt(filter.month, 10);
        empOrders = empOrders.filter(o => {
            if (!o.date) return false;
            const d = new Date(o.date);
            if (isNaN(d.getTime())) return false;
            return d.getMonth() === targetMonth;
        });
    } else if (filter.preset && filter.preset !== 'all') {
        if (filter.preset === 'today') {
            const todayStr = getLocalStr(now);
            empOrders = empOrders.filter(o => {
                if (!o.date) return false;
                return getLocalStr(o.date) === todayStr;
            });
        } else if (filter.preset === 'yesterday') {
            const yest = new Date(now);
            yest.setDate(now.getDate() - 1);
            const yestStr = getLocalStr(yest);
            empOrders = empOrders.filter(o => {
                if (!o.date) return false;
                return getLocalStr(o.date) === yestStr;
            });
        } else if (filter.preset === 'week') {
            const startOfRange = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            startOfRange.setDate(startOfRange.getDate() - 6);
            startOfRange.setHours(0, 0, 0, 0);
            empOrders = empOrders.filter(o => {
                if (!o.date) return false;
                const d = new Date(o.date);
                if (isNaN(d.getTime())) return false;
                return d >= startOfRange;
            });
        } else if (filter.preset === 'fortnight') {
            const startOfRange = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            startOfRange.setDate(startOfRange.getDate() - 14);
            startOfRange.setHours(0, 0, 0, 0);
            empOrders = empOrders.filter(o => {
                if (!o.date) return false;
                const d = new Date(o.date);
                if (isNaN(d.getTime())) return false;
                return d >= startOfRange;
            });
        } else if (filter.preset === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            empOrders = empOrders.filter(o => {
                if (!o.date) return false;
                const d = new Date(o.date);
                if (isNaN(d.getTime())) return false;
                return d >= startOfMonth;
            });
        }
    }

    const empObj = (employeesList || []).find(e => e.name && e.name.toLowerCase() === empName.toLowerCase());
    const commRate = (empObj && empObj.commissionRate !== undefined && empObj.commissionRate !== '') ? parseFloat(empObj.commissionRate) : 10;

    const acceptedOrders = empOrders.filter(o => o.status === 'accepted');
    const totalSales = acceptedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const avgTicket = acceptedOrders.length > 0 ? Math.round(totalSales / acceptedOrders.length) : 0;
    const commission = Math.round(totalSales * (commRate / 100));

    let lastActivityStr = 'Sin actividad reciente';
    if (empOrders.length > 0) {
        const sorted = empOrders.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
        const lastDate = new Date(sorted[0].date);
        if (!isNaN(lastDate.getTime())) {
            lastActivityStr = lastDate.toLocaleString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
    }

    return {
        totalOrders: empOrders.length,
        acceptedOrders: acceptedOrders.length,
        totalSales,
        avgTicket,
        commission,
        commissionRate: commRate,
        lastActivityStr,
        recentOrders: empOrders.slice().reverse()
    };
}

function renderEmployeesTable() {
    const tbody = document.getElementById('employees-table-body');

    let adminCount = 0, meseroCount = 0, cajeroCount = 0, cocinaCount = 0;

    (employeesList || []).forEach(emp => {
        if (emp.role === 'admin') adminCount++;
        else if (emp.role === 'mesero') meseroCount++;
        else if (emp.role === 'cajero') cajeroCount++;
        else if (emp.role === 'cocina') cocinaCount++;
    });

    if (document.getElementById('count-role-admin')) document.getElementById('count-role-admin').textContent = adminCount;
    if (document.getElementById('count-role-mesero')) document.getElementById('count-role-mesero').textContent = meseroCount;
    if (document.getElementById('count-role-cajero')) document.getElementById('count-role-cajero').textContent = cajeroCount;
    if (document.getElementById('count-role-cocina')) document.getElementById('count-role-cocina').textContent = cocinaCount;

    const query = (document.getElementById('emp-search-input')?.value || '').toLowerCase().trim();
    const roleFilter = window._empRoleFilter || 'all';

    let filtered = (employeesList || []).filter(emp => {
        if (roleFilter !== 'all' && emp.role !== roleFilter) return false;
        if (query) {
            const matchName = emp.name.toLowerCase().includes(query);
            const matchUser = (emp.username || '').toLowerCase().includes(query);
            const matchPin = (emp.pin || '').includes(query);
            return matchName || matchUser || matchPin;
        }
        return true;
    });

    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-dim);">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                        <i data-lucide="users" style="width: 32px; height: 32px; opacity: 0.4;"></i>
                        <span>No se encontraron colaboradores que coincidan con la búsqueda.</span>
                    </div>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = filtered.map(emp => {
            let roleBadge = '';
            if (emp.role === 'owner' || emp.role === 'propietario') roleBadge = '<span style="background: rgba(245,158,11,0.18); color: #d97706; padding: 4px 10px; border-radius: 8px; font-weight: 700; font-size: 0.75rem;">Propietario</span>';
            else if (emp.role === 'admin') roleBadge = '<span style="background: rgba(99,102,241,0.18); color: #4f46e5; padding: 4px 10px; border-radius: 8px; font-weight: 700; font-size: 0.75rem;">Administrador</span>';
            else if (emp.role === 'mesero') roleBadge = '<span style="background: rgba(37,99,235,0.18); color: #2563eb; padding: 4px 10px; border-radius: 8px; font-weight: 700; font-size: 0.75rem;">Mesero / Pedidos</span>';
            else if (emp.role === 'cajero') roleBadge = '<span style="background: rgba(16,185,129,0.18); color: #059669; padding: 4px 10px; border-radius: 8px; font-weight: 700; font-size: 0.75rem;">Cajero / Cierre</span>';
            else if (emp.role === 'cocina') roleBadge = '<span style="background: rgba(217,119,6,0.18); color: #d97706; padding: 4px 10px; border-radius: 8px; font-weight: 700; font-size: 0.75rem;">Cocina / Comandas</span>';
            else if (emp.role === 'domiciliario') roleBadge = '<span style="background: rgba(16,185,129,0.18); color: #059669; padding: 4px 10px; border-radius: 8px; font-weight: 700; font-size: 0.75rem;">🛵 Domiciliario</span>';

            const statusBadge = emp.status === 'active'
                ? '<span style="color:#059669; font-weight:700; font-size:0.8rem;">● Activo</span>'
                : '<span style="color:#dc2626; font-weight:700; font-size:0.8rem;">● Inactivo</span>';

            const avatarImg = emp.avatarUrl
                ? `<img src="${emp.avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`
                : emp.name.charAt(0).toUpperCase();

            return `
                <tr style="border-bottom: 1px solid var(--glass-border);">
                    <td style="padding: 1rem; font-weight: 700; color: var(--text);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div onclick="viewEmployeeProfile('${emp.id}', true)" title="Ver Perfil Completo" style="width: 34px; height: 34px; border-radius: 50%; background: rgba(var(--text-rgb), 0.08); border: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: center; font-weight: 800; color: var(--theme-accent); overflow: hidden; cursor: pointer;">
                                ${avatarImg}
                            </div>
                            <span class="emp-name-btn" onclick="viewEmployeeProfile('${emp.id}', true)" title="Ver Perfil Completo">${escapeHtml(formatShortName(emp.name))}</span>
                        </div>
                    </td>
                    <td style="padding: 1rem; color: var(--text-dim); font-family: monospace;"><span style="opacity: 0.35; font-weight: 700;">@</span>${escapeHtml(emp.username ? emp.username.replace(/^@/, '') : '')}</td>
                    <td style="padding: 1rem; color: var(--text-dim); font-family: monospace;">${emp.pin ? '🔑 ' + '•'.repeat(String(emp.pin).length) : '—'}</td>
                    <td style="padding: 1rem;">${roleBadge}</td>
                    <td style="padding: 1rem;">${statusBadge}</td>
                    <td style="padding: 1rem; text-align: right;">
                        <div style="display: flex; gap: 8px; justify-content: flex-end;">
                            <button onclick="viewEmployeeProfile('${emp.id}', false)" class="emp-action-btn" title="Ver Detalles" style="background: rgba(var(--theme-accent-rgb,247,147,30),0.12); border-color: rgba(var(--theme-accent-rgb,247,147,30),0.3); color: var(--theme-accent);">
                                <i data-lucide="eye" style="width: 15px; height: 15px;"></i>
                            </button>
                            <button onclick="editEmployee('${emp.id}')" class="emp-action-btn" title="Editar">
                                <i data-lucide="edit-2" style="width: 15px; height: 15px;"></i>
                            </button>
                            <button onclick="confirmDeleteEmployee('${emp.id}', '${escapeHtml(emp.name)}')" class="emp-action-btn delete-btn" title="Eliminar">
                                <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderEmployeesGrid();
    if (window.setEmployeeView) setEmployeeView(window._empView || 'grid');

    if (window.lucide) lucide.createIcons();
}

window._empRoleFilter = 'all';

window.setEmployeeRoleFilter = function(role) {
    window._empRoleFilter = role;
    const pills = document.querySelectorAll('.emp-pill-filter');
    pills.forEach(p => {
        if (p.getAttribute('data-role') === role) {
            p.style.background = 'var(--theme-accent)';
            p.style.color = '#fff';
        } else {
            p.style.background = 'rgba(255,255,255,0.04)';
            p.style.color = 'var(--text-dim)';
        }
    });
    renderEmployeesGrid();
    renderEmployeesTable();
};

window.filterEmployeeList = function() {
    renderEmployeesGrid();
    renderEmployeesTable();
};

window.toggleEmployeeStatus = async function(empId) {
    const emp = employeesList.find(e => String(e.id) === String(empId));
    if (!emp) return;

    const newStatus = emp.status === 'active' ? 'inactive' : 'active';
    const instanceId = getInstanceId();
    const token = localStorage.getItem('streetfeed_employee_token') || sessionStorage.getItem('clientSession');
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    try {
        const res = await fetch(`/api/modules/streetfeed/employees/${empId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                instanceId,
                name: emp.name,
                username: emp.username,
                pin: emp.pin,
                role: emp.role,
                status: newStatus,
                gender: emp.gender || '',
                age: emp.age || '',
                phone: emp.phone || '',
                address: emp.address || '',
                neighborhood: emp.neighborhood || ''
            })
        });

        if (res.ok) {
            emp.status = newStatus;
            showToast(newStatus === 'active' ? `● ${emp.name} activado` : `● ${emp.name} desactivado`, 'success');
            renderEmployeesGrid();
            renderEmployeesTable();
        } else {
            showToast('Error al cambiar estado del colaborador', 'error');
        }
    } catch (err) {
        console.error('Error cambiando estado:', err);
        showToast('Error de conexión', 'error');
    }
};

window.openExportPdfModal = function() {
    const modal = document.getElementById('exportPdfModal');
    if (modal) {
        modal.style.display = 'flex';
        if (window.lucide) lucide.createIcons();
    }
};

window.closeExportPdfModal = function() {
    const modal = document.getElementById('exportPdfModal');
    if (modal) modal.style.display = 'none';
};

window.confirmExportStaffPdf = function() {
    closeExportPdfModal();
    const month = document.getElementById('pdf-export-month')?.value || 'all';
    const year = document.getElementById('pdf-export-year')?.value || '2026';
    exportStaffPerformancePDF(month, year);
};

window.exportStaffPerformancePDF = function(selectedMonth = 'all', selectedYear = '2026') {
    if (!employeesList || employeesList.length === 0) {
        showToast('No hay colaboradores para exportar', 'warning');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const nowStr = new Date().toLocaleString('es-CO');

        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const periodText = selectedMonth === 'all'
            ? `HISTÓRICO COMPLETO (${selectedYear})`
            : `MES: ${monthNames[parseInt(selectedMonth, 10)]?.toUpperCase()} ${selectedYear}`;

        // Header Banner
        doc.setFillColor(247, 147, 30);
        doc.rect(0, 0, 210, 24, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE RENDIMIENTO DE PERSONAL', 14, 15);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generado: ${nowStr}`, 145, 15);

        // Subtitle & Period
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.text(`PERÍODO: ${periodText}`, 14, 32);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Colaboradores: ${employeesList.length}`, 145, 32);

        // Table
        const headers = [['Colaborador', 'Usuario', 'Rol', 'PIN', 'Pedidos', 'Ventas Totales', 'Comisión (10%)', 'Estado']];
        const roleLabels = { admin: 'Admin', mesero: 'Mesero', cajero: 'Cajero', cocina: 'Cocina' };

        const body = employeesList.map(emp => {
            const stats = getEmployeeStats(emp.name, { month: selectedMonth === 'all' ? '' : selectedMonth });
            return [
                emp.name,
                '@' + (emp.username || '').replace(/^@/, ''),
                roleLabels[emp.role] || emp.role,
                emp.pin || '—',
                stats.totalOrders,
                '$' + stats.totalSales.toLocaleString('es-CO'),
                '$' + stats.commission.toLocaleString('es-CO'),
                emp.status === 'active' ? 'Activo' : 'Inactivo'
            ];
        });

        doc.autoTable({
            head: headers,
            body: body,
            startY: 38,
            theme: 'grid',
            headStyles: { fillStyle: 'F', fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            styles: { fontSize: 8.5, cellPadding: 3 }
        });

        const monthSlug = selectedMonth === 'all' ? 'Completo' : (monthNames[parseInt(selectedMonth, 10)] || 'Mes');
        doc.save(`Reporte_Personal_${monthSlug}_${selectedYear}.pdf`);
        showToast(`Reporte PDF (${periodText}) descargado exitosamente ✓`, 'success');
    } catch (err) {
        console.error('Error generando PDF:', err);
        showToast('Error generando reporte PDF', 'error');
    }
};

function renderEmployeesGrid() {
    const grid = document.getElementById('employees-grid');
    if (!grid) return;

    const roleConfig = {
        owner:   { label: 'Propietario',       color: '#d97706', bg: 'rgba(245,158,11,0.15)',   icon: 'crown' },
        admin:   { label: 'Administrador',     color: '#6366f1', bg: 'rgba(99,102,241,0.15)',   icon: 'crown' },
        mesero:        { label: 'Mesero / Pedidos',  color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',   icon: 'clipboard-list' },
        cajero:        { label: 'Cajero / Cierre',   color: '#10b981', bg: 'rgba(16,185,129,0.15)',   icon: 'calculator' },
        cocina:        { label: 'Cocina / Comandas', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',   icon: 'chef-hat' },
        domiciliario:  { label: '🛵 Domiciliario',   color: '#10b981', bg: 'rgba(16,185,129,0.15)',   icon: 'bike' }
    };

    if (!employeesList || employeesList.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 5rem 2rem; color: var(--text-dim);"><i data-lucide="users" style="width: 48px; height: 48px; opacity: 0.3; margin-bottom: 1rem; display: block; margin-left: auto; margin-right: auto;"></i><p style="font-size: 1.1rem;">Sin colaboradores aún. <br><small>Haz clic en "Nuevo Colaborador" para comenzar.</small></p></div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }

    const query = (document.getElementById('emp-search-input')?.value || '').toLowerCase().trim();
    const roleFilter = window._empRoleFilter || 'all';

    let filtered = employeesList.filter(emp => {
        if (roleFilter !== 'all' && emp.role !== roleFilter) return false;
        if (query) {
            const matchName = emp.name.toLowerCase().includes(query);
            const matchUser = (emp.username || '').toLowerCase().includes(query);
            const matchPin = (emp.pin || '').includes(query);
            return matchName || matchUser || matchPin;
        }
        return true;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: var(--text-dim);"><i data-lucide="search-x" style="width: 42px; height: 42px; opacity: 0.3; margin-bottom: 0.8rem; display: block; margin-left: auto; margin-right: auto;"></i><p style="font-size: 1rem; font-weight:600;">No se encontraron colaboradores que coincidan con la búsqueda.</p></div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }

    grid.innerHTML = filtered.map(emp => {
        const cfg = roleConfig[emp.role] || roleConfig.mesero;
        const isActive = emp.status === 'active';
        const initials = emp.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        const stats = getEmployeeStats(emp.name);
        const avatarContent = emp.avatarUrl
            ? `<img src="${emp.avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 16px;">`
            : initials;

        return `
        <div class="emp-profile-card" style="background: var(--surface-light); border: 1px solid var(--glass-border); border-radius: 24px; overflow: hidden; transition: all 0.3s cubic-bezier(0.4,0,0.2,1); box-shadow: var(--shadow); ${isActive ? '' : 'opacity: 0.65;'}">
            <!-- Card Top Bar -->
            <div style="height: 5px; background: linear-gradient(90deg, ${cfg.color}, ${cfg.color}88);"></div>

            <!-- Card Header -->
            <div style="padding: 1.5rem 1.5rem 1rem; display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;">
                <!-- Avatar + Info -->
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div onclick="viewEmployeeProfile('${emp.id}', true)" title="Ver Perfil Completo" style="width: 64px; height: 64px; border-radius: 18px; background: ${cfg.bg}; border: 2px solid ${cfg.color}44; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; font-weight: 900; color: ${cfg.color}; flex-shrink: 0; position: relative; overflow: visible; cursor: pointer;">
                        ${avatarContent}
                        <div style="position: absolute; bottom: -3px; right: -3px; width: 14px; height: 14px; border-radius: 50%; background: ${isActive ? '#4caf50' : '#ef4444'}; border: 2px solid var(--surface-light); z-index: 2;"></div>
                    </div>
                    <div>
                        <h4 class="emp-name-btn" onclick="viewEmployeeProfile('${emp.id}', true)" title="Ver Perfil Completo" style="margin: 0 0 0.2rem; font-size: 1.05rem; font-weight: 900; color: var(--text); line-height: 1.2;">${escapeHtml(formatShortName(emp.name))}</h4>
                        <p style="margin: 0 0 0.4rem; font-family: monospace; font-size: 0.78rem; color: var(--text-dim);"><span style="opacity:0.5;">@</span>${escapeHtml((emp.username || '').replace(/^@/, ''))}</p>
                        <span style="background: ${cfg.bg}; color: ${cfg.color}; padding: 3px 10px; border-radius: 6px; font-weight: 800; font-size: 0.7rem; letter-spacing: 0.3px;">${cfg.label}</span>
                    </div>
                </div>
                <!-- Status Toggle Button -->
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem; flex-shrink: 0;">
                    <button onclick="toggleEmployeeStatus('${emp.id}')" title="Clic para activar/desactivar" style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; font-weight: 700; color: ${isActive ? '#4caf50' : '#ef4444'}; background: ${isActive ? 'rgba(76,175,80,0.1)' : 'rgba(239,68,68,0.1)'}; padding: 4px 10px; border-radius: 20px; border: 1px solid ${isActive ? 'rgba(76,175,80,0.25)' : 'rgba(239,68,68,0.25)'}; white-space: nowrap; cursor: pointer; transition: all 0.2s;">
                        <div style="width: 6px; height: 6px; border-radius: 50%; background: ${isActive ? '#4caf50' : '#ef4444'};"></div>
                        ${isActive ? 'Activo' : 'Inactivo'}
                    </button>
                </div>
            </div>

            <!-- Última actividad indicator -->
            <div style="padding: 0 1.5rem 0.8rem; font-size: 0.72rem; color: var(--text-dim); display: flex; align-items: center; gap: 0.4rem;">
                <i data-lucide="clock" style="width: 12px; height: 12px; opacity: 0.6;"></i>
                <span>Última atención: <strong>${stats.lastActivityStr}</strong></span>
            </div>

            <!-- Divider -->
            <div style="height: 1px; background: var(--glass-border); margin: 0 1.5rem;"></div>

            <!-- KPIs Row -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0; padding: 0;">
                <div style="padding: 0.8rem 1rem; text-align: center; border-right: 1px solid var(--glass-border);">
                    <div style="font-size: 0.6rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 0.2rem;">${emp.role === 'domiciliario' ? 'Entregas' : 'Pedidos'}</div>
                    <div style="font-size: 1.3rem; font-weight: 900; color: var(--text);">${stats.totalOrders}</div>
                </div>
                <div style="padding: 0.8rem 1rem; text-align: center; border-right: 1px solid var(--glass-border);">
                    <div style="font-size: 0.6rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 0.2rem;">${emp.role === 'domiciliario' ? 'Cobrado' : 'Ventas'}</div>
                    <div style="font-size: 1rem; font-weight: 900; color: #4caf50;">$${stats.totalSales.toLocaleString('es-CO')}</div>
                </div>
                <div style="padding: 0.8rem 1rem; text-align: center;">
                    <div style="font-size: 0.6rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 0.2rem;">${emp.role === 'domiciliario' ? 'Domicilios' : `Comisión (${stats.commissionRate}%)`}</div>
                    <div style="font-size: 1rem; font-weight: 900; color: #ec4899;">$${stats.commission.toLocaleString('es-CO')}</div>
                </div>
            </div>

            <!-- Divider -->
            <div style="height: 1px; background: var(--glass-border);"></div>

            <!-- Actions Footer -->
            <div style="padding: 1rem 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 0.8rem;">
                <button onclick="viewEmployeeProfile('${emp.id}', false)" style="flex: 1; padding: 0.65rem 1rem; border-radius: 12px; border: 1px solid ${cfg.color}44; background: ${cfg.bg}; color: ${cfg.color}; font-weight: 800; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem; transition: all 0.2s;" title="Ver Detalles">
                    <i data-lucide="eye" style="width: 14px; height: 14px;"></i>
                    Ver Detalles
                </button>
                <button onclick="editEmployee('${emp.id}')" style="width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.04); color: var(--text-dim); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Editar">
                    <i data-lucide="edit-2" style="width: 15px; height: 15px;"></i>
                </button>
                <button onclick="confirmDeleteEmployee('${emp.id}', '${escapeHtml(emp.name)}')" style="width: 38px; height: 38px; border-radius: 10px; border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.06); color: #ef4444; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Eliminar">
                    <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
                </button>
            </div>
        </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

window._activeProfileEmpId = null;

window.onProfileDateChange = function() {
    window._activeEmpPresetValue = 'all';
    window._activeEmpMonthValue = '';
    const presetDisp = document.querySelector('#emp-current-preset');
    const monthDisp = document.querySelector('#emp-current-month');
    if (presetDisp) presetDisp.textContent = "Todo el tiempo";
    if (monthDisp) monthDisp.textContent = "Meses...";
    document.querySelectorAll('#emp-preset-dropdown li, #emp-month-dropdown li').forEach(li => li.classList.remove('active'));
    renderActiveProfileMetrics();
};

window.onProfilePresetChange = function() {
    renderActiveProfileMetrics();
};

window.onProfileMonthChange = function() {
    renderActiveProfileMetrics();
};

function renderActiveProfileMetrics() {
    const empId = window._activeProfileEmpId;
    if (!empId) return;
    const emp = employeesList.find(e => String(e.id) === String(empId));
    if (!emp) return;

    const dateEl = document.getElementById('emp-filter-date');

    const specificDate = dateEl ? dateEl.value : '';
    const preset = window._activeEmpPresetValue || 'all';
    const month = window._activeEmpMonthValue || '';

    const stats = getEmployeeStats(emp.name, { specificDate, preset, month });

    // KPIs
    const ordersEl = document.getElementById('emp-profile-orders');
    if (ordersEl) ordersEl.textContent = stats.totalOrders;
    const salesEl = document.getElementById('emp-profile-sales');
    if (salesEl) salesEl.textContent = '$' + stats.totalSales.toLocaleString('es-CO');
    const avgEl = document.getElementById('emp-profile-avg');
    if (avgEl) avgEl.textContent = '$' + stats.avgTicket.toLocaleString('es-CO');
    const commEl = document.getElementById('emp-profile-commission');
    if (commEl) commEl.textContent = '$' + stats.commission.toLocaleString('es-CO');

    // Recent orders
    const listEl = document.getElementById('emp-profile-orders-list');
    if (listEl) {
        if (stats.recentOrders.length === 0) {
            listEl.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-dim); font-size: 0.85rem; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px dashed var(--glass-border);">Sin pedidos registrados en este período.</div>`;
        } else {
            listEl.innerHTML = stats.recentOrders.map(o => {
                const statusColor = o.status === 'accepted' ? '#4caf50' : (o.status === 'cancelled' ? '#ef4444' : '#f59e0b');
                const statusLabel = o.status === 'accepted' ? 'Completado' : (o.status === 'cancelled' ? 'Cancelado' : 'En proceso');
                const time = new Date(o.date).toLocaleString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.9rem 1.1rem; background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 12px; gap: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.8rem;">
                        <div style="font-size: 0.7rem; font-weight: 800; color: var(--text-dim); font-family: monospace; background: rgba(255,255,255,0.05); padding: 2px 7px; border-radius: 5px; white-space: nowrap;">${o.id}</div>
                        <div>
                            <div style="font-size: 0.82rem; font-weight: 700; color: var(--text);">${o.customer?.name || 'Cliente'}</div>
                            <div style="font-size: 0.72rem; color: var(--text-dim);">${time}</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0;">
                        <span style="font-size: 0.9rem; font-weight: 900; color: var(--text);">$${(o.total || 0).toLocaleString('es-CO')}</span>
                        <span style="font-size: 0.65rem; font-weight: 800; color: ${statusColor}; background: ${statusColor}22; padding: 2px 8px; border-radius: 5px; text-transform: uppercase;">${statusLabel}</span>
                    </div>
                </div>
                `;
            }).join('');
        }
    }
}

window.viewEmployeeProfile = function(empId, showPersonalInfo = false) {
    const emp = employeesList.find(e => String(e.id) === String(empId));
    if (!emp) return;

    window._activeProfileEmpId = empId;

    const roleConfig = {
        admin:         { label: 'Administrador',     color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
        mesero:        { label: 'Mesero / Pedidos',  color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
        cajero:        { label: 'Cajero / Cierre',   color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
        cocina:        { label: 'Cocina / Comandas', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
        domiciliario:  { label: '🛵 Domiciliario',   color: '#10b981', bg: 'rgba(16,185,129,0.15)' }
    };
    const cfg = roleConfig[emp.role] || roleConfig.mesero;
    const isActive = emp.status === 'active';
    const initials = emp.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    // Reset filter elements to default ("all")
    window._activeEmpPresetValue = 'all';
    window._activeEmpMonthValue = '';
    const dateEl = document.getElementById('emp-filter-date'); if (dateEl) dateEl.value = '';
    const presetDisp = document.querySelector('#emp-current-preset'); if (presetDisp) presetDisp.textContent = "Todo el tiempo";
    const monthDisp = document.querySelector('#emp-current-month'); if (monthDisp) monthDisp.textContent = "Meses...";
    document.querySelectorAll('#emp-preset-dropdown li, #emp-month-dropdown li').forEach(li => li.classList.remove('active'));
    const allLi = document.querySelector('#emp-preset-dropdown li[data-value="all"]'); if (allLi) allLi.classList.add('active');

    // Hero
    const avatarEl = document.getElementById('emp-profile-avatar');
    if (avatarEl) {
        if (emp.avatarUrl) {
            avatarEl.innerHTML = `<img src="${emp.avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 17px;">`;
        } else {
            avatarEl.textContent = initials;
            avatarEl.style.background = cfg.bg;
            avatarEl.style.color = cfg.color;
        }
    }
    const nameEl = document.getElementById('emp-profile-name');
    if (nameEl) nameEl.textContent = formatShortName(emp.name);

    const roleBadgeEl = document.getElementById('emp-profile-role-badge');
    if (roleBadgeEl) {
        roleBadgeEl.textContent = cfg.label;
        roleBadgeEl.style.background = cfg.bg;
        roleBadgeEl.style.color = cfg.color;
    }
    const statusEl = document.getElementById('emp-profile-status');
    if (statusEl) {
        statusEl.textContent = isActive ? '● Activo' : '● Inactivo';
        statusEl.style.color = isActive ? '#4caf50' : '#ef4444';
    }
    const userEl = document.getElementById('emp-profile-username');
    if (userEl) userEl.textContent = '@' + (emp.username || '').replace(/^@/, '');

    // DOM Elements for Mode Toggling
    const filterBarEl = document.getElementById('emp-profile-filter-bar');
    const metricsGridEl = document.getElementById('emp-profile-metrics-grid');
    const personalEl = document.getElementById('emp-profile-personal');
    const historyEl = document.getElementById('emp-profile-history');
    const footerEl = document.getElementById('emp-profile-footer');
    const headerPdfBtn = document.getElementById('emp-profile-header-pdf-btn');

    if (showPersonalInfo) {
        // MODE A: PERFIL PERSONAL (Clicked Name / Avatar)
        // Shows Hero + Personal Info + Footer (Editar, PDF, Eliminar)
        if (filterBarEl) filterBarEl.style.display = 'none';
        if (metricsGridEl) metricsGridEl.style.display = 'none';
        if (historyEl) historyEl.style.display = 'none';
        if (headerPdfBtn) headerPdfBtn.style.display = 'none';
        if (footerEl) footerEl.style.display = 'flex';

        const personalGridEl = document.getElementById('emp-profile-personal-grid');
        if (personalEl && personalGridEl) {
            const genderInfoMap = {
                masculino: { icon: 'user', label: 'Masculino', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
                femenino:  { icon: 'user', label: 'Femenino',  color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
                otro:      { icon: 'user', label: 'Otro',      color: '#a855f7', bg: 'rgba(168,85,247,0.15)' }
            };
            const gInfo = genderInfoMap[emp.gender] || { icon: 'user', label: emp.gender || '—', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' };

            const items = [
                emp.gender ? `
                    <div class="emp-personal-tile" style="display: flex; align-items: center; gap: 0.9rem; padding: 0.9rem 1.1rem; border-radius: 16px; background: rgba(var(--text-rgb,255,255,255), 0.035); border: 1px solid var(--glass-border); transition: all 0.2s;">
                        <div style="width: 42px; height: 42px; border-radius: 12px; background: ${gInfo.bg}; color: ${gInfo.color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <i data-lucide="${gInfo.icon}" style="width: 20px; height: 20px;"></i>
                        </div>
                        <div>
                            <div style="font-size: 0.64rem; font-weight: 800; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.6px;">Sexo</div>
                            <div style="font-size: 0.92rem; font-weight: 800; color: var(--text); margin-top: 2px;">${gInfo.label}</div>
                        </div>
                    </div>
                ` : '',

                emp.age ? `
                    <div class="emp-personal-tile" style="display: flex; align-items: center; gap: 0.9rem; padding: 0.9rem 1.1rem; border-radius: 16px; background: rgba(var(--text-rgb,255,255,255), 0.035); border: 1px solid var(--glass-border); transition: all 0.2s;">
                        <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(245,158,11,0.15); color: #f59e0b; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <i data-lucide="cake" style="width: 20px; height: 20px;"></i>
                        </div>
                        <div>
                            <div style="font-size: 0.64rem; font-weight: 800; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.6px;">Edad</div>
                            <div style="font-size: 0.92rem; font-weight: 800; color: var(--text); margin-top: 2px;">${emp.age} años</div>
                        </div>
                    </div>
                ` : '',

                emp.phone ? `
                    <div class="emp-personal-tile" style="display: flex; align-items: center; gap: 0.8rem; padding: 0.85rem 1rem; border-radius: 16px; background: rgba(var(--text-rgb,255,255,255), 0.035); border: 1px solid var(--glass-border); transition: all 0.2s;">
                        <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(16,185,129,0.15); color: #10b981; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <i data-lucide="phone" style="width: 19px; height: 19px;"></i>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 0.62rem; font-weight: 800; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px;">Contacto</div>
                            <div style="font-size: 0.88rem; font-weight: 800; color: var(--text); margin-top: 2px; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${emp.phone}</div>
                        </div>
                    </div>
                ` : '',

                emp.address ? `
                    <div class="emp-personal-tile" style="display: flex; align-items: center; gap: 0.8rem; padding: 0.85rem 1rem; border-radius: 16px; background: rgba(var(--text-rgb,255,255,255), 0.035); border: 1px solid var(--glass-border); transition: all 0.2s;">
                        <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(247,147,30,0.15); color: var(--theme-accent, #f7931e); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <i data-lucide="map-pin" style="width: 19px; height: 19px;"></i>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 0.62rem; font-weight: 800; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px;">Dirección</div>
                            <div style="font-size: 0.82rem; font-weight: 700; color: var(--text); margin-top: 2px; line-height: 1.2;">
                                <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${emp.address}">${emp.address}</div>
                                ${emp.neighborhood ? `<div style="font-size: 0.68rem; color: var(--text-dim); font-weight: 600; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Barrio ${emp.neighborhood}</div>` : ''}
                            </div>
                        </div>
                    </div>
                ` : ''
            ].filter(Boolean);

            personalEl.style.display = 'block';
            if (items.length > 0) {
                personalGridEl.innerHTML = items.join('');
            } else {
                personalGridEl.innerHTML = `<div style="grid-column: 1/-1; color: var(--text-dim); font-size: 0.85rem; font-style: italic; padding: 0.5rem 0;">No hay datos personales adicionales registrados para este colaborador.</div>`;
            }
        }
    } else {
        // MODE B: VER DETALLES (Clicked "Ver Detalles" button)
        // Shows Filter Bar (with PDF button on top right), Metrics & Recent Orders. Hides Personal Info & Bottom Footer!
        if (filterBarEl) filterBarEl.style.display = 'flex';
        if (metricsGridEl) metricsGridEl.style.display = 'grid';
        if (historyEl) historyEl.style.display = 'block';
        if (headerPdfBtn) headerPdfBtn.style.display = 'inline-flex';

        if (personalEl) personalEl.style.display = 'none';
        if (footerEl) footerEl.style.display = 'none';

        // Render Metrics & Orders with initial filter
        renderActiveProfileMetrics();
    }

    // Wire up footer buttons
    const editBtn = document.getElementById('emp-profile-edit-btn');
    if (editBtn) editBtn.onclick = () => { document.getElementById('employee-profile-modal').classList.add('hidden'); editEmployee(emp.id); };
    const deleteBtn = document.getElementById('emp-profile-delete-btn');
    if (deleteBtn) deleteBtn.onclick = () => { document.getElementById('employee-profile-modal').classList.add('hidden'); confirmDeleteEmployee(emp.id, emp.name); };

    // Show
    const modal = document.getElementById('employee-profile-modal');
    if (modal) {
        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }
};

window.exportSingleEmployeePDF = function() {
    const empId = window._activeProfileEmpId;
    if (!empId) {
        showToast('No se encontró el colaborador activo', 'error');
        return;
    }
    const emp = (employeesList || []).find(e => String(e.id) === String(empId));
    if (!emp) {
        showToast('Colaborador no encontrado', 'error');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const nowStr = new Date().toLocaleString('es-CO');

        // Current filter values
        const dateEl = document.getElementById('emp-filter-date');
        const specificDate = dateEl ? dateEl.value : '';
        const preset = window._activeEmpPresetValue || 'all';
        const month = window._activeEmpMonthValue || '';

        const presetLabels = { all: 'Todo el tiempo', today: 'Hoy', yesterday: 'Ayer', week: 'Esta semana', month: 'Este mes' };
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        let filterText = 'Todo el tiempo';
        if (specificDate) filterText = `Fecha: ${specificDate}`;
        else if (month !== '') filterText = `Mes: ${monthNames[parseInt(month, 10)]}`;
        else if (preset) filterText = presetLabels[preset] || 'Todo el tiempo';

        const stats = getEmployeeStats(emp.name, { specificDate, preset, month });

        // Header Banner (Orange accent)
        doc.setFillColor(247, 147, 30);
        doc.rect(0, 0, 210, 26, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE FICHA DE COLABORADOR', 14, 16);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generado: ${nowStr}`, 140, 16);

        // Employee Info Box
        doc.setFillColor(245, 247, 250);
        doc.roundedRect(14, 32, 182, 28, 3, 3, 'F');

        doc.setTextColor(30, 41, 59);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(emp.name.toUpperCase(), 20, 42);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Usuario: @${(emp.username || '').replace(/^@/, '')}`, 20, 49);
        doc.text(`Rol: ${emp.role.toUpperCase()}  |  Estado: ${emp.status === 'active' ? 'ACTIVO' : 'INACTIVO'}`, 20, 55);

        doc.setFont('helvetica', 'bold');
        doc.text(`Filtro: ${filterText}`, 120, 42);
        doc.setFont('helvetica', 'normal');
        doc.text(`Última atención: ${stats.lastActivityStr}`, 120, 49);

        // KPI Summary Box
        doc.setFillColor(238, 242, 255);
        doc.roundedRect(14, 64, 182, 22, 3, 3, 'F');

        doc.setFontSize(9);
        doc.setTextColor(79, 70, 229);
        doc.setFont('helvetica', 'bold');
        doc.text('PEDIDOS', 22, 72);
        doc.text('VENTAS ATENDIDAS', 65, 72);
        doc.text('TICKET PROMEDIO', 115, 72);
        doc.text(`COMISIÓN (${stats.commissionRate}%)`, 160, 72);

        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text(`${stats.totalOrders}`, 22, 80);
        doc.text(`$${stats.totalSales.toLocaleString('es-CO')}`, 65, 80);
        doc.text(`$${stats.avgTicket.toLocaleString('es-CO')}`, 115, 80);
        doc.text(`$${stats.commission.toLocaleString('es-CO')}`, 160, 80);

        // Table Header & Orders
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('DETALLE DE REGISTRO DE ATENCIONES', 14, 95);

        const tableHeaders = [['# Pedido', 'Cliente', 'Fecha / Hora', 'Total ($)', 'Estado']];
        const tableBody = stats.recentOrders.map(o => {
            const statusMap = { accepted: 'Completado', cancelled: 'Cancelado', confirmed: 'En cocina', pending: 'En espera' };
            const time = new Date(o.date).toLocaleString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            return [
                o.id,
                o.customer?.name || 'Cliente',
                time,
                '$' + (o.total || 0).toLocaleString('es-CO'),
                statusMap[o.status] || o.status
            ];
        });

        doc.autoTable({
            head: tableHeaders,
            body: tableBody.length > 0 ? tableBody : [['—', 'Sin atenciones en este período', '—', '—', '—']],
            startY: 99,
            theme: 'grid',
            headStyles: { fillStyle: 'F', fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            styles: { fontSize: 8.5, cellPadding: 3.5 }
        });

        const safeName = emp.name.replace(/[^a-zA-Z0-9]/g, '_');
        doc.save(`Ficha_${safeName}.pdf`);
        showToast('Ficha de colaborador exportada en PDF ✓', 'success');

    } catch (err) {
        console.error('Error generando PDF de ficha de colaborador:', err);
        showToast('Error al descargar el PDF de la ficha', 'error');
    }
};

function clearEmployeeValidationFeedback() {
    const uInput = document.getElementById('emp-username');
    const pInput = document.getElementById('emp-pin');
    const uFb = document.getElementById('emp-username-feedback');
    const pFb = document.getElementById('emp-pin-feedback');

    if (uInput) uInput.style.borderColor = 'var(--glass-border)';
    if (pInput) pInput.style.borderColor = 'var(--glass-border)';
    if (uFb) uFb.innerHTML = '';
    if (pFb) pFb.innerHTML = '';
}

function checkUsernameAvailability() {
    const input = document.getElementById('emp-username');
    const feedback = document.getElementById('emp-username-feedback');
    const currentId = document.getElementById('emp-id-input')?.value;

    if (!input || !feedback) return true;

    const val = input.value.trim().toLowerCase();
    if (!val) {
        feedback.innerHTML = '';
        input.style.borderColor = 'var(--glass-border)';
        return true;
    }

    const existing = employeesList.find(e => 
        e.username && e.username.toLowerCase() === val && e.id !== currentId
    );

    if (existing) {
        feedback.style.color = '#ef4444';
        feedback.innerHTML = `<i data-lucide="x-circle" style="width:13px;height:13px;display:inline-block;"></i> En uso por ${escapeHtml(existing.name)}`;
        input.style.borderColor = '#ef4444';
        if (window.lucide) lucide.createIcons({ node: feedback });
        return false;
    } else {
        feedback.style.color = '#10b981';
        feedback.innerHTML = `<i data-lucide="check-circle" style="width:13px;height:13px;display:inline-block;"></i> Disponible`;
        input.style.borderColor = '#10b981';
        if (window.lucide) lucide.createIcons({ node: feedback });
        return true;
    }
}

function checkPinAvailability() {
    const input = document.getElementById('emp-pin');
    const feedback = document.getElementById('emp-pin-feedback');
    const currentId = document.getElementById('emp-id-input')?.value;

    if (!input || !feedback) return true;

    const val = input.value.trim();
    if (!val) {
        feedback.innerHTML = '';
        input.style.borderColor = 'var(--glass-border)';
        return true;
    }

    const existing = employeesList.find(e => 
        e.pin && e.pin.toString() === val && e.id !== currentId
    );

    if (existing) {
        feedback.style.color = '#ef4444';
        feedback.innerHTML = `<i data-lucide="x-circle" style="width:13px;height:13px;display:inline-block;"></i> PIN en uso por ${escapeHtml(existing.name)}`;
        input.style.borderColor = '#ef4444';
        if (window.lucide) lucide.createIcons({ node: feedback });
        return false;
    } else {
        feedback.style.color = '#10b981';
        feedback.innerHTML = `<i data-lucide="check-circle" style="width:13px;height:13px;display:inline-block;"></i> PIN disponible`;
        input.style.borderColor = '#10b981';
        if (window.lucide) lucide.createIcons({ node: feedback });
        return true;
    }
}

window.handleEmpAvatarUpload = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        const url = evt.target.result;
        const preview = document.getElementById('emp-avatar-preview');
        const hiddenInput = document.getElementById('emp-avatar-url');
        if (hiddenInput) hiddenInput.value = url;
        if (preview) {
            preview.style.backgroundImage = `url('${url}')`;
            preview.style.backgroundSize = 'cover';
            preview.style.backgroundPosition = 'center';
            preview.innerHTML = '';
        }
    };
    reader.readAsDataURL(file);
};

function openNewEmployeeModal() {
    requireSecurityAuth(() => {
        _performOpenNewEmployeeModal();
    }, true);
}

function _performOpenNewEmployeeModal() {
    clearEmployeeValidationFeedback();
    document.getElementById('emp-id-input').value = '';
    document.getElementById('emp-name').value = '';
    document.getElementById('emp-username').value = '';
    document.getElementById('emp-pin').value = '';
    const avatarPreview = document.getElementById('emp-avatar-preview');
    if (avatarPreview) {
        avatarPreview.style.backgroundImage = 'none';
        avatarPreview.innerHTML = '<i data-lucide="camera" style="width: 22px; height: 22px; color: var(--theme-accent);"></i><span style="font-size: 0.62rem; font-weight: 700; color: var(--theme-accent); margin-top: 2px;">Foto</span>';
    }
    const avatarUrlEl = document.getElementById('emp-avatar-url'); if (avatarUrlEl) avatarUrlEl.value = '';
    const commRateEl = document.getElementById('emp-commission-rate'); if (commRateEl) commRateEl.value = '10';

    const genderEl = document.getElementById('emp-gender');
    if (genderEl) {
        genderEl.value = '';
        genderEl.dispatchEvent(new Event('change'));
    }
    const ageEl = document.getElementById('emp-age'); if (ageEl) ageEl.value = '';
    const phoneEl = document.getElementById('emp-phone'); if (phoneEl) phoneEl.value = '';
    const addressEl = document.getElementById('emp-address'); if (addressEl) addressEl.value = '';
    const neighEl = document.getElementById('emp-neighborhood'); if (neighEl) neighEl.value = '';
    const roleEl = document.getElementById('emp-role');
    if (roleEl) {
        roleEl.value = 'mesero';
        roleEl.dispatchEvent(new Event('change'));
    }
    document.getElementById('emp-status-check').checked = true;
    document.getElementById('employee-modal-title').innerHTML = '<i data-lucide="user-plus" style="color: var(--theme-accent); width: 26px; height: 26px;"></i> Nuevo Colaborador';
    
    const modal = document.getElementById('newEmployeeModal');
    if (modal) modal.style.display = 'flex';
    if (window.lucide) lucide.createIcons();
}

function closeEmployeeModal() {
    const modal = document.getElementById('newEmployeeModal');
    if (modal) modal.style.display = 'none';
}

async function handleSaveEmployee(e) {
    e.preventDefault();

    if (!checkUsernameAvailability()) {
        showToast('El usuario de acceso ya está siendo utilizado por otro colaborador.', 'error');
        return;
    }
    if (!checkPinAvailability()) {
        showToast('El PIN ingresado ya está siendo utilizado por otro colaborador.', 'error');
        return;
    }

    const id = document.getElementById('emp-id-input').value;
    const name = document.getElementById('emp-name').value.trim();
    const username = document.getElementById('emp-username').value.trim();
    const pin = document.getElementById('emp-pin').value.trim();
    const role = document.getElementById('emp-role').value;
    const status = document.getElementById('emp-status-check').checked ? 'active' : 'inactive';
    const avatarUrl = (document.getElementById('emp-avatar-url') || {}).value || '';
    const commissionRate = (document.getElementById('emp-commission-rate') || {}).value || '10';
    const gender = (document.getElementById('emp-gender') || {}).value || '';
    const age = (document.getElementById('emp-age') || {}).value || '';
    const phone = (document.getElementById('emp-phone') || {}).value || '';
    const address = (document.getElementById('emp-address') || {}).value || '';
    const neighborhood = (document.getElementById('emp-neighborhood') || {}).value || '';

    const instanceId = getInstanceId();

    const token = localStorage.getItem('streetfeed_employee_token') || sessionStorage.getItem('clientSession');
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    try {
        let res;
        if (id) {
            // Update
            res = await fetch(`/api/modules/streetfeed/employees/${id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ instanceId, name, username, pin, role, status, avatarUrl, commissionRate, gender, age, phone, address, neighborhood })
            });
        } else {
            // Create
            res = await fetch('/api/modules/streetfeed/employees', {
                method: 'POST',
                headers,
                body: JSON.stringify({ instanceId, name, username, pin, role, avatarUrl, commissionRate, gender, age, phone, address, neighborhood })
            });
        }

        if (res.ok) {
            const resData = await res.json().catch(() => ({}));
            const targetId = id || (resData.employee && resData.employee.id) || username || name.toLowerCase();

            const metaStr = localStorage.getItem('streetfeed_employees_meta') || '{}';
            let metaObj = {};
            try { metaObj = JSON.parse(metaStr); } catch (e) {}

            metaObj[targetId] = { avatarUrl, commissionRate, gender, age, phone, address, neighborhood };
            if (username) metaObj[username] = metaObj[targetId];
            if (name) metaObj[name.toLowerCase()] = metaObj[targetId];

            localStorage.setItem('streetfeed_employees_meta', JSON.stringify(metaObj));

            showToast(id ? 'Colaborador actualizado' : 'Colaborador creado exitosamente', 'success');
            closeEmployeeModal();
            loadEmployees();
        } else {
            const data = await res.json();
            showToast(data.error || 'Error al guardar colaborador', 'error');
        }
    } catch (err) {
        console.error('Error guardando empleado:', err);
        showToast('Error de red al guardar colaborador', 'error');
    }
}

window._pendingSecurityAction = null;

window.requireSecurityAuth = function(actionCallback, forcePrompt = false) {
    let isWorkerSession = false;
    try {
        const empUserStr = localStorage.getItem('streetfeed_employee_user') || localStorage.getItem('streetfeed_employee');
        if (empUserStr) {
            const parsed = JSON.parse(empUserStr);
            if (parsed && parsed.role && parsed.role !== 'admin' && parsed.role !== 'owner' && parsed.role !== 'propietario') {
                isWorkerSession = true;
            }
        }
    } catch(e) {}

    if (typeof currentEmployeeRole !== 'undefined' && (currentEmployeeRole === 'mesero' || currentEmployeeRole === 'cajero' || currentEmployeeRole === 'cocina')) {
        isWorkerSession = true;
    }

    if (!isWorkerSession && !forcePrompt) {
        if (typeof actionCallback === 'function') actionCallback();
        return;
    }

    // Prompt worker for Super Admin Master Password
    window._pendingSecurityAction = actionCallback;
    const modal = document.getElementById('securityAuthModal');
    const passInput = document.getElementById('security-auth-password');
    if (passInput) passInput.value = '';
    if (modal) {
        modal.style.display = 'flex';
        if (passInput) passInput.focus();
        if (window.lucide) lucide.createIcons();
    }
};

window.closeSecurityAuthModal = function() {
    const modal = document.getElementById('securityAuthModal');
    if (modal) modal.style.display = 'none';
    window._pendingSecurityAction = null;
};

window.handleSecurityAuthSubmit = function(e) {
    e.preventDefault();
    const enteredPass = (document.getElementById('security-auth-password')?.value || '').trim();

    // 1. Master Propietario Password from state.auth
    const masterPass = (typeof state !== 'undefined' && state.auth && state.auth.pass) ? state.auth.pass : '';
    const expensePass = (typeof state !== 'undefined' && state.auth && state.auth.expensePass) ? state.auth.expensePass : '';

    // 2. Master Dashboard Owner Password from mod_creds
    const instanceId = getInstanceId();
    const clientCredsStr = localStorage.getItem(`mod_creds_${instanceId}`) || localStorage.getItem('mod_creds_streetfeed') || '{}';
    let clientPass = '';
    try {
        const parsed = JSON.parse(clientCredsStr);
        clientPass = parsed.pass || parsed.password || '';
    } catch(err) {}

    let isValid = false;

    // Check against Super Admin / Propietario credentials ONLY
    if (masterPass && enteredPass === masterPass) isValid = true;
    else if (expensePass && enteredPass === expensePass) isValid = true;
    else if (clientPass && enteredPass === clientPass) isValid = true;
    else if (!masterPass && !expensePass && !clientPass) {
        // Default fallback if no master password configured yet
        isValid = (enteredPass === 'admin' || enteredPass === '123456' || enteredPass.length >= 4);
    }

    if (isValid) {
        showToast('Verificación de Super Administrador confirmada ✓', 'success');
        const callback = window._pendingSecurityAction;
        closeSecurityAuthModal();
        if (typeof callback === 'function') callback();
    } else {
        showToast('⚠️ Solo la clave del Propietario / Super Admin puede autorizar esta acción.', 'error');
        const input = document.getElementById('security-auth-password');
        if (input) {
            input.value = '';
            input.focus();
        }
    }
};

function editEmployee(id) {
    requireSecurityAuth(() => {
        _performEditEmployee(id);
    }, true);
}

function _performEditEmployee(id) {
    const emp = employeesList.find(e => e.id === id);
    if (!emp) return;

    clearEmployeeValidationFeedback();
    document.getElementById('emp-id-input').value = emp.id;
    document.getElementById('emp-name').value = emp.name;
    document.getElementById('emp-username').value = emp.username;
    document.getElementById('emp-pin').value = emp.pin || '';

    const avatarPreview = document.getElementById('emp-avatar-preview');
    const avatarUrlEl = document.getElementById('emp-avatar-url');
    if (emp.avatarUrl) {
        if (avatarUrlEl) avatarUrlEl.value = emp.avatarUrl;
        if (avatarPreview) {
            avatarPreview.style.backgroundImage = `url('${emp.avatarUrl}')`;
            avatarPreview.style.backgroundSize = 'cover';
            avatarPreview.style.backgroundPosition = 'center';
            avatarPreview.innerHTML = '';
        }
    } else {
        if (avatarUrlEl) avatarUrlEl.value = '';
        if (avatarPreview) {
            avatarPreview.style.backgroundImage = 'none';
            avatarPreview.innerHTML = '<i data-lucide="camera" style="width: 22px; height: 22px; color: var(--theme-accent);"></i><span style="font-size: 0.62rem; font-weight: 700; color: var(--theme-accent); margin-top: 2px;">Foto</span>';
        }
    }

    const commRateEl = document.getElementById('emp-commission-rate');
    if (commRateEl) commRateEl.value = (emp.commissionRate !== undefined && emp.commissionRate !== '') ? emp.commissionRate : '10';

    const genderEl = document.getElementById('emp-gender');
    if (genderEl) {
        genderEl.value = emp.gender || '';
        genderEl.dispatchEvent(new Event('change'));
    }
    const ageEl = document.getElementById('emp-age'); if (ageEl) ageEl.value = emp.age || '';
    const phoneEl = document.getElementById('emp-phone'); if (phoneEl) phoneEl.value = emp.phone || '';
    const addressEl = document.getElementById('emp-address'); if (addressEl) addressEl.value = emp.address || '';
    const neighEl = document.getElementById('emp-neighborhood'); if (neighEl) neighEl.value = emp.neighborhood || '';
    const roleEl = document.getElementById('emp-role');
    if (roleEl) {
        roleEl.value = emp.role || 'mesero';
        roleEl.dispatchEvent(new Event('change'));
    }
    document.getElementById('emp-status-check').checked = emp.status === 'active';
    document.getElementById('employee-modal-title').innerHTML = '<i data-lucide="user-check" style="color: var(--theme-accent); width: 26px; height: 26px;"></i> Editar Colaborador';

    checkUsernameAvailability();
    checkPinAvailability();

    const modal = document.getElementById('newEmployeeModal');
    if (modal) modal.style.display = 'flex';
    if (window.lucide) lucide.createIcons();
}

function confirmDeleteEmployee(id, name) {
    requireSecurityAuth(() => {
        _performConfirmDeleteEmployee(id, name);
    }, true);
}

function _performConfirmDeleteEmployee(id, name) {
    const deleteAction = async () => {
        const instanceId = getInstanceId();
        const token = localStorage.getItem('streetfeed_employee_token') || sessionStorage.getItem('clientSession');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        try {
            const res = await fetch(`/api/modules/streetfeed/employees/${id}?instanceId=${encodeURIComponent(instanceId)}`, {
                method: 'DELETE',
                headers
            });
            if (res.ok) {
                const metaStr = localStorage.getItem('streetfeed_employees_meta') || '{}';
                let metaObj = {};
                try { metaObj = JSON.parse(metaStr); } catch (e) {}
                delete metaObj[id];
                if (name) delete metaObj[name.toLowerCase()];
                localStorage.setItem('streetfeed_employees_meta', JSON.stringify(metaObj));

                showToast('Colaborador eliminado correctamente', 'success');
                loadEmployees();
            } else {
                showToast('Error al eliminar colaborador', 'error');
            }
        } catch (err) {
            console.error('Error eliminando empleado:', err);
            showToast('Error de red', 'error');
        }
    };

    if (typeof showConfirm === 'function') {
        showConfirm(
            `¿Estás seguro de que deseas eliminar la cuenta de "${name}"?`,
            deleteAction,
            'Eliminar',
            '#ef4444',
            'Eliminar Colaborador'
        );
    } else if (confirm(`¿Estás seguro de que deseas eliminar la cuenta de ${name}?`)) {
        deleteAction();
    }
}

function applyRolePermissions(role = 'owner', name = 'Propietario') {
    currentEmployeeRole = role;

    const badgeName = document.getElementById('admin-name-display');
    if (badgeName) {
        let roleTitle = 'Propietario';
        const rLower = (role || '').toLowerCase();
        if (rLower === 'owner' || rLower === 'propietario') roleTitle = 'Propietario';
        else if (rLower === 'admin' || rLower === 'administrador') roleTitle = 'Administrador';
        else if (rLower === 'mesero') roleTitle = 'Mesero';
        else if (rLower === 'cajero') roleTitle = 'Cajero';
        else if (rLower === 'cocina') roleTitle = 'Cocina';
        else if (rLower === 'domiciliario' || rLower === 'repartidor' || rLower === 'delivery') roleTitle = 'Domiciliario';
        
        const displayName = (name === 'Administrador' || !name) ? roleTitle : name;
        const firstName = formatFirstName(displayName);

        if (firstName.toLowerCase() === roleTitle.toLowerCase()) {
            badgeName.innerHTML = `${escapeHtml(firstName)}`;
        } else {
            badgeName.innerHTML = `${escapeHtml(firstName)} <small style="opacity:0.75; font-size:0.75rem;">(${roleTitle})</small>`;
        }
    }

    const navOrders = document.querySelector('.sidebar-btn[data-tab="orders-tab"]');
    const navHistory = document.querySelector('.sidebar-btn[data-tab="history-tab"]');
    const navEmployees = document.getElementById('nav-btn-employees');
    const navConfig = document.querySelector('.sidebar-btn[data-tab="config-tab"]');
    const navExpenses = document.querySelector('.sidebar-btn[data-tab="expenses-tab"]');
    const navStats = document.querySelector('.sidebar-btn[data-tab="stats-tab"]');
    const navItems = document.querySelector('.sidebar-btn[data-tab="items-tab"]');
    const navCombos = document.querySelector('.sidebar-btn[data-tab="combos-tab"]');
    const navMyMetrics = document.getElementById('nav-btn-my-metrics');
    const navDomiciliarios = document.getElementById('nav-btn-domiciliarios');
    const navDriverMetrics = document.getElementById('nav-btn-driver-metrics');

    const btnNewOrder = document.getElementById('btn-new-manual-order');
    const orderSettingsBtn = document.querySelector('.order-settings-btn');

    // Restore default DOM order for sidebar buttons before applying role visibility
    const sidebar = document.querySelector('.sidebar-nav');
    if (sidebar) {
        const defaultOrder = [
            'orders-tab',
            'items-tab',
            'combos-tab',
            'stats-tab',
            'domicilios-tab',
            'expenses-tab',
            'employees-tab',
            'my-metrics-tab',
            'driver-metrics-tab',
            'history-tab',
            'config-tab'
        ];
        defaultOrder.forEach(tabId => {
            const btn = sidebar.querySelector(`.sidebar-btn[data-tab="${tabId}"]`);
            if (btn) sidebar.appendChild(btn);
        });
    }

    if (role === 'domiciliario') {
        if (navOrders) navOrders.style.display = 'none';
        if (navHistory) navHistory.style.display = 'flex';
        if (navItems) navItems.style.display = 'none';
        if (navCombos) navCombos.style.display = 'none';
        if (navEmployees) navEmployees.style.display = 'none';
        if (navConfig) navConfig.style.display = 'none';
        if (navExpenses) navExpenses.style.display = 'none';
        if (navStats) navStats.style.display = 'none';
        if (navMyMetrics) navMyMetrics.style.display = 'none';
        if (navDomiciliarios) navDomiciliarios.style.display = 'flex';
        if (navDriverMetrics) navDriverMetrics.style.display = 'flex';
        if (btnNewOrder) btnNewOrder.style.display = 'none';
        document.querySelectorAll('.order-settings-btn').forEach(b => b.style.display = 'none');

        // Order sidebar buttons for driver: Domicilios -> Historial -> Métricas
        if (sidebar && navDomiciliarios && navHistory && navDriverMetrics) {
            sidebar.appendChild(navDomiciliarios);
            sidebar.appendChild(navHistory);
            sidebar.appendChild(navDriverMetrics);
        }

        // Automatically open Domicilios tab for driver
        setTimeout(() => {
            if (navDomiciliarios) navDomiciliarios.click();
        }, 60);
    } else if (role === 'mesero') {
        if (navDriverMetrics) navDriverMetrics.style.display = 'none';
        if (navOrders) navOrders.style.display = 'flex';
        if (navHistory) navHistory.style.display = 'flex';
        if (navItems) navItems.style.display = 'none';
        if (navCombos) navCombos.style.display = 'none';
        if (navEmployees) navEmployees.style.display = 'none';
        if (navConfig) navConfig.style.display = 'none';
        if (navExpenses) navExpenses.style.display = 'none';
        if (navStats) navStats.style.display = 'none';
        if (navMyMetrics) navMyMetrics.style.display = 'flex';
        if (navDomiciliarios) navDomiciliarios.style.display = 'flex';
        if (btnNewOrder) btnNewOrder.style.display = 'flex';
        document.querySelectorAll('.order-settings-btn').forEach(b => b.style.display = 'none');

        document.querySelectorAll('.btn-delete-item, .btn-delete-cat, .btn-add-category').forEach(el => el.style.display = 'none');
    } else if (role === 'cajero') {
        if (navDriverMetrics) navDriverMetrics.style.display = 'none';
        if (navOrders) navOrders.style.display = 'flex';
        if (navHistory) navHistory.style.display = 'flex';
        if (navItems) navItems.style.display = 'none';
        if (navCombos) navCombos.style.display = 'none';
        if (navEmployees) navEmployees.style.display = 'none';
        if (navConfig) navConfig.style.display = 'none';
        if (navExpenses) navExpenses.style.display = 'flex';
        if (navStats) navStats.style.display = 'flex';
        if (navMyMetrics) navMyMetrics.style.display = 'none';
        if (navDomiciliarios) navDomiciliarios.style.display = 'flex';
        if (btnNewOrder) btnNewOrder.style.display = 'flex';
        document.querySelectorAll('.order-settings-btn').forEach(b => b.style.display = 'none');
    } else if (role === 'cocina') {
        if (navDriverMetrics) navDriverMetrics.style.display = 'none';
        if (navOrders) navOrders.style.display = 'flex';
        if (navHistory) navHistory.style.display = 'flex';
        if (navItems) navItems.style.display = 'none';
        if (navCombos) navCombos.style.display = 'none';
        if (navEmployees) navEmployees.style.display = 'none';
        if (navConfig) navConfig.style.display = 'none';
        if (navExpenses) navExpenses.style.display = 'none';
        if (navStats) navStats.style.display = 'none';
        if (navMyMetrics) navMyMetrics.style.display = 'none';
        if (navDomiciliarios) navDomiciliarios.style.display = 'flex';
        if (btnNewOrder) btnNewOrder.style.display = 'none';
        document.querySelectorAll('.order-settings-btn').forEach(b => b.style.display = 'none');
    } else {
        if (navDriverMetrics) navDriverMetrics.style.display = 'none';
        if (navOrders) navOrders.style.display = 'flex';
        if (navHistory) navHistory.style.display = 'flex';
        if (navItems) navItems.style.display = 'flex';
        if (navCombos) navCombos.style.display = 'flex';
        if (navEmployees) navEmployees.style.display = 'flex';
        if (navConfig) navConfig.style.display = 'flex';
        if (navExpenses) navExpenses.style.display = 'flex';
        if (navStats) navStats.style.display = 'flex';
        if (navMyMetrics) navMyMetrics.style.display = 'none';
        if (navDomiciliarios) navDomiciliarios.style.display = 'flex';
        if (btnNewOrder) btnNewOrder.style.display = 'flex';
        document.querySelectorAll('.order-settings-btn').forEach(b => b.style.display = 'flex');
        document.querySelectorAll('.btn-delete-item, .btn-delete-cat, .btn-add-category').forEach(el => el.style.display = '');
    }

    // Filtros de Alcance ("Mis Ventas") y Sub-Pestañas para Cocina
    const historyScopeContainer = document.getElementById('history-scope-container');
    const historyScopeMine = document.getElementById('history-scope-mine');
    const pdfScopeMine = document.getElementById('pdf-scope-mine');
    const subtabUnpaidBtn = document.getElementById('subtab-unpaid-btn');

    if (role === 'cocina') {
        if (historyScopeContainer) historyScopeContainer.style.display = 'none';
        if (historyScopeMine) historyScopeMine.style.display = 'none';
        if (pdfScopeMine) pdfScopeMine.style.display = 'none';
        if (subtabUnpaidBtn) subtabUnpaidBtn.style.display = 'none';

        // Si estaba seleccionado el subtab "unpaid", cambiar a "incoming"
        const activeSubTab = document.querySelector('.sub-tab-btn.active');
        if (activeSubTab && activeSubTab.dataset.subtab === 'unpaid') {
            const incomingSubTabBtn = document.querySelector('.sub-tab-btn[data-subtab="incoming"]');
            if (incomingSubTabBtn) incomingSubTabBtn.click();
        }

        if (typeof window.setHistoryScope === 'function') {
            window.setHistoryScope('all');
        }
    } else if (role === 'domiciliario') {
        // Show scope container, hide "General" (all) button — driver only sees their deliveries
        if (historyScopeContainer) historyScopeContainer.style.display = 'flex';
        if (historyScopeMine) {
            historyScopeMine.style.display = 'inline-flex';
            // Rename "Mis Ventas" → "Mis Domis"
            historyScopeMine.innerHTML = '<i data-lucide="bike" style="width: 14px;"></i> Mis Domis';
        }
        // Hide "General" button — domiciliario only sees their own deliveries
        const historyScopeAll = document.getElementById('history-scope-all');
        if (historyScopeAll) historyScopeAll.style.display = 'flex';
        if (pdfScopeMine) pdfScopeMine.style.display = 'flex';
        if (subtabUnpaidBtn) subtabUnpaidBtn.style.display = 'none';

        // Set a flag so renderOrders filters delivery-only orders
        window.driverDeliveryOnlyHistory = true;

        // Auto-activate "mine" scope for domiciliario
        if (typeof window.setHistoryScope === 'function') {
            window.setHistoryScope('mine');
        }
        if (window.lucide) lucide.createIcons();
    } else {
        // Restore "Mis Ventas" label in case of role switch
        if (historyScopeMine) {
            historyScopeMine.innerHTML = '<i data-lucide="user" style="width: 14px;"></i> Mis Ventas';
        }
        const historyScopeAll = document.getElementById('history-scope-all');
        if (historyScopeAll) historyScopeAll.style.display = 'flex';
        window.driverDeliveryOnlyHistory = false;
        if (historyScopeContainer) historyScopeContainer.style.display = 'flex';
        if (historyScopeMine) historyScopeMine.style.display = 'inline-flex';
        if (pdfScopeMine) pdfScopeMine.style.display = 'flex';
        if (subtabUnpaidBtn) subtabUnpaidBtn.style.display = 'flex';
    }

    // --- CORRECCIÓN DE BUG DE NAVEGACIÓN POR ROL ---
    const forbiddenTabIds = [];
    if (role === 'domiciliario') {
        forbiddenTabIds.push('orders-tab', 'items-tab', 'combos-tab', 'employees-tab', 'config-tab', 'expenses-tab', 'stats-tab', 'my-metrics-tab');
    } else if (role === 'mesero') {
        forbiddenTabIds.push('items-tab', 'combos-tab', 'employees-tab', 'config-tab', 'expenses-tab', 'stats-tab');
    } else if (role === 'cocina') {
        forbiddenTabIds.push('items-tab', 'combos-tab', 'employees-tab', 'config-tab', 'expenses-tab', 'stats-tab', 'my-metrics-tab');
    } else if (role === 'cajero') {
        forbiddenTabIds.push('items-tab', 'combos-tab', 'employees-tab', 'config-tab', 'my-metrics-tab');
    } else {
        forbiddenTabIds.push('my-metrics-tab');
    }

    const activeSidebarBtn = document.querySelector('.sidebar-btn.active');
    const activeTabId = activeSidebarBtn?.dataset?.tab;

    if (!activeTabId || forbiddenTabIds.includes(activeTabId) || (activeSidebarBtn && activeSidebarBtn.style.display === 'none')) {
        const defaultVisibleBtn = (role === 'domiciliario' ? document.querySelector('.sidebar-btn[data-tab="domicilios-tab"]') : null) ||
                                 document.querySelector('.sidebar-btn[data-tab="orders-tab"]') || 
                                 document.querySelector('.sidebar-btn:not([style*="display: none"])');
        if (defaultVisibleBtn) {
            defaultVisibleBtn.click();
        }
    }

    if (role === 'domiciliario') {
        renderDriverDeliveriesSection();
    } else if (typeof window.renderOrders === 'function') {
        window.renderOrders();
    }
}

// ====== GESTIÓN DE DOMICILIOS & RASTREO GPS INTEGRADO ======
let activeWatchPositionId = null;
let activeGpsOrderId = null;
let adminDriverMapInstance = null;
let adminDriverMapMarker = null;
let adminDriverMapInterval = null;

// ====== ORDER ASSIGNMENT / CLAIMING SYSTEM ======

function getOrderAssignments() {
    try {
        const raw = localStorage.getItem('streetfeed_order_assignments');
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}

function saveOrderAssignments(assignments) {
    localStorage.setItem('streetfeed_order_assignments', JSON.stringify(assignments));
}

function getCurrentDriverInfo() {
    try {
        const empStr = localStorage.getItem('streetfeed_employee_user');
        if (empStr) {
            const emp = JSON.parse(empStr);
            if (emp && emp.name) return { name: emp.name, id: emp.id || emp.username || emp.name };
        }
    } catch (e) {}
    return { name: 'Domiciliario', id: 'unknown' };
}

function claimDeliveryOrder(orderId) {
    const assignments = getOrderAssignments();
    const existing = assignments[orderId];
    const driver = getCurrentDriverInfo();

    if (existing && existing.driverId !== driver.id) {
        const elapsed = existing.claimedAt
            ? Math.round((Date.now() - new Date(existing.claimedAt).getTime()) / 60000)
            : 0;
        if (typeof showAdminNotification === 'function') {
            showAdminNotification(`❌ Ya reclamado por ${existing.driverName} (hace ${elapsed} min)`, 'error');
        }
        return;
    }

    assignments[orderId] = {
        driverName: driver.name,
        driverId: driver.id,
        claimedAt: new Date().toISOString()
    };
    saveOrderAssignments(assignments);

    // Also stamp attendedBy on the order so history filter works
    const allOrders = getOrders();
    const claimIdx = allOrders.findIndex(o => (o.id || o.orderId) === orderId);
    if (claimIdx !== -1 && driver.name) {
        allOrders[claimIdx].attendedBy = driver.name;
        allOrders[claimIdx].deliveredBy = driver.name;
        localStorage.setItem('streetfeed_orders', JSON.stringify(allOrders));
    }

    if (typeof showAdminNotification === 'function') {
        showAdminNotification(`✅ ¡Pedido #${orderId} asignado a ti! Ya aparece en "Mis Pedidos"`, 'success');
    }
    renderDriverDeliveriesSection();
}

function releaseDeliveryOrder(orderId) {
    const doRelease = () => {
        const assignments = getOrderAssignments();
        delete assignments[orderId];
        saveOrderAssignments(assignments);
        if (typeof showAdminNotification === 'function') {
            showAdminNotification(`↩️ Pedido #${orderId} liberado al pool`, 'info');
        }
        renderDriverDeliveriesSection();
    };

    if (typeof showConfirm === 'function') {
        showConfirm(
            `¿Deseas liberar el pedido #${orderId} para que esté disponible para otros domiciliarios?`,
            doRelease,
            '↩️ Liberar Pedido',
            '#ef4444',
            'Liberar Pedido'
        );
    } else {
        doRelease();
    }
}

function forceReassignOrder(orderId, newDriverName, newDriverId) {
    const assignments = getOrderAssignments();
    const existing = assignments[orderId];
    const currentName = existing ? existing.driverName : 'nadie';
    
    const doReassign = () => {
        assignments[orderId] = {
            driverName: newDriverName,
            driverId: newDriverId,
            claimedAt: new Date().toISOString(),
            forcedByAdmin: true
        };
        saveOrderAssignments(assignments);
        if (typeof showAdminNotification === 'function') {
            showAdminNotification(`🔄 #${orderId} reasignado a ${newDriverName} por Admin`, 'success');
        }
        renderDriverDeliveriesSection();
    };

    if (typeof showConfirm === 'function') {
        showConfirm(
            `Actualmente asignado a ${currentName}. ¿Forzar la reasignación del pedido #${orderId} a ${newDriverName}?`,
            doReassign,
            '🔄 Reasignar',
            '#f59e0b',
            `Reasignar #${orderId}`
        );
    } else if (confirm(`¿Reasignar #${orderId}?\nActualmente lo tiene: ${currentName}\n¿Forzar asignación a ${newDriverName}?`)) {
        doReassign();
    }
}

// ====== CARD BUILDER (shared between driver and admin) ======

function buildDeliveryCard(order, idx, isDriver, assignments) {
    const orderId = order.id || order.orderId || 'ORD-0';
    const accentColors = ['#10b981','#f59e0b','#3b82f6','#a855f7','#ef4444','#06b6d4'];
    const accentColor = accentColors[idx % accentColors.length];

    let customerName = 'Cliente';
    if (typeof order.customerName === 'string' && order.customerName.trim()) customerName = order.customerName;
    else if (typeof order.customer === 'string' && order.customer.trim()) customerName = order.customer;
    else if (order.customerName && typeof order.customerName === 'object' && order.customerName.name) customerName = order.customerName.name;
    else if (order.customer && typeof order.customer === 'object' && order.customer.name) customerName = order.customer.name;

    let address = 'Dirección no especificada';
    if (typeof order.customerAddress === 'string' && order.customerAddress.trim()) address = order.customerAddress;
    else if (typeof order.address === 'string' && order.address.trim()) address = order.address;
    else if (order.address && typeof order.address === 'object' && order.address.street) address = order.address.street;

    let phone = '';
    if (typeof order.customerPhone === 'string' && order.customerPhone.trim()) phone = order.customerPhone;
    else if (typeof order.phone === 'string' && order.phone.trim()) phone = order.phone;

    const barrio = (typeof order.barrio === 'string') ? order.barrio : ((typeof order.neighborhood === 'string') ? order.neighborhood : '');
    const notes = (typeof order.notes === 'string') ? order.notes : ((typeof order.observations === 'string') ? order.observations : '');
    const total = order.total || 0;
    const payMethod = order.paymentMethod || order.payMethod || 'Efectivo';
    const isTransmitting = (activeGpsOrderId === orderId);

    const fullAddrStr = barrio ? `${address} - B/ ${barrio}` : address;
    const wazeUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddrStr)}`;
    const waUrl = phone ? `https://wa.me/${phone.replace(/[^0-9]/g, '')}` : '#';

    const payIconMap = { 'efectivo': '💵', 'transferencia': '📲', 'tarjeta': '💳', 'nequi': '📱', 'daviplata': '📱' };
    const payIcon = payIconMap[(payMethod || '').toLowerCase()] || '💳';
    const initials = customerName.split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || 'CL';

    const assignment = assignments[orderId];
    const driver = getCurrentDriverInfo();
    const isMine = assignment && assignment.driverId === driver.id;
    const isTakenByOther = assignment && assignment.driverId !== driver.id;

    // Assignment badge for admin view
    const assignmentBadge = (() => {
        if (!assignment) return `<span style="background:rgba(107,114,128,0.15);color:#9ca3af;padding:2px 8px;border-radius:6px;font-weight:700;font-size:0.69rem;">🔘 Sin asignar</span>`;
        const elapsed = Math.round((Date.now() - new Date(assignment.claimedAt).getTime()) / 60000);
        const elapsedText = elapsed < 1 ? 'ahora' : `hace ${elapsed} min`;
        return `<span style="background:rgba(16,185,129,0.15);color:#10b981;padding:2px 8px;border-radius:6px;font-weight:700;font-size:0.69rem;">🛵 ${escapeHtml(assignment.driverName)} · ${elapsedText}</span>`;
    })();

    return `
        <div style="border-radius: 22px; overflow: hidden; border: 1px solid ${isMine ? '#10b981' : isTakenByOther ? 'rgba(239,68,68,0.3)' : 'var(--glass-border)'}; background: var(--surface-light); display: flex; flex-direction: column; box-shadow: 0 4px 24px rgba(0,0,0,0.18); transition: transform 0.2s, box-shadow 0.2s;"
             onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 32px rgba(0,0,0,0.28)';"
             onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 24px rgba(0,0,0,0.18)';">

            <!-- Colored top accent bar -->
            <div style="height: 5px; background: linear-gradient(90deg, ${isMine ? '#10b981' : isTakenByOther ? '#ef4444' : accentColor}, ${isMine ? '#059669' : isTakenByOther ? '#dc2626' : accentColor}88);"></div>

            <!-- Card Body -->
            <div style="padding: 1.4rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; flex: 1;">

                <!-- Header row -->
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 52px; height: 52px; border-radius: 16px; background: ${accentColor}22; border: 2px solid ${accentColor}44; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 900; color: ${accentColor}; flex-shrink: 0; letter-spacing: -1px;">
                        ${initials}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.18rem;">
                            <span style="background: ${accentColor}22; color: ${accentColor}; padding: 2px 8px; border-radius: 6px; font-weight: 900; font-size: 0.71rem; font-family: monospace;">#${escapeHtml(orderId)}</span>
                            ${isTransmitting ? `<span style="background:rgba(239,68,68,0.15);color:#ef4444;padding:2px 8px;border-radius:6px;font-weight:800;font-size:0.7rem;">📡 GPS Activo</span>` : ''}
                            ${isMine ? `<span style="background:rgba(16,185,129,0.15);color:#10b981;padding:2px 8px;border-radius:6px;font-weight:800;font-size:0.7rem;">✋ Tuyo</span>` : ''}
                            ${!isDriver ? assignmentBadge : ''}
                        </div>
                        <h4 style="margin: 0; font-size: 1.05rem; font-weight: 900; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(customerName)}</h4>
                    </div>
                    <div style="text-align: right; flex-shrink: 0;">
                        <div style="font-size: 1.18rem; font-weight: 900; color: #10b981;">$${total.toLocaleString('es-CO')}</div>
                        <div style="font-size: 0.7rem; color: var(--text-dim); font-weight: 700; display: flex; align-items: center; gap: 0.22rem; justify-content: flex-end; margin-top: 2px;">
                            <span>${payIcon}</span><span>${escapeHtml(payMethod)}</span>
                        </div>
                    </div>
                </div>

                <div style="height: 1px; background: var(--glass-border);"></div>

                <!-- Address -->
                <div style="display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.8rem; background: rgba(239,68,68,0.06); border-radius: 12px; border: 1px solid rgba(239,68,68,0.14);">
                    <div style="width: 34px; height: 34px; border-radius: 10px; background: rgba(239,68,68,0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i data-lucide="map-pin" style="width: 18px; height: 18px; color: #ef4444;"></i>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 0.68rem; text-transform: uppercase; font-weight: 800; color: #ef4444; letter-spacing: 0.5px; margin-bottom: 0.22rem;">Dirección de entrega</div>
                        <div style="font-size: 0.9rem; font-weight: 700; color: var(--text); line-height: 1.4;">${escapeHtml(address)}</div>
                        ${barrio ? `<div style="font-size: 0.78rem; color: var(--text-dim); margin-top: 0.2rem;"><strong>Barrio:</strong> ${escapeHtml(barrio)}</div>` : ''}
                    </div>
                </div>

                <!-- Phone -->
                ${phone ? `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.9rem; background: rgba(16,185,129,0.06); border-radius: 12px; border: 1px solid rgba(16,185,129,0.16);">
                    <div style="display: flex; align-items: center; gap: 0.6rem;">
                        <div style="width: 30px; height: 30px; border-radius: 8px; background: rgba(16,185,129,0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <i data-lucide="phone" style="width: 15px; height: 15px; color: #10b981;"></i>
                        </div>
                        <span style="font-size: 0.88rem; font-weight: 700; color: var(--text);">${escapeHtml(phone)}</span>
                    </div>
                    <a href="${waUrl}" target="_blank" style="padding: 5px 12px; border-radius: 8px; background: rgba(37,211,102,0.14); color: #25D366; border: 1px solid rgba(37,211,102,0.3); text-decoration: none; font-weight: 800; font-size: 0.78rem; display: flex; align-items: center; gap: 0.3rem;">
                        💬 WhatsApp
                    </a>
                </div>
                ` : ''}

                <!-- Notes -->
                ${notes ? `
                <div style="padding: 0.6rem 0.85rem; background: rgba(245,158,11,0.08); border-radius: 10px; border: 1px solid rgba(245,158,11,0.22); font-size: 0.82rem; color: var(--text-dim); display: flex; align-items: flex-start; gap: 0.5rem;">
                    <span style="flex-shrink: 0;">⚠️</span>
                    <div><strong style="color: #f59e0b;">Nota:</strong> ${escapeHtml(notes)}</div>
                </div>
                ` : ''}
            </div>

            <!-- Footer -->
            <div style="padding: 1rem 1.5rem; border-top: 1px solid var(--glass-border); background: rgba(0,0,0,0.08); display: flex; flex-direction: column; gap: 0.5rem;">
                ${isDriver ? `
                    ${isTakenByOther ? `
                        <!-- Taken by another driver -->
                        <div style="padding: 0.9rem; border-radius: 12px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); text-align: center; font-size: 0.88rem; color: #ef4444; font-weight: 800;">
                            🔒 Ya lo tiene <strong>${escapeHtml(assignment.driverName)}</strong>
                        </div>
                    ` : isMine ? `
                        <!-- My claimed order: show full action buttons -->
                        <button onclick="toggleDriverGPS('${escapeHtml(orderId)}')"
                            style="width:100%;padding:0.82rem 1rem;border-radius:12px;font-weight:800;font-size:0.88rem;display:flex;align-items:center;justify-content:center;gap:0.6rem;background:${isTransmitting ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#10b981,#059669)'};color:#fff;border:none;cursor:pointer;box-shadow:0 4px 14px ${isTransmitting ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.35)'};transition:filter 0.2s;"
                            onmouseover="this.style.filter='brightness(1.1)'" onmouseout="this.style.filter='none'">
                            <i data-lucide="${isTransmitting ? 'radio' : 'navigation'}" style="width:18px;height:18px;"></i>
                            ${isTransmitting ? '📡 Transmitiendo GPS — Toca para detener' : '🚀 Iniciar Entrega (Activar GPS)'}
                        </button>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">
                            <a href="${wazeUrl}" target="_blank"
                                style="padding:0.65rem;border-radius:10px;font-size:0.82rem;font-weight:700;display:flex;align-items:center;justify-content:center;gap:0.4rem;text-decoration:none;background:rgba(59,130,246,0.12);color:#3b82f6;border:1px solid rgba(59,130,246,0.28);transition:background 0.2s;"
                                onmouseover="this.style.background='rgba(59,130,246,0.22)'" onmouseout="this.style.background='rgba(59,130,246,0.12)'">
                                <i data-lucide="navigation-2" style="width:15px;height:15px;"></i> Navegar
                            </a>
                            <button onclick="openDriverMapModal('${escapeHtml(orderId)}','${escapeHtml(customerName)}','${escapeHtml(address)}')"
                                style="padding:0.65rem;border-radius:10px;font-size:0.82rem;font-weight:700;display:flex;align-items:center;justify-content:center;gap:0.4rem;background:rgba(168,85,247,0.12);color:#a855f7;border:1px solid rgba(168,85,247,0.28);cursor:pointer;transition:background 0.2s;"
                                onmouseover="this.style.background='rgba(168,85,247,0.22)'" onmouseout="this.style.background='rgba(168,85,247,0.12)'">
                                <i data-lucide="eye" style="width:15px;height:15px;"></i> Ver en Mapa
                            </button>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">
                            <button onclick="completeDriverDelivery('${escapeHtml(orderId)}')"
                                style="padding:0.7rem;border-radius:10px;font-size:0.85rem;font-weight:800;display:flex;align-items:center;justify-content:center;gap:0.5rem;background:rgba(16,185,129,0.1);color:#10b981;border:1px solid rgba(16,185,129,0.28);cursor:pointer;transition:background 0.2s;"
                                onmouseover="this.style.background='rgba(16,185,129,0.2)'" onmouseout="this.style.background='rgba(16,185,129,0.1)'">
                                <i data-lucide="check-circle" style="width:16px;height:16px;"></i> ✅ Entregado
                            </button>
                            <button onclick="releaseDeliveryOrder('${escapeHtml(orderId)}')"
                                style="padding:0.7rem;border-radius:10px;font-size:0.82rem;font-weight:700;display:flex;align-items:center;justify-content:center;gap:0.4rem;background:rgba(107,114,128,0.1);color:#9ca3af;border:1px solid rgba(107,114,128,0.2);cursor:pointer;transition:background 0.2s;"
                                onmouseover="this.style.background='rgba(107,114,128,0.2)'" onmouseout="this.style.background='rgba(107,114,128,0.1)'">
                                <i data-lucide="x-circle" style="width:15px;height:15px;"></i> Liberar
                            </button>
                        </div>
                    ` : `
                        <!-- Available: Claim button -->
                        <button onclick="claimDeliveryOrder('${escapeHtml(orderId)}')"
                            style="width:100%;padding:0.9rem 1rem;border-radius:12px;font-weight:900;font-size:0.95rem;display:flex;align-items:center;justify-content:center;gap:0.6rem;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(245,158,11,0.4);transition:filter 0.2s;"
                            onmouseover="this.style.filter='brightness(1.1)'" onmouseout="this.style.filter='none'">
                            <i data-lucide="hand" style="width:20px;height:20px;"></i>
                            ✋ Yo lo llevo
                        </button>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">
                            <a href="${wazeUrl}" target="_blank"
                                style="padding:0.65rem;border-radius:10px;font-size:0.82rem;font-weight:700;display:flex;align-items:center;justify-content:center;gap:0.4rem;text-decoration:none;background:rgba(59,130,246,0.12);color:#3b82f6;border:1px solid rgba(59,130,246,0.28);">
                                <i data-lucide="map" style="width:15px;height:15px;"></i> Ver Ruta
                            </a>
                            ${phone ? `
                            <a href="${waUrl}" target="_blank"
                                style="padding:0.65rem;border-radius:10px;font-size:0.82rem;font-weight:700;display:flex;align-items:center;justify-content:center;gap:0.4rem;text-decoration:none;background:rgba(37,211,102,0.12);color:#25D366;border:1px solid rgba(37,211,102,0.28);">
                                💬 WhatsApp
                            </a>
                            ` : `<div></div>`}
                        </div>
                    `}
                ` : `
                    <!-- Admin / Propietario view -->
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.55rem;">
                        <button onclick="openDriverMapModal('${escapeHtml(orderId)}','${escapeHtml(customerName)}','${escapeHtml(address)}')"
                            style="padding:0.78rem;border-radius:12px;font-weight:800;font-size:0.85rem;display:flex;align-items:center;justify-content:center;gap:0.5rem;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;cursor:pointer;box-shadow:0 4px 12px rgba(16,185,129,0.3);transition:filter 0.2s;"
                            onmouseover="this.style.filter='brightness(1.1)'" onmouseout="this.style.filter='none'">
                            <i data-lucide="map-pin" style="width:17px;height:17px;"></i> Rastreo GPS
                        </button>
                        <a href="${wazeUrl}" target="_blank"
                            style="padding:0.78rem;border-radius:12px;font-size:0.85rem;font-weight:700;display:flex;align-items:center;justify-content:center;gap:0.5rem;text-decoration:none;background:rgba(59,130,246,0.12);color:#3b82f6;border:1px solid rgba(59,130,246,0.28);transition:background 0.2s;"
                            onmouseover="this.style.background='rgba(59,130,246,0.22)'" onmouseout="this.style.background='rgba(59,130,246,0.12)'">
                            <i data-lucide="map" style="width:17px;height:17px;"></i> Abrir Mapa
                        </a>
                    </div>
                    ${assignment ? `
                    <button onclick="releaseDeliveryOrder('${escapeHtml(orderId)}')"
                        style="width:100%;padding:0.62rem;border-radius:10px;font-size:0.8rem;font-weight:700;display:flex;align-items:center;justify-content:center;gap:0.4rem;background:rgba(239,68,68,0.08);color:#ef4444;border:1px solid rgba(239,68,68,0.2);cursor:pointer;transition:background 0.2s;"
                        onmouseover="this.style.background='rgba(239,68,68,0.18)'" onmouseout="this.style.background='rgba(239,68,68,0.08)'">
                        <i data-lucide="user-x" style="width:15px;height:15px;"></i> 🔄 Liberar / Reasignar
                    </button>
                    ` : ''}
                `}
            </div>
        </div>
    `;
}

let currentDeliveryFilterTab = 'available'; // 'available', 'mine'

function setDeliveryFilterTab(tab) {
    currentDeliveryFilterTab = tab;
    renderDriverDeliveriesSection();
}
window.setDeliveryFilterTab = setDeliveryFilterTab;

function renderDriverDeliveriesSection() {
    const container = document.getElementById('driver-deliveries-list');
    if (!container) return;

    const isDriver = (typeof currentEmployeeRole !== 'undefined' && currentEmployeeRole === 'domiciliario');

    // Update status pill
    const statusPill = document.getElementById('driver-gps-status-pill');
    const statusText = document.getElementById('driver-gps-status-text');
    if (statusPill && statusText) {
        if (isDriver) {
            statusPill.style.background = activeGpsOrderId ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.1)';
            statusPill.style.color = '#10b981';
            statusText.textContent = activeGpsOrderId ? '📡 Transmitiendo GPS en Vivo' : 'Listo para Entregas';
        } else {
            statusPill.style.background = 'rgba(59, 130, 246, 0.15)';
            statusPill.style.color = '#3b82f6';
            statusPill.style.borderColor = 'rgba(59, 130, 246, 0.3)';
            statusText.textContent = '📊 Supervisión de Domicilios';
        }
    }

    const allOrders = getOrders();
    // Only show delivery orders that have been DISPATCHED by the owner.
    // Pending/confirmed orders stay in Pedidos tab until the owner dispatches them.
    const deliveryOrders = allOrders.filter(o => {
        if (o.status !== 'dispatched') return false;
        const isDeliv = (
            o.deliveryType === 'delivery' ||
            o.type === 'domicilio' ||
            o.customer?.deliveryType === 'delivery' ||
            (o.deliveryFee && o.deliveryFee > 0) ||
            (o.address && typeof o.address === 'string' && o.address.trim().length > 2)
        );
        return isDeliv;
    });

    // Use centralized badge updater so it's always consistent with renderOrders
    updateDomiciliosBadge();

    if (deliveryOrders.length === 0) {
        container.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:4rem 2rem;background:var(--surface-light);border-radius:24px;border:1px dashed var(--glass-border);">
                <i data-lucide="check-circle-2" style="width:48px;height:48px;color:#10b981;margin-bottom:1rem;opacity:0.7;display:block;margin-left:auto;margin-right:auto;"></i>
                <h4 style="margin:0 0 0.4rem;font-size:1.2rem;font-weight:800;color:var(--text);">¡No hay domicilios pendientes!</h4>
                <p style="margin:0;font-size:0.88rem;color:var(--text-dim);">Todos los domicilios han sido entregados o no hay pedidos activos.</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    const assignments = getOrderAssignments();
    const driver = getCurrentDriverInfo();

    const unassigned = deliveryOrders.filter(o => !assignments[o.id || o.orderId]);

    // For driver: show their claimed orders. For owner/admin: show all active assigned deliveries in progress.
    const assignedList = isDriver
        ? deliveryOrders.filter(o => {
            const a = assignments[o.id || o.orderId];
            return a && a.driverId === driver.id;
        })
        : deliveryOrders.filter(o => {
            const a = assignments[o.id || o.orderId];
            return !!a;
        });

    const leftTabLabel = isDriver ? 'Entrantes' : 'Sin Asignar';
    const rightTabLabel = isDriver ? 'Mis Domicilios' : 'Domicilios en Camino';

    // Ensure valid active tab
    if (currentDeliveryFilterTab !== 'mine' && currentDeliveryFilterTab !== 'available') {
        currentDeliveryFilterTab = assignedList.length > 0 ? 'mine' : 'available';
    }
    const activeTab = currentDeliveryFilterTab;

    // Top Filter Bar HTML
    const filterBarHtml = `
        <div style="grid-column:1/-1; display:flex; align-items:center; justify-content:center; gap:0.6rem; margin-bottom:1.5rem; flex-wrap:wrap; background:rgba(0,0,0,0.15); padding:0.4rem; border-radius:16px; border:1px solid var(--glass-border);">
            <button onclick="setDeliveryFilterTab('available')"
                style="flex:1; min-width:140px; padding:0.7rem 1.2rem; border-radius:12px; font-weight:800; font-size:0.88rem; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.5rem; transition:all 0.2s; ${activeTab === 'available' ? 'background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; box-shadow:0 4px 14px rgba(245,158,11,0.35);' : 'background:transparent; color:var(--text-dim);'}">
                <i data-lucide="bell" style="width:17px;height:17px;"></i>
                ${leftTabLabel} <span style="background:${activeTab === 'available' ? 'rgba(255,255,255,0.25)' : 'rgba(245,158,11,0.15)'}; color:${activeTab === 'available' ? '#fff' : '#f59e0b'}; padding:2px 8px; border-radius:10px; font-size:0.78rem; font-weight:900;">${unassigned.length}</span>
            </button>

            <button onclick="setDeliveryFilterTab('mine')"
                style="flex:1; min-width:140px; padding:0.7rem 1.2rem; border-radius:12px; font-weight:800; font-size:0.88rem; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.5rem; transition:all 0.2s; ${activeTab === 'mine' ? 'background:linear-gradient(135deg,#10b981,#059669); color:#fff; box-shadow:0 4px 14px rgba(16,185,129,0.35);' : 'background:transparent; color:var(--text-dim);'}">
                <i data-lucide="${isDriver ? 'package-check' : 'bike'}" style="width:17px;height:17px;"></i>
                ${rightTabLabel} <span style="background:${activeTab === 'mine' ? 'rgba(255,255,255,0.25)' : 'rgba(16,185,129,0.15)'}; color:${activeTab === 'mine' ? '#fff' : '#10b981'}; padding:2px 8px; border-radius:10px; font-size:0.78rem; font-weight:900;">${assignedList.length}</span>
            </button>
        </div>
    `;

    let contentHtml = '';

    if (activeTab === 'mine') {
        if (assignedList.length === 0) {
            const emptyTitle = isDriver ? 'No tienes domicilios asignados' : 'No hay domicilios en camino';
            const emptySub = isDriver
                ? 'Ve a la pestaña "Entrantes" para reclamar un pedido disponible con ✋ Yo lo llevo.'
                : 'Los pedidos asignados a los domiciliarios aparecerán aquí para tu supervisión en tiempo real.';
            contentHtml = `
                <div style="grid-column:1/-1;text-align:center;padding:3rem 1.5rem;background:var(--surface-light);border-radius:20px;border:1px dashed var(--glass-border);">
                    <i data-lucide="bike" style="width:40px;height:40px;color:#10b981;margin-bottom:0.8rem;opacity:0.6;display:block;margin-left:auto;margin-right:auto;"></i>
                    <h5 style="margin:0 0 0.3rem;font-size:1.1rem;font-weight:800;color:var(--text);">${emptyTitle}</h5>
                    <p style="margin:0;font-size:0.85rem;color:var(--text-dim);">${emptySub}</p>
                </div>
            `;
        } else {
            contentHtml = assignedList.map((o, i) => buildDeliveryCard(o, i, isDriver, assignments)).join('');
        }
    } else {
        // Tab 'available' (Entrantes / Sin Asignar)
        if (unassigned.length === 0) {
            const emptyTitle = isDriver ? '¡No hay domicilios entrantes sin asignar!' : 'No hay domicilios sin asignar';
            const emptySub = isDriver
                ? 'Todos los pedidos activos ya fueron reclamados por repartidores.'
                : 'Todos los domicilios activos ya se encuentran asignados a un domiciliario.';
            contentHtml = `
                <div style="grid-column:1/-1;text-align:center;padding:3rem 1.5rem;background:var(--surface-light);border-radius:20px;border:1px dashed var(--glass-border);">
                    <i data-lucide="check-check" style="width:40px;height:40px;color:#f59e0b;margin-bottom:0.8rem;opacity:0.6;display:block;margin-left:auto;margin-right:auto;"></i>
                    <h5 style="margin:0 0 0.3rem;font-size:1.1rem;font-weight:800;color:var(--text);">${emptyTitle}</h5>
                    <p style="margin:0;font-size:0.85rem;color:var(--text-dim);">${emptySub}</p>
                </div>
            `;
        } else {
            contentHtml = unassigned.map((o, i) => buildDeliveryCard(o, i, isDriver, assignments)).join('');
        }
    }

    container.innerHTML = filterBarHtml + contentHtml;
    if (window.lucide) lucide.createIcons();
}




function toggleDriverGPS(orderId) {
    if (activeGpsOrderId === orderId) {
        if (activeWatchPositionId !== null) {
            navigator.geolocation.clearWatch(activeWatchPositionId);
            activeWatchPositionId = null;
        }
        activeGpsOrderId = null;
        updateGpsStatusPill(false);
        if (typeof showAdminNotification === 'function') showAdminNotification('📡 Transmisión de GPS detenida', 'info');
        renderDriverDeliveriesSection();
        return;
    }

    if (!navigator.geolocation) {
        if (typeof showAdminNotification === 'function') showAdminNotification('❌ Tu navegador o dispositivo no soporta localización GPS', 'error');
        return;
    }

    if (typeof showAdminNotification === 'function') showAdminNotification('🚀 GPS Activado. Transmitiendo ubicación...', 'success');
    activeGpsOrderId = orderId;
    updateGpsStatusPill(true);

    activeWatchPositionId = navigator.geolocation.watchPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            fetch('/api/driver/location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, lat, lng })
            }).catch(e => console.log('Location update error', e));
        },
        (err) => {
            console.warn('GPS position error:', err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    renderDriverDeliveriesSection();
}

function updateGpsStatusPill(isActive) {
    const pill = document.getElementById('driver-gps-status-pill');
    const text = document.getElementById('driver-gps-status-text');
    if (!pill || !text) return;
    if (isActive) {
        pill.style.background = 'rgba(16, 185, 129, 0.25)';
        pill.style.color = '#10b981';
        pill.style.borderColor = '#10b981';
        text.textContent = '📡 Transmitiendo GPS en Vivo';
    } else {
        pill.style.background = 'rgba(16, 185, 129, 0.1)';
        pill.style.color = '#10b981';
        pill.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        text.textContent = 'Listo para Entregas';
    }
}

function completeDriverDelivery(orderId) {
    const doComplete = () => {
        if (activeGpsOrderId === orderId && activeWatchPositionId !== null) {
            navigator.geolocation.clearWatch(activeWatchPositionId);
            activeWatchPositionId = null;
            activeGpsOrderId = null;
            updateGpsStatusPill(false);
        }
        // Clear assignment on delivery
        const assignments = getOrderAssignments();
        delete assignments[orderId];
        saveOrderAssignments(assignments);

        const allOrders = getOrders();
        const idx = allOrders.findIndex(o => (o.id || o.orderId) === orderId);
        if (idx !== -1) {
            allOrders[idx].status = 'completed';
            // Stamp the driver's name so "Mis Domis" history filter works correctly
            const driverInfo = getCurrentDriverInfo();
            if (driverInfo && driverInfo.name) {
                allOrders[idx].attendedBy = driverInfo.name;
                allOrders[idx].deliveredBy = driverInfo.name;
            }
            localStorage.setItem('streetfeed_orders', JSON.stringify(allOrders));
        }
        if (typeof showAdminNotification === 'function') showAdminNotification(`✅ Pedido #${orderId} marcado como Entregado`, 'success');
        renderDriverDeliveriesSection();
        if (typeof window.renderOrders === 'function') window.renderOrders();
    };

    if (typeof showConfirm === 'function') {
        showConfirm(
            `¿Confirmar que el pedido #${orderId} fue entregado con éxito al cliente?`,
            doComplete,
            '✅ Sí, Entregado',
            'linear-gradient(135deg, #10b981, #059669)',
            'Confirmar Entrega'
        );
    } else if (confirm(`¿Confirmar que el pedido #${orderId} fue entregado con éxito?`)) {
        doComplete();
    }
}

function openDriverMapModal(orderId, customerName, address) {
    const modal = document.getElementById('driver-map-modal');
    const title = document.getElementById('driver-map-title');
    const subtitle = document.getElementById('driver-map-subtitle');
    if (!modal) return;

    if (title) title.textContent = `Rastreo GPS en Vivo - #${orderId}`;
    if (subtitle) subtitle.textContent = `Entrega a ${customerName} (${address})`;
    modal.classList.remove('hidden');

    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
        if (!adminDriverMapInstance) {
            adminDriverMapInstance = L.map('admin-driver-map').setView([10.4631, -73.2532], 14);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(adminDriverMapInstance);
        } else {
            adminDriverMapInstance.invalidateSize();
        }

        const scooterHtml = `<div style="background:#10b981; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:22px; box-shadow:0 4px 15px rgba(16,185,129,0.5); border:3px solid #fff;">🛵</div>`;
        const scooterIcon = L.divIcon({ html: scooterHtml, className: 'scooter-marker-icon', iconSize: [44, 44], iconAnchor: [22, 22] });

        const fetchLoc = () => {
            fetch(`/api/driver/location/${orderId}`)
                .then(r => r.json())
                .then(data => {
                    if (data && data.lat && data.lng) {
                        const pos = [data.lat, data.lng];
                        if (!adminDriverMapMarker) {
                            adminDriverMapMarker = L.marker(pos, { icon: scooterIcon }).addTo(adminDriverMapInstance);
                            adminDriverMapInstance.setView(pos, 15);
                        } else {
                            adminDriverMapMarker.setLatLng(pos);
                        }
                    }
                })
                .catch(e => console.log(e));
        };

        fetchLoc();
        if (adminDriverMapInterval) clearInterval(adminDriverMapInterval);
        adminDriverMapInterval = setInterval(fetchLoc, 4000);
    }, 200);
}

function closeDriverMapModal() {
    const modal = document.getElementById('driver-map-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    if (adminDriverMapInterval) {
        clearInterval(adminDriverMapInterval);
        adminDriverMapInterval = null;
    }
    // Reset map instance so it re-initializes next time
    if (adminDriverMapInstance) {
        try { adminDriverMapInstance.remove(); } catch(e) {}
        adminDriverMapInstance = null;
        adminDriverMapMarker = null;
    }
}

// Exportar globalmente
window.openNewEmployeeModal = openNewEmployeeModal;
window.closeEmployeeModal = closeEmployeeModal;
window.handleSaveEmployee = handleSaveEmployee;
window.editEmployee = editEmployee;
window.confirmDeleteEmployee = confirmDeleteEmployee;
window.applyRolePermissions = applyRolePermissions;
window.renderDriverDeliveriesSection = renderDriverDeliveriesSection;
window.toggleDriverGPS = toggleDriverGPS;
window.completeDriverDelivery = completeDriverDelivery;
window.openDriverMapModal = openDriverMapModal;
window.closeDriverMapModal = closeDriverMapModal;
window.claimDeliveryOrder = claimDeliveryOrder;
window.releaseDeliveryOrder = releaseDeliveryOrder;
window.forceReassignOrder = forceReassignOrder;
window.getOrderAssignments = getOrderAssignments;
window.buildDeliveryCard = buildDeliveryCard;
// Export GPS state so script.js can clean them up on logout
Object.defineProperty(window, 'activeWatchPositionId', {
    get: () => activeWatchPositionId,
    set: (v) => { activeWatchPositionId = v; }
});
Object.defineProperty(window, 'activeGpsOrderId', {
    get: () => activeGpsOrderId,
    set: (v) => { activeGpsOrderId = v; }
});



