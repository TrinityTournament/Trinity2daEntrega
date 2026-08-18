import { getContentType, toUserJid } from "zapo-js";

function extractText(message) {
  if (!message) return undefined;
  return (
    message.conversation ??
    message.extendedTextMessage?.text ??
    message.imageMessage?.caption ??
    message.videoMessage?.caption
  );
}

// El contextInfo (donde vive el mensaje citado) no está en un lugar fijo,
// cuelga del tipo de mensaje que se usó para citar (texto, imagen, video...).
function extractContextInfo(message) {
  if (!message) return undefined;
  return (
    message.extendedTextMessage?.contextInfo ??
    message.imageMessage?.contextInfo ??
    message.videoMessage?.contextInfo ??
    message.documentMessage?.contextInfo ??
    message.audioMessage?.contextInfo ??
    message.stickerMessage?.contextInfo
  );
}

function extractQuoted(message, client) {
  const contextInfo = extractContextInfo(message);
  if (!contextInfo?.quotedMessage) return undefined;

  const quotedMessage = contextInfo.quotedMessage;

  return {
    id: contextInfo.stanzaId,
    sender: contextInfo.participant ? toUserJid(contextInfo.participant) : undefined,
    message: quotedMessage,
    type: getContentType(quotedMessage) || Object.keys(quotedMessage)[0],
    text: extractText(quotedMessage),
    download: () => client.message.downloadBytes(quotedMessage)
  };
}

export default function serialize(event, client) {
  const key = event.key;

  return {
    raw: event,
    key,
    id: key.id,
    from: key.remoteJid,
    fromMe: key.fromMe,
    isGroup: key.isGroup,
    sender: toUserJid(key.isGroup ? (key.participant ?? key.remoteJid) : key.remoteJid),
    pushName: event.pushName,
    type: event.message ? (getContentType(event.message) || Object.keys(event.message)[0]) : undefined,
    text: extractText(event.message), // event.message?.conversation, más corto
    quoted: extractQuoted(event.message, client),
    
    // content puede ser un string o cualquier objeto tipado (image, video, poll, etc.)
    // El resultado trae su propio .edit(), para poder editar el mensaje recién enviado.
    reply: async (content, options = {}) => {
      const result = await client.message.send(key.remoteJid, content, { quote: event, ...options });
      return {
        ...result,
        edit: (newContent, editOptions = {}) =>
          client.message.send(key.remoteJid, newContent, { editKey: { id: result.id }, ...editOptions })
      };
    },

    react: (emoji) =>
      client.message.send(key.remoteJid, { type: "reaction", emoji, target: key }),

    // Edita el mensaje actual. Solo funciona si vos lo enviaste (fromMe: true).
    edit: (content, options = {}) =>
      client.message.send(key.remoteJid, content, { editKey: key, ...options }),

    download: () => client.message.downloadBytes(event)
  };
}