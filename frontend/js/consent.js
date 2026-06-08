/**
 * AS Sierra Systems - Global Consent Banner
 * Maneja el banner de cookies y términos de servicio de forma global.
 */

document.addEventListener('DOMContentLoaded', () => {
    // El banner de privacidad solo debe aparecer en la página de inicio principal
    const path = window.location.pathname;
    const isLandingPage = path === '/' || path === '/index.html' || path.endsWith('/index.html') || path === '';
    
    if (!isLandingPage) {
        return; // Detener si estamos en paneles de administración u otras páginas
    }

    // No mostrar el banner si el usuario ya aceptó anteriormente
    if (localStorage.getItem('as_sierra_consent') === 'true') {
        return;
    }
    
    setTimeout(showConsentBanner, 1500);
});

function showConsentBanner() {
    const banner = document.createElement('div');
    banner.id = 'consent-banner';
    banner.innerHTML = `
        <style>
            #consent-banner {
                position: fixed; bottom: 1rem; left: 50%; transform: translateX(-50%);
                width: 95%; max-width: 1100px; 
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                padding: 1rem 2rem; z-index: 999; 
                display: flex; align-items: center; justify-content: center; gap: 2.5rem;
                animation: enterpriseSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                color: #1e293b;
                font-family: 'Outfit', sans-serif;
                box-sizing: border-box;
            }
            @keyframes enterpriseSlideUp { 
                from { bottom: -100px; opacity: 0; } 
                to { bottom: 1rem; opacity: 1; } 
            }
            .consent-content { display: flex; align-items: center; gap: 1.5rem; flex: 1; }
            .consent-icon { color: #6366f1; display: flex; align-items: center; }
            .consent-text { font-size: 0.85rem; color: #475569; line-height: 1.5; }
            .consent-text strong { color: #1e293b; }
            .btn-accept-consent { 
                background: #6366f1; color: white; border: none; 
                padding: 0.7rem 2rem; border-radius: 12px; font-weight: 700; 
                cursor: pointer; transition: all 0.3s ease;
                white-space: nowrap; font-size: 0.85rem;
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
            }
            .btn-accept-consent:hover { background: #4f46e5; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3); }
            
            .btn-decline-consent {
                background: transparent; color: #64748b; border: 1px solid #e2e8f0;
                padding: 0.7rem 1.5rem; border-radius: 12px; font-weight: 600;
                cursor: pointer; transition: all 0.2s ease;
                white-space: nowrap; font-size: 0.85rem;
            }
            .btn-decline-consent:hover { background: #f8fafc; color: #1e293b; border-color: #cbd5e1; }

            .link-terms-consent { color: #6366f1; text-decoration: underline; cursor: pointer; font-weight: 600; }
            @media (max-width: 992px) { 
                #consent-banner { flex-direction: column; gap: 1rem; text-align: center; padding: 1.5rem; width: 90%; }
                .consent-content { flex-direction: column; gap: 0.5rem; }
                .consent-btns { display: flex; gap: 0.5rem; width: 100%; }
                .btn-accept-consent, .btn-decline-consent { flex: 1; }
            }
        </style>
        <div class="consent-content">
            <div class="consent-icon"><i data-lucide="shield-check" style="width:24px;height:24px;"></i></div>
            <div class="consent-text">
                <strong>Control de Privacidad.</strong> En AS Sierra Systems respetamos su derecho a la información. Para habilitar su acceso al portal SaaS y garantizar la seguridad de sus datos, solicitamos su aceptación de nuestra <span class="link-terms-consent" onclick="showGlobalTerms()">Política de Privacidad y Acuerdo de Servicio</span>.
            </div>
        </div>
        <div class="consent-btns" style="display:flex; gap: 0.75rem;">
            <button class="btn-decline-consent" onclick="handleDeclineConsent()">Rechazar</button>
            <button class="btn-accept-consent" onclick="acceptGlobalConsent()">Aceptar y Continuar</button>
        </div>
    `;
    document.body.appendChild(banner);
    if (window.lucide) lucide.createIcons();
}

window.handleDeclineConsent = function() {
    Swal.fire({
        title: '¿Desea continuar sin aceptar?',
        text: 'Al rechazar los términos, algunas funcionalidades críticas de seguridad y gestión del portal SaaS quedarán limitadas. El acuerdo legal es necesario para proteger tanto su información como la integridad del sistema.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Revisar Términos',
        cancelButtonText: 'Entiendo, cerrar por ahora',
        confirmButtonColor: '#6366f1',
        cancelButtonColor: '#94a3b8',
        background: '#ffffff',
        color: '#1e293b'
    }).then((result) => {
        if (result.isConfirmed) {
            showGlobalTerms();
        } else {
            const banner = document.getElementById('consent-banner');
            if (banner) {
                banner.style.opacity = '0';
                banner.style.transform = 'translate(-50%, 50px)';
                banner.style.transition = 'all 0.5s ease';
                setTimeout(() => banner.remove(), 500);
            }
        }
    });
};

window.acceptGlobalConsent = function() {
    localStorage.setItem('as_sierra_consent', 'true');
    const banner = document.getElementById('consent-banner');
    if (banner) {
        banner.style.opacity = '0';
        banner.style.bottom = '-100px';
        banner.style.transition = 'all 0.5s ease';
        setTimeout(() => banner.remove(), 500);
    }
};

