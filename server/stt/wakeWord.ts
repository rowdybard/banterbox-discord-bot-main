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
  // Strip punctuation so "Hey, Banter!" matches "hey banter"
  const clean = transcript.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  const kw = wakeWord.toLowerCase().trim();

  const idx = clean.indexOf(kw);
  // Strict: wake word must start within the first 20 characters of the transcript.
  // Prevents mid-sentence accidental triggers e.g. "I hope hey banter doesn't fire".
  if (idx === -1 || idx > 20) return { triggered: false, prompt: "" };

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
