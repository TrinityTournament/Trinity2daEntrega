#!/bin/bash

set -euo pipefail

# Este script se encarga de verificar el estado del bot de Whatsapp y envia un mensaje por whatsapp que dice "El bot está funcionando"

source "$(dirname "$0")/../.env"

if [ -z "${BREVO_KEY:-}" ]; then
    echo "Error: BREVO_KEY no está definida."
    exit 1
fi

response=$(curl -s \
    "https://half-patience-playhouse.ngrok-free.dev/api/whatsapp/status" \
    -H "ngrok-skip-browser-warning: true" \
    -H "Content-Type: application/json" \
    -H "x-wa-secret: WAxK9mQpL2rNvF5cJ7WnOlZ3orfpc9vG8dYb")

# Esto corrobora si el bot está conectado, si devuelve true, entonces pasa a enviar el mensaje a uno de los integrantes para
# avisar que, efectivamente, está funcionando

if ! status=$(echo "$response" | jq -r '.connected' 2>/dev/null); then
    status="false"
fi

if [ "$status" = "true" ]; then
    echo "El bot funciona."
    echo "Enviando mensaje..."

    curl -sS -f \
        "https://half-patience-playhouse.ngrok-free.dev/api/whatsapp/send" \
        -H "ngrok-skip-browser-warning: true" \
        -H "Content-Type: application/json" \
        -H "x-wa-secret: WAxK9mQpL2rNvF5cJ7WnOlZ3orfpc9vG8dYb" \
        -d '{ "phone": "59895609705", "message": "El bot está funcionando." }'

    echo
    echo "Mensaje enviado."

else
    echo "El bot no está funcionando."
    echo "Enviando correo de alerta..."

    curl -sS -f \
        -H "accept: application/json" \
        -H "api-key: $BREVO_KEY" \
        -H "content-type: application/json" \
        -d '{
            "sender": {
                "name": "WhatsApp Bot",
                "email": "trinitysupportteam@gmail.com"
            },
            "to": [
                {
                    "email": "contact.smokyy@gmail.com",
                    "name": "Agustina Rodriguez"
                }
            ],
            "subject": "Bot de WhatsApp apagado",
            "textContent": "El bot de WhatsApp no está funcionando."
        }' \
        "https://api.brevo.com/v3/smtp/email"

    echo
    echo "Correo enviado."
    exit 1
fi