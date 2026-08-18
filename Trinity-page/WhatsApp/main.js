import { connect } from './src/events/connect.js'
import serialize from './src/utils/serialize.js'
import { loadCommands } from './src/handlers/commands.js'
import { prefix, devs } from './src/config.js'
import express from 'express';
import { startApiServer } from "./WAServer.js";
export function startWAServer(port = 3001) {
    app.listen(port, '127.0.0.1', () => {
        console.log("API interna del bot escuchando en http://127.0.0.1:3001" );
    })
}

async function main() {
    const client = await connect()
    const commands = await loadCommands()
    const uniqueCommands = [...new Set(commands.values())]

    console.log(`[INFO] ${uniqueCommands.length} comandos cargados. Prefix: "${prefix}"`)

    client.on('message', async (event) => {
        const message = serialize(event, client)

        if (!message.text || !message.text.startsWith(prefix)) return

        const args = message.text.slice(prefix.length).trim().split(/\s+/)
        const commandName = args.shift()?.toLowerCase()

        if (!commandName) return
        const command = commands.get(commandName)
        
        if (!command) return

        // Se comprueba si el comando tiene el campo 'dev' activo y compara el sender con el ID en src/config.js
        if (command.dev && !devs.includes(message.sender.split('@')[0])) return message.reply("Este comando solo lo pueden ejecutar desarrolladores.")
        //if (command.admin && !admins.includes())

        try {
            await command.execute({ message, args, client, commands })
        } catch (error) {
            console.error(`[Comandos] Error ejecutando "${commandName}":`, error)
            await message.reply('Ocurrió un error al ejecutar el comando.')
        }
    })
}

main()