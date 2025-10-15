import { pino } from 'pino';
import {
  isJidBroadcast,
  isJidNewsletter,
  AuthenticationState,
  WAVersion,
  UserFacingSocketConfig,
  WAMessageKey,
  WAMessageContent
} from 'baileys';
import NodeCache from 'node-cache';

export default function configWaSocket(
  state: AuthenticationState,
  retryCache: NodeCache,
  version: WAVersion,
  messageStoreCache: NodeCache,
) {
  const config: UserFacingSocketConfig = {
    logger: pino({ level: 'silent' }),
    browser: ['Chrome (Linux)', '', ''],
    auth: state,
    version,
    msgRetryCounterCache: retryCache,
    defaultQueryTimeoutMs: 45000,
    syncFullHistory: false,
    qrTimeout: 50000,
    markOnlineOnConnect: true,
    shouldIgnoreJid: (jid: string) =>
      isJidBroadcast(jid) || isJidNewsletter(jid),

    getMessage: async (key: WAMessageKey): Promise<WAMessageContent | undefined> => {
      // Verifica se o ID é válido antes de acessar o cache
      if (!key.id) return undefined;

      const message = messageStoreCache.get(key.id);
      if (!message) return undefined; // Evita erro de tipo
      
      return message as WAMessageContent; // Cast seguro
    },
  };

  return config;
}
