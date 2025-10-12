import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const WHATSAPP_API = "https://graph.facebook.com/v24.0";

// Envia mensagem de texto simples
export async function sendMessage(to: string, text: string) {
  const url = `${WHATSAPP_API}/${process.env.PHONE_NUMBER_ID}/messages`;

  await axios.post(
    url,
    {
      messaging_product: "whatsapp",
      to,
      text: { body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

// Envia mensagem com botão de resposta (reply button)
export async function sendMessageWithButton(to: string, bodyText: string, buttonText: string) {
  const url = `${WHATSAPP_API}/${process.env.PHONE_NUMBER_ID}/messages`;

  await axios.post(
    url,
    {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: bodyText
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: "acessar_site",
                title: buttonText
              }
            }
          ]
        }
      }
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

export async function sendApprovedTemplate(to: string, templateName: string, languageCode = "pt_BR") {
  const url = `${WHATSAPP_API}/${process.env.PHONE_NUMBER_ID}/messages`;

  try {
    const response = await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode }
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error: any) {
    console.error("Erro ao enviar template:", error.response?.data || error.message);
  }
}
