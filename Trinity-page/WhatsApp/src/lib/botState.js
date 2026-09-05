// ══════════════════════════════════════════════════════════
//  TRINITY Bot — Estado compartido del cliente de WhatsApp
//  Permite que el servidor Express (apiServer.js) sepa si
//  el cliente de zapo-js está conectado y lo use para enviar.
// ══════════════════════════════════════════════════════════

let _client    = null;
let _connected = false;

/** Guarda la referencia al client y lo marca como conectado. */
export const setClient = (client) => {
    _client    = client;
    _connected = true;
};

/** Marca la conexión como caída. No borra `_client`: si zapo
 *  reconecta con el mismo objeto (ver main.js), seguimos
 *  necesitando la referencia para volver a llamar a connect(). */
export const clearClient = () => {
    _connected = false;
};

/** Devuelve el client actual (puede estar desconectado). */
export const getClient = () => _client;

/** true sólo cuando la conexión con WhatsApp está activa. */
export const isReady = () => _client !== null && _connected;
