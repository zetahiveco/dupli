import "@/lib/langfuse";
import { createOpenAI } from "@ai-sdk/openai";

export function fireworksTelemetry(functionId: string) {
    return {
        isEnabled: true,
        recordInputs: true,
        recordOutputs: true,
        functionId,
        metadata: {
            provider: "fireworks",
        },
    };
}

const fireworksProvider = createOpenAI({
    name: "fireworks",
    // Placeholder so loadApiKey does not throw if dotenv loads after this module.
    apiKey: process.env.FIREWORKS_API_KEY ?? "missing",
    baseURL: "https://api.fireworks.ai/inference/v1",
    headers: {
        get Authorization() {
            const apiKey = process.env.FIREWORKS_API_KEY;
            if (!apiKey) {
                throw new Error("FIREWORKS_API_KEY is not set");
            }
            return `Bearer ${apiKey}`;
        },
    },
});

// Fireworks speaks chat completions. createOpenAI()(modelId) uses the Responses
// API. .chat() also sends json_schema for Output.object; @ai-sdk/fireworks does not.
const fireworks = (modelId: string) => fireworksProvider.chat(modelId);

export default fireworks;
