import { toUserJid } from "zapo-js";

function extractText(message) {
  if (!message) return undefined;

  return (
    message.conversation ??
    message.extendedTextMessage?.text
  );
}

function extractContextInfo(message) {
  if (!message) return undefined;

  return message.extendedTextMessage?.contextInfo;
}

function extractQuoted(message) {
  const contextInfo = extractContextInfo(message);

  if (!contextInfo?.quotedMessage) return undefined;

  const quotedMessage = contextInfo.quotedMessage;

  return {
    id: contextInfo.stanzaId,
    sender: contextInfo.participant
      ? toUserJid(contextInfo.participant)
      : undefined,
    message: quotedMessage,
    text: extractText(quotedMessage)
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

    sender: toUserJid(
      key.isGroup
        ? (key.participant ?? key.remoteJid)
        : key.remoteJid
    ),

    pushName: event.pushName,

    // Texto del mensaje recibido
    text: extractText(event.message),

    // Texto del mensaje citado, si existe
    quoted: extractQuoted(event.message),

    reply: async (content, options = {}) => {
      const result = await client.message.send(
        key.remoteJid,
        content,
        {
          quote: event,
          ...options
        }
      );

      return {
        ...result,

        edit: (newContent, editOptions = {}) =>
          client.message.send(
            key.remoteJid,
            newContent,
            {
              editKey: { id: result.id },
              ...editOptions
            }
          )
      };
    },

    react: (emoji) =>
      client.message.send(
        key.remoteJid,
        {
          type: "reaction",
          emoji,
          target: key
        }
      ),

    edit: (content, options = {}) =>
      client.message.send(
        key.remoteJid,
        content,
        {
          editKey: key,
          ...options
        }
      )
  };
}
