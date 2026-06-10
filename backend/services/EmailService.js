/**
 * ============================================================
 * EmailService.js — AS Sierra Systems
 * ============================================================
 * Servicio simulado para el envío de correos electrónicos.
 * Diseña plantillas HTML premium responsivas y escribe los
 * correos salientes en la carpeta local `backend/debug/emails/`
 * además de registrar la acción con colores en la consola.
 * ============================================================
 */

const fs = require('fs');
const path = require('path');

// Carpeta de depuración de correos
const debugEmailsDir = path.resolve(__dirname, '..', 'debug', 'emails');

/**
 * Asegura que la carpeta de depuración exista.
 */
function ensureDebugDir() {
    if (!fs.existsSync(debugEmailsDir)) {
        fs.mkdirSync(debugEmailsDir, { recursive: true });
    }
}

/**
 * Limpia caracteres especiales para nombres de archivo seguros.
 */
function sanitizeFilename(str) {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 50);
}

/**
 * Plantilla Base HTML Premium con Diseño Moderno (Violeta/Indigo, Glassmorphism, Responsive)
 */
function getBaseTemplate(title, preheader, bodyContent) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        
        body {
            margin: 0;
            padding: 0;
            background-color: #f3f4f6;
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #1f2937;
            -webkit-font-smoothing: antialiased;
        }
        
        table {
            border-collapse: collapse;
            width: 100%;
        }
        
        .wrapper {
            width: 100%;
            background-color: #f3f4f6;
            padding: 40px 20px;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
        }
        
        .header {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            padding: 40px 30px;
            text-align: center;
        }
        
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 26px;
            font-weight: 700;
            letter-spacing: -0.5px;
        }
        
        .header p {
            color: #c7d2fe;
            margin: 8px 0 0 0;
            font-size: 14px;
            font-weight: 400;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .preheader-text {
            display: none;
            font-size: 1px;
            color: #f3f4f6;
            line-height: 1px;
            max-height: 0px;
            max-width: 0px;
            opacity: 0;
            overflow: hidden;
        }
        
        h2 {
            color: #111827;
            font-size: 20px;
            font-weight: 600;
            margin-top: 0;
            margin-bottom: 16px;
        }
        
        p {
            font-size: 16px;
            line-height: 24px;
            color: #4b5563;
            margin-top: 0;
            margin-bottom: 20px;
        }
        
        .info-card {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px;
        }
        
        .info-row {
            padding: 8px 0;
            border-bottom: 1px solid #f3f4f6;
            font-size: 15px;
        }
        
        .info-row:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }
        
        .info-row:first-child {
            padding-top: 0;
        }
        
        .info-label {
            font-weight: 600;
            color: #374151;
            width: 35%;
            display: inline-block;
        }
        
        .info-value {
            color: #6b7280;
            width: 60%;
            display: inline-block;
            vertical-align: top;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .badge-success {
            background-color: #d1fae5;
            color: #065f46;
        }
        
        .badge-warning {
            background-color: #fef3c7;
            color: #92400e;
        }
        
        .badge-danger {
            background-color: #fee2e2;
            color: #991b1b;
        }
        
        .btn-container {
            text-align: center;
            margin: 30px 0 10px 0;
        }
        
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 30px;
            font-size: 16px;
            font-weight: 600;
            border-radius: 10px;
            box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(79, 70, 229, 0.1);
            transition: all 0.2s ease-in-out;
        }
        
        .footer {
            padding: 30px;
            text-align: center;
            background-color: #f9fafb;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            font-size: 13px;
            color: #9ca3af;
            margin: 0 0 8px 0;
            line-height: 18px;
        }
        
        .footer a {
            color: #4f46e5;
            text-decoration: none;
        }
        
        @media only screen and (max-width: 600px) {
            .wrapper {
                padding: 10px;
            }
            .content {
                padding: 24px 20px;
            }
            .info-label, .info-value {
                width: 100%;
                display: block;
            }
            .info-label {
                margin-bottom: 4px;
            }
            .info-row {
                padding: 12px 0;
            }
        }
    </style>
