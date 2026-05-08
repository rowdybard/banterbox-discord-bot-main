const MAX_PROMPT_LENGTH = 200;

const BLOCK_PATTERNS = [
  /\b(kill|murder|rape|suicide|self.?harm)\b/i,
  /\b(n[i1]gg[ae]r|f[a4]gg[o0]t|k[i1]ke|ch[i1]nk|sp[i1][ck])\b/i,
  /\b(hitler|nazi|holocaust)\b/i,
  /child\s*(porn|sex|abuse|exploit)/i,
];

export interface SafetyResult {
  safe: boolean;
  reason?: string;
}

/**
 * Validates a user prompt before sending it to OpenAI.
 * Returns { safe: false, reason } if the prompt should be blocked.
 */
export function checkPromptSafety(prompt: string): SafetyResult {
  const trimmed = prompt.trim();

  if (trimmed.length === 0) {
    return { safe: false, reason: "Empty prompt" };
  }

  if (trimmed.length > MAX_PROMPT_LENGTH) {
    return {
      safe: false,
      reason: `Prompt too long (${trimmed.length}/${MAX_PROMPT_LENGTH} chars)`,
    };
  }

  for (const pattern of BLOCK_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { safe: false, reason: "Blocked content pattern" };
    }
  }

  return { safe: true };
}

/**
 * Validates an AI-generated response before speaking it.
 * Last-line defence — catches anything that slipped through the prompt filter.
 */
export function checkResponseSafety(response: string): SafetyResult {
  for (const pattern of BLOCK_PATTERNS) {
    if (pattern.test(response)) {
      return { safe: false, reason: "Blocked content in response" };
    }
  }
  return { safe: true };
}
