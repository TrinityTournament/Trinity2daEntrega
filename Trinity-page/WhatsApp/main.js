import { connect } from './src/events/connect.js'
import serialize from './src/utils/serialize.js'

async function main() {
    const client = await connect()

    client.on('message', async (event) => {
        const message = serialize(event, client)

        if (!message.text || !message.text.startsWith(prefix)) return

        })
    }

main()

// Este archivo solo se encarga de inicializar el bot, como el bot solo se activará mediante llamadas POST, no es necesario usar ningún comando de manera manual.
// A futuro, quizá se implemente algo para que el usuario tenga más interacción.