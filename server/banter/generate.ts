import OpenAI from "openai";
import { getPersonality } from "./prompts";
import { checkResponseSafety } from "./safety";
import { logger } from "../logger";

const FALLBACK_RESPONSES = [
  "I've got nothing. That's on you.",
  "My brain buffered. Try again.",
  "404: banter not found.",
  "I was going to say something clever, but I forgot.",
];

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

function randomFallback(): string {
  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}

/**
 * Generates a short banter response via GPT.
 *
 * @param prompt       - What the user said after the wake word.
 * @param personality  - Personality key (see prompts.ts).
 * @param contextLines - Optional recent context summaries for the AI.
 * @param maxWords     - Hard cap on response length (default 25).
 */
export async function generateBanter(
  prompt: string,
  personality = "default",
  contextLines: string[] = [],
  maxWords = 25,
): Promise<string> {
  const { systemPrompt } = getPersonality(personality);
  const start = Date.now();

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  if (contextLines.length > 0) {
    messages.push({
      role: "system",
      content: `Recent context:\n${contextLines.slice(-3).join("\n")}`,
    });
  }

  messages.push({ role: "user", content: prompt });

  try {
    const completion = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: maxWords * 3, // tokens ≠ words; 3× is a safe overshoot
      temperature: 0.9,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";

    const safety = checkResponseSafety(raw);
    if (!safety.safe) {
      logger.warn("GPT response blocked by safety filter", {
        errorMessage: safety.reason,
      });
      return randomFallback();
    }

    // Soft-trim to maxWords
    const words = raw.split(/\s+/);
    const result = words.length > maxWords ? words.slice(0, maxWords).join(" ") + "…" : raw;

    logger.info("Banter generated", {
      provider: "gpt-4o-mini",
      latencyMs: Date.now() - start,
    });

    return result;
  } catch (err) {
    logger.error("GPT generation failed — using fallback", {
      provider: "gpt-4o-mini",
      errorClass: err instanceof Error ? err.constructor.name : "Unknown",
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    return randomFallback();
  }
}
