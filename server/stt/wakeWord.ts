const DEFAULT_WAKE_WORD = "hey banter";

export interface WakeWordResult {
  triggered: boolean;
  prompt: string;
}

/**
 * Checks whether the transcript starts with (or contains) the wake word
 * and extracts the remaining text as the prompt.
 *
 * Examples (wake word = "hey banter"):
 *   "hey banter roast Dave"   → { triggered: true,  prompt: "roast Dave" }
 *   "hey banter"              → { triggered: true,  prompt: "" }
 *   "what's up"               → { triggered: false, prompt: "" }
 */
export function detectWakeWord(
  transcript: string,
  wakeWord: string = DEFAULT_WAKE_WORD,
): WakeWordResult {
  const clean = transcript.toLowerCase().trim();
  const kw = wakeWord.toLowerCase().trim();

  const idx = clean.indexOf(kw);
  if (idx === -1) return { triggered: false, prompt: "" };

  // Grab everything after the wake word, strip leading punctuation/whitespace
  const after = transcript.slice(idx + kw.length).replace(/^[\s,!?.]+/, "").trim();

  return { triggered: true, prompt: after };
}

/**
 * Normalises a user-supplied wake word: lowercase, collapse whitespace.
 */
export function normaliseWakeWord(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, " ").trim() || DEFAULT_WAKE_WORD;
}
