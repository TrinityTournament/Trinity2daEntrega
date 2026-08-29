// readline, como dice el nombre, lee las lineas de la Terminal, se usa para hacer programas CLI (Command-Line Interface)
// Realmente no se usa porque la idea original es que solicite el número del bot mediante Terminal, pero como siempre es el mismo
// no se usa, de igual manera, me gusta conservarlo por si acaso
import readline from 'readline/promises';

async function ask(question) {
    const rl = readline.createInterface({ input, output });
    const answer = await rl.question(question);
    rl.close();
    return answer.trim();
};

// Esta función hace que el mensaje de WhatsApp tenga esta estructura: https://files.catbox.moe/pfgv0u.jpg 
// Hace un "redireccionamiento" a un mensaje inexistente pero que lleva al canal de información.
export function forwardedFromChannel({ jid, name, serverMessageId = 1 }) {
    return {
        isForwarded: true,
        forwardingScore: 9999, // Esta linea es la responsable de porque en la imagen figura "Reenviado muchas veces", si el numero fuera menor, solo diria Reenviado.
        raw: {
            forwardedNewsletterMessageInfo: {
                newsletterJid: jid,
                newsletterName: name,
                serverMessageId
            }
        }
    };
}