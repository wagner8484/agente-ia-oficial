import express from "express";
import dotenv from "dotenv";
import { sendMessage, sendApprovedTemplate } from "./whatsapp.js";
import { askOpenAI } from "./openai.js";

dotenv.config();

const app = express();
app.use(express.json());

app.get("/webhook", (req, res) => {
  const verify_token = process.env.VERIFY_TOKEN;
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === verify_token) {
    console.log("Webhook verificado!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (body.object) {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const message = changes?.value?.messages?.[0];

      if (message && message.type === "text") {
        const from = message.from;
        const userText = message.text.body;

        console.log(`📩 Mensagem recebida: ${userText} de ${from}`);

        const resposta = await askOpenAI(userText, from);

        await sendMessage(from, resposta);
      }

      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (err) {
    console.error("Erro no webhook:", err);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
