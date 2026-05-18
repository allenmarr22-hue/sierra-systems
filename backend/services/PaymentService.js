/**
 * ============================================================
 * PaymentService — AS Sierra Systems
 * ============================================================
 * Capa de abstracción para pagos con tokenización.
 * Actualmente en MODO SIMULADO.
 *
 * Para activar Wompi real:
 *   1. Ve a dashboard.wompi.co y crea una cuenta
 *   2. Copia tu PUBLIC_KEY y PRIVATE_KEY de sandbox/producción
 *   3. Cambia SIMULATION_MODE = false
 *   4. Añade tus llaves en las variables de entorno
 * ============================================================
 */

const axios = require('axios');

// ─── Configuración ────────────────────────────────────────────────────────────
const SIMULATION_MODE = true; // ← Cambiar a false cuando tengas credenciales Wompi

const WOMPI_CONFIG = {
    baseUrl: 'https://sandbox.wompi.co/v1', // Cambia a 'https://production.wompi.co/v1' en prod
    publicKey: process.env.WOMPI_PUBLIC_KEY || 'pub_test_XXXXXX',
    privateKey: process.env.WOMPI_PRIVATE_KEY || 'prv_test_XXXXXX',
    eventsSecret: process.env.WOMPI_EVENTS_SECRET || 'test_events_secret',
};

// ─── Resultado estándar de PaymentService ─────────────────────────────────────
function successResult(data = {}) {
    return { ok: true, ...data };
}

function failResult(message, code = 'PAYMENT_ERROR') {
    return { ok: false, message, code };
}

// ─── Modo Simulado ─────────────────────────────────────────────────────────────
const SimulatedPayment = {
    /**
     * Simula tokenizar una tarjeta.
     * En producción, esto lo hace directamente el widget JS de Wompi en el frontend
     * y nos llega el token ya listo. No procesamos datos de tarjeta en el servidor.
     *
     * @param {object} cardData - { number, exp_month, exp_year, cvc, card_holder }
     * @returns {object} - { ok, token, last_four, card_brand }
     */
    tokenizeCard(cardData) {
        console.log('[PaymentService SIMULATION] Tokenizando tarjeta...');
        const last_four = String(cardData.number || '0000').slice(-4);

        // Detectar marca por el primer dígito
        const firstDigit = String(cardData.number || '')[0];
        const brandMap = { '4': 'VISA', '5': 'MASTERCARD', '3': 'AMEX', '6': 'DINERS' };
        const card_brand = brandMap[firstDigit] || 'UNKNOWN';

        return successResult({
            token: `sim_tok_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            last_four,
            card_brand,
        });
    },

    /**
     * Simula un cobro usando un token guardado.
     * Tiene una tasa de éxito del 90% para simular fallos reales.
     *
     * @param {string} token - El token de tarjeta guardado
     * @param {number} amountInCents - El monto en centavos (ej: 95000 * 100 = 9500000)
     * @param {string} description - Descripción del cobro
     * @returns {object} - { ok, transactionId, status }
     */
    chargeWithToken(token, amountInCents, description) {
        console.log(`[PaymentService SIMULATION] Cobrando $${amountInCents / 100} COP con token ${token}...`);

        // Simular fallo ocasional (10% de probabilidad)
        if (Math.random() < 0.1) {
            return failResult('Tarjeta declinada por el banco emisor.', 'CARD_DECLINED');
        }

        return successResult({
            transactionId: `sim_txn_${Date.now()}`,
            status: 'APPROVED',
            amountInCents,
            description,
        });
    },

    /**
     * Simula consultar el estado de una transacción.
     */
    getTransactionStatus(transactionId) {
        return successResult({ transactionId, status: 'APPROVED' });
    },

    /**
     * Valida la firma HMAC de un webhook (siempre válida en simulación).
     */
    validateWebhookSignature(payload, signature) {
        console.log('[PaymentService SIMULATION] Validando firma webhook... OK');
        return true;
    },
};

// ─── Modo Real (Wompi) ──────────────────────────────────────────────────────────
const WompiPayment = {
    /**
     * En producción, el token lo genera el widget JS de Wompi en el cliente.
     * Este método es solo un wrapper por si necesitamos el API server-to-server.
     */
    async tokenizeCard(cardData) {
        try {
            const response = await axios.post(`${WOMPI_CONFIG.baseUrl}/tokens/cards`, cardData, {
                headers: {
                    Authorization: `Bearer ${WOMPI_CONFIG.publicKey}`,
                },
            });
            const { token, last_four, card_brand } = response.data.data;
            return successResult({ token, last_four, card_brand });
        } catch (error) {
            const msg = error.response?.data?.error?.messages?.join(', ') || error.message;
            return failResult(`Error tokenizando tarjeta: ${msg}`, 'TOKENIZATION_ERROR');
        }
    },

    async chargeWithToken(token, amountInCents, description) {
        try {
            const response = await axios.post(`${WOMPI_CONFIG.baseUrl}/transactions`, {
                acceptance_token: await this._getAcceptanceToken(),
                amount_in_cents: amountInCents,
                currency: 'COP',
                customer_email: 'billing@assierrasystems.com',
                payment_method: {
                    type: 'CARD',
                    token,
                    installments: 1,
                },
                reference: `AS-SIERRA-${Date.now()}`,
                customer_data: { phone_number: '3000000000' },
            }, {
                headers: {
                    Authorization: `Bearer ${WOMPI_CONFIG.privateKey}`,
                },
            });

            const txn = response.data.data;
            return successResult({
                transactionId: txn.id,
                status: txn.status,
                amountInCents: txn.amount_in_cents,
                description,
            });
        } catch (error) {
            const msg = error.response?.data?.error?.messages?.join(', ') || error.message;
            return failResult(`Error procesando cobro: ${msg}`, 'CHARGE_ERROR');
        }
    },

    async getTransactionStatus(transactionId) {
        try {
            const response = await axios.get(`${WOMPI_CONFIG.baseUrl}/transactions/${transactionId}`, {
                headers: { Authorization: `Bearer ${WOMPI_CONFIG.privateKey}` },
            });
            const txn = response.data.data;
            return successResult({ transactionId: txn.id, status: txn.status });
        } catch (error) {
            return failResult(`Error consultando transacción: ${error.message}`);
        }
    },

    validateWebhookSignature(payload, signature) {
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', WOMPI_CONFIG.eventsSecret)
            .update(JSON.stringify(payload))
            .digest('hex');
        return expectedSignature === signature;
    },

    async _getAcceptanceToken() {
        const response = await axios.get(`${WOMPI_CONFIG.baseUrl}/merchants/${WOMPI_CONFIG.publicKey}`);
        return response.data.data.presigned_acceptance.acceptance_token;
    },
};

// ─── Exportar según el modo configurado ───────────────────────────────────────
const PaymentService = SIMULATION_MODE ? SimulatedPayment : WompiPayment;

module.exports = PaymentService;
