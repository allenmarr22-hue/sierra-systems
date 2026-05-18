const fs = require('fs');
const path = 'c:/Users/Allenmar/Documents/Pagina web Margarita/admin.js';
let content = fs.readFileSync(path, 'utf8');

// Use regex for loose matching on whitespace
const targetPattern = /if \(group\[0\]\.status === 'postponed'\) accentColor = '#f39c12';\s+const duration = parseInt\(apt\.duration\) \|\| 60;/;

const replacement = `if (group[0].status === 'postponed') accentColor = '#f39c12';
            
            if (isGroupPartial) accentColor = '#f39c12'; 
            if (isGroupPaid) accentColor = '#2ecc71';    

            let glassBg = 'white';
            if (isGroupPartial) glassBg = 'rgba(243, 156, 18, 0.05)';
            if (isGroupPaid) glassBg = 'rgba(46, 204, 113, 0.08)';

            const parsePriceVal = (p) => {
                if (!p || p === 'Gratis') return 0;
                return parseInt(p.toString().replace(/\\D/g, '')) || 0;
            };
            const isRealCombo = group.some(a => a.splitPrice != null && parseInt(a.splitPrice) !== parsePriceVal(a.price));
            const groupLabel = isRealCombo ? 'COMBO' : 'PAQUETE';

            html += \`<div class="glass-module" style="padding:22px; margin-bottom:20px; border-left: 6px solid \${accentColor}; border-top: 1px solid rgba(var(--accent-rgb), 0.05); transition: 0.3s; opacity: \${group[0].status === 'postponed' ? '0.85' : '1'}; position: relative; overflow: hidden; border-radius: 20px; background: \${glassBg};">\`;

            if (isMulti) {
                let optHtml = '';
                group.forEach((sub, i) => { 
                   optHtml += \`<div class="custom-dropdown-item \${i === safeIdx ? 'selected' : ''}" onclick="window.selectSwitchedService('\${gId}', \${i}, this)">Servicio \${i+1}: \${sub.service}</div>\`; 
                });
                
                html += \`
                <div style="margin-bottom:15px; display:inline-flex; align-items:center; gap:22px; background:white; padding:8px 25px; border-radius:30px; border:1px solid rgba(var(--accent-rgb),0.15); box-shadow:0 6px 20px rgba(var(--accent-rgb),0.06); position:relative;">
                    <span style="font-size: 0.85rem; font-weight: 800; color: \${isRealCombo ? 'var(--color-dark-pink)' : '#7f8c8d'}; display:flex; align-items:center; gap:8px; border-right: 1px solid #eee; padding-right:15px; letter-spacing:1px;">
                        <i class="fas fa-layer-group" style="font-size:1.1rem; opacity:0.7;"></i> <span>\${groupLabel}</span>
                    </span>
                    <div class="custom-dropdown-container">
                        <div id="dropdown-toggle-\${gId}" class="custom-dropdown-toggle" onclick="window.toggleServiceSwitcher(event, '\${gId}')">
                             Servicio \${safeIdx + 1}: \${group[safeIdx].service}
                        </div>
                        <div id="dropdown-menu-\${gId}" class="custom-dropdown-menu">
                            \${optHtml}
                        </div>
                    </div>
                </div>\`;
            }

            group.forEach((apt, subIdx) => {
                let dateString = "Fecha N/A";
                let timeString = window.formatTime12h(apt.time);
                
                try {
                    if(apt.date) {
                        const d = new Date(\`\${apt.date}T\${apt.time || '00:00'}\`);
                        if(!isNaN(d)) {
                            dateString = d.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' });
                            
                            const duration = parseInt(apt.duration) || 60;`;

if (targetPattern.test(content)) {
    content = content.replace(targetPattern, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log('RECOVERY SUCCESSFUL');
} else {
    console.log('TARGET PATTERN NOT FOUND');
}
