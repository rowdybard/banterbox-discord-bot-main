/**
 * Simple async semaphore — limits concurrent async operations.
 */
export class Semaphore {
  private running = 0;
  private readonly queue: Array<() => void> = [];

  constructor(readonly limit: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.running >= this.limit) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      this.queue.shift()?.();
    }
  }
}

/**
 * Global cap on concurrent GPT + TTS round-trips across all guilds.
 * Prevents OpenAI / ElevenLabs rate-limit errors under peak load.
 */
export const apiSemaphore = new Semaphore(10);
