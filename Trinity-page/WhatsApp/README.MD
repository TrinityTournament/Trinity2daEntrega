# Trinity WABot

Bot de WhatsApp de Trinity sobre la librería [zapo-js](https://zapo.to). A diferencia de otras plantillas de bots, **no tiene sistema de comandos manuales** — se activa exclusivamente mediante llamadas POST desde el backend PHP del sitio.

## Uso

```
npm install
node main.js
```

La primera vez va a pedir un código de emparejamiento por consola (ver `src/events/connect.js`). Las credenciales quedan guardadas en `.auth/` (no se sube al repo).

## Integración con Trinity

Este bot expone una API HTTP interna (`src/apiServer.js`, puerto `WA_PORT`, default `3001`) que consume el backend PHP a través de `api/src/Core/WhatsAppClient.php`. La usan `VerificationService`, `AuthService`, `NotificationService` y `TournamentService` para mandar códigos de verificación, avisos y anuncios de torneos.

### Endpoints

| Método | Ruta                      | Body                             | Uso                                   |
| ------ | ------------------------- | --------------------------------- | -------------------------------------- |
| GET    | `/api/whatsapp/status`    | —                                  | Health check (`{ connected: bool }`)  |
| POST   | `/api/whatsapp/send`      | `{ phone, message }`              | Un mensaje a un número                 |
| POST   | `/api/whatsapp/broadcast` | `{ phones: string[], message }`   | El mismo mensaje a varios números      |

Todas las rutas (salvo `/status`) requieren el header `X-WA-Secret` con el mismo valor que `WA_SECRET` en `.env` — tiene que coincidir con el `.env` de la raíz del sitio.

### Reconexión

zapo-js **no reconecta automáticamente** (decisión de diseño de la librería). `main.js` implementa el loop de reintentos con backoff exponencial que recomienda la [documentación oficial](https://zapo.to/en/guides/reconnection), escuchando el evento `connection` (`open` / `close`) para saber cuándo el bot está realmente listo para enviar mensajes (`src/lib/botState.js`).

### Variables de entorno (`.env`)

```
WA_PORT=3001
WA_SECRET=<mismo valor que en el .env del sitio>
```

`.env.example` tiene una plantilla sin el secreto real.

### Sin comandos manuales

El listener de `client.on('message', ...)` en `main.js` no hace nada por ahora — queda como gancho para el día que se quiera agregar interacción directa por WhatsApp. Todo lo que el bot dice hoy lo dispara PHP.
