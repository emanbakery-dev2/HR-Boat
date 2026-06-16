import { customProvider, gateway } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { isTestEnvironment } from "../constants";
import { titleModel } from "./models";

// ─── Gemini direct provider (used when GOOGLE_GENERATIVE_AI_API_KEY is set) ───
const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

const geminiProvider = geminiApiKey
  ? createGoogleGenerativeAI({ apiKey: geminiApiKey })
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
export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  if (geminiProvider) {
    return geminiProvider("gemini-2.5-flash");
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

  return gateway.languageModel(titleModel.id);
}
