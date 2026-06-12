// Disable browser scroll restoration so page always starts at top
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

// --- State Management ---
let state = {
    isLoggedIn: localStorage.getItem('streetfeed_isLoggedIn') === 'true',
    view: 'menu', // 'menu', 'admin' or 'login'
    currentCategory: 'todos',
    searchQuery: '',
    cart: JSON.parse(localStorage.getItem('streetfeed_cart')) || [],
    config: JSON.parse(localStorage.getItem('streetfeed_config')) || {
        restaurantName: 'STREETFEED',
        tagline: 'Fast Food Reimagined',
        bizType: 'burgers',
        orderEmojis: '🍔 🍟',
        heroTitleT1: 'Sabor',
        heroTitleHighlight: 'Intenso',
        heroTitleT2: 'en Cada Mordisco',
        heroDesc: 'Descubre el arte de la comida rápida premium. Ingredientes frescos, técnicas artesanales y una explosión de sabor.',
        footerText: 'Abierto todos los días 11:00 - 23:00 · Pedidos en línea 🚀',
        instagram: 'https://instagram.com/',
        facebook: 'https://facebook.com/',
        heroImg: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1000&auto=format&fit=crop',
        heroTime: '15-25 min',
        heroRating: '4.9 (2k+)',
        whatsappNumber: '573001234567',
        themeAccent: '#f7931e',
        themeBg: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1920&auto=format&fit=crop',
        themeLogo: 'assets/logo-default.png',
        surfaceColor: '#12162b',
        storeOpen: true,
        storeClosedFrom: '',
        storeClosedUntil: '',
        storeClosedMsg: '⚠️ Estamos cerrados temporalmente. ¡Volvemos pronto!',
        mobileHeroLayout: 'background' // 'background' o 'right'
    },
    categories: JSON.parse(localStorage.getItem('streetfeed_categories')) || [
        { id: 'todos', name: 'Todos', icon: 'sparkles' },
        { id: 'hamburguesas', name: 'Hamburguesas', icon: 'utensils' },
        { id: 'salchipapas', name: 'Salchipapas', icon: 'drumstick-bite' },
        { id: 'perros', name: 'Perros', icon: 'flame' },
        { id: 'mazorcadas', name: 'Mazorcadas', icon: 'corn' },
        { id: 'snacks', name: 'Snacks', icon: 'cookie' },
        { id: 'postres', name: 'Postres', icon: 'ice-cream' },
        { id: 'bebidas', name: 'Bebidas', icon: 'coffee' }
    ],
    auth: (() => {
        let parsed = JSON.parse(localStorage.getItem('streetfeed_auth'));
        if (!parsed) {
            parsed = {
                user: 'admin',
                pass: '123456'
            };
        } else if (parsed.pass === '123456789') {
            parsed.pass = '123456';
            localStorage.setItem('streetfeed_auth', JSON.stringify(parsed));
        }
        return parsed;
    })(),
    dishes: JSON.parse(localStorage.getItem('streetfeed_dishes')) || [
        { id: 1, cat: 'hamburguesas', name: 'La Bestia', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800', desc: 'Doble carne de res premium, cuádruple bacon, cheddar fundido y nuestra salsa secreta.', price: 32000, active: true },
        { id: 2, cat: 'hamburguesas', name: 'Classic Smoke', img: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=800', desc: 'Carne ahumada a la leña, aros de cebolla crujientes y BBQ artesanal.', price: 28000, active: true },
        { id: 3, cat: 'salchipapas', name: 'Salchi-Monster', img: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?q=80&w=800', desc: 'Cama de papas nativas, salchicha ahumada, huevo frito y lluvia de queso.', price: 22000, active: true }
    ],
    combos: JSON.parse(localStorage.getItem('streetfeed_combos')) || [
        {
            id: 1,
            name: 'Combo Bestia Supremo',
            desc: 'La hamburguesa más legendaria + papas cargadas + bebida a elección. ¡Todo al precio de antes!',
            items: ['La Bestia', 'Papas Cargadas', 'Bebida 500ml'],
            price: 42000,
            originalPrice: 56000,
            img: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?q=80&w=800',
            emoji: '🔥',
            active: true,
            limited: true,
            expiresAt: '',
            showInModal: true
        },
        {
            id: 2,
            name: 'Dúo de Perros',
            desc: 'Dos perros calientes clásicos acompañados de salchipapa mediana y salsa de la casa.',
            items: ['Perro Clásico x2', 'Salchipapa Mediana'],
            price: 28000,
            originalPrice: 38000,
            img: 'https://images.unsplash.com/photo-1612392062631-94dd858cba88?q=80&w=800',
            emoji: '🌭',
            active: true,
            limited: false,
            expiresAt: '',
            showInModal: false
        }
    ],
    orders: JSON.parse(localStorage.getItem('streetfeed_orders')) || []
};

// --- AUTO IMAGE FILLER MIGRATION V2 ---
// Fuerza imágenes premium únicas para cada producto en las categorías indicadas
(() => {
    const categoryImages = {
        'salchipapas': [
            'https://images.unsplash.com/photo-1576107241774-88981f9fa417?q=80&w=800',
            'https://images.unsplash.com/photo-1630431341973-02e1b662cebc?q=80&w=800',
            'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?q=80&w=800',
            'https://images.unsplash.com/photo-1585109649139-366815a0d713?q=80&w=800',
            'https://images.unsplash.com/photo-1534080564583-6be75777b70a?q=80&w=800',
            'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800',
            'https://images.unsplash.com/photo-1520072959219-c595dc870360?q=80&w=800'
        ],
        'perros': [
            'https://images.unsplash.com/photo-1612392062631-94dd858cba88?q=80&w=800',
            'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?q=80&w=800',
            'https://images.unsplash.com/photo-1541214113241-21578d2d9b62?q=80&w=800',
            'https://images.unsplash.com/photo-1615711019183-dbcb7980c98f?q=80&w=800',
            'https://images.unsplash.com/photo-1627308595171-d1b5d67129c4?q=80&w=800',
            'https://images.unsplash.com/photo-1590487988256-9ed24133863e?q=80&w=800',
            'https://images.unsplash.com/photo-1542382156909-9ae382da3d03?q=80&w=800'
        ],
        'mazorcadas': [
            'https://images.unsplash.com/photo-1551754655-cd27e38d2076?q=80&w=800',
            'https://images.unsplash.com/photo-1598466846985-783fa339de71?q=80&w=800',
            'https://images.unsplash.com/photo-1608897013039-887f214b985c?q=80&w=800',
            'https://images.unsplash.com/photo-1534939561126-855b8675edd7?q=80&w=800',
            'https://images.unsplash.com/photo-1600028068383-ea11a7a101f3?q=80&w=800',
            'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=800',
            'https://images.unsplash.com/photo-1548842186-09fc2b24bbd1?q=80&w=800'
        ],
        'snacks': [
            'https://images.unsplash.com/photo-1569691899455-88464f6d3ab1?q=80&w=800',
            'https://images.unsplash.com/photo-1614398751058-25fdb5832a58?q=80&w=800',
            'https://images.unsplash.com/photo-1528736235302-52922df5c122?q=80&w=800',
            'https://images.unsplash.com/photo-1625938144755-652e08e359b7?q=80&w=800',
            'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=800',
            'https://images.unsplash.com/photo-1560053608-13721e0d69e8?q=80&w=800',
            'https://images.unsplash.com/photo-1606509036737-0104192b1a8f?q=80&w=800'
        ],
        'postres': [
            'https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=800',
            'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?q=80&w=800',
            'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?q=80&w=800',
            'https://images.unsplash.com/photo-1542826438-bd32f43d626f?q=80&w=800',
            'https://images.unsplash.com/photo-1587314168485-3236d6710814?q=80&w=800',
            'https://images.unsplash.com/photo-1565958011703-44f9829ba187?q=80&w=800',
            'https://images.unsplash.com/photo-1600891964092-4316c288032e?q=80&w=800'
        ],
        'bebidas': [
            'https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=800',
            'https://images.unsplash.com/photo-1497534547324-0ebb3f052e88?q=80&w=800',
            'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=800',
            'https://images.unsplash.com/photo-1556881286-fc6915169721?q=80&w=800',
            'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=800',
            'https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=800',
            'https://images.unsplash.com/photo-1587883012610-e3df17d4126f?q=80&w=800'
        ],
        'hamburguesas': [
            'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800',
            'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=800',
            'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?q=80&w=800',
            'https://images.unsplash.com/photo-1586816001966-79b736744398?q=80&w=800',
            'https://images.unsplash.com/photo-1553979459-d2229ba7433b?q=80&w=800',
            'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?q=80&w=800',
            'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=800'
        ]
    };

    let stateUpdated = false;
    
    // Contadores para asegurar imágenes únicas
    const indexTrack = {};
    
    if (state.dishes && Array.isArray(state.dishes)) {
        state.dishes.forEach(dish => {
            // Asegurar que el producto tenga propiedad active si falta
            if (dish.active === undefined) {
                dish.active = true;
                stateUpdated = true;
            }

            const cleanCat = (dish.cat || '').toLowerCase().trim();
            if (categoryImages[cleanCat]) {
                if (indexTrack[cleanCat] === undefined) indexTrack[cleanCat] = 0;
                
                const imgArray = categoryImages[cleanCat];
                const currentIndex = indexTrack[cleanCat] % imgArray.length;
                
                // --- LÓGICA INTELIGENTE DE REEMPLAZO ---
                // Solo sobrescribimos si:
                // 1. No tiene imagen
                // 2. Es un placeholder roto
                // 3. Es una imagen PESADA de las antiguas (más de 150,000 caracteres base64)
                const isOldHeavyImage = dish.img && dish.img.startsWith('data:image') && dish.img.length > 150000;
                const isPlaceholder = !dish.img || dish.img.includes('placeholder') || dish.img === '';

                if (isPlaceholder || isOldHeavyImage) {
                    dish.img = imgArray[currentIndex];
                    stateUpdated = true;
                }
                
                indexTrack[cleanCat]++;
            }
        });
        if (stateUpdated) {
            localStorage.setItem('streetfeed_dishes', JSON.stringify(state.dishes));
            // También actualizar streetfeed_state para mantener sincronía total
            localStorage.setItem('streetfeed_state', JSON.stringify(state));
        }
    }
})();
// ------------------------------------

// --- Selectors ---
const categoryStrip = document.getElementById('category-strip');
const menuGrid = document.getElementById('menu-grid');
const dishModal = document.getElementById('dish-modal');
const modalBody = document.getElementById('modal-body');
const toastContainer = document.getElementById('toast-container');

// --- Appearance Themes & Wallpapers ---
const THEMES = [
    // ── Warm & Appetite ──
    { name: 'Naranja Fuego',    color: '#f7931e' },
    { name: 'Ámbar Premium',    color: '#f59e0b' },
    { name: 'Oro Brillante',    color: '#eab308' },
    { name: 'Tomate',           color: '#e85d04' },
    { name: 'Rojo Vino',        color: '#c0392b' },
    { name: 'Carmesí',          color: '#be123c' },
    { name: 'Coral Vivo',       color: '#f97316' },
    { name: 'Rosa Fuerte',      color: '#e91e8c' },
    { name: 'Fucsia',           color: '#d946ef' },
    { name: 'Cobre',            color: '#b87333' },

    // ── Cool & Fresh ──
    { name: 'Azul Zafiro',      color: '#2563eb' },
    { name: 'Azul Océano',      color: '#0284c7' },
    { name: 'Cian Digital',     color: '#06b6d4' },
    { name: 'Teal Profundo',    color: '#0d9488' },
    { name: 'Ártico',           color: '#38bdf8' },
    { name: 'Marino Royal',     color: '#1e40af' },
    { name: 'Índigo',           color: '#4f46e5' },
    { name: 'Violeta Premium',  color: '#7c3aed' },
    { name: 'Lila Suave',       color: '#a855f7' },
    { name: 'Lavanda Oscura',   color: '#9333ea' },

    // ── Nature & Fresh ──
    { name: 'Esmeralda',        color: '#10b981' },
    { name: 'Verde Lima',       color: '#22c55e' },
    { name: 'Verde Bosque',     color: '#16a34a' },
    { name: 'Oliva Premium',    color: '#65a30d' },
    { name: 'Menta Fresca',     color: '#34d399' },
    { name: 'Salvia',           color: '#6ee7b7' },
    { name: 'Verde Militar',    color: '#3f6212' },
    { name: 'Aguamarina',       color: '#2dd4bf' },
    { name: 'Turquesa',         color: '#14b8a6' },
    { name: 'Musgo',            color: '#4d7c0f' },

    // ── Luxury & Brand ──
    { name: 'Platino',          color: '#94a3b8' },
    { name: 'Champán',          color: '#d4af37' },
    { name: 'Bronce',           color: '#cd7f32' },
    { name: 'Oro Rosa',         color: '#c9748a' },
    { name: 'Borgoña',          color: '#800020' },
    { name: 'Granate',          color: '#6d0f1b' },
    { name: 'Ciruela',          color: '#722f37' },
    { name: 'Malva',            color: '#8b5e83' },
    { name: 'Pizarra Azul',     color: '#475569' },
    { name: 'Carbón Elegante',  color: '#334155' },

    // ── Neon & Digital ──
    { name: 'Rosa Neón',        color: '#f43f5e' },
    { name: 'Lima Eléctrico',   color: '#84cc16' },
    { name: 'Cian Neón',        color: '#22d3ee' },
    { name: 'Violeta Neón',     color: '#a21caf' },
    { name: 'Naranja Neón',     color: '#fb923c' },
    { name: 'Verde Matrix',     color: '#4ade80' },
    { name: 'Azul Eléctrico',   color: '#60a5fa' },
    { name: 'Magenta',          color: '#e879f9' },
    { name: 'Rojo Neón',        color: '#f87171' },
    { name: 'Dorado Neón',      color: '#fbbf24' },
];

const SAVORY_GALLERY = [
    { name: 'Burger AI', url: 'assets/imgs/burger.png' },
    { name: 'Pizza Pepperoni', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591' },
    { name: 'Parrillada Mixta', url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1' },
    { name: 'Alitas AI', url: 'assets/imgs/wings.png' },
    { name: 'Tacos AI', url: 'assets/imgs/tacos.png' },
    { name: 'Hot Dog AI', url: 'assets/imgs/hotdog.png' },
    { name: 'Costillas BBQ AI', url: 'assets/imgs/ribs.png' },
    { name: 'Pizza AI', url: 'assets/imgs/pizza.png' },
    { name: 'Papas Crunch', url: 'https://images.unsplash.com/photo-1541592106381-b31e9223cad0' },
    { name: 'Carne Asada', url: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092' },
    { name: 'Sandwich Club', url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af' },
    { name: 'Nachos Supreme', url: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d' },
    { name: 'Pollo Crispy', url: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58' },
    { name: 'Burger Doble', url: 'https://images.unsplash.com/photo-1550547660-d9450f859349' },
    { name: 'Pizza Suprema', url: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e' },
    { name: 'Tacos Dorados', url: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b' },
    { name: 'Bacon Burger', url: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5' },
    { name: 'Burrito Gigante', url: 'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85' },
    { name: 'Kebab Grill', url: 'https://images.unsplash.com/photo-1561651823-34feb02250e4' },
    { name: 'Salchipapa Real', url: 'https://images.unsplash.com/photo-1585109649139-366815a0d713' },
    { name: 'Onion Rings', url: 'https://images.unsplash.com/photo-1625938140722-26159ca3f2fd' },
    { name: 'Loaded Fries', url: 'https://images.unsplash.com/photo-1576101167748-24233d63e936' },
    { name: 'Parrilla Carnes', url: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd' },
    { name: 'Chicken Basket', url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec' },
    { name: 'Deli Burger', url: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add' },
    { name: 'Italian Pizza', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591' },
    { name: 'Feast Table', url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836' },
    { name: 'Grilled Corn', url: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d' },
    { name: 'Crispy Wings', url: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2' },
    { name: 'Gourmet Burger', url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90' },
    { name: 'BBQ Chicken', url: 'https://images.unsplash.com/photo-1532550905614-f599d0c24391' },
    { name: 'Rustic Pizza', url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38' },
    { name: 'Grill Master', url: 'https://images.unsplash.com/photo-1544025162-d76694265947' },
    { name: 'Burger Especial', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd' },
    { name: 'Alitas BBQ', url: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f' },
    { name: 'Tacos Pastor', url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47' }
];

const HERO_GALLERY = [
    { name: 'Hamburguesa con Papas', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd' },
    { name: 'Combo Fast Food', url: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5' },
    { name: 'Papas Rústicas', url: 'https://images.unsplash.com/photo-1573016608244-7d5f0732844a' },
    { name: 'Burger Gourmet', url: 'https://images.unsplash.com/photo-1550547660-d9450f859349' },
    { name: 'Tenders de Pollo', url: 'https://images.unsplash.com/photo-1562967914-6cbb048971d7' },
    { name: 'Hot Dogs Deluxe', url: 'https://images.unsplash.com/photo-1541214113241-21578d2d9b62' },
    { name: 'Crispy Fries', url: 'https://images.unsplash.com/photo-1585109649139-366815a0d713' },
    { name: 'Burger Fresh', url: 'https://images.unsplash.com/photo-1586816001966-79b736744398' },
    { name: 'Burger Close-up', url: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add' },
    { name: 'Tacos Mexicanos', url: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b' },
    { name: 'Pizza Pepperoni', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591' },
    { name: 'Alitas BBQ', url: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2' },
    { name: 'Classic Hot Dog', url: 'https://images.unsplash.com/photo-1612392062631-94dd858cba88' },
    { name: 'Glazed Donuts', url: 'https://images.unsplash.com/photo-1520072959219-c595dc870360' },
    { name: 'Nachos Supreme', url: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d' },
    { name: 'Aros de Cebolla', url: 'https://images.unsplash.com/photo-1625938140722-26159ca3f2fd' },
    { name: 'Strawberry Shake', url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836' },
    { name: 'Animal Style Fries', url: 'https://images.unsplash.com/photo-1585109649139-366815a0d713' },
    { name: 'Triple Cheese Burger', url: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5' },
    { name: 'Sub Sandwich', url: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f' }
];

function applyTheme(accentColor, bgUrl, logoUrl) {
    const root = document.documentElement;
    const isAdminPage = window.location.pathname.endsWith('admin.html');

    root.style.setProperty('--primary', accentColor);
    root.style.setProperty('--theme-accent', accentColor);
    root.style.setProperty('--accent', accentColor);
    root.style.setProperty('--primary-glow', accentColor + '4d');
    
    // Hex to RGB converter for transparent backgrounds
    if (accentColor && accentColor.startsWith('#')) {
        let hex = accentColor.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c+c).join('');
        if (hex.length === 6) {
            const r = parseInt(hex.substring(0,2), 16);
            const g = parseInt(hex.substring(2,4), 16);
            const b = parseInt(hex.substring(4,6), 16);
            root.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);
            root.style.setProperty('--theme-accent-rgb', `${r}, ${g}, ${b}`);
        }
    }

    // Background image: always update on public page
    if (bgUrl && !isAdminPage) {
        const isDataUrl = bgUrl.startsWith('data:');
        const fullResUrl = (isDataUrl || bgUrl.includes('?')) ? bgUrl : `${bgUrl}?q=80&w=1920&auto=format&fit=crop`;
        root.style.setProperty('--theme-bg-url', `url('${fullResUrl}')`);
    } else if (bgUrl && isAdminPage) {
        // Still set bg url on admin so it's saved, but don't affect the admin visuals
        const isDataUrl = bgUrl.startsWith('data:');
        const fullResUrl = (isDataUrl || bgUrl.includes('?')) ? bgUrl : `${bgUrl}?q=80&w=1920&auto=format&fit=crop`;
        root.style.setProperty('--theme-bg-url', `url('${fullResUrl}')`);
    }

    const headerLogo = document.getElementById('header-logo-img');
    if (headerLogo) {
        headerLogo.src = logoUrl || 'assets/logo-default.png';
        headerLogo.onload = () => { headerLogo.style.opacity = '1'; };
        if (headerLogo.complete) headerLogo.style.opacity = '1';
    }

    // Update Browser Favicon
    const favicon = document.getElementById('app-favicon');
    if (favicon && logoUrl) {
        if (typeof window.setRoundedFavicon === 'function') {
            window.setRoundedFavicon(logoUrl);
        } else {
            favicon.href = logoUrl;
        }
    }

    // Update Collapsed Sidebar Logo
    const collapsedLogoEl = document.getElementById('admin-sidebar-logo-collapsed');
    if (collapsedLogoEl && logoUrl) {
        collapsedLogoEl.innerHTML = `<img src="${logoUrl}" alt="Logo" style="width:48px;height:48px;object-fit:contain;border-radius:10px;display:block;margin:0 auto;" />`;
        collapsedLogoEl.style.opacity = '1';
    }

    // Apply surface color — with light-theme protection
    const c2 = state.config.surfaceColor;
    if (c2) {
        const r = parseInt(c2.slice(1,3),16), g = parseInt(c2.slice(3,5),16), b = parseInt(c2.slice(5,7),16);
        const rgb = `${r}, ${g}, ${b}`;

        // AUTO-CONTRAST: Detect if theme is light
        // ── THEME APPLICATION ──────────────────────────────────────
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        const isLight = brightness > 155;
        
        // Final theme decision (Admin can override)
        let finalIsLight = isLight;
        if (isAdminPage) {
            const adminOverride = localStorage.getItem('streetfeed_admin_theme');
            if (adminOverride) finalIsLight = (adminOverride === 'light');
        }

        document.documentElement.dataset.theme = finalIsLight ? 'light' : 'dark';
        document.body.classList.toggle('light-mode', finalIsLight);

        // ── LIGHT THEME on ADMIN ───────────────────────────────────
        // If it's a light theme but we are on admin, we might want to keep some dark elements
        // but we now allow the full light mode if the user toggled it.
        if (isAdminPage && !localStorage.getItem('streetfeed_admin_theme') && isLight) {
            // If the restaurant theme is light but admin hasn't been toggled, 
            // keep admin dark for safety/clarity by default.
            document.body.classList.remove('light-mode');
            document.documentElement.dataset.theme = 'dark';
            finalIsLight = false;
        }

        // Apply mobile hero layout
        const mobileLayout = state.config.mobileHeroLayout || 'background';
        document.documentElement.dataset.mobileHero = mobileLayout;

        // ── APPLY SURFACE ──────────────────────────────────────────
        // In light mode, we want a white/clean base for glass/cards
        const glassBase = finalIsLight ? '255, 255, 255' : rgb;
        
        root.style.setProperty('--surface-color', rgb);
        
        // Prevent public template backgrounds from bleeding into the Admin Panel
        if (!isAdminPage) {
            root.style.setProperty('--surface', `rgb(${rgb})`);
            root.style.setProperty('--surface-light', `rgba(${glassBase}, ${finalIsLight ? '0.98' : '0.7'})`);
            root.style.setProperty('--glass', `rgba(${glassBase}, ${finalIsLight ? '0.95' : '0.7'})`);
            root.style.setProperty('--text', finalIsLight ? '#0f172a' : '#ffffff');
            root.style.setProperty('--text-dim', finalIsLight ? '#64748b' : 'rgba(255,255,255,0.6)');
            root.style.setProperty('--glass-border', finalIsLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255,255,255,0.1)');

            if (finalIsLight) {
                // Light mode: Clean white background for the whole page
                root.style.setProperty('--bg-overlay-1', '#f1f5f9');
                root.style.setProperty('--bg-overlay-2', '#f1f5f9');
            } else {
                root.style.removeProperty('--bg-overlay-1');
                root.style.removeProperty('--bg-overlay-2');
            }
        }

        const logoText = document.querySelector('.logo-text');
        if (logoText) logoText.style.color = finalIsLight ? '#1a1a1a' : '#ffffff';

        // ── ACTUALIZAR TÍTULO DE LA PESTAÑA ──────────────────────────
        const siteName = state.config.restaurantName || "Menú Digital";
        if (isAdminPage) {
            document.title = `Admin | ${siteName}`;
        } else {
            document.title = siteName;
        }
    }
}

function saveStateToLocal() {
    try {
        const fullState = JSON.stringify(state);
        localStorage.setItem('streetfeed_dishes', JSON.stringify(state.dishes));
        localStorage.setItem('streetfeed_config', JSON.stringify(state.config));
        localStorage.setItem('streetfeed_categories', JSON.stringify(state.categories));
        localStorage.setItem('streetfeed_auth', JSON.stringify(state.auth));
        localStorage.setItem('streetfeed_cart', JSON.stringify(state.cart));
        localStorage.setItem('streetfeed_combos', JSON.stringify(state.combos));
        localStorage.setItem('streetfeed_orders', JSON.stringify(state.orders));
        localStorage.setItem('streetfeed_state', fullState);
    } catch (e) {
        console.error("Storage error:", e);
        if (e.name === 'QuotaExceededError') {
            showToast('⚠️ Error: Almacenamiento lleno. Intenta con una imagen más pequeña.', 'error');
        }
    }
}

function switchView(viewName) {
    const isPageAdmin = window.location.pathname.endsWith('admin.html');
    
    // Cross-page navigation
    if (viewName === 'menu' && isPageAdmin) {
        sessionStorage.setItem('streetfeed_view', 'menu');
        window.location.href = 'index.html';
        return;
    }
    if ((viewName === 'login' || viewName === 'admin') && !isPageAdmin) {
        sessionStorage.setItem('streetfeed_view', viewName);
        window.location.href = 'admin.html';
        return;
    }

    state.view = viewName;
    sessionStorage.setItem('streetfeed_view', viewName);
    
    // Elements to toggle
    const menuView = document.getElementById('menu-view');
    const loginView = document.getElementById('login-view');
    const adminView = document.getElementById('admin-view');
    const footer = document.querySelector('.main-footer');

    // Reset visibility
    [menuView, loginView, adminView, footer].forEach(el => {
        if (el) el.classList.add('hidden');
    });
    
    if (viewName === 'menu') {
        if (menuView) menuView.classList.remove('hidden');
        if (footer) footer.classList.remove('hidden');
        renderCategories();
        renderMenu();
    } else if (viewName === 'login') {
        if (loginView) loginView.classList.remove('hidden');
    } else if (viewName === 'admin') {
        if (adminView) adminView.classList.remove('hidden');
        if (typeof renderAdmin === 'function') renderAdmin();
        if (typeof prefillConfigForm === 'function') prefillConfigForm();
        if (typeof renderAppearancePanel === 'function') renderAppearancePanel();
    }
    window.scrollTo(0, 0);
}

function updateUIFromConfig() {
    const c = state.config;
    const updateLogo = (elId) => {
        const logoEl = document.getElementById(elId);
        if (!logoEl) return;

        // Populate collapsed logo if it's the target
        if (elId === 'admin-sidebar-logo-collapsed' && c.themeLogo) {
            logoEl.innerHTML = `<img src="${c.themeLogo}" alt="Logo" style="width:48px;height:48px;object-fit:contain;border-radius:10px;display:block;margin:0 auto;" />`;
            logoEl.style.opacity = '1';
            return;
        }

        // Update Browser Favicon if a custom logo image exists
        if (c.themeLogo) {
            const favicon = document.getElementById('app-favicon');
            if (favicon) {
                if (typeof window.setRoundedFavicon === 'function') {
                    window.setRoundedFavicon(c.themeLogo);
                } else {
                    favicon.href = c.themeLogo;
                }
            }
        }

        const hasName = c.restaurantName && c.restaurantName.trim().length > 0;

        if (elId === 'header-logo') {
            if (!hasName) {
                logoEl.style.display = 'none';
                logoEl.innerHTML = '';
                return;
            } else {
                logoEl.style.display = '';
            }
        }

        if (!hasName) {
            if (elId === 'admin-sidebar-logo' || elId === 'admin-login-logo') {
                logoEl.innerHTML = `<img src="${c.themeLogo || 'assets/logo-default.png'}" alt="Logo" style="height:45px;max-width:100%;object-fit:contain;display:block;margin:0 auto;" />`;
                logoEl.style.opacity = '1';
                return;
            }
        }

        const name = c.restaurantName || 'StreetFeed';
        const parts = name.trim().split(/\s+/);
        let first, last;
        if (parts.length === 1) {
            const word = parts[0];
            const splitAt = Math.max(word.length - 4, Math.ceil(word.length * 0.55));
            first = word.slice(0, splitAt);
            last = word.slice(splitAt);
        } else {
            last = parts.pop();
            first = parts.join(' ');
        }
        const baseHtml = (first ? first + '&nbsp;' : '') + `<span>${last}</span>`;
        let html = `<span class="logo-base">${baseHtml}</span>`;
        if (c.logoAnimationEnabled !== false) {
            html += `<span class="logo-glow-layer" aria-hidden="true">${baseHtml}</span>`;
        }
        logoEl.innerHTML = html;
        logoEl.style.opacity = '1';
        
        // Add glow animation
        logoEl.classList.remove('animate-glow');
        void logoEl.offsetWidth; // Force reflow
        logoEl.classList.add('animate-glow');

        if (elId === 'header-logo') {
            logoEl.style.cursor = 'pointer';
            logoEl.onclick = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); };
        }
    };

    updateLogo('header-logo');
    updateLogo('admin-sidebar-logo');
    updateLogo('admin-sidebar-logo-collapsed');
    updateLogo('admin-login-logo');
    
    const tagline = document.getElementById('hero-tagline');
    if (tagline) tagline.textContent = c.tagline;
    
    const title = document.getElementById('hero-title-main');
    if (title) title.innerHTML = `${c.heroTitleT1} <span class="accent">${c.heroTitleHighlight}</span> ${c.heroTitleT2}`;
    
    const desc = document.getElementById('hero-desc-text');
    if (desc) desc.textContent = c.heroDesc;
    
    const heroImg = document.getElementById('main-hero-img');
    if (heroImg) heroImg.src = c.heroImg;

    // Hero stats - FIXED: now updates time and rating on public page
    const heroTime = document.getElementById('hero-stat-time');
    if (heroTime) heroTime.textContent = c.heroTime || '15-25 min';
    const heroRating = document.getElementById('hero-stat-rating');
    if (heroRating) heroRating.textContent = c.heroRating || '4.9 (2k+)';
    
    const heroHours = document.getElementById('footer-text-display');
    if (heroHours) heroHours.textContent = c.footerText;

    // Update Cart Icons (Stickers)
    const newIcon = c.cartIcon || '🛒';
    const cartIcons = document.querySelectorAll('.cart-icon-main');
    cartIcons.forEach(icon => {
        const isEmoji = /\p{Emoji}/u.test(newIcon);
        if (isEmoji) {
            icon.innerHTML = newIcon;
            icon.removeAttribute('data-lucide');
            icon.style.fontStyle = 'normal';
            icon.style.fontSize = '2.2rem'; /* Increased for better visibility */
            icon.style.display = 'flex';
            icon.style.alignItems = 'center';
            icon.style.justifyContent = 'center';
            icon.style.lineHeight = '1';
        } else {
            icon.setAttribute('data-lucide', newIcon);
            icon.innerHTML = '';
        }
    });
    if (window.lucide) lucide.createIcons();
    
    applyTheme(c.themeAccent, c.themeBg, c.themeLogo);

    // Socials & Footer Identity
    const socials = document.getElementById('footer-socials');
    if (socials) {
        const hasName = c.restaurantName && c.restaurantName.trim().length > 0;
        let footerLogoHtml = '';
        if (hasName) {
            const rawName = c.restaurantName.trim();
            const fParts = rawName.split(/\s+/);
            let firstPart, lastPart;
            if (fParts.length === 1) {
                const word = fParts[0];
                const splitAt = Math.max(word.length - 4, Math.ceil(word.length * 0.55));
                firstPart = word.slice(0, splitAt);
                lastPart = word.slice(splitAt);
            } else {
                lastPart = fParts.pop();
                firstPart = fParts.join(' ');
            }
            footerLogoHtml = `<button class="footer-logo" onclick="window.scrollTo({top:0,behavior:'smooth'})" title="Volver al inicio">${firstPart}<span>${lastPart}</span></button>`;
        } else if (c.themeLogo) {
            footerLogoHtml = `<button class="footer-logo" onclick="window.scrollTo({top:0,behavior:'smooth'})" title="Volver al inicio" style="background:transparent;border:none;padding:0;outline:none;"><img src="${c.themeLogo}" alt="Logo" style="height:50px;max-width:150px;object-fit:contain;display:block;margin:0 auto;" /></button>`;
        }

        socials.innerHTML = `
            <div class="footer-identity">
                ${footerLogoHtml}
                <p class="footer-tagline">${c.tagline || 'Fast Food Reimagined'}</p>
                <div class="footer-social-links">
                    <a href="${c.instagram || '#'}" target="_blank" class="social-icon" title="Instagram">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                    </a>
                    <a href="${c.facebook || '#'}" target="_blank" class="social-icon" title="Facebook">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                    </a>
                </div>
                <div class="footer-divider"></div>
                <p class="footer-copyright">&copy; ${new Date().getFullYear()} ${c.restaurantName || ''}. Todos los derechos reservados.</p>
            </div>
        `;
    }

    // Banner - FIXED: now shows closing time from schedule
    const banner = document.getElementById('store-closed-banner');
    if (banner) {
        if (!c.storeOpen) {
            const msg = c.storeClosedMsg || 'Cerrado temporalmente';
            const formatDT = (dtStr) => {
                if (!dtStr) return '';
                try {
                    const d = new Date(dtStr);
                    return d.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                } catch(e) { return ''; }
            };
            let fullMsg = msg;
            if (c.storeClosedUntil) {
                fullMsg += ` · Volvemos el ${formatDT(c.storeClosedUntil)}`;
            }
            banner.innerHTML = `<div class="marquee-content">${`<span>${fullMsg}</span>`.repeat(20)}</div>`;
            banner.classList.remove('hidden');
        } else {
            banner.classList.add('hidden');
        }
    }

    const waBtn = document.getElementById('floating-wa-btn');
    if (waBtn) waBtn.href = `https://wa.me/${c.whatsappNumber}`;

    if (window.lucide) {
        setTimeout(() => lucide.createIcons(), 100);
    }

    // Refresh cart UI to disable checkout if closed
    updateCartUI();
}

function renderCategories() {
    if (!categoryStrip) return;
    categoryStrip.innerHTML = state.categories.filter(c => !c.isExtras || c.showOnMenu).map(cat => `
        <button class="category-item ${state.currentCategory === cat.id ? 'active' : ''}" data-id="${cat.id}">
            ${cat.name}
        </button>
    `).join('');

    categoryStrip.querySelectorAll('.category-item').forEach(btn => {
        btn.addEventListener('click', () => {
            state.currentCategory = btn.dataset.id;
            renderCategories();
            renderMenu();
        });
    });
}

// --- Combos & Discounts ---

let _promoTimerInterval = null;
let _currentPromoCombo = null;
let _cardTimerIntervals = [];
let _promoCarouselIndex = 0;
let _promoActiveCombos = [];

function calcSavings(combo) {
    if (!combo.originalPrice || combo.originalPrice <= combo.price) return 0;
    return Math.round((1 - combo.price / combo.originalPrice) * 100);
}

function formatCountdown(msLeft) {
    if (msLeft <= 0) return { h: '00', m: '00', s: '00' };
    const totalSec = Math.floor(msLeft / 1000);
    const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return { h, m, s };
}

function renderCombos() {
    // Combos are now ONLY shown in the promo modal carousel, not on the main page
    const section = document.getElementById('combos-section');
    if (section) section.classList.add('hidden');
    _cardTimerIntervals.forEach(id => clearInterval(id));
    _cardTimerIntervals = [];
    // Update bubble visibility
    checkAndShowPromoModal();
}

function _renderCombosFull_UNUSED() {
    const section = document.getElementById('combos-section');
    const grid = document.getElementById('combos-grid');
    if (!section || !grid) return;
    _cardTimerIntervals.forEach(id => clearInterval(id));
    _cardTimerIntervals = [];
    const activeCombos = (state.combos || []).filter(c => c.active !== false);
    if (activeCombos.length === 0) {
        section.classList.add('hidden');
        return;
    }
    section.classList.remove('hidden');

    grid.innerHTML = activeCombos.map(combo => {
        const savings = calcSavings(combo);
        const hasExpiry = combo.expiresAt && new Date(combo.expiresAt) > new Date();
        const imgHtml = combo.img
            ? `<img class="combo-card-img" src="${combo.img}" alt="${combo.name}" loading="lazy">`
            : `<div class="combo-card-img-placeholder">${combo.emoji || '🍔'}</div>`;

        const chipsHtml = (combo.items || []).map(item =>
            `<span class="combo-item-chip">${item}</span>`
        ).join('');

        const countdownHtml = hasExpiry
            ? `<div class="combo-card-countdown" id="ccd-${combo.id}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Oferta termina en: <span class="ccd-timer" id="ccd-t-${combo.id}">--:--:--</span>
               </div>`
            : '';

        return `
            <div class="combo-card" data-combo-id="${combo.id}">
                <div style="position:relative; overflow:hidden;">
                    ${imgHtml}
                    ${savings > 0 ? `<span class="combo-savings-badge">-${savings}%</span>` : ''}
                    ${combo.limited ? `<span class="combo-limited-badge">⏰ Tiempo Limitado</span>` : ''}
                </div>
                <div class="combo-card-body">
                    <h3 class="combo-card-name">${combo.name}</h3>
                    <p class="combo-card-desc">${combo.desc}</p>
                    ${chipsHtml ? `<div class="combo-card-items">${chipsHtml}</div>` : ''}
                    ${countdownHtml}
                    <div class="combo-card-pricing">
                        ${combo.originalPrice && combo.originalPrice > combo.price
                            ? `<span class="combo-price-original">$ ${combo.originalPrice.toLocaleString('es-CO')}</span>`
                            : ''}
                        <span class="combo-price-final">$ ${combo.price.toLocaleString('es-CO')}</span>
                    </div>
                    <button class="combo-card-btn" onclick="addComboToCart(${combo.id})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                        Agregar al Carrito
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Start card countdown timers
    activeCombos.forEach(combo => {
        if (!combo.expiresAt) return;
        const expiryDate = new Date(combo.expiresAt);
        const timerEl = document.getElementById(`ccd-t-${combo.id}`);
        const containerEl = document.getElementById(`ccd-${combo.id}`);
        if (!timerEl) return;

        const updateCardTimer = () => {
            const msLeft = expiryDate - new Date();
            if (msLeft <= 0) {
                if (containerEl) containerEl.style.display = 'none';
                return;
            }
            const { h, m, s } = formatCountdown(msLeft);
            timerEl.textContent = `${h}:${m}:${s}`;
        };
        updateCardTimer();
        const id = setInterval(updateCardTimer, 1000);
        _cardTimerIntervals.push(id);
    });
}

window.addComboToCart = function(comboId, event = null) {
    const combo = (state.combos || []).find(c => c.id === comboId);
    if (!combo) return;
    
    // Trigger fly animation
    if (event) flyToCart(event.currentTarget || event.target);

    // Add as a special item with combo_ prefix id
    const cartItemId = `combo_${combo.id}`;
    const existing = state.cart.find(i => i.id === cartItemId);
    const savings = calcSavings(combo);
    
    if (existing) {
        existing.qty++;
    } else {
        state.cart.push({
            id: cartItemId,
            name: combo.name,
            price: combo.price,
            img: combo.img || '',
            qty: 1,
            isCombo: true,
            savings: savings
        });
    }
    updateCartUI();
    saveStateToLocal();
    showToast('¡Combo agregado al carrito! 🔥');
};

// ============================================================
// PROMO MODAL - CAROUSEL SYSTEM
// ============================================================

function _renderPromoSlide() {
    const combo = _promoActiveCombos[_promoCarouselIndex];
    if (!combo) return;
    _currentPromoCombo = combo;

    // --- Image ---
    const imgEl = document.getElementById('pmc-img');
    const imgPlaceholder = document.getElementById('pmc-img-placeholder');
    if (imgEl && imgPlaceholder) {
        if (combo.img) {
            imgEl.src = combo.img;
            imgEl.style.display = 'block';
            imgPlaceholder.style.display = 'none';
        } else {
            imgEl.style.display = 'none';
            imgPlaceholder.textContent = combo.emoji || '🔥';
            imgPlaceholder.style.display = 'flex';
        }
    }

    // --- Savings Badge ---
    const savings = calcSavings(combo);
    const savBadge = document.getElementById('pmc-savings-badge');
    if (savBadge) {
        if (savings > 0) {
            savBadge.textContent = `-${savings}%`;
            savBadge.style.display = '';
        } else {
            savBadge.style.display = 'none';
        }
    }

    // --- Limited Badge ---
    const limBadge = document.getElementById('pmc-limited-badge');
    if (limBadge) {
        if (combo.limited) limBadge.style.display = '';
        else limBadge.style.display = 'none';
    }

    // --- Arrows & Dots ---
    const prevBtn = document.getElementById('pmc-prev');
    const nextBtn = document.getElementById('pmc-next');
    const hasMultiple = _promoActiveCombos.length > 1;
    if (prevBtn) prevBtn.style.display = hasMultiple ? 'flex' : 'none';
    if (nextBtn) nextBtn.style.display = hasMultiple ? 'flex' : 'none';

    const dotsEl = document.getElementById('pmc-dots');
    if (dotsEl) {
        if (hasMultiple) {
            dotsEl.innerHTML = _promoActiveCombos.map((_, i) =>
                `<span class="pmc-dot ${i === _promoCarouselIndex ? 'active' : ''}" onclick="promoGoToSlide(${i})"></span>`
            ).join('');
            dotsEl.style.display = 'flex';
        } else {
            dotsEl.style.display = 'none';
        }
    }

    // --- Text Content ---
    const nameEl = document.getElementById('pmc-name');
    const descEl = document.getElementById('pmc-desc');
    if (nameEl) nameEl.textContent = combo.name;
    if (descEl) descEl.textContent = combo.desc;

    // --- Chips ---
    const chipsEl = document.getElementById('pmc-chips');
    if (chipsEl) {
        chipsEl.innerHTML = (combo.items || []).map(item =>
            `<span class="combo-item-chip">${item}</span>`
        ).join('');
    }

    // --- Pricing ---
    const pricingEl = document.getElementById('pmc-pricing');
    if (pricingEl) {
        pricingEl.innerHTML = `
            ${combo.originalPrice && combo.originalPrice > combo.price
                ? `<span class="combo-price-original">$ ${combo.originalPrice.toLocaleString('es-CO')}</span>`
                : ''}
            <span class="combo-price-final pmc-price-final">$ ${combo.price.toLocaleString('es-CO')}</span>
        `;
    }

    // --- Countdown ---
    if (_promoTimerInterval) clearInterval(_promoTimerInterval);
    const countdownEl = document.getElementById('promo-modal-countdown');
    if (combo.expiresAt && new Date(combo.expiresAt) > new Date()) {
        if (countdownEl) countdownEl.classList.remove('hidden');
        const updateTimer = () => {
            const msLeft = new Date(combo.expiresAt) - new Date();
            const { h, m, s } = formatCountdown(msLeft);
            const hEl = document.getElementById('ct-hours');
            const mEl = document.getElementById('ct-mins');
            const sEl = document.getElementById('ct-secs');
            if (hEl) hEl.textContent = h;
            if (mEl) mEl.textContent = m;
            if (sEl) sEl.textContent = s;
            if (msLeft <= 0) {
                clearInterval(_promoTimerInterval);
                if (countdownEl) countdownEl.classList.add('hidden');
            }
        };
        updateTimer();
        _promoTimerInterval = setInterval(updateTimer, 1000);
    } else {
        if (countdownEl) countdownEl.classList.add('hidden');
    }

    if (window.lucide) setTimeout(() => lucide.createIcons(), 50);
}

window.openPromoModal = function(comboId) {
    _promoActiveCombos = (state.combos || []).filter(c => c.active !== false);
    if (_promoActiveCombos.length === 0) return;

    if (comboId !== undefined) {
        const idx = _promoActiveCombos.findIndex(c => c.id === comboId);
        _promoCarouselIndex = idx >= 0 ? idx : 0;
    } else {
        // Prefer showInModal combo as starting slide
        const modalIdx = _promoActiveCombos.findIndex(c => c.showInModal);
        _promoCarouselIndex = modalIdx >= 0 ? modalIdx : 0;
    }

    _renderPromoSlide();

    const overlay = document.getElementById('promo-modal-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        document.body.classList.add('scroll-lock');
    }

    const bubble = document.getElementById('promo-bubble');
    if (bubble) bubble.classList.add('hidden');
};

window.closePromoModal = function() {
    const overlay = document.getElementById('promo-modal-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        document.body.classList.remove('scroll-lock');
    }
    if (_promoTimerInterval) clearInterval(_promoTimerInterval);
    _currentPromoCombo = null;
    // Show bubble again if any active combos exist
    const hasActive = (state.combos || []).some(c => c.active !== false);
    const bubble = document.getElementById('promo-bubble');
    if (bubble && hasActive) bubble.classList.remove('hidden');
};

window.promoCarouselPrev = function() {
    if (_promoActiveCombos.length < 2) return;
    _promoCarouselIndex = (_promoCarouselIndex - 1 + _promoActiveCombos.length) % _promoActiveCombos.length;
    _renderPromoSlide();
};

window.promoCarouselNext = function() {
    if (_promoActiveCombos.length < 2) return;
    _promoCarouselIndex = (_promoCarouselIndex + 1) % _promoActiveCombos.length;
    _renderPromoSlide();
};

window.promoGoToSlide = function(idx) {
    _promoCarouselIndex = idx;
    _renderPromoSlide();
};

window.addPromoComboToCart = function(event) {
    if (!_currentPromoCombo) return;
    addComboToCart(_currentPromoCombo.id, event);
    closePromoModal();
};

function updatePromoBubbleUI() {
    const bubble = document.getElementById('promo-bubble');
    const inner = bubble?.querySelector('.promo-bubble-inner');
    if (!bubble || !inner) return;

    const conf = state.config;
    const animId = conf.promoAnim || 'anim-3d-spinner';

    // Render SVG artwork if available, otherwise fallback emoji
    const svgMarkup = conf.promoIconSvg || '';
    if (svgMarkup) {
        inner.innerHTML = svgMarkup;
    } else {
        // Default SVG box (red classic) as fallback
        inner.innerHTML = `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#e53935" stroke="#b71c1c" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#ef9a9a" stroke="#b71c1c" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#c62828"/><rect x="8" y="22" width="44" height="4" fill="#c62828"/><path d="M30 18 Q20 10 14 14 Q8 18 12 22 Q18 22 30 18Z" fill="#ff5252"/><path d="M30 18 Q40 10 46 14 Q52 18 48 22 Q42 22 30 18Z" fill="#ff5252"/><circle cx="30" cy="18" r="3" fill="#ffcdd2"/></svg>`;
    }

    // Remove all anim classes
    const allAnims = [
        'anim-3d-spinner', 'anim-atomic-heart', 'anim-magnetic', 'anim-elastic',
        'anim-orbital', 'anim-glitch', 'anim-solar', 'anim-cosmic',
        'anim-radar', 'anim-flip-glide', 'anim-vortex', 'anim-cosmic-bounce'
    ];
    bubble.classList.remove(...allAnims);
    bubble.classList.add(animId);
}

let _shownModalComboIds = []; // Rastreo de combos que ya activaron el modal en esta sesión

function checkAndShowPromoModal(isFirstLoad = false) {
    const activeCombos = (state.combos || []).filter(c => c.active !== false);
    const bubble = document.getElementById('promo-bubble');
    
    // Aplicar personalización visual del burbuja
    updatePromoBubbleUI();

    if (bubble) {
        if (activeCombos.length > 0) bubble.classList.remove('hidden');
        else bubble.classList.add('hidden');
    }

    // Lógica del Modal (Pop-up)
    const modalCombos = activeCombos.filter(c => c.showInModal);
    
    // Detectar si hay algún combo "nuevo" que no hayamos mostrado aún
    const newModalCombos = modalCombos.filter(c => !_shownModalComboIds.includes(c.id));

    if (newModalCombos.length > 0) {
        // Solo mostramos el modal si hay combos nuevos que anunciar
        setTimeout(() => {
            // Verificamos de nuevo que sigan activos antes de abrir
            const stillActive = (state.combos || []).some(c => c.active && c.showInModal && newModalCombos.some(nc => nc.id === c.id));
            if (!stillActive) return;

            openPromoModal();
            
            // Marcar estos combos como "vistos" para no repetir el pop-up
            modalCombos.forEach(c => {
                if (!_shownModalComboIds.includes(c.id)) _shownModalComboIds.push(c.id);
            });
        }, isFirstLoad ? 1500 : 500);
    }
}

function renderMenu(dishes = null) {
    if (!menuGrid) return;
    menuGrid.innerHTML = '';
    
    const filteredDishes = (dishes || state.dishes).filter(d => d.active !== false);
    const categoriesToRender = state.currentCategory === 'todos' 
        ? state.categories.filter(c => c.id !== 'todos' && (!c.isExtras || c.showOnMenu))
        : state.categories.filter(c => c.id === state.currentCategory);

    // Render Special Discounts Section First if on "todos"
    if (state.currentCategory === 'todos') {
        const discountedDishes = filteredDishes.filter(d => d.discountActive && d.discountPrice > 0);
        if (discountedDishes.length > 0) {
            const section = document.createElement('section');
            section.className = 'category-section';
            section.innerHTML = `
                <div class="category-header">
                    <h2 class="category-title" style="color: var(--theme-accent);">🔥 Ofertas Especiales</h2>
                </div>
                <div class="carousel-wrapper">
                    <button class="carousel-arrow left-arrow" aria-label="Anterior">
                        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>
                    <div class="carousel-container">
                        ${discountedDishes.map(dish => renderDishCard(dish)).join('')}
                    </div>
                    <button class="carousel-arrow right-arrow" aria-label="Siguiente">
                        <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                </div>
            `;
            menuGrid.appendChild(section);
        }
    }

    categoriesToRender.forEach(cat => {
        const catDishes = filteredDishes.filter(d => 
            (d.cat || '').toLowerCase().trim() === (cat.id || '').toLowerCase().trim()
        );
        if (catDishes.length === 0) return;

        const section = document.createElement('section');
        section.className = 'category-section';
        section.innerHTML = `
            <div class="category-header"><h2 class="category-title">${cat.name}</h2></div>
            <div class="carousel-wrapper">
                <button class="carousel-arrow left-arrow" aria-label="Anterior">
                    <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <div class="carousel-container">
                    ${catDishes.map(dish => renderDishCard(dish)).join('')}
                </div>
                <button class="carousel-arrow right-arrow" aria-label="Siguiente">
                    <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                </button>
            </div>
        `;
        menuGrid.appendChild(section);
    });

    if (window.lucide) lucide.createIcons();

    // --- EVENT DELEGATION FOR MENU ACTIONS ---
    // This is more robust than adding listeners to each element individually
    if (!menuGrid.dataset.delegated) {
        menuGrid.dataset.delegated = "true";
        menuGrid.addEventListener('click', (e) => {
            // 1. Add to Cart Button
            const addBtn = e.target.closest('.add-to-cart');
            if (addBtn) {
                e.preventDefault();
                e.stopPropagation();
                const dishId = addBtn.dataset.id;
                
                // Ripple effect
                const ripple = document.createElement('span');
                ripple.className = 'add-btn-ripple';
                addBtn.appendChild(ripple);
                setTimeout(() => ripple.remove(), 520);

                // Check for extras
                const extrasCats = state.categories.filter(c => c.isExtras);
                const globalExtras = state.dishes.filter(d => extrasCats.some(ec => ec.id == d.cat) && d.active !== false);
                
                if (globalExtras.length > 0) {
                    openDishModal(dishId);
                } else {
                    addToCart(dishId, e);
                }
                return;
            }

            // 2. View Details or Clickable Image
            const viewEl = e.target.closest('.view-details') || e.target.closest('.clickable-img');
            if (viewEl) {
                e.preventDefault();
                e.stopPropagation();
                openDishModal(viewEl.dataset.id);
                return;
            }
        });
    }

    // Initialize Carousels
    document.querySelectorAll('.carousel-wrapper').forEach(wrapper => {
        const container = wrapper.querySelector('.carousel-container');
        const leftBtn = wrapper.querySelector('.left-arrow');
        const rightBtn = wrapper.querySelector('.right-arrow');
        if (!container || !leftBtn || !rightBtn) return;
        
        const scrollAmount = window.innerWidth > 768 ? 320 : window.innerWidth * 0.85; 
        
        leftBtn.addEventListener('click', () => {
            container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });
        rightBtn.addEventListener('click', () => {
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });
        
        const updateArrows = () => {
            // Show/hide based on scroll limits
            leftBtn.style.opacity = container.scrollLeft <= 5 ? '0' : '1';
            leftBtn.style.pointerEvents = container.scrollLeft <= 5 ? 'none' : 'auto';
            
            const maxScroll = container.scrollWidth - container.clientWidth;
            rightBtn.style.opacity = container.scrollLeft >= (maxScroll - 5) ? '0' : '1';
            rightBtn.style.pointerEvents = container.scrollLeft >= (maxScroll - 5) ? 'none' : 'auto';
            
            // If contents fit entirely, hide both
            if (container.scrollWidth <= container.clientWidth) {
                leftBtn.style.display = 'none';
                rightBtn.style.display = 'none';
            } else {
                leftBtn.style.display = 'flex';
                rightBtn.style.display = 'flex';
            }
        };
        
        container.addEventListener('scroll', updateArrows);
        setTimeout(updateArrows, 50); // initial check
        window.addEventListener('resize', updateArrows);

        // Auto-reset carousel to first item when it leaves the viewport
        const resetObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting && container.scrollLeft > 0) {
                    // Carousel scrolled out of view — reset to start for next visit
                    setTimeout(() => {
                        container.scrollTo({ left: 0, behavior: 'instant' });
                        updateArrows();
                    }, 300); // small delay so reset doesn't flash while user scrolls
                }
            });
        }, { threshold: 0, rootMargin: '-60px 0px' }); // -60px so nav doesn't trigger it

        resetObserver.observe(container);
    });
}

function renderDishCard(dish) {
    const isDiscounted = dish.discountActive && dish.discountPrice > 0;
    const price = isDiscounted ? dish.discountPrice : dish.price;
    const savings = isDiscounted ? Math.round((1 - dish.discountPrice / dish.price) * 100) : 0;

    return `
        <article class="dish-card">
            <div class="dish-img-container clickable-img" data-id="${dish.id}">
                ${isDiscounted ? `<div class="dish-discount-badge">-${savings}%</div>` : ''}
                <img src="${dish.img}" class="dish-img-full" alt="${dish.name}">
            </div>
            <div class="dish-info">
                <div class="dish-header">
                    <h3 class="dish-name">${dish.name}</h3>
                    <div class="dish-pricing">
                        ${isDiscounted ? `<span class="dish-old-price">$ ${dish.price.toLocaleString('es-CO')}</span>` : ''}
                        <span class="dish-price">$ ${price.toLocaleString('es-CO')}</span>
                    </div>
                </div>
                <p class="dish-desc">${dish.desc}</p>
                <div class="dish-actions">
                    <button class="btn-secondary view-details" data-id="${dish.id}">Detalles</button>
                    <button class="add-btn add-to-cart" data-id="${dish.id}"><i data-lucide="plus"></i></button>
                </div>
            </div>
        </article>
    `;
}

function openDishModal(id) {
    const dish = state.dishes.find(d => d.id == id);
    if (!dish || !modalBody) return;

    const isDiscounted = dish.discountActive && dish.discountPrice > 0;
    const price = isDiscounted ? dish.discountPrice : dish.price;
    const savings = isDiscounted ? Math.round((1 - dish.discountPrice / dish.price) * 100) : 0;

    // --- Master Extras (Globales) ---
    const parentCat = state.categories.find(c => c.id == dish.cat);
    const allowExtras = parentCat ? (parentCat.allowExtras === true) : false;

    const extrasCats = state.categories.filter(c => c.isExtras);
    const globalExtras = state.dishes.filter(d => extrasCats.some(ec => ec.id == d.cat) && d.active !== false);

    let extrasHtml = '';
    const hasGlobalExtras = allowExtras && globalExtras.length > 0;

    if (hasGlobalExtras) {
        extrasHtml = `
            <div class="modal-extras-section">
                <h4 style="color: var(--text); font-size: 0.95rem; margin-bottom: 1rem; font-weight: 800; text-align: center;">¿Deseas agregar algo más?</h4>
                
                <button type="button" class="btn-toggle-extras" id="toggle-extras-list">
                    <i data-lucide="plus-circle" style="width: 18px;"></i>
                    VER EXTRAS DISPONIBLES
                    <i data-lucide="chevron-down" style="width: 16px; margin-left: auto;" id="toggle-icon-extras"></i>
                </button>

                <div class="extras-scroll-container" id="extras-container-wrapper">
                    <div class="extras-grid" style="display: grid; grid-template-columns: 1fr; gap: 0.5rem; padding: 0.5rem 0;">
                        ${globalExtras.map((ex, i) => `
                            <div class="extra-item-pro" data-name="${ex.name}" data-price="${ex.price}">
                                <img src="${ex.img || 'img/placeholder.png'}" class="extra-thumb" style="width: 45px; height: 45px; object-fit: cover; border-radius: 10px; flex-shrink: 0;" alt="${ex.name}">
                                <div style="flex-grow: 1;">
                                    <div style="font-size: 0.9rem; font-weight: 800; color: var(--text);">${ex.name}</div>
                                    <div style="font-size: 0.7rem; color: var(--text-dim); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Adicional Extra</div>
                                </div>
                                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem;">
                                    <span style="font-weight: 900; color: var(--theme-accent); font-size: 0.9rem;">+ $${ex.price.toLocaleString('es-CO')}</span>
                                    <div class="extra-check-box" style="width: 24px; height: 24px; border: 2px solid var(--glass-border); border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                                        <i data-lucide="check" style="width: 16px; color: #4caf50; display: none; stroke-width: 3px;"></i>
                                    </div>
                                    <input type="checkbox" class="extra-checkbox hidden" data-name="${ex.name}" data-price="${ex.price}">
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    modalBody.innerHTML = `
        <div style="padding: 1.5rem 1.5rem 0 1.5rem;">
            <div style="position: relative; width: 100%; border-radius: 20px; overflow: hidden; box-shadow: 0 15px 30px rgba(0,0,0,0.3); margin-bottom: 1.5rem;">
                <img src="${dish.img}" style="width: 100%; aspect-ratio: 16/10; object-fit: cover; display: block;">
                ${isDiscounted ? `<div style="position: absolute; top: 1rem; left: 1rem; background: var(--theme-accent); color: #000; padding: 0.4rem 0.8rem; border-radius: 10px; font-weight: 900; font-size: 0.85rem; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">-${savings}% OFF</div>` : ''}
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem;">
                <h2 style="font-size: 1.8rem; font-weight: 950; color: var(--text); line-height: 1.1; letter-spacing: -0.5px;">${dish.name}</h2>
                <div style="text-align: right;">
                    ${isDiscounted ? `<div style="text-decoration: line-through; color: var(--text-dim); font-size: 0.9rem; font-weight: 700; opacity: 0.6;">$ ${dish.price.toLocaleString('es-CO')}</div>` : ''}
                    <div style="font-size: 1.6rem; font-weight: 950; color: var(--theme-accent);">$ ${price.toLocaleString('es-CO')}</div>
                </div>
            </div>
            
            <p style="color: var(--text-dim); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem; font-weight: 500;">${dish.desc}</p>
        </div>

        ${extrasHtml}

        <div style="padding: 1.2rem 1.5rem; background: var(--surface); border-top: 1px solid var(--glass-border); position: sticky; bottom: 0; display: flex; gap: 0.8rem; align-items: center; z-index: 10;">
            <div class="modal-qty-controls" style="display: flex; align-items: center; background: rgba(var(--text-rgb), 0.05); border-radius: 50px; padding: 0.2rem; border: 1px solid var(--glass-border); flex-shrink: 0;">
                <button type="button" id="modal-qty-minus" style="width: 36px; height: 36px; border-radius: 50%; border: none; background: transparent; color: var(--text); font-size: 1.4rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s;">-</button>
                <span id="modal-qty-val" style="width: 30px; text-align: center; font-weight: 900; font-size: 1.1rem; color: var(--text);">1</span>
                <button type="button" id="modal-qty-plus" style="width: 36px; height: 36px; border-radius: 50%; border: none; background: transparent; color: var(--text); font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s;">+</button>
            </div>
            <button class="btn-primary add-modal-cart" data-id="${dish.id}" style="flex: 1; height: 50px; border-radius: 50px; font-size: 1.05rem; font-weight: 900; box-shadow: 0 8px 25px rgba(var(--theme-accent-rgb), 0.3); display: flex; justify-content: center; align-items: center; gap: 0.5rem; text-transform: uppercase;">
                Agregar <span id="modal-btn-price" style="margin-left: 0.2rem;">$ ${price.toLocaleString('es-CO')}</span>
            </button>
        </div>
    `;

    // Initialize Lucide icons
    if (window.lucide) lucide.createIcons();

    // Toggle Extras Logic
    const toggleBtn = document.getElementById('toggle-extras-list');
    const extrasWrapper = document.getElementById('extras-container-wrapper');
    if (toggleBtn && extrasWrapper) {
        toggleBtn.onclick = () => {
            const isOpen = extrasWrapper.classList.toggle('open');
            const icon = document.getElementById('toggle-icon-extras');
            if (icon) {
                icon.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0)';
                icon.style.transition = 'transform 0.3s ease';
            }
            toggleBtn.style.borderStyle = isOpen ? 'solid' : 'dashed';
            toggleBtn.innerHTML = isOpen 
                ? `<i data-lucide="minus-circle" style="width: 18px;"></i> OCULTAR EXTRAS <i data-lucide="chevron-up" style="width: 16px; margin-left: auto;" id="toggle-icon-extras"></i>`
                : `<i data-lucide="plus-circle" style="width: 18px;"></i> VER EXTRAS DISPONIBLES <i data-lucide="chevron-down" style="width: 16px; margin-left: auto;" id="toggle-icon-extras"></i>`;
            if (window.lucide) lucide.createIcons();
        };
    }

    // Pro Extras Selection Logic
    document.querySelectorAll('.extra-item-pro').forEach(item => {
        item.onclick = () => {
            const cb = item.querySelector('.extra-checkbox');
            const checkIcon = item.querySelector('.extra-check-box svg') || item.querySelector('.extra-check-box i');
            const checkBox = item.querySelector('.extra-check-box');
            
            cb.checked = !cb.checked;
            item.classList.toggle('selected', cb.checked);
            
            if (cb.checked) {
                checkBox.style.borderColor = '#4caf50';
                if (checkIcon) checkIcon.style.display = 'block';
            } else {
                checkBox.style.borderColor = 'var(--glass-border)';
                if (checkIcon) checkIcon.style.display = 'none';
            }
            updateModalPrice();
        };
    });

    // Quantity & Price Logic
    let currentQty = 1;
    const updateModalPrice = () => {
        let totalExtras = 0;
        document.querySelectorAll('.extra-checkbox:checked').forEach(cb => {
            totalExtras += parseFloat(cb.dataset.price);
        });
        const finalPrice = (price + totalExtras) * currentQty;
        document.getElementById('modal-btn-price').textContent = `$ ${finalPrice.toLocaleString('es-CO')}`;
    };

    document.getElementById('modal-qty-minus').onclick = () => {
        if (currentQty > 1) {
            currentQty--;
            document.getElementById('modal-qty-val').textContent = currentQty;
            updateModalPrice();
        }
    };
    
    document.getElementById('modal-qty-plus').onclick = () => {
        currentQty++;
        document.getElementById('modal-qty-val').textContent = currentQty;
        updateModalPrice();
    };

    dishModal.classList.remove('hidden');
    document.body.classList.add('scroll-lock');
    
    document.querySelector('.add-modal-cart').onclick = (e) => {
        const selectedExtras = Array.from(document.querySelectorAll('.extra-checkbox:checked')).map(cb => ({
            name: cb.dataset.name,
            price: parseFloat(cb.dataset.price)
        }));
        addToCart(dish.id, e, selectedExtras, currentQty);
        dishModal.classList.add('hidden');
        document.body.classList.remove('scroll-lock');
    };
}

/**
 * Sincroniza el carrito con el menú actual.
 * - Si un producto ya no tiene descuento, vuelve al precio original.
 * - Si un combo está inactivo o expiró, desaparece del carrito.
 */
function syncCartWithMenu() {
    if (!state.cart || state.cart.length === 0) return;
    
    let cartModified = false;
    const initialCount = state.cart.length;

    const newCart = state.cart.filter(item => {
        if (item.isCombo) {
            const comboId = parseInt(item.id.replace('combo_', ''));
            const combo = (state.combos || []).find(c => c.id === comboId);
            
            // Verificar si el combo existe y está activo
            if (!combo || combo.active === false) {
                cartModified = true;
                return false;
            }
            
            // Verificar si el combo expiró
            if (combo.expiresAt && new Date(combo.expiresAt) < new Date()) {
                cartModified = true;
                return false;
            }

            // Actualizar datos del combo en el carrito (precio por si cambió)
            if (item.price !== combo.price || item.name !== combo.name) {
                item.price = combo.price;
                item.name = combo.name;
                item.savings = calcSavings(combo);
                cartModified = true;
            }
            return true;
        } else {
            // Es un plato normal
            const dish = state.dishes.find(d => d.id == item.id);
            
            // Si el plato no existe o está inactivo, fuera del carrito
            if (!dish || dish.active === false) {
                cartModified = true;
                return false;
            }

            // Verificar el estado actual del precio/descuento
            const isDiscounted = dish.discountActive && dish.discountPrice > 0;
            const currentPrice = isDiscounted ? dish.discountPrice : dish.price;
            const currentSavings = isDiscounted ? Math.round((1 - dish.discountPrice / dish.price) * 100) : 0;

            // Si el precio cambió (ej: quitaron el descuento), actualizamos el carrito
            if (item.price !== currentPrice || item.isDiscount !== isDiscounted) {
                item.price = currentPrice;
                item.isDiscount = isDiscounted;
                item.savings = currentSavings;
                cartModified = true;
            }
            return true;
        }
    });

    if (cartModified || newCart.length !== initialCount) {
        state.cart = newCart;
        saveStateToLocal();
    }
}

function calculateTotal() {
    return state.cart.reduce((sum, item) => {
        const extrasPrice = (item.extras || []).reduce((s, e) => s + e.price, 0);
        return sum + ((item.price + extrasPrice) * item.qty);
    }, 0);
}

function updateCartUI() {
    syncCartWithMenu();
    const cartContainer = document.getElementById('cart-items');
    const cartBadge = document.getElementById('cart-badge');
    const totalPrice = document.getElementById('total-price');
    if (!cartContainer || !cartBadge || !totalPrice) return;
    
    cartContainer.innerHTML = state.cart.map(item => {
        const safeId = JSON.stringify(String(item.cartItemId || item.id));
        // Robust calculation for items already in cart without savings property
        let savingsValue = item.savings;
        if (item.isDiscount && (!savingsValue || savingsValue === 0)) {
            const originalDish = state.dishes.find(d => d.id === item.id);
            if (originalDish && originalDish.price > item.price) {
                savingsValue = Math.round((1 - item.price / originalDish.price) * 100);
            }
        }
        
        const cleanName = item.name.replace(' (Combo)', '');

        const badgeHtml = item.isCombo 
            ? `<span class="cart-item-badge combo" style="display: inline-flex; align-items: center; gap: 0.3rem; background: rgba(255, 69, 0, 0.15); color: #ff4500; padding: 0.2rem 0.6rem; border-radius: 8px; font-size: 0.6rem; font-weight: 900; text-transform: uppercase; border: 1px solid rgba(255, 69, 0, 0.3); letter-spacing: 0.5px; margin-left: 0.6rem;">
                <i data-lucide="zap" style="width: 10px; height: 10px;"></i> Combo
               </span>`
            : (item.isDiscount && savingsValue > 0)
                ? `<span class="cart-item-badge discount">-${savingsValue}%</span>`
                : '';

        // Calculate item total with extras
        const extrasPrice = (item.extras || []).reduce((s, e) => s + e.price, 0);
        const itemUnitPrice = item.price + extrasPrice;
        const itemTotal = itemUnitPrice * item.qty;

        const extrasSection = (item.extras && item.extras.length > 0)
            ? `
            <div class="cart-item-extras-section" style="padding: 0 0.75rem 0.75rem 0.75rem; border-top: 1px solid rgba(255,255,255,0.03);">
                <div class="extras-header-tag" style="display: inline-flex; align-items: center; gap: 0.4rem; background: rgba(247, 147, 30, 0.12); color: #f7931e; padding: 0.25rem 0.75rem; border-radius: 20px; border: 1px solid rgba(247, 147, 30, 0.25); margin-bottom: 0.6rem; margin-top: 0.4rem;">
                    <i data-lucide="plus-circle" style="width: 11px; height: 11px;"></i>
                    <span style="font-size: 0.6rem; font-weight: 900; letter-spacing: 0.6px; text-transform: uppercase;">Adiciones (Extras)</span>
                </div>
                <div class="cart-item-extras-tags" style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                    ${item.extras.map(ex => `
                        <span class="extra-tag" style="display: flex; align-items: center; gap: 0.25rem; background: rgba(255,255,255,0.03); color: white; padding: 0.3rem 0.6rem; border-radius: 10px; font-size: 0.65rem; font-weight: 600; border: 1px solid var(--glass-border);">
                            ${ex.name}
                            <span onclick="removeExtraFromCart('${item.cartItemId}', '${ex.name}')" style="display: flex; align-items: center; justify-content: center; width: 14px; height: 14px; background: rgba(255,255,255,0.08); border-radius: 50%; cursor: pointer; margin-left: 2px;">
                               <svg viewBox="0 0 24 24" width="8" height="8" stroke="currentColor" stroke-width="3" fill="none"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </span>
                        </span>
                    `).join('')}
                </div>
            </div>
            `
            : '';

        return `
        <div class="cart-item">
            <div class="cart-item-main">
                <div class="cart-item-img-wrapper">
                    <img src="${item.img}" alt="${cleanName}">
                </div>
                <div class="cart-item-details">
                    <h4 class="cart-item-name">${cleanName} ${badgeHtml}</h4>
                    
                    <div class="cart-item-footer">
                        <div class="quantity-controls">
                            <button onclick='updateQty(${safeId}, -1)' class="q-btn minus" title="Quitar uno">−</button>
                            <span class="q-num">${item.qty}</span>
                            <button onclick='updateQty(${safeId}, 1)' class="q-btn plus" title="Agregar uno">+</button>
                        </div>
                        <span class="cart-item-total">$${itemTotal.toLocaleString('es-CO')}</span>
                        <button class="remove-item-btn" onclick='removeFromCart(${safeId})' title="Eliminar producto">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
                        </button>
                    </div>
                </div>
            </div>
            ${extrasSection}
        </div>
    `}).join('');
    
    const total = calculateTotal();
    const cartCount = state.cart.reduce((sum, item) => sum + item.qty, 0);
    cartBadge.textContent = cartCount;
    totalPrice.textContent = `$ ${total.toLocaleString('es-CO')}`;

    const cartBtn = document.getElementById('cart-toggle');
    if (cartBtn) {
        if (cartCount > 0) cartBtn.classList.add('pulse-active');
        else cartBtn.classList.remove('pulse-active');
    }

    // Disable checkout if store is closed
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        if (!state.config.storeOpen) {
            checkoutBtn.disabled = true;
            checkoutBtn.style.opacity = '0.5';
            checkoutBtn.style.cursor = 'not-allowed';
            checkoutBtn.textContent = 'Tienda Cerrada';
        } else {
            checkoutBtn.disabled = false;
            checkoutBtn.style.opacity = '1';
            checkoutBtn.style.cursor = 'pointer';
            checkoutBtn.textContent = 'Finalizar Pedido';
        }
    }

    if (window.lucide) lucide.createIcons();
}

function addToCart(id, event = null, selectedExtras = [], qtyToAdd = 1) {
    const dish = state.dishes.find(d => d.id == id);
    if (!dish) return;

    // Trigger fly animation
    if (event) flyToCart(event.currentTarget || event.target);

    const isDiscounted = dish.discountActive && dish.discountPrice > 0;
    const finalPrice = isDiscounted ? dish.discountPrice : dish.price;

    // Unique key for the item based on ID and selected extras
    const extrasKey = selectedExtras.map(e => e.name).sort().join('|');
    const cartItemId = extrasKey ? `${dish.id}_${extrasKey}` : dish.id;

    const item = state.cart.find(i => i.cartItemId === cartItemId);
    const savings = isDiscounted ? Math.round((1 - dish.discountPrice / dish.price) * 100) : 0;

    if (item) {
        item.qty += qtyToAdd;
    } else {
        state.cart.push({
            cartItemId: cartItemId,
            id: dish.id,
            name: dish.name,
            cat: dish.cat || '',
            price: finalPrice,
            img: dish.img,
            qty: qtyToAdd,
            isDiscount: isDiscounted,
            savings: savings,
            extras: selectedExtras
        });
    }
    updateCartUI();
    saveStateToLocal();
    showToast('Agregado al carrito ✅');
}

function removeExtraFromCart(cartItemId, extraName) {
    const itemIndex = state.cart.findIndex(i => i.cartItemId === cartItemId);
    if (itemIndex === -1) return;

    const item = state.cart[itemIndex];
    item.extras = item.extras.filter(ex => ex.name !== extraName);

    // Re-calculate cartItemId to maintain consistency
    const extrasKey = item.extras.map(e => e.name).sort().join('|');
    const newCartItemId = extrasKey ? `${item.id}_${extrasKey}` : item.id.toString();

    // Check if another item with the same final combination already exists
    const existingItemIndex = state.cart.findIndex(i => i.cartItemId === newCartItemId && i !== item);

    if (existingItemIndex !== -1) {
        state.cart[existingItemIndex].qty += item.qty;
        state.cart.splice(itemIndex, 1);
    } else {
        item.cartItemId = newCartItemId;
    }

    updateCartUI();
    saveStateToLocal();
    showToast('Extra eliminado 🗑️');
}

function flyToCart(startEl) {
    const cartToggle = document.getElementById('cart-toggle');
    if (!startEl || !cartToggle) return;

    const cartRect  = cartToggle.getBoundingClientRect();
    const tx = cartRect.left + cartRect.width / 2;
    const ty = cartRect.top + cartRect.height / 2;

    // Try to find the closest image related to the clicked button
    const card = startEl.closest('.dish-card, .combo-card, .modal-content, .promo-combo-item');
    let imgEl = null;
    if (card) {
        imgEl = card.querySelector('img');
    }

    if (imgEl) {
        // Professional Image Clone Animation
        const imgRect = imgEl.getBoundingClientRect();
        const clone = imgEl.cloneNode(true);
        clone.style.position = 'fixed';
        clone.style.zIndex = '9999';
        clone.style.left = imgRect.left + 'px';
        clone.style.top = imgRect.top + 'px';
        clone.style.width = imgRect.width + 'px';
        clone.style.height = imgRect.height + 'px';
        clone.style.borderRadius = window.getComputedStyle(imgEl).borderRadius;
        clone.style.objectFit = 'cover';
        clone.style.boxShadow = '0 15px 35px rgba(0,0,0,0.4)';
        clone.style.transition = 'all 0.7s cubic-bezier(0.19, 1, 0.22, 1)';
        clone.style.pointerEvents = 'none';

        document.body.appendChild(clone);

        // Force reflow
        void clone.offsetWidth;

        // Animate clone to cart
        clone.style.left = (tx - 15) + 'px';
        clone.style.top = (ty - 15) + 'px';
        clone.style.width = '30px';
        clone.style.height = '30px';
        clone.style.opacity = '0.4';
        clone.style.transform = 'scale(0.5) rotate(15deg)';

        setTimeout(() => {
            clone.remove();
            shakeCart(cartToggle);
        }, 700);

    } else {
        // Fallback minimal animation if no image is found
        const startRect = startEl.getBoundingClientRect();
        const cx = startRect.left + startRect.width / 2;
        const cy = startRect.top + startRect.height / 2;

        const dot = document.createElement('div');
        dot.style.position = 'fixed';
        dot.style.zIndex = '9999';
        dot.style.left = (cx - 6) + 'px';
        dot.style.top = (cy - 6) + 'px';
        dot.style.width = '12px';
        dot.style.height = '12px';
        dot.style.background = 'var(--primary)';
        dot.style.borderRadius = '50%';
        dot.style.pointerEvents = 'none';
        dot.style.boxShadow = '0 0 10px var(--primary)';
        dot.style.transition = 'all 0.6s cubic-bezier(0.19, 1, 0.22, 1)';
        
        document.body.appendChild(dot);
        
        void dot.offsetWidth;

        dot.style.left = (tx - 6) + 'px';
        dot.style.top = (ty - 6) + 'px';
        dot.style.opacity = '0';
        dot.style.transform = 'scale(0.5)';

        setTimeout(() => {
            dot.remove();
            shakeCart(cartToggle);
        }, 600);
    }
}


// Helper: reliably triggers cart shake using Web Animations API (bypasses conflicting CSS animations)
function shakeCart(el) {
    if (!el) return;
    el.animate([
        { transform: 'scale(1)' },
        { transform: 'scale(1.25) rotate(-14deg) translateY(-5px)' },
        { transform: 'scale(1.35) rotate(14deg) translateY(2px)' },
        { transform: 'scale(1.2) rotate(-10deg) translateY(-3px)' },
        { transform: 'scale(1.1) rotate(7deg) translateY(1px)' },
        { transform: 'scale(1.05) rotate(-3deg)' },
        { transform: 'scale(1)' }
    ], {
        duration: 600,
        easing: 'cubic-bezier(0.36, 0.07, 0.19, 0.97)',
        fill: 'none'
    });
}


window.updateQty = function(id, delta) {
    const sid = String(id);
    const item = state.cart.find(i => String(i.cartItemId || i.id) === sid);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) {
            state.cart = state.cart.filter(i => String(i.cartItemId || i.id) !== sid);
        }
        saveStateToLocal();
        updateCartUI();
    }
};

window.removeFromCart = function(id) {
    const sid = String(id);
    state.cart = state.cart.filter(i => String(i.cartItemId || i.id) !== sid);
    updateCartUI();
    saveStateToLocal();
};

function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'error') toast.style.background = '#ff5252';
    toast.textContent = msg;
    container.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// Legacy checkout function removed. 


function setupEventListeners() {
    const cartToggle = document.getElementById('cart-toggle');
    const closeCart = document.getElementById('close-cart');
    const cartSidebar = document.getElementById('cart-sidebar');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    const waBtn = document.getElementById('floating-wa-btn');
    
    if (cartToggle) {
        cartToggle.onclick = () => {
            cartSidebar.classList.add('active');
            document.body.classList.add('scroll-lock');
            if (waBtn) waBtn.classList.add('hidden');
        };
    }
    if (closeCart) {
        closeCart.onclick = () => {
            cartSidebar.classList.remove('active');
            document.body.classList.remove('scroll-lock');
            if (waBtn) waBtn.classList.remove('hidden');
        };
    }
    
    // Close cart when clicking outside or pressing Escape
    document.addEventListener('click', (e) => {
        if (cartSidebar && cartSidebar.classList.contains('active')) {
            // Use closest to check if the click is inside the sidebar or on any button that shouldn't close it
            const isInsideCart = e.target.closest('#cart-sidebar');
            const isToggle = e.target.closest('#cart-toggle');
            const isAddBtn = e.target.closest('.add-to-cart') || e.target.closest('.add-modal-cart') || e.target.closest('.promo-add-btn');
            
            // If the element is detached (re-rendered), closest() might return null.
            // In that case, we should check if the click happened while the cart was active
            // and ignore it if it was likely a quantity button inside the cart.
            if (!isInsideCart && !isToggle && !isAddBtn && e.target.isConnected) {
                cartSidebar.classList.remove('active');
                document.body.classList.remove('scroll-lock');
                if (waBtn) waBtn.classList.remove('hidden');
            }
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && cartSidebar && cartSidebar.classList.contains('active')) {
            cartSidebar.classList.remove('active');
            document.body.classList.remove('scroll-lock');
            if (waBtn) waBtn.classList.remove('hidden');
        }
    });
    
    // REMOVED OLD CHECKOUT LISTENERS (Consolidated into initCheckout)

    // --- Search Logic ---
    const menuSearch = document.getElementById('menu-search');

    if (menuSearch) {
        menuSearch.oninput = (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = state.dishes.filter(d => 
                d.name.toLowerCase().includes(term) || 
                d.desc.toLowerCase().includes(term)
            );
            renderMenu(filtered);
        };
    }

    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.onclick = () => {
            btn.closest('.modal').classList.add('hidden');
            document.body.classList.remove('scroll-lock'); // guaranteed release regardless of lock depth
        };
    });

    // Also unlock scroll when clicking outside the dish modal
    const dishModalEl = document.getElementById('dish-modal');
    if (dishModalEl) {
        dishModalEl.addEventListener('click', (e) => {
            if (e.target === dishModalEl) {
                dishModalEl.classList.add('hidden');
                document.body.classList.remove('scroll-lock');
            }
        });
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = (e) => {
            e.preventDefault();
            const u = document.getElementById('login-user').value;
            const p = document.getElementById('login-pass').value;
            if ((u === state.auth.user && p === state.auth.pass) || (u === 'admin' && p === '123456')) {
                state.isLoggedIn = true;
                localStorage.setItem('streetfeed_isLoggedIn', 'true');
                switchView('admin');
            } else {
                showToast('Credenciales incorrectas', 'error');
            }
        };
    }

    const logoutAction = () => {
        state.isLoggedIn = false;
        localStorage.setItem('streetfeed_isLoggedIn', 'false');
        // Clear credentials on logout for security
        const userInp = document.getElementById('login-user');
        const passInp = document.getElementById('login-pass');
        if (userInp) userInp.value = '';
        if (passInp) passInp.value = '';
        switchView('login');
    };

    const handleLogoutClick = () => {
        // Use our custom confirm modal if available, otherwise fallback to native confirm
        if (typeof showConfirm === 'function') {
            showConfirm('¿Estás seguro de que deseas cerrar la sesión?', logoutAction, 'Cerrar Sesión', 'var(--primary)');
        } else if (confirm('¿Estás seguro de que deseas cerrar la sesión?')) {
            logoutAction();
        }
    };

    const logoutBtn = document.getElementById('admin-logout');
    if (logoutBtn) logoutBtn.onclick = handleLogoutClick;

    const logoutBtnMobile = document.getElementById('admin-logout-mobile');
    if (logoutBtnMobile) logoutBtnMobile.onclick = handleLogoutClick;
    const backToMenu = document.getElementById('back-to-menu');
    if (backToMenu) {
        backToMenu.onclick = () => switchView('menu');
    }
}

// --- Real-time Sync across tabs ---
window.addEventListener('storage', (e) => {
    if (e.key === 'streetfeed_admin_theme' || e.key === 'streetfeed_config') {
        if (e.key === 'streetfeed_config') {
            state.config = JSON.parse(e.newValue);
            updateUIFromConfig();
        }
        applyTheme(state.config.themeAccent, state.config.themeBg, state.config.themeLogo);
        
        // If we are on admin and theme changed, refresh charts to update colors
        if (window.location.pathname.endsWith('admin.html') && typeof renderStats === 'function') {
            const activeBtn = document.querySelector('.filter-btn.active');
            renderStats(activeBtn ? activeBtn.dataset.range : 'today');
        }
    }
    if (e.key === 'streetfeed_dishes') {
        state.dishes = JSON.parse(e.newValue);
        renderMenu();
    }
    if (e.key === 'streetfeed_combos') {
        state.combos = JSON.parse(e.newValue);
        renderCombos();
        checkAndShowPromoModal();
    }
});

// --- Order & Checkout Logic ---
function initCheckout() {
    const openBtn = document.getElementById('open-checkout-modal');
    const closeBtn = document.getElementById('close-checkout');
    const closeBtnX = document.getElementById('close-checkout-x');
    const modal = document.getElementById('checkout-modal');
    const form = document.getElementById('checkout-form');

    if (!openBtn || !modal || !form) return;

    openBtn.addEventListener('click', () => {
        if (state.cart.length === 0) {
            showToast('El carrito está vacío', 'error');
            return;
        }
        modal.classList.remove('hidden');
        document.body.classList.add('scroll-lock');
        
        // Reset payment selector to placeholder state
        const pLabel = document.getElementById('payment-select-label');
        const pHidden = document.getElementById('cust-payment');
        if (pLabel) {
            pLabel.textContent = 'Seleccionar método de pago';
            pLabel.style.opacity = '0.6';
        }
        if (pHidden) pHidden.value = '';
        document.querySelectorAll('#payment-select-options .custom-select-option').forEach(o => o.classList.remove('selected'));

        // Reiniciar selector de entrega (nada preseleccionado)
        document.querySelectorAll('.del-type-btn').forEach(b => b.classList.remove('active'));
        const custDelType = document.getElementById('cust-delivery-type');
        if (custDelType) custDelType.value = '';
        
        const infoGroup = document.getElementById('delivery-info-group');
        if (infoGroup) infoGroup.style.display = 'none';

        // Actualizar totales explícitamente sin depender del clic
        updateCheckoutTotal();
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            document.body.classList.remove('scroll-lock');
        });
    }
    if (closeBtnX) {
        closeBtnX.addEventListener('click', () => {
            modal.classList.add('hidden');
            document.body.classList.remove('scroll-lock');
        });
    }

    // Delivery Type Selectors
    document.querySelectorAll('.del-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.del-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const type = btn.dataset.type;
            document.getElementById('cust-delivery-type').value = type;
            
            const label = document.getElementById('delivery-label');
            const input = document.getElementById('cust-address');
            if (input) input.value = ''; // Reset input value on every type switch
            
            // Reset visual states to prevent confusion
            document.querySelectorAll('.table-option').forEach(o => {
                o.style.background = 'rgba(255,255,255,0.05)';
                o.style.borderColor = 'var(--glass-border)';
                o.style.color = 'white';
                o.style.transform = 'scale(1)';
            });
            document.querySelectorAll('.takeout-opt-btn').forEach(b => {
                b.style.background = 'rgba(255,255,255,0.05)';
                b.style.borderColor = 'var(--glass-border)';
                b.style.color = 'white';
            });
            
            const tableSelWrapper = document.getElementById('table-selector-wrapper');
            const takeoutSelWrapper = document.getElementById('takeout-selector-wrapper');
            const infoGroup = document.getElementById('delivery-info-group');

            if (infoGroup) infoGroup.style.display = 'block';
            
            if (type === 'delivery') {
                label.textContent = 'Dirección de Entrega';
                input.placeholder = 'Ej: Calle 123 #45-67 Barrio...';
                input.style.display = 'block';
                if (tableSelWrapper) tableSelWrapper.style.display = 'none';
                if (takeoutSelWrapper) takeoutSelWrapper.style.display = 'none';
            } else if (type === 'dine-in') {
                label.textContent = 'Selecciona tu Mesa';
                input.style.display = 'none';
                if (tableSelWrapper) tableSelWrapper.style.display = 'flex';
                if (takeoutSelWrapper) takeoutSelWrapper.style.display = 'none';
                renderTableSelector();
            } else {
                label.textContent = '¿Cuándo recoges tu pedido?';
                input.style.display = 'none';
                if (tableSelWrapper) tableSelWrapper.style.display = 'none';
                if (takeoutSelWrapper) takeoutSelWrapper.style.display = 'flex';
                renderTakeoutSelector();
            }

            updateCheckoutTotal();
        });
    });

    function renderTakeoutSelector() {
        const input = document.getElementById('cust-address');
        document.querySelectorAll('.takeout-opt-btn').forEach(btn => {
            // Remove previous listeners if any (by replacing cloning or just assigning onclick)
            btn.onclick = () => {
                document.querySelectorAll('.takeout-opt-btn').forEach(b => {
                    b.style.background = 'rgba(255,255,255,0.05)';
                    b.style.borderColor = 'var(--glass-border)';
                    b.style.color = 'white';
                });
                btn.style.background = 'var(--theme-accent)';
                btn.style.borderColor = 'transparent';
                btn.style.color = '#000';
                input.value = btn.dataset.val;
            };
        });
    }

    function renderTableSelector() {
        const container = document.getElementById('table-selector');
        const input = document.getElementById('cust-address');
        const tableCount = state.config.tableCount || 10;
        
        if (!container) return;
        
        container.innerHTML = '';
        for (let i = 1; i <= tableCount; i++) {
            const opt = document.createElement('div');
            opt.className = 'table-option';
            opt.textContent = i;
            opt.style.cssText = `
                flex: 0 0 50px;
                height: 50px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255,255,255,0.05);
                border: 1px solid var(--glass-border);
                border-radius: 12px;
                font-weight: 800;
                cursor: pointer;
                transition: all 0.2s;
                color: white;
            `;
            
            opt.onclick = () => {
                container.querySelectorAll('.table-option').forEach(o => {
                    o.style.background = 'rgba(255,255,255,0.05)';
                    o.style.borderColor = 'var(--glass-border)';
                    o.style.color = 'white';
                    o.style.transform = 'scale(1)';
                });
                opt.style.background = 'var(--theme-accent)';
                opt.style.borderColor = 'transparent';
                opt.style.color = '#000';
                opt.style.transform = 'scale(1.1)';
                input.value = `Mesa ${i}`;
            };
            
            container.appendChild(opt);
        }

        // Conditional visibility for arrows
        const prev = document.getElementById('prev-table');
        const next = document.getElementById('next-table');
        if (prev && next) {
            const showArrows = tableCount > 5;
            prev.style.display = showArrows ? 'flex' : 'none';
            next.style.display = showArrows ? 'flex' : 'none';
            
            if (showArrows && !prev.dataset.listener) {
                prev.dataset.listener = "true";
                prev.onclick = () => container.scrollBy({ left: -100, behavior: 'smooth' });
                next.onclick = () => container.scrollBy({ left: 100, behavior: 'smooth' });
            }
        }
    }

    function updateCheckoutTotal() {
        const type = document.getElementById('cust-delivery-type').value;
        const baseTotal = calculateTotal();
        const delFee = (type === 'delivery') ? (state.config.deliveryFee || 0) : 0;
        
        const subtotalRow = document.getElementById('chk-subtotal-row');
        const delRow = document.getElementById('chk-del-row');
        const divider = document.getElementById('chk-divider');
        const subtotalEl = document.getElementById('chk-subtotal');
        const delFeeEl = document.getElementById('chk-del-fee');
        
        if (type === 'delivery') {
            if (subtotalRow) subtotalRow.style.display = 'flex';
            if (delRow) delRow.style.display = 'flex';
            if (divider) divider.style.display = 'block';
            if (subtotalEl) subtotalEl.textContent = `$ ${baseTotal.toLocaleString('es-CO').replace(/,/g, '.')}`;
            if (delFeeEl) delFeeEl.textContent = delFee > 0 ? `$ ${delFee.toLocaleString('es-CO').replace(/,/g, '.')}` : '¡Gratis!';
        } else {
            if (subtotalRow) subtotalRow.style.display = 'none';
            if (delRow) delRow.style.display = 'none';
            if (divider) divider.style.display = 'none';
        }

        const totalEl = document.getElementById('total-price');
        const chkTotalEl = document.getElementById('chk-total');
        
        const finalTotal = baseTotal + delFee;
        const formattedTotal = `$ ${finalTotal.toLocaleString('es-CO').replace(/,/g, '.')}`;
        
        if (totalEl) totalEl.textContent = formattedTotal;
        if (chkTotalEl) chkTotalEl.textContent = formattedTotal;
    }

    // Real-time Validation for Checkout Fields
    const nameInput = document.getElementById('cust-name');
    const phoneInput = document.getElementById('cust-phone');

    if (nameInput) {
        nameInput.addEventListener('input', (e) => {
            // Remove any characters that are not letters or spaces
            e.target.value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
        });
    }

    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            // Remove any characters that are not digits
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }

    function highlightError(selector, type = 'border') {
        const el = document.querySelector(selector);
        if (!el) return;
        const className = type === 'bg' ? 'invalid-field-bg' : 'invalid-field';
        el.classList.add(className);
        
        const removeError = () => {
            el.classList.remove(className);
            el.removeEventListener('click', removeError);
            el.removeEventListener('input', removeError);
        };
        el.addEventListener('click', removeError);
        el.addEventListener('input', removeError);
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const custPayment = document.getElementById('cust-payment').value;
        const custDeliveryType = document.getElementById('cust-delivery-type').value;
        const custAddress = document.getElementById('cust-address').value;

        if (!custDeliveryType) {
            showToast('Por favor, selecciona cómo recibirás tu pedido.', 'error');
            highlightError('.delivery-type-selector', 'bg');
            return;
        }

        if (!custAddress) {
            if (custDeliveryType === 'delivery') {
                showToast('Por favor ingresa tu dirección de entrega.', 'error');
                highlightError('#cust-address', 'border');
            }
            if (custDeliveryType === 'dine-in') {
                showToast('Por favor selecciona tu mesa.', 'error');
                highlightError('#table-selector-wrapper', 'bg');
            }
            if (custDeliveryType === 'takeout') {
                showToast('Por favor selecciona cuándo recoges tu pedido.', 'error');
                highlightError('#takeout-selector-wrapper', 'bg');
            }
            return;
        }

        if (!custPayment) {
            showToast('Por favor, selecciona un método de pago.', 'error');
            highlightError('.custom-select-trigger', 'border');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loading-spinner"></span> Enviando...';
            submitBtn.style.opacity = '0.7';
            submitBtn.style.cursor = 'not-allowed';
        }

        const customer = {
            name: document.getElementById('cust-name').value,
            phone: document.getElementById('cust-phone').value,
            address: document.getElementById('cust-address').value,
            payment: document.getElementById('cust-payment').value,
            note: document.getElementById('cust-note').value,
            deliveryType: document.getElementById('cust-delivery-type').value
        };

        // Obtener y actualizar el contador de pedidos secuencial
        let orderCounter = parseInt(localStorage.getItem('streetfeed_order_counter') || '0');
        orderCounter++;
        localStorage.setItem('streetfeed_order_counter', orderCounter.toString());

        const orderId = 'ORD-' + orderCounter;
        const baseTotal = calculateTotal();
        const delFee = (customer.deliveryType === 'delivery') ? (state.config.deliveryFee || 0) : 0;

        const orderData = {
            id: orderId,
            date: new Date().toISOString(),
            items: [...state.cart],
            baseTotal: baseTotal,
            deliveryFee: delFee,
            total: baseTotal + delFee,
            customer: customer,
            status: 'pending' // Importante para el BI y el Dashboard
        };

        // Guardar en el historial global (para que el Admin lo vea)
        state.orders = JSON.parse(localStorage.getItem('streetfeed_orders') || '[]');
        state.orders.push(orderData);
        saveStateToLocal();

        // Preparar mensaje de WhatsApp
        sendOrderToWhatsApp(orderData);

        // Limpiar y cerrar
        modal.classList.add('hidden');
        clearCart();
        
        // Resetear formulario y botón
        form.reset();
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Confirmar y Pedir';
            submitBtn.style.opacity = '';
            submitBtn.style.cursor = '';
        }
        
        showToast('🚀 Pedido enviado con éxito');
    });
}

function sendOrderToWhatsApp(order) {
    const config = state.config;
    // Use whatsappNumber which is exactly how the admin panel saves it
    const phone = config.whatsappNumber || '573000000000';
    
    const storeName = config.restaurantName || 'STREETFEED';
    
    // Emojis via Unicode escapes (ASCII safe, immune to file encoding issues)
    const e = {
        user: '\uD83D\uDC64',   // 👤
        phone: '\uD83D\uDCDE',  // 📞
        pin: '\uD83D\uDCCD',    // 📍
        money: '\uD83D\uDCB0',  // 💰
        note: '\uD83D\uDCDD',   // 📝
        cart: '\uD83D\uDED2',   // 🛒
        cash: '\uD83D\uDCB5',   // 💵
        rocket: '\uD83D\uDE80', // 🚀
        truck: '\uD83D\uDE9A'   // 🚚
    };

    const orderEmojis = config.orderEmojis || "";
    let message = `${orderEmojis} *NUEVO PEDIDO - ${storeName.toUpperCase()}* ${orderEmojis}\n`;
    message += `--------------------------\n`;
    message += `${e.user} *CLIENTE:* ${order.customer.name}\n`;
    message += `${e.phone} *TELÉFONO:* ${order.customer.phone}\n`;
    
    const delLabels = { 'dine-in': 'En Mesa', 'takeout': 'Para Llevar', 'delivery': 'Domicilio' };
    message += `${e.truck} *ENTREGA:* ${delLabels[order.customer.deliveryType]}\n`;
    
    if (order.customer.deliveryType === 'dine-in') {
        message += `${e.pin} *MESA:* ${order.customer.address}\n`;
    } else if (order.customer.deliveryType === 'delivery') {
        message += `${e.pin} *DIRECCIÓN:* ${order.customer.address}\n`;
    }

    message += `${e.money} *PAGO:* ${order.customer.payment}\n`;
    if (order.customer.note) message += `${e.note} *NOTA:* ${order.customer.note}\n`;
    message += `--------------------------\n\n`;
    
    message += `${e.cart} *RESUMEN DEL PEDIDO:*\n`;
    order.items.forEach(item => {
        const extrasPrice = (item.extras || []).reduce((s, ex) => s + ex.price, 0);
        const itemTotal = (item.price + extrasPrice) * item.qty;
        message += `  • *${item.qty}x* ${item.name} ($${itemTotal.toLocaleString()})\n`;
        if (item.extras && item.extras.length > 0) {
            message += `    _Extras: ${item.extras.map(ex => ex.name).join(', ')}_\n`;
        }
    });
    
    message += `\n--------------------------\n`;
    if (order.deliveryFee > 0) {
        message += `Subtotal: $${order.baseTotal.toLocaleString()}\n`;
        message += `Domicilio: $${order.deliveryFee.toLocaleString()}\n`;
    }
    message += `${e.cash} *TOTAL A PAGAR: $${order.total.toLocaleString()}*\n`;
    message += `--------------------------\n\n`;
    message += `${e.rocket} _Enviado desde el Menú Digital_`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
}

function showConfirm(msg, onConfirm, okText = 'Eliminar', okColor = '#ff5252', title = '¿Estás seguro?', onCancel = null) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-title');
    const msgEl = document.getElementById('confirm-msg');
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    
    if (!modal || !msgEl) return;
    
    if (titleEl) titleEl.textContent = title;
    msgEl.textContent = msg;
    
    if (okBtn) {
        okBtn.textContent = okText;
        okBtn.style.background = okColor;
    }

    modal.classList.remove('hidden');
    document.body.classList.add('scroll-lock');
    if (window.lucide) lucide.createIcons();
    
    const cleanup = () => {
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        modal.classList.add('hidden');
        document.body.classList.remove('scroll-lock');
    };

    if (okBtn) {
        okBtn.onclick = () => {
            cleanup();
            if (onConfirm) onConfirm();
        };
    }

    if (cancelBtn) {
        cancelBtn.onclick = () => {
            cleanup();
            if (onCancel) onCancel();
        };
    }
}

function clearCart() {
    if (state.cart.length === 0) return;
    state.cart = [];
    updateCartUI();
    saveStateToLocal();
    showToast('Carrito vaciado', 'success');

    const cartSidebar = document.getElementById('cart-sidebar');
    const waBtn = document.getElementById('floating-wa-btn');
    if (cartSidebar) cartSidebar.classList.remove('active');
    if (waBtn) waBtn.classList.remove('hidden');
}

window.confirmClearCart = function() {
    if (state.cart.length === 0) return;
    showConfirm(
        '¿Estás seguro de que quieres vaciar todo tu carrito?',
        () => clearCart(),
        'Vaciar Todo',
        '#ff5252',
        'Vaciar Carrito'
    );
};

document.addEventListener('DOMContentLoaded', () => {
    updateUIFromConfig();
    renderCategories();
    renderMenu();
    renderCombos();
    setupEventListeners();
    initCheckout(); // ACTIVAR LÓGICA DE CHECKOUT
    updateCartUI();
    checkAndShowPromoModal(true);
    if (window.lucide) lucide.createIcons();
    // Scroll to top AFTER everything is rendered (overrides browser scroll restore)
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 0);
    
    const isPageAdmin = window.location.pathname.endsWith('admin.html');
    const savedView = sessionStorage.getItem('streetfeed_view');
    
    if (isPageAdmin) {
        if (state.isLoggedIn) switchView('admin');
        else switchView('login');
    } else {
        if (savedView === 'admin' && state.isLoggedIn) switchView('admin');
        else switchView('menu');
    }

    // --- SINCRONIZACIÓN EN TIEMPO REAL (CROSS-TAB) ---
    // Escucha cambios en localStorage hechos desde otras pestañas (como el Admin)
    window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('streetfeed_')) {
            // Recargar datos actualizados
            state.dishes = JSON.parse(localStorage.getItem('streetfeed_dishes')) || state.dishes;
            state.categories = JSON.parse(localStorage.getItem('streetfeed_categories')) || state.categories;
            state.combos = JSON.parse(localStorage.getItem('streetfeed_combos')) || state.combos;
            state.config = JSON.parse(localStorage.getItem('streetfeed_config')) || state.config;
            
            // Re-renderizar todo el sistema en vivo
            updateUIFromConfig();
            renderCategories();
            renderMenu();
            renderCombos();
            updateCartUI();
            checkAndShowPromoModal(false);
            if (window.lucide) lucide.createIcons();
            
            console.log('🔄 Sincronización en tiempo real completada.');
        }
    });
});

// ================================================
// CUSTOM SELECT DROPDOWN - Método de Pago
// ================================================
function togglePaymentDropdown() {
    const wrapper = document.getElementById('payment-select-wrapper');
    if (wrapper) wrapper.classList.toggle('open');
}

function selectPaymentOption(el) {
    // Quitar "selected" de todas las opciones
    document.querySelectorAll('#payment-select-options .custom-select-option').forEach(o => o.classList.remove('selected'));
    // Marcar la seleccionada
    el.classList.add('selected');
    // Actualizar el label visible y el input oculto
    const value = el.getAttribute('data-value');
    const label = document.getElementById('payment-select-label');
    const hiddenInput = document.getElementById('cust-payment');
    if (label) {
        label.textContent = value;
        label.style.opacity = '1';
    }
    if (hiddenInput) hiddenInput.value = value;
    // Cerrar el dropdown
    const wrapper = document.getElementById('payment-select-wrapper');
    if (wrapper) wrapper.classList.remove('open');
}

// Cerrar el dropdown al hacer click fuera de él
document.addEventListener('click', function(e) {
    const wrapper = document.getElementById('payment-select-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        wrapper.classList.remove('open');
    }
});
