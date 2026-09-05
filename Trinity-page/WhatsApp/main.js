import 'dotenv/config'
import { connect } from './src/events/connect.js'
import serialize from './src/utils/serialize.js'
import { prefix } from './src/config.js'
import { setClient, clearClient } from './src/lib/botState.js'
import { startApiServer } from './src/apiServer.js'

// Este archivo solo se encarga de inicializar el bot. Como el bot se activa
// mediante llamadas POST desde PHP (ver src/apiServer.js), no hace falta un
// sistema de comandos manual. El listener de 'message' de abajo queda como
// gancho por si en el futuro se agrega interacción directa por WhatsApp.

// zapo-js NO reconecta solo (a propósito, según su documentación) — si no
// manejamos el evento 'connection', el bot se queda mudo apenas se corta
// la conexión una vez. Backoff exponencial recomendado por la doc oficial:
// https://zapo.to/en/guides/reconnection
const MAX_RECONNECT_ATTEMPTS = 10
let reconnectAttempt = 0

function wireClient(client) {
    client.on('connection', (event) => {
        if (event.status === 'open') {
            reconnectAttempt = 0
            setClient(client)
            console.log('[WhatsApp] Conexión abierta — bot listo para enviar mensajes.')
            return
        }

        // status === 'close'
        clearClient()

        if (event.isLogout) {
            console.error('[WhatsApp] Sesión cerrada (logout). Borrá la carpeta .auth y volvé a vincular con un nuevo código.')
            return
        }

        console.log(`[WhatsApp] Conexión cerrada (${event.reason ?? 'motivo desconocido'}). Reintentando...`)
        void reconnect(client)
    })

    client.on('message', async (event) => {
        const message = serialize(event, client)

        if (!message.text || !message.text.startsWith(prefix)) return

        // A futuro: acá se podría enrutar a un sistema de comandos.
        // Por ahora el bot no responde a mensajes entrantes, solo envía
        // lo que le pide PHP a través de la API HTTP.
    })
}

async function reconnect(client) {
    if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
        console.error(`[WhatsApp] Se alcanzaron los ${MAX_RECONNECT_ATTEMPTS} reintentos máximos. Reiniciá el proceso manualmente.`)
        return
    }

    const delayMs = Math.min(30_000, 1_000 * 2 ** reconnectAttempt)
    reconnectAttempt += 1
    console.log(`[WhatsApp] Reconectando en ${delayMs}ms (intento ${reconnectAttempt}/${MAX_RECONNECT_ATTEMPTS})`)

    await new Promise((resolve) => setTimeout(resolve, delayMs))

    try {
        // Se reutiliza el mismo cliente (no se crea uno nuevo): las
        // credenciales ya están persistidas en .auth, así que no vuelve
        // a pedir código de emparejamiento.
        await client.connect()
    } catch (error) {
        console.error('[WhatsApp] Reintento de conexión fallido:', error)
        void reconnect(client)
    }
}

async function main() {
    // El servidor HTTP arranca ya mismo (no espera al emparejamiento de
    // WhatsApp): así PHP puede consultar /api/whatsapp/status y recibir
    // { connected: false } en vez de que la conexión falle directamente
    // mientras el bot todavía está arrancando.
    const WA_PORT = parseInt(process.env.WA_PORT || '3001', 10)
    startApiServer(WA_PORT)

    const client = await connect()
    wireClient(client)
}

main()
