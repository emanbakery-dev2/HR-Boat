import { customProvider, gateway } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { isTestEnvironment } from "../constants";
import { titleModel } from "./models";

// ─── Gemini direct provider ──────────────────────────────────────────────────
const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const geminiProvider = geminiApiKey
  ? createGoogleGenerativeAI({ apiKey: geminiApiKey })
  : null;

// ─── Groq direct provider ────────────────────────────────────────────────────
const groqApiKey = process.env.GROQ_API_KEY;
const groqProvider = groqApiKey
  ? createGroq({ apiKey: groqApiKey })
  : null;

// ─── Test environment mock provider (unchanged) ──────────────────────────────
export const myProvider = isTestEnvironment
  ? (() => {
      const { chatModel, titleModel } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": titleModel,
        },
      });
    })()
  : null;

// ─── Language model resolver ──────────────────────────────────────────────────
// Priority: Test mock → Gemini → Groq → Vercel AI Gateway
export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  if (geminiProvider) {
    return geminiProvider("gemini-2.5-flash");
  }

  if (groqProvider) {
    return groqProvider("llama-3.3-70b-versatile");
  }

  return gateway.languageModel(modelId);
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }

  if (geminiProvider) {
    return geminiProvider("gemini-2.5-flash");
  }

  if (groqProvider) {
    return groqProvider("llama-3.3-70b-versatile");
  }

  return gateway.languageModel(titleModel.id);
}
