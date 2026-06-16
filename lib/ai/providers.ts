import { customProvider, gateway, type LanguageModel } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { isTestEnvironment } from "../constants";
import { titleModel } from "./models";

// ─── Gemini direct provider ──────────────────────────────────────────────────
const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
export const geminiProvider = geminiApiKey
  ? createGoogleGenerativeAI({ apiKey: geminiApiKey })
  : null;

// ─── Groq direct provider ────────────────────────────────────────────────────
const groqApiKey = process.env.GROQ_API_KEY;
export const groqProvider = groqApiKey
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
// Routes by model ID prefix:
//   "google/*"  → Gemini direct provider (cast to LanguageModel for V3 compat)
//   "groq/*"    → Groq direct provider   (cast to LanguageModel for V3 compat)
//   anything else → Vercel AI Gateway (untouched, native V3)
export function getLanguageModel(modelId: string): LanguageModel {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  if (modelId.startsWith("google/") && geminiProvider) {
    const geminiModelId = modelId.replace("google/", "");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return geminiProvider(geminiModelId) as any as LanguageModel;
  }

  if (modelId.startsWith("groq/") && groqProvider) {
    const groqModelId = modelId.replace("groq/", "");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return groqProvider(groqModelId) as any as LanguageModel;
  }

  // ← Vercel AI Gateway — handles all gateway model IDs untouched
  return gateway.languageModel(modelId);
}

// Title generation always goes through the gateway to keep the return type
// fully compatible with LanguageModelV3 (avoids V1/V3 type mismatch).
export function getTitleModel(): LanguageModel {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return gateway.languageModel(titleModel.id);
}
