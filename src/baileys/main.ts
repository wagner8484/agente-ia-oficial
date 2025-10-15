import {
  fetchLatestBaileysVersion,
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
} from 'baileys';
import * as dotenv from 'dotenv';
import NodeCache from 'node-cache';
import configWaSocket from './config/config.js';
import qrcode from 'qrcode-terminal';
import { askOpenAI } from '../openai.js';
import { Boom } from '@hapi/boom';
import { processUniqueMessage } from './processUniqueMessage.js';

dotenv.config();

const messageStoreCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });
const retryCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });

const connectWhatsapp = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('session');
  const { version } = await fetchLatestBaileysVersion();

  const sock: WASocket = makeWASocket(
    configWaSocket(state, retryCache, version, messageStoreCache),
  );

  sock.ev.process(async (events: any) => {
    // ✅ Eventos de conexões
    if (events['connection.update']) {
      const update = events['connection.update'];
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrcode.generate(qr, { small: true }, (qrcode) => {
          console.log(qrcode);
        });
      }

      if (connection === 'close') {
        const erroCode = new Boom(lastDisconnect.error)?.output?.statusCode;

        if (erroCode === DisconnectReason?.restartRequired) {
          await startBot();
        }
      }

      if (connection === 'open') {
        console.log('CLIENTE CONECTADO!');
      }
    }

    // ✅ Atualização de credenciais
    if (events['creds.update']) {
      await saveCreds();
    }

    // ✅ Mensagens recebidas
    if (events['messages.upsert']) {
      const { messages } = events['messages.upsert'];
      for (const message of messages) {
        if (message.key.fromMe) continue;

        const userText =
          message.message?.conversation || message.message?.extendedTextMessage?.text || '';

        const fromArray = [];

        fromArray.push(message.key?.remoteJid);
        fromArray.push(message.key?.senderLid);
        fromArray.push(message.key?.senderPn);

        console.log(fromArray);

        const from = fromArray
          .filter((id): id is string => typeof id === 'string')
          .find((id) => id.includes('@s.whatsapp.net'));

        if (!from) {
          console.log('⚠️ Nenhum JID @s.whatsapp.net encontrado, ignorando mensagem');
          return;
        }

        console.log(from);

        console.log('USERTEXT', userText);

        console.log(message);

        try {
          messageStoreCache.set(from, message);

          await processUniqueMessage(message, async () => {
            const resposta = await askOpenAI(userText, from);
            await sock.sendMessage(from, { text: resposta });
          });
        } catch (err) {
          console.error('Erro ao processar mensagem:', err);
        }
      }
    }
  });
};

async function startBot() {
  try {
    await connectWhatsapp();
  } catch (err) {
    console.error('Erro durante a inicialização do bot:', err);
  }
}

startBot();
