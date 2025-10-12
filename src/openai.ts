import OpenAI from "openai";
import dotenv from "dotenv";
import { systemPrompt } from "./prompt/systemPrompt.js";
import { getHistorico, salvarHistorico } from "./storage/conversaStorage.js";
import { enviarSiteOficial, enviarEnderecoEvento } from "./tools/eventTools.js";

dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function askOpenAI(prompt: string, userId: string): Promise<string> {
  // 1️⃣ Pega histórico e adiciona a mensagem do usuário
  const historico = await getHistorico(userId);
  historico.push({ role: "user", content: prompt });

  // 2️⃣ Filtra mensagens antigas com roles inválidos para o modelo
  const historicoFiltrado = historico.filter(
    msg => msg.role === "user" || msg.role === "assistant"
  );

  // 3️⃣ Chama o modelo com funções corretamente
  const completion = await client.chat.completions.create({
    model: "gpt-5-mini",
    messages: [{ role: "system", content: systemPrompt }, ...historicoFiltrado],
    functions: [
      {
        name: "enviarSiteOficial",
        description: "Envia o site oficial do evento para o usuário.",
        parameters: { type: "object", properties: {} },
      },
      {
        name: "enviarEnderecoEvento",
        description: "Envia o endereço do evento no Google Maps.",
        parameters: { type: "object", properties: {} },
      },
    ],
  });

  const choice = completion.choices[0];

  // 4️⃣ Se o modelo pediu para chamar uma função
  if (choice.message?.function_call) {
    const functionName = choice.message.function_call.name;
    const args = choice.message.function_call.arguments
      ? JSON.parse(choice.message.function_call.arguments)
      : {};

    let functionResult = "";

    if (functionName === "enviarSiteOficial") functionResult = await enviarSiteOficial();
    if (functionName === "enviarEnderecoEvento") functionResult = await enviarEnderecoEvento();

    // 5️⃣ Não registramos role 'function' no histórico, só uma mensagem normal
    historico.push({
      role: "assistant",
      content: functionResult, // ou "Executando função..." se quiser mostrar isso
    });

    await salvarHistorico(userId, historico);

    return functionResult;
  }

  // 6️⃣ Caso não haja função, apenas retorna a resposta do modelo
  const resposta = choice.message?.content || "Desculpe, não consegui responder.";
  historico.push({ role: "assistant", content: resposta });
  await salvarHistorico(userId, historico);

  return resposta;
}
