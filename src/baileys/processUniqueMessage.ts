import { WAMessage } from 'baileys';
import NodeCache from 'node-cache';

const processedMessagesCache = new NodeCache({
  stdTTL: 5 * 60,
  useClones: false,
});

type MessageUpsert = WAMessage;

/**
 * Executa a função apenas se a mensagem ainda não tiver sido processada
 */
export async function processUniqueMessage(
  message: MessageUpsert,
  handler: () => Promise<void>,
): Promise<void> {
  const messageId = message?.key?.id;

  if (!messageId) return;

  // Se já processou, ignora
  if (processedMessagesCache.has(messageId)) return;

  // Marca como processada
  processedMessagesCache.set(messageId, true);

  // Executa a função de tratamento
  await handler();
}
