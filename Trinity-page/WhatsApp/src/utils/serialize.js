import { getContentType, toUserJid } from "zapo-js";

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

    // Edita el mensaje actual. Solo funciona si vos lo enviaste (fromMe: true).
    edit: (content, options = {}) =>
      client.message.send(key.remoteJid, content, { editKey: key, ...options }),

  };
}