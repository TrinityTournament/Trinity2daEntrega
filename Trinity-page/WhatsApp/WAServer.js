import { isReady } from './lib/botState.js';

function normalizePhone(raw) {
    return raw.toString().replace(/[^0-9]/g, '');
}

const app = express();
app.use(express.json());

// Revisa si el bot está vivo o ne
app.get('/api/whatsapp/status', (_req, res) => {
    res.json({ connected: isReady() });
});

app.use((req, res, next) => {
    const expected = process.env.secretWA || '';
    if (!expected) return next();

    const received = req.headers['x-wa-secret'] || '';
    if (received !== expected) {
        return res.status(401).json({ error: 'No autorizado.' });
    }
    next();
});

app.post('/api/whatsapp/send', async (req, res) => {
    if (!isReady()) {
        return res.status(503).json({
            error: 'El bot de WhatsApp no está activo. Intentá de nuevo en un rato.'
        });
    }

    const { phone, message } = req.body;

    if ( !phone || !message ) {
        return res.status(400).json({ error: 'Se requiere "phone" y "message".' });
    }
    const normalized = normalizePhone(phone)
    if (!normalized || normalized.length < 7) {
        return res.status(400).json({ error: "Número de telefono invalido." });
    }

    try {
        const jid = `${normalized}@s.whatsapp.net`;

        await client.message.send(jid, { text: message });

        console.log(`Mensaje enviado a ${normalized}.`);
        res.json({ ok: true });
    } catch(err) {
        console.error("Error enviando mensaje a WhatsApp: ", err.message );
        res.status(500).json({ error: "No se pudo enviar el mensaje." });
    }
})

app.post('/api/whatsapp/broadcast', async (req, res) => {
    if (!isReady()) {
        return res.status(503).json({ error: "Bot no conectado." });
    }

    const { phones, message } = req.body;

    if (!Array.isArray(phones) || !phones.length || !message) {
        return res.status(400).json({ error: "Se requieren los telefonos y el mensaje a enviar." });
    }

    const results = { ok: 0, fail: 0, errors: [] };
    
    for (const phone of phones) {
        const normalized = normalizePhone(phone);
        if (!normalized) continue;  
        try {
            await client.send.message(`${normalized}@s.whatsapp.net`, { text: message});
            results.ok++
            await new Promise(r => setTimeout(r, 800)); // Pequeña pausa para evitar spam
        } catch (err) {
            results.fail++;
            results.errors.push({ phone: normalized, error: err.message });
        }
    }

    console.log(`Broadcast enviado: ${results.ok} mensajes con exito, ${results} fallidos.` );
    res.json({ ok: true, results });
});

const WA_PORT = parseInt(process.env.WA_PORT || '3001', 10);
startApiServer(WA_PORT);