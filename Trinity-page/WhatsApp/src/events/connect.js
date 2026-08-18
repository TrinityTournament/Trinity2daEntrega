import { createSqliteStore } from '@zapo-js/store-sqlite'
import { createNoopLogger, createStore, WaClient } from 'zapo-js'

import fs from 'fs'

export async function connect() {
    if (!fs.existsSync('./.auth')) {
        console.log("[INFO] Creando carpeta .auth")
        fs.mkdirSync('./.auth', { recursive: true })
    }

    const store = createStore({
        backends: {
            sqlite: createSqliteStore({ path: './.auth/state.sqlite' })
        },
        providers: {
            auth: 'sqlite',
            signal: 'sqlite',
            preKey: 'sqlite',
            session: 'sqlite',
            identity: 'sqlite',
            senderKey: 'sqlite',
            appState: 'sqlite',
            privacyToken: 'sqlite',
            messages: 'none',
            threads: 'none',
            contacts: 'none'
        }
    })

    const bot = new WaClient( { store, sessionId: 'default' },
                                createNoopLogger())
    await bot.connect()
    
    bot.on('auth_paired', ({ credentials }) => {
        console.log('Conectado como: ', credentials.meJid + "\n")
    })

    const credentials = await bot.auth.authStore.load()
    
    if (!credentials?.meJid) {
        const code = await bot.auth.requestPairingCode(
            '59892928797', 'true', 'VRVGVAYS' // El codigo no puede contener los siguientes caracteres: 0, O, U, I.
        )                                    // Los parametros de la función son estos: 
                                            // requestPairingCode(phoneNumber, shouldShowPushNotification?, customCode?)
        console.log('\nIngresa este codigo para vincular: ', code)    
                                          // Parametro 1: Numero a vincular | Parametro 2: Enviar la notificación push para vincular
        await new Promise((resolve) => bot.once('auth_paired', resolve))
    }                                   // Parametro 3: Código personalizado para vincular
                                       // (El parametro 2 es necesario si se quiere poner un codigo personalizado)
    return bot                        // 'return bot' devuelve todo lo necesario para ejecutar el bot.
}                                       