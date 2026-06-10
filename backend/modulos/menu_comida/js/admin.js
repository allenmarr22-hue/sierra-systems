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
        'conf-closed-msg': state.config.storeClosedMsg
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
    { id: 'pizza',      label: 'Pizzería',     emoji: String.fromCodePoint(0x1F355), emojis: `${String.fromCodePoint(0x1F355)} ${String.fromCodePoint(0x1F3C7)}`, tagline: 'Pizza artesanal hecha con amor' },
    { id: 'coffee',     label: 'Cafetería',    emoji: String.fromCodePoint(0x2615), emojis: `${String.fromCodePoint(0x2615)} ${String.fromCodePoint(0x1F950)}`, tagline: 'El mejor café de tu día' },
    { id: 'bakery',     label: 'Panadería',    emoji: String.fromCodePoint(0x1F956), emojis: `${String.fromCodePoint(0x1F956)} ${String.fromCodePoint(0x1F9C1)}`, tagline: 'Recién horneado cada mañana' },
    { id: 'sushi',      label: 'Sushi',        emoji: String.fromCodePoint(0x1F363), emojis: `${String.fromCodePoint(0x1F363)} ${String.fromCodePoint(0x1F371)}`, tagline: 'Sushi fresco y auténtico' },
    { id: 'seafood',    label: 'Mariscos',     emoji: String.fromCodePoint(0x1F99E), emojis: `${String.fromCodePoint(0x1F99E)} ${String.fromCodePoint(0x1F41F)}`, tagline: 'Lo mejor del mar en tu mesa' },
    { id: 'chicken',    label: 'Pollo',        emoji: String.fromCodePoint(0x1F357), emojis: `${String.fromCodePoint(0x1F357)} ${String.fromCodePoint(0x1F336)}`, tagline: 'Crujiente por fuera, jugoso por dentro' },
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
            updateBizPreview(bizId);
        };
    }

    const resetBtn = document.getElementById('reset-wa-auto');
    if (resetBtn) {
        resetBtn.onclick = () => {
            state.config.waManualMode = false;
            updateBizPreview(bizId);
        };
    }

    const emojisInp = document.getElementById('wa-custom-emojis-inp');
    if (emojisInp) {
        emojisInp.oninput = (e) => {
            state.config.waCustomEmojis = e.target.value;
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
    renderPromoConfig();
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
            document.getElementById(tabId).classList.remove('hidden');
            
            if (tabId === 'stats-tab') {
                renderStats('today');
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
            state.config.instagram = document.getElementById('conf-instagram').value;
            state.config.facebook = document.getElementById('conf-facebook').value;
            
            // Resolve emojis from selected business type
            const activeBizCard = document.querySelector('.biz-type-card.active');
            const bizId = activeBizCard ? activeBizCard.dataset.bizId : (state.config.bizType || 'burgers');
            state.config.bizType = bizId;
            if (bizId === 'custom') {
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
            catForm.reset();
            catModal.classList.remove('hidden');
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
    if (addItemBtn) addItemBtn.addEventListener('click', () => openAdminModal());
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
    if (addComboBtn) addComboBtn.addEventListener('click', () => openComboModal());

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
    if (addDiscountBtn) addDiscountBtn.addEventListener('click', () => openDiscountModal());

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
    salesTrend: null
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

    // 1b. Handle Order Sub-Tabs (only incoming / pending now)
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

        document.getElementById('incoming-orders-list').classList.toggle('hidden', subtab !== 'incoming');
        document.getElementById('pending-orders-list').classList.toggle('hidden', subtab !== 'pending');

        // (Search bar is now permanently visible, no need to hide on tab switch)
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
                
                // Active trigger style if it's a range and not "today" (or just highlight it)
                if (dropdown.id === 'range-dropdown') {
                    trigger.classList.add('active-trigger');
                    // Reset month if needed
                    const monthDisplay = document.querySelector('#current-month');
                    if (monthDisplay) monthDisplay.textContent = "Meses...";
                    document.querySelectorAll('#month-dropdown li').forEach(li => li.classList.remove('active'));
                } else {
                    // It's a month
                    const rangeDisplay = document.querySelector('#current-range');
                    if (rangeDisplay) rangeDisplay.textContent = "Rango..."; // O dejarlo en el ultimo?
                    document.querySelectorAll('#range-dropdown li').forEach(li => li.classList.remove('active'));
                    trigger.classList.add('active-trigger');
                }

                // Clear date input
                const dateInput = document.getElementById('stats-date-filter');
                if (dateInput) dateInput.value = "";

                // Trigger Logic
                if (dropdown.id === 'range-dropdown') {
                    renderStats(value);
                } else {
                    renderStats('month', value);
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

// Specific Date Picker - Unified logic
const dateFilter = document.getElementById('stats-date-filter');
if (dateFilter) {
    dateFilter.addEventListener('change', (e) => {
        if (e.target.value !== "") {
            // Limpiar dropdowns custom
            document.querySelectorAll('.custom-dropdown li').forEach(li => li.classList.remove('active'));
            document.querySelectorAll('.dropdown-trigger').forEach(tr => tr.classList.remove('active-trigger'));
            const rangeDisp = document.querySelector('#current-range');
            const monthDisp = document.querySelector('#current-month');
            if (rangeDisp) rangeDisp.textContent = "Rango...";
            if (monthDisp) monthDisp.textContent = "Meses...";

            renderStats(null, null, e.target.value);
        }
    });
}

// Re-init dropdowns after content load or render
initCustomDropdowns();



window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('streetfeed_')) {
        // Actualizar estadísticas si la pestaña está activa
        const statsTab = document.getElementById('stats-tab');
        if (statsTab && !statsTab.classList.contains('hidden')) {
            const activeBtn = document.querySelector('.filter-btn.active');
            const monthVal = document.getElementById('stats-month-filter') ? document.getElementById('stats-month-filter').value : "";
            if (monthVal !== "") renderStats('month', monthVal);
            else renderStats(activeBtn ? activeBtn.dataset.range : 'today');
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
    
    // Cambiar icono dinámicamente si es una acción de peligro
    if (iconContainer) {
        const isDanger = buttonColor === '#d32f2f' || buttonText.toLowerCase().includes('eliminar') || buttonText.toLowerCase().includes('vaciar') || buttonText.toLowerCase().includes('todo');
        
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

let historyDateFilter = null;
window.historySearchQuery = null;

window.renderOrders = function() {
    const orders = getOrders();
    const incomingList = document.getElementById('incoming-orders-list');
    const pendingList = document.getElementById('pending-orders-list');
    const historyList = document.getElementById('history-list-content');
    if (!incomingList || !pendingList || !historyList) return;

    // Filter by statuses
    let incoming = orders.filter(o => o.status === 'pending' || !o.status).reverse();
    let confirmed = orders.filter(o => o.status === 'confirmed').reverse();
    let history = orders.filter(o => o.status === 'accepted' || o.status === 'cancelled').reverse();

    // Filtro por Búsqueda principal (Pedidos: Entrantes y Pendientes)
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
        confirmed = confirmed.filter(filterFn);
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

    // Actualizar el Badge en el Sidebar y en las Pestañas
    const badge = document.getElementById('order-count-badge');
    const badgeInc = document.getElementById('badge-incoming');
    const badgePen = document.getElementById('badge-pending');

    if (badgeInc) {
        badgeInc.textContent = incoming.length;
        badgeInc.style.display = incoming.length > 0 ? 'inline-block' : 'none';
    }
    if (badgePen) {
        badgePen.textContent = confirmed.length;
        badgePen.style.display = confirmed.length > 0 ? 'inline-block' : 'none';
    }

    if (badge) {
        // Mostramos la suma de entrantes y pendientes en el badge lateral
        const totalActive = incoming.length + confirmed.length;
        badge.textContent = totalActive;
        if (totalActive > 0) badge.classList.remove('hidden');
        else badge.classList.add('hidden');
    }

    // Calcular Ventas Totales (Solo Aceptados)
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

    // Render Incoming (Entrantes)
    if (incoming.length === 0) {
        incomingList.innerHTML = `<div class="empty-state-orders" style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: var(--text-dim);"><i data-lucide="coffee" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.3;"></i><p>No hay pedidos pendientes.</p></div>`;
    } else {
        incomingList.innerHTML = incoming.map(o => createOrderCard(o)).join('');
    }

    // Render Pending (Confirmados/En Preparación)
    if (confirmed.length === 0) {
        pendingList.innerHTML = `<div class="empty-state-orders" style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: var(--text-dim);"><i data-lucide="timer" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.3;"></i><p>No hay pedidos en preparación.</p></div>`;
    } else {
        pendingList.innerHTML = confirmed.map(o => createOrderCard(o)).join('');
    }

    // Render History
    if (history.length === 0) {
        historyList.innerHTML = `<div class="empty-state-orders" style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: var(--text-dim);"><i data-lucide="archive" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.3;"></i><p>${historyDateFilter ? 'No hay pedidos para esta fecha.' : 'El historial está vacío.'}</p></div>`;
    } else {
        historyList.innerHTML = history.map(o => createOrderCard(o)).join('');
    }
    
    if (window.lucide) lucide.createIcons();
}

// Estado global para modo limpieza
window.isCleaningMode = false;
window.toggleCleaningMode = function() {
    window.isCleaningMode = !window.isCleaningMode;
    
    const clearBtn = document.getElementById('clear-all-history');
    const toolsContainer = clearBtn?.parentElement;

    if (clearBtn && toolsContainer) {
        if (window.isCleaningMode) {
            // Cambiar LIMPIAR por BORRAR TODO
            clearBtn.innerHTML = '<i data-lucide="trash-2"></i> TODO';
            clearBtn.style.background = '#d32f2f';
            clearBtn.style.color = '#fff';
            clearBtn.title = "Borrar todo el historial permanentemente";
            
            // Añadir botón CANCELAR si no existe
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
            // Restaurar a LIMPIAR
            clearBtn.innerHTML = '<i data-lucide="trash-2"></i> LIMPIAR';
            clearBtn.style.background = '#d32f2f';
            clearBtn.title = "";
            
            // Quitar botón CANCELAR
            const cancelBtn = document.getElementById('cancel-cleaning-btn');
            if (cancelBtn) cancelBtn.remove();
        }
        if (window.lucide) lucide.createIcons();
    }
    
    window.renderOrders();
};

function createOrderCard(order) {
    const isIncoming = order.status === 'pending' || !order.status;
    const isConfirmed = order.status === 'confirmed';
    const isHistory = order.status === 'accepted' || order.status === 'cancelled';
    const statusClass = `status-${order.status || 'pending'}`;
    const date = new Date(order.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    // --- DISEÑO DIFERENCIADO: HISTORIAL vs ACTIVOS ---
    let gridCols = isHistory 
        ? 'auto 175px 190px 130px auto' 
        : '240px 175px 190px 130px auto';

    // Ajuste especial para Pendientes para que quepan bien los 3 botones (Confirmar es ancho)
    if (isConfirmed) {
        gridCols = '240px 175px 190px 110px auto';
    }

    return `
        <div class="order-card-pro ${statusClass}" data-id="${order.id}" style="display: grid; grid-template-columns: ${gridCols}; align-items: center; background: var(--surface-light); border: 1px solid var(--glass-border); border-radius: 16px; margin-bottom: 1rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: var(--shadow); min-height: ${isHistory ? '55px' : '85px'}; overflow: hidden; padding-right: ${isHistory ? '0.8rem' : '1.2rem'};">
            
            <!-- 1. Identidad -->
            <div style="padding: 0 0.4rem 0 1.5rem; display: flex; flex-direction: ${isHistory ? 'row' : 'column'}; align-items: ${isHistory ? 'center' : 'flex-start'}; justify-content: flex-start; gap: ${isHistory ? '1.2rem' : '0.2rem'}; height: 100%; min-width: ${isHistory ? '120px' : '220px'}; flex-shrink: 0;">
                <div style="display: flex; align-items: center; gap: ${isHistory ? '0.6rem' : '0.8rem'}; overflow: hidden; width: ${isHistory ? 'auto' : '100%'}; flex-shrink: 0;">
                    <div style="width: 85px; flex-shrink: 0;">
                        <span style="font-size: 0.65rem; color: var(--text-dim); font-weight: 800; background: rgba(var(--text-rgb), 0.08); padding: 0.15rem 0.4rem; border-radius: 4px; display: inline-block; width: 100%; text-align: center;">#${order.id}</span>
                    </div>
                    
                    ${isHistory ? `
                        <div style="width: 100px; overflow: hidden; flex-shrink: 0;">
                            <h4 style="margin: 0; font-size: 0.85rem; font-weight: 800; color: var(--text); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${(order.customer?.name || 'Cliente').split(' ')[0]}</h4>
                        </div>
                    ` : `
                        <h4 style="margin: 0; font-size: 1.1rem; font-weight: 800; color: var(--text); white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${order.customer?.name || 'Cliente'}</h4>
                    `}
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
                <div style="display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; padding: 0.35rem 0.7rem; border-radius: 6px; background: ${order.customer?.payment === 'Efectivo' ? '#4caf50' : '#2563eb'}; box-shadow: 0 4px 10px ${order.customer?.payment === 'Efectivo' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(37, 99, 235, 0.2)'}; white-space: nowrap;">
                    <i data-lucide="${order.customer?.payment === 'Efectivo' ? 'banknote' : 'smartphone'}" style="width: 12px; color: #fff;"></i>
                    <span style="font-size: 0.65rem; font-weight: 900; color: #fff; text-transform: uppercase; letter-spacing: 0.5px;">${order.customer?.payment === 'Efectivo' ? 'EFECTIVO' : 'TRANSF.'}</span>
                </div>
            </div>

            <div class="order-total-cell" style="display: flex; align-items: center; justify-content: flex-start; border-left: ${isHistory ? '1px solid var(--glass-border)' : 'none'}; padding: 0 0.8rem; align-self: stretch; width: 130px; flex-shrink: 0;">
                <span style="font-size: 1.1rem; font-weight: 950; color: var(--text); letter-spacing: -0.5px;">$${order.total.toLocaleString()}</span>
            </div>

            <!-- 5. Acciones -->
            <div style="display: flex; align-items: center; gap: 0.6rem; padding: 0 0.5rem; justify-content: flex-end; width: auto; flex-shrink: 0;">
                ${isIncoming ? `
                    <button onclick="window.updateOrderStatus('${order.id}', 'confirmed')" style="padding: 0 1.2rem; height: 44px; border-radius: 12px; background: #4caf50; border: none; color: #fff; cursor: pointer; font-weight: 900; font-size: 0.8rem; letter-spacing: 0.5px; transition: all 0.2s; box-shadow: 0 4px 10px rgba(76, 175, 80, 0.2);">
                        ACEPTAR
                    </button>
                    <button onclick="window.updateOrderStatus('${order.id}', 'cancelled')" style="width: 44px; height: 44px; border-radius: 12px; background: #d32f2f; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; box-shadow: 0 4px 10px rgba(211, 47, 47, 0.2);">
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="white" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                    <button onclick="window.showOrderDetails('${order.id}')" style="width: 44px; height: 44px; border-radius: 12px; background: rgba(var(--text-rgb), 0.05); border: 1px solid var(--glass-border); color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Ver Detalle">
                        <i data-lucide="eye" style="width: 20px; height: 20px;"></i>
                    </button>
                ` : isConfirmed ? `
                    <button onclick="window.updateOrderStatus('${order.id}', 'accepted')" style="padding: 0 1.2rem; height: 44px; border-radius: 12px; background: #4caf50; border: none; color: #fff; cursor: pointer; font-weight: 900; font-size: 0.8rem; letter-spacing: 0.5px; transition: all 0.2s; box-shadow: 0 4px 10px rgba(76, 175, 80, 0.2);">
                        CONFIRMAR
                    </button>
                    <button onclick="window.updateOrderStatus('${order.id}', 'cancelled')" style="width: 44px; height: 44px; border-radius: 12px; background: #d32f2f; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; box-shadow: 0 4px 10px rgba(211, 47, 47, 0.2);">
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="white" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                    <button onclick="window.showOrderDetails('${order.id}')" style="width: 44px; height: 44px; border-radius: 12px; background: rgba(var(--text-rgb), 0.05); border: 1px solid var(--glass-border); color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Ver Detalle">
                        <i data-lucide="eye" style="width: 20px; height: 20px;"></i>
                    </button>
                ` : `
                    <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.6rem; transition: all 0.3s ease;">
                        <!-- Columna Estado -->
                        <div style="width: 105px; flex-shrink: 0; display: flex; justify-content: center;">
                            <div style="padding: 0.3rem 0; border-radius: 8px; background: ${order.status === 'accepted' ? '#4caf50' : '#d32f2f'}; box-shadow: 0 4px 10px ${order.status === 'accepted' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(211, 47, 47, 0.2)'}; width: 100%; text-align: center;">
                                <span style="font-size: 0.65rem; font-weight: 900; color: #fff; text-transform: uppercase; letter-spacing: 1px;">${order.status === 'accepted' ? 'ACEPTADO' : 'CANCELADO'}</span>
                            </div>
                        </div>
                        
                        <!-- Botón Detalles -->
                        <button onclick="window.showOrderDetails('${order.id}')" style="width: 50px; height: 34px; border-radius: 8px; background: rgba(var(--text-rgb), 0.05); border: 1px solid var(--glass-border); color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Ver Detalle">
                            <i data-lucide="eye" style="width: 18px; height: 18px;"></i>
                        </button>
                        
                        <!-- Botón Eliminar -->
                        ${window.isCleaningMode ? `
                            <div style="width: 50px; flex-shrink: 0;">
                                <button onclick="window.deleteHistoryOrder('${order.id}')" style="width: 100%; height: 34px; border-radius: 8px; background: rgba(211, 47, 47, 0.15); border: 1px solid rgba(211, 47, 47, 0.3); color: #ff5252; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Eliminar este pedido">
                                    <i data-lucide="trash-2" style="width: 18px; height: 18px;"></i>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `}
            </div>
        </div>
    `;
}

window.updateOrderStatus = function(id, newStatus) {
    let actionMsg = '¿Realizar esta acción?';
    let confirmBtn = 'Confirmar';
    let confirmColor = '#4caf50';

    if (newStatus === 'confirmed') {
        actionMsg = '¿Aceptar este pedido y pasarlo a preparación?';
        confirmBtn = 'Pasar a Pendientes';
        confirmColor = '#4caf50';
    } else if (newStatus === 'accepted') {
        actionMsg = '¿Confirmar pedido finalizado y pasarlo al historial?';
        confirmBtn = 'Confirmar Entrega';
        confirmColor = '#4caf50';
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
            if (newStatus === 'accepted') toastMsg = '✅ Pedido finalizado';
            if (newStatus === 'cancelled') toastMsg = '⚠️ Pedido cancelado';
            if (newStatus === 'confirmed') toastMsg = '🍳 En preparación';
            
            showToast(toastMsg);
            
            // IMPORTANTE: Redibujar TODO para sincronizar UI y Badge
            window.renderOrders();
            if (typeof renderStats === 'function') renderStats(); 
        },
        confirmBtn,
        confirmColor
    );
}

window.showOrderDetails = function(id) {
    const orders = getOrders();
    const order = orders.find(o => String(o.id) === String(id));
    if (!order) {
        console.error("Order not found:", id);
        return;
    }

    document.getElementById('detail-order-id').textContent = `Pedido ${order.id}`;
    document.getElementById('detail-order-date').textContent = new Date(order.date).toLocaleString();
    document.getElementById('detail-customer-name').textContent = order.customer?.name || 'No especificado';
    document.getElementById('detail-customer-phone').innerHTML = order.customer?.phone ? `<a href="https://wa.me/57${order.customer.phone.replace(/\D/g,'')}" target="_blank" style="color: #25d366; text-decoration: none; border-bottom: 1px dashed #25d366; padding-bottom: 1px;" title="Abrir WhatsApp">${order.customer.phone}</a>` : '---';
    document.getElementById('detail-customer-address').textContent = order.customer?.address || '---';
    const noteEl = document.getElementById('detail-customer-note');
    if (noteEl) noteEl.textContent = order.customer?.note || 'Sin notas adicionales.';
    
    const paymentEl = document.getElementById('detail-customer-payment');
    if (paymentEl) paymentEl.textContent = order.customer?.payment || 'No especificado';
    
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

    const footer = document.getElementById('order-action-footer');
    if (order.status === 'pending' || !order.status) {
        footer.innerHTML = `
            <button class="admin-btn-action" style="width:100%; height: 50px; border-radius: 12px; border:1px solid #ff5252; color:#ff5252; background: transparent; font-weight: 800; cursor: pointer;" onclick="window.updateOrderStatus('${order.id}', 'cancelled'); document.getElementById('order-details-modal').classList.add('hidden');">CANCELAR</button>
            <button class="admin-btn-action" style="width:100%; height: 50px; border-radius: 12px; background:#4caf50; color:white; border: none; font-weight: 900; cursor: pointer; box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);" onclick="window.updateOrderStatus('${order.id}', 'confirmed'); document.getElementById('order-details-modal').classList.add('hidden');">ACEPTAR</button>
        `;
    } else if (order.status === 'confirmed') {
        footer.innerHTML = `
            <button class="admin-btn-action" style="width:100%; height: 50px; border-radius: 12px; border:1px solid #ff5252; color:#ff5252; background: transparent; font-weight: 800; cursor: pointer;" onclick="window.updateOrderStatus('${order.id}', 'cancelled'); document.getElementById('order-details-modal').classList.add('hidden');">CANCELAR</button>
            <button class="admin-btn-action" style="width:100%; height: 50px; border-radius: 12px; background:#4caf50; color:white; border: none; font-weight: 900; cursor: pointer; box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);" onclick="window.updateOrderStatus('${order.id}', 'accepted'); document.getElementById('order-details-modal').classList.add('hidden');">CONFIRMAR</button>
        `;
    } else {
        footer.innerHTML = `<button class="admin-btn-action" style="grid-column: span 2; height: 50px; border-radius: 12px; background: rgba(var(--text-rgb), 0.1); color: var(--text); border: 1px solid var(--glass-border); font-weight: 800; cursor: pointer;" onclick="document.getElementById('order-details-modal').classList.add('hidden')">CERRAR DETALLES</button>`;
    }

    document.getElementById('order-details-modal').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

// --- HISTORY ACTIONS & EXPORT ---
window.deleteHistoryOrder = function(id) {
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
}

window.clearAllHistory = function() {
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
}

window.exportHistoryPDF = function() {
    const modal = document.getElementById('month-picker-modal');
    const grid = modal.querySelector('.month-grid');
    const allBtn = document.getElementById('month-all-btn');
    if (!modal || !grid) return;

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

            // Check if there are orders for this month before showing confirm
            const ordersForMonth = getOrders().filter(o =>
                o.status !== 'pending' && new Date(o.date).getMonth() === monthIdx
            );
            if (ordersForMonth.length === 0) {
                showToast(`No hay pedidos registrados para ${monthName}.`, 'error');
                return;
            }

            showConfirm(
                `¿Deseas descargar el historial de ventas del mes de ${monthName}?`,
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
        const allOrders = getOrders().filter(o => o.status !== 'pending');
        if (allOrders.length === 0) {
            showToast('No hay pedidos en el historial.', 'error');
            return;
        }
        showConfirm(
            '¿Deseas descargar el reporte completo con todo el historial de ventas?',
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

    if (orders.length === 0) {
        showToast('No hay pedidos en el historial.', 'error');
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
    const title = `REPORTE DE VENTAS - ${restName}`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(title, 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Periodo: ${reportTitleMonth}`, 14, 35);
    doc.text(`Establecimiento: ${state.config.restaurantName || "STREETFEED"}`, 14, 40);

    const tableData = orders.map(o => [
        o.id,
        new Date(o.date).toLocaleString([], {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}),
        o.customer?.name || '---',
        o.customer?.payment?.toUpperCase() || '---',
        o.status === 'accepted' ? 'ACEPTADO' : 'CANCELADO',
        `$${o.total.toLocaleString()}`
    ]);

    doc.autoTable({
        startY: 45,
        head: [['ID', 'Fecha/Hora', 'Cliente', 'Método Pago', 'Estado', 'Total']],
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

        // Logic for Theme Toggle (Night/Day Mode)
        const themeToggle = document.getElementById('theme-toggle');
        const themeIcon = document.getElementById('theme-icon');
        const themeText = document.getElementById('theme-text');

        const updateThemeUI = (isLight) => {
            const iconContainer = document.getElementById('theme-icon-container');
            if (iconContainer) {
                iconContainer.innerHTML = `<i data-lucide="${isLight ? 'sun' : 'moon'}" id="theme-icon"></i>`;
            } else if (themeIcon) {
                // Fallback: replace the icon itself with a new one
                const newIcon = document.createElement('i');
                newIcon.id = 'theme-icon';
                newIcon.setAttribute('data-lucide', isLight ? 'sun' : 'moon');
                themeIcon.replaceWith(newIcon);
                // Re-find it for next time
                themeIcon = document.getElementById('theme-icon');
            }
            
            if (themeText) themeText.textContent = isLight ? 'Modo Día' : 'Modo Noche';
            if (window.lucide) lucide.createIcons();
        };

        const savedTheme = localStorage.getItem('streetfeed_admin_theme') || 'dark';
        const isLightInitial = savedTheme === 'light';
        
        // Initial apply to be sure
        if (typeof applyTheme === 'function') {
            applyTheme(state.config.themeAccent, state.config.themeBg, state.config.themeLogo);
        }
        
        updateThemeUI(isLightInitial);

        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const current = localStorage.getItem('streetfeed_admin_theme') || 'dark';
                const nextIsLight = current !== 'light';
                
                localStorage.setItem('streetfeed_admin_theme', nextIsLight ? 'light' : 'dark');
                
                if (typeof applyTheme === 'function') {
                    applyTheme(state.config.themeAccent, state.config.themeBg, state.config.themeLogo);
                }
                
                updateThemeUI(nextIsLight);
                
                if (typeof renderStats === 'function') {
                    const activeBtn = document.querySelector('.filter-btn.active');
                    renderStats(activeBtn ? activeBtn.dataset.range : 'today');
                }
            });
        }
    }
});

// Order Settings Persistence
document.addEventListener('click', (e) => {
    if (e.target.id === 'save-order-settings' || e.target.closest('#save-order-settings')) {
        const priceStr = document.getElementById('config-delivery-price').value.replace(/\./g, '');
        const price = parseInt(priceStr) || 0;
        const tables = parseInt(document.getElementById('config-table-count').value) || 10;
        
        state.config.deliveryFee = price;
        state.config.tableCount = tables;
        
        saveStateToLocal();
        showToast('Configuración guardada');
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
        const catFilter = document.getElementById('manual-order-cat-filter');
        if (catFilter) {
            catFilter.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            catFilter.addEventListener('change', () => renderManualProducts());
        }
        const searchEl = document.getElementById('manual-product-search');
        if (searchEl) {
            searchEl.addEventListener('input', () => renderManualProducts());
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

        const orderData = {
            id: 'ORD-' + orderCounter,
            date: new Date().toISOString(),
            items: manualCart.map(i => ({ ...i, extras: [] })),
            baseTotal: baseTotal,
            deliveryFee: delFee,
            total: baseTotal + delFee,
            isManual: true,
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
        showToast('✅ Pedido manual creado y agregado a Pendientes');
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
    if (confirm('¿Estás seguro de eliminar este registro de gasto?')) {
        let expenses = JSON.parse(localStorage.getItem('streetfeed_expenses')) || [];
        expenses = expenses.filter(e => e.id !== id);
        
        localStorage.setItem('streetfeed_expenses', JSON.stringify(expenses));
        localStorage.setItem('_local_list_gastos_comida_v2', JSON.stringify(expenses));
        if (window.saveListToCloud) window.saveListToCloud('gastos_comida_v2', expenses);
        
        showToast('Registro de gasto eliminado.', 'success');
        renderExpenses();
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

