import { customProvider, gateway } from "ai";
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
//   "google/*"  → Gemini direct provider
//   "groq/*"    → Groq direct provider
//   anything else → Vercel AI Gateway (untouched)
export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  if (modelId.startsWith("google/") && geminiProvider) {
    // Strip the "google/" prefix to get the raw Gemini model name
    const geminiModelId = modelId.replace("google/", "");
    return geminiProvider(geminiModelId);
  }

  if (modelId.startsWith("groq/") && groqProvider) {
    // Strip the "groq/" prefix to get the raw Groq model name
    const groqModelId = modelId.replace("groq/", "");
    return groqProvider(groqModelId);
  }

  // ← Vercel AI Gateway — handles all gateway model IDs untouched
  return gateway.languageModel(modelId);
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }

  // Title generation: prefer Gemini > Groq > gateway in that order
  if (geminiProvider) {
    return geminiProvider("gemini-2.5-flash");
  }

  if (groqProvider) {
    return groqProvider("llama-3.3-70b-versatile");
  }

  return gateway.languageModel(titleModel.id);
}