window.showGlobalTerms = function() {
    if (typeof Swal === 'undefined') {
        alert("Contrato Legal AS Sierra Systems...");
        return;
    }
    
    const styleFix = document.createElement('style');
    styleFix.innerHTML = `
        .swal2-popup.enterprise-terms-modal { background: #ffffff !important; color: #1e293b !important; border-radius: 24px !important; }
        .enterprise-terms-modal .swal2-title { color: #0f172a !important; font-weight: 800 !important; font-size: 1.5rem !important; }
        .legal-section { margin-bottom: 2rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 1.5rem; }
        .legal-section:last-child { border-bottom: none; }
        .legal-title { color: #0f172a !important; font-size: 1.15rem !important; font-weight: 700 !important; margin-bottom: 0.75rem; display: block; }
        .legal-text { color: #475569 !important; font-size: 0.85rem !important; line-height: 1.7 !important; }
        .legal-text ul { padding-left: 1.25rem; margin-top: 0.5rem; }
        .legal-text li { margin-bottom: 0.4rem; }
        
        /* Estilo para el botón deshabilitado */
        .swal2-confirm:disabled {
            background-color: #d1d5db !important;
            cursor: not-allowed !important;
            opacity: 0.7 !important;
        }
    `;
    document.head.appendChild(styleFix);

    Swal.fire({
        title: 'Acuerdo Legal y Privacidad',
        html: `
            <div id="legal-scroll-container" style="text-align:left; max-height:450px; overflow-y:auto; padding: 1rem; font-family:'Outfit', sans-serif; border: 1px solid #f1f5f9; border-radius: 12px;">
                
                <div class="legal-section">
                    <span class="legal-title">Términos del Servicio SaaS</span>
                    <div class="legal-text">
                        Este contrato regula el acceso y uso de la plataforma <strong>AS Sierra Systems</strong>. Al utilizar nuestros servicios, usted acepta:
                        <ul>
                            <li><strong>Licencia:</strong> Se otorga una licencia de uso personal e intransferible, no una venta del software.</li>
                            <li><strong>Uso Permitido:</strong> Queda prohibida la ingeniería inversa o cualquier actividad que comprometa la estabilidad de nuestros servidores.</li>
                            <li><strong>Actualizaciones:</strong> AS Sierra Systems se reserva el derecho de modificar funcionalidades para mejorar el servicio.</li>
                        </ul>
                    </div>
                </div>

                <div class="legal-section">
                    <span class="legal-title">Protección de Datos (Ley 1581)</span>
                    <div class="legal-text">
                        En cumplimiento de la normativa de Protección de Datos Personales:
                        <ul>
                            <li><strong>Finalidad:</strong> Sus datos se recolectan únicamente para gestión de cuenta, facturación y soporte.</li>
                            <li><strong>Seguridad:</strong> Implementamos cifrado corporativo y bases de datos redundantes.</li>
                            <li><strong>Derechos ARCO:</strong> Puede Actualizar o Suprimir sus datos escribiendo a soporte@assierrasystems.com.</li>
                        </ul>
                    </div>
                </div>

                <div class="legal-section">
                    <span class="legal-title">Limitación de Responsabilidad</span>
                    <div class="legal-text">
                        <strong>AS Sierra Systems</strong> provee herramientas tecnológicas "as is":
                        <ul>
                            <li>No somos responsables por pérdidas de beneficios por fallos externos de internet.</li>
                            <li>Uso indebido de credenciales por parte del personal del cliente.</li>
                            <li>Daños indirectos o incidentales de cualquier tipo.</li>
                        </ul>
                    </div>
                </div>

                <div class="legal-section">
                    <span class="legal-title">Política de Cookies</span>
                    <div class="legal-text">
                        Utilizamos cookies para:
                        <ul>
                            <li>Mantener su sesión activa de forma segura.</li>
                            <li>Recordar sus preferencias de interfaz.</li>
                            <li>Optimizar la velocidad de carga.</li>
                        </ul>
                    </div>
                </div>

                <div class="legal-section" style="background: #f8fafc; padding: 1rem; border-radius: 12px; margin-bottom: 0;">
                    <span class="legal-title" style="font-size: 0.9rem !important;">Jurisdicción Aplicable</span>
                    <div class="legal-text">
                        Este acuerdo se rige por las leyes de la República de Colombia. Cualquier disputa será resuelta ante los tribunales competentes de dicha jurisdicción.
                    </div>
                </div>

            </div>
            <div id="scroll-instruction" style="font-size: 0.75rem; color: #6366f1; margin-top: 1rem; font-weight: 600;">
                <i data-lucide="mouse-pointer-2" style="width:12px; vertical-align:middle;"></i> Por favor, desplace hasta el final para habilitar la aceptación.
            </div>
        `,
        confirmButtonText: 'He leído y acepto el Acuerdo Global',
        confirmButtonColor: '#6366f1',
        background: '#ffffff',
        width: '750px',
        showCloseButton: true,
        allowOutsideClick: false,
        customClass: { popup: 'enterprise-terms-modal' },
        didOpen: () => {
            const container = document.getElementById('legal-scroll-container');
            const confirmBtn = Swal.getConfirmButton();
            const instruction = document.getElementById('scroll-instruction');
            
            confirmBtn.disabled = true;
            lucide.createIcons();

            container.addEventListener('scroll', () => {
                const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 20;
                if (isAtBottom) {
                    confirmBtn.disabled = false;
                    instruction.style.color = '#10b981';
                    instruction.innerHTML = '<i data-lucide="check" style="width:12px; vertical-align:middle;"></i> Documento verificado. Ya puede aceptar.';
                    lucide.createIcons();
                }
            });
        }
    }).then(() => {
        styleFix.remove();
    });
};
