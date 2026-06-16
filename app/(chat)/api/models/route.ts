import {
  chatModels,
  geminiChatModel,
  getCapabilities,
  getActiveModels,
  groqChatModel,
  isDemo,
  getAllGatewayModels,
} from "@/lib/ai/models";

export async function GET() {
  const headers = {
    "Cache-Control": "public, max-age=3600, s-maxage=3600",
  };

  const curatedCapabilities = await getCapabilities();

  if (isDemo) {
    const gatewayModels = await getAllGatewayModels();
    const capabilities = Object.fromEntries(
      gatewayModels.map((m) => [m.id, curatedCapabilities[m.id] ?? m.capabilities])
    );
    return Response.json({ capabilities, models: gatewayModels }, { headers });
  }

  // Always return { models, capabilities } so the UI renders the full list.
  const activeModels = getActiveModels();

  const capabilities: Record<string, { tools: boolean; vision: boolean; reasoning: boolean }> = {
    ...curatedCapabilities,
  };

  // Direct provider models don't go through gateway — set their caps manually.
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    capabilities[geminiChatModel.id] = { tools: true, vision: true, reasoning: true };
  }
  if (process.env.GROQ_API_KEY) {
    capabilities[groqChatModel.id] = { tools: true, vision: false, reasoning: false };
  }

  return Response.json({ models: activeModels, capabilities }, { headers });
}