</head>
<body>
    <span class="preheader-text">${preheader}</span>
    <div class="wrapper">
        <div class="container">
            <!-- HEADER -->
            <div class="header">
                <h1>AS Sierra Systems</h1>
                <p>Plataforma de Administración SaaS</p>
            </div>
            
            <!-- CONTENT -->
            <div class="content">
                ${bodyContent}
            </div>
            
            <!-- FOOTER -->
            <div class="footer">
                <p>Este correo electrónico fue generado automáticamente por AS Sierra Systems.</p>
                <p>&copy; ${new Date().getFullYear()} AS Sierra Systems. Todos los derechos reservados.</p>
                <p>¿Tienes preguntas? Contáctanos a <a href="mailto:soporte@assierrasystems.com">soporte@assierrasystems.com</a> o al +57 (300) 123-4567.</p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Escribe el correo simulado a un archivo local de depuración.
 */
function saveSimulatedEmail(to, subject, htmlContent) {
    try {
        ensureDebugDir();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `email_${timestamp}_${sanitizeFilename(subject)}.html`;
        const filePath = path.join(debugEmailsDir, filename);
        
        fs.writeFileSync(filePath, htmlContent, 'utf8');

        // Log visualmente atractivo con colores en consola
        console.log('\x1b[35m%s\x1b[0m', '================================================================================');
        console.log('\x1b[36m%s\x1b[0m', '✉️  CORREO SIMULADO ENVIADO CON ÉXITO:');
        console.log(`   \x1b[1mDestinatario:\x1b[0m ${to}`);
        console.log(`   \x1b[1mAsunto:\x1b[0m       ${subject}`);
        console.log(`   \x1b[1mArchivo HTML:\x1b[0m  ${filePath}`);
        console.log('\x1b[35m%s\x1b[0m', '================================================================================');

        return { success: true, file: filePath };
    } catch (err) {
        console.error('❌ Error guardando correo electrónico simulado:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Servicio de Correo Electrónico
 */
const EmailService = {
    /**
     * Correo 1: Bienvenida al registrar un nuevo negocio
     */
    async sendWelcomeEmail(to, businessName, clientEmail, rawPassword) {
        const subject = `¡Bienvenido a AS Sierra Systems, ${businessName}!`;
        const preheader = `Tu cuenta en AS Sierra Systems ya está lista. Conoce tus credenciales de acceso.`;
        
        const body = `
            <h2>¡Tu cuenta ha sido creada con éxito!</h2>
            <p>Hola <strong>${businessName}</strong>,</p>
            <p>Te damos la más cordial bienvenida a <strong>AS Sierra Systems</strong>. Nos complace ser tu socio tecnológico y ayudarte a escalar la administración de tu negocio y sucursales.</p>
            
            <p>A continuación, encontrarás tus credenciales de acceso para ingresar a tu Portal de Clientes:</p>
            
            <div class="info-card">
                <div class="info-row">
                    <span class="info-label">Portal:</span>
                    <span class="info-value"><a href="http://localhost:3000/client-dashboard.html">Ir al Portal de Cliente</a></span>
                </div>
                <div class="info-row">
                    <span class="info-label">Usuario/Email:</span>
                    <span class="info-value"><strong>${clientEmail}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">Contraseña:</span>
                    <span class="info-value"><code>${rawPassword || '(Establecida por el administrador)'}</code></span>
                </div>
            </div>
            
            <p>Te recomendamos cambiar tu contraseña una vez que inicies sesión por primera vez para garantizar la seguridad de tu información.</p>
            
            <div class="btn-container">
                <a href="http://localhost:3000/client-dashboard.html" class="btn">Iniciar Sesión</a>
            </div>
            
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">Si experimentas algún problema para ingresar o configurar tus sucursales, no dudes en abrir un ticket de soporte técnico en nuestro portal.</p>
        `;

        const html = getBaseTemplate(subject, preheader, body);
        return saveSimulatedEmail(to, subject, html);
    },

    /**
     * Correo 2: Creación de Ticket de Soporte
     */
    async sendTicketCreatedEmail(to, businessName, ticketId, moduleName, priority, description) {
        const subject = `Confirmación de Ticket Creado: ${ticketId}`;
        const preheader = `Hemos recibido tu solicitud de soporte técnico en el módulo ${moduleName}.`;
        
        const priorityBadge = priority === 'urgente' 
            ? `<span class="badge badge-danger">Urgente</span>`
            : priority === 'alta'
            ? `<span class="badge badge-warning">Alta</span>`
            : `<span class="badge badge-success">Normal</span>`;

        const body = `
            <h2>Hemos recibido tu solicitud de soporte</h2>
            <p>Hola <strong>${businessName}</strong>,</p>
            <p>Confirmamos que hemos recibido tu ticket de soporte técnico. Nuestro equipo ya se encuentra revisándolo para darte una solución a la brevedad posible.</p>
            
            <div class="info-card">
                <div class="info-row">
                    <span class="info-label">Ticket ID:</span>
                    <span class="info-value"><strong>${ticketId}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">Módulo/Sede:</span>
                    <span class="info-value">${moduleName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Prioridad:</span>
                    <span class="info-value">${priorityBadge}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Descripción:</span>
                    <span class="info-value">${description}</span>
                </div>
            </div>
            
            <p>Puedes hacer seguimiento a este ticket en tiempo real o chatear con nuestros técnicos directamente desde el Portal de Clientes.</p>
            
            <div class="btn-container">
                <a href="http://localhost:3000/client-dashboard.html" class="btn">Ver Ticket de Soporte</a>
            </div>
        `;

        const html = getBaseTemplate(subject, preheader, body);
        return saveSimulatedEmail(to, subject, html);
    },

    /**
     * Correo 3: Respuesta/Mensaje Nuevo en Ticket de Soporte
     */
    async sendTicketRepliedEmail(to, businessName, ticketId, senderName, messageText) {
        const subject = `Nuevo mensaje en tu Ticket ${ticketId}`;
        const preheader = `${senderName} ha respondido a tu ticket de soporte técnico.`;

        const body = `
            <h2>Nueva respuesta en soporte técnico</h2>
            <p>Hola <strong>${businessName}</strong>,</p>
            <p>Tu ticket de soporte <strong>${ticketId}</strong> tiene una nueva actualización o mensaje de <strong>${senderName}</strong>:</p>
            
            <div class="info-card" style="border-left: 4px solid #4f46e5; background-color: #f5f3ff;">
                <p style="margin: 0; font-style: italic; color: #4b5563;">"${messageText}"</p>
            </div>
            
            <p>Para responder a este mensaje o ver el historial de la conversación, ingresa al chat en tu portal.</p>
            
            <div class="btn-container">
                <a href="http://localhost:3000/client-dashboard.html" class="btn">Abrir Chat de Soporte</a>
            </div>
        `;

        const html = getBaseTemplate(subject, preheader, body);
        return saveSimulatedEmail(to, subject, html);
    },

    /**
     * Correo 4: Pago Exitoso (Factura Generada)
     */
    async sendPaymentSuccessEmail(to, businessName, amount, invoiceId, instancesCount) {
        const subject = `Confirmación de Pago Exitoso — Recibo ${invoiceId}`;
        const preheader = `Hemos procesado exitosamente el cobro de tu suscripción por $${amount.toLocaleString('es-CO')} COP.`;

        const body = `
            <h2>¡Gracias por tu pago!</h2>
            <p>Hola <strong>${businessName}</strong>,</p>
            <p>Te informamos que hemos procesado exitosamente el cobro recurrente de tu suscripción mensual para tus sucursales activas en la plataforma.</p>
            
            <div class="info-card">
                <div class="info-row">
                    <span class="info-label">Recibo No:</span>
                    <span class="info-value"><strong>${invoiceId}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">Monto Cobrado:</span>
                    <span class="info-value" style="color: #10b981; font-weight: 700;">$${amount.toLocaleString('es-CO')} COP</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Concepto:</span>
                    <span class="info-value">Renovación mensual (${instancesCount} sucursales activas)</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Estado:</span>
                    <span class="info-value"><span class="badge badge-success">APROBADO</span></span>
                </div>
                <div class="info-row">
                    <span class="info-label">Fecha:</span>
                    <span class="info-value">${new Date().toLocaleDateString('es-CO')}</span>
                </div>
            </div>
            
            <p>Puedes descargar este recibo de pago detallado en formato PDF en cualquier momento ingresando a la sección "Historial de Facturación" en tu dashboard.</p>
            
            <div class="btn-container">
                <a href="http://localhost:3000/client-dashboard.html" class="btn">Ir al Historial de Pagos</a>
            </div>
        `;

        const html = getBaseTemplate(subject, preheader, body);
        return saveSimulatedEmail(to, subject, html);
    },

    /**
     * Correo 5: Pago Rechazado / Fallido
     */
    async sendPaymentDeclinedEmail(to, businessName, amount, reason) {
        const subject = `⚠️ Pago Rechazado — Intento de Cobro Suscripción`;
        const preheader = `El intento de cobro por la renovación de tus sucursales ha sido rechazado.`;

        const body = `
            <h2 style="color: #ef4444;">⚠️ Tu pago no pudo ser procesado</h2>
            <p>Hola <strong>${businessName}</strong>,</p>
            <p>Te informamos que el cobro automático de tu suscripción por un monto de <strong>$${amount.toLocaleString('es-CO')} COP</strong> ha sido <strong>RECHAZADO</strong> por la pasarela de pagos.</p>
            
            <div class="info-card" style="border-left: 4px solid #ef4444;">
                <div class="info-row">
                    <span class="info-label">Monto:</span>
                    <span class="info-value">$${amount.toLocaleString('es-CO')} COP</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Motivo del rechazo:</span>
                    <span class="info-value" style="color: #ef4444; font-weight: 600;">${reason || 'Fondos insuficientes o denegado por el banco emisor'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Estado:</span>
                    <span class="info-value"><span class="badge badge-danger">RECHAZADO / DECLINED</span></span>
                </div>
            </div>
            
            <p><strong>IMPORTANTE:</strong> Para evitar la suspensión de tus sucursales y la interrupción de tus servicios contratados, te solicitamos actualizar tu método de pago o verificar el estado de tu tarjeta lo antes posible.</p>
            
            <div class="btn-container">
                <a href="http://localhost:3000/client-dashboard.html" class="btn">Actualizar Tarjeta de Crédito</a>
            </div>
        `;

        const html = getBaseTemplate(subject, preheader, body);
        return saveSimulatedEmail(to, subject, html);
    },

    /**
     * Correo 6: Cuenta Suspendida por Falta de Pago / Falta de Método
     */
    async sendSubscriptionSuspendedEmail(to, businessName, amount, reason) {
        const subject = `❌ Suscripción Suspendida — AS Sierra Systems`;
        const preheader = `Tus sucursales han sido suspendidas temporalmente debido a la falta de pago.`;

        const body = `
            <h2 style="color: #ef4444;">❌ Tus servicios han sido suspendidos</h2>
            <p>Hola <strong>${businessName}</strong>,</p>
            <p>Lamentamos informarte que tu suscripción en <strong>AS Sierra Systems</strong> ha sido suspendida debido a que no pudimos procesar el cobro recurrente de <strong>$${amount.toLocaleString('es-CO')} COP</strong> por tus sucursales activas.</p>
            
            <div class="info-card" style="border-left: 4px solid #ef4444; background-color: #fef2f2;">
                <p style="margin: 0; font-weight: 600; color: #991b1b;">Detalle: ${reason || 'Sin método de pago válido registrado en el sistema o reintentos de cobro fallidos.'}</p>
            </div>
            
            <p>Durante la suspensión:</p>
            <ul>
                <li>El acceso a tus sucursales/sedes en el sistema estará inhabilitado.</li>
                <li>Tus clientes no podrán realizar citas o pedidos (StreetFeed / StyleSync) hasta que regularices el pago.</li>
            </ul>
            
            <p><strong>¿Cómo reactivar tu cuenta?</strong> Es sumamente sencillo, solo debes ingresar a tu Portal de Clientes, registrar una tarjeta de crédito válida y realizar el pago pendiente.</p>
            
            <div class="btn-container">
                <a href="http://localhost:3000/client-dashboard.html" class="btn" style="background: #ef4444;">Reactivar Mi Cuenta</a>
            </div>
        `;

        const html = getBaseTemplate(subject, preheader, body);
        return saveSimulatedEmail(to, subject, html);
    }
};

module.exports = EmailService;
