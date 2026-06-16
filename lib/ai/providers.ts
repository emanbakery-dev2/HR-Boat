import { customProvider, gateway } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { isTestEnvironment } from "../constants";
import { titleModel } from "./models";

// ─── Gemini direct provider (used when GOOGLE_GENERATIVE_AI_API_KEY is set) ───
// This is completely independent of Vercel AI Gateway.
// When you activate AI Gateway in the future, remove the geminiProvider block
// and the getLanguageModel / getTitleModel functions will automatically fall
// back to gateway.languageModel() which is already preserved below.
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
// Priority order:
//   1. Test environment mock
//   2. Gemini direct (if GOOGLE_GENERATIVE_AI_API_KEY is set)
//   3. Vercel AI Gateway (original — preserved for future use)
export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  if (geminiProvider) {
    // Map any modelId to gemini-2.0-flash when using direct Gemini provider
    return geminiProvider("gemini-2.0-flash");
  }

  // ← Vercel AI Gateway (untouched — activates automatically when you
  //   enable AI Gateway and remove GOOGLE_GENERATIVE_AI_API_KEY)
  return gateway.languageModel(modelId);
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }

  if (geminiProvider) {
    return geminiProvider("gemini-2.0-flash");
  }

  // ← Vercel AI Gateway (untouched)
  return gateway.languageModel(titleModel.id);
}
