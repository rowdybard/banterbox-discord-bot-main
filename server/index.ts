import express, { type Request, Response, NextFunction, type Express } from "express";
import { createServer } from "http";
import { existsSync } from "fs";
import path from "path";
import { logger } from "./logger";
import { startBot } from "./discord/bot";
import { getBotInviteUrl } from "./discord/commands";
import { cacheStats } from "./tts/index";
import { cleanExpiredContext } from "./storage/repositories";

const app = express();

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    ttsCache: cacheStats(),
  });
});

app.get("/api/invite", (_req, res) => {
  try {
    res.json({ url: getBotInviteUrl() });
  } catch {
    res.status(503).json({ error: "Bot invite URL unavailable — DISCORD_APPLICATION_ID not set" });
  }
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status: number = err.status ?? err.statusCode ?? 500;
  const message: string = err.message ?? "Internal Server Error";
  logger.error("Unhandled Express error", {
    errorMessage: message,
    errorClass: err?.constructor?.name,
  });
  res.status(status).json({ message });
});

// ---------------------------------------------------------------------------
// Static file serving (production only — dev uses Vite middleware instead)
// ---------------------------------------------------------------------------

function serveStaticFiles(application: Express): void {
  const distPath = path.resolve(process.cwd(), "dist", "client");
  if (!existsSync(distPath)) {
    throw new Error(
      `Build directory not found: ${distPath} — run \`npm run build\` first`,
    );
  }
  application.use(express.static(distPath));
  application.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

(async () => {
  const server = createServer(app);
  const port = parseInt(process.env.PORT ?? "5000", 10);

  // Start Discord bot (non-fatal if credentials missing)
  try {
    await startBot();
  } catch (err) {
    logger.warn("Discord bot failed to start — server running without bot", {
      errorMessage: err instanceof Error ? err.message : String(err),
    });
  }

  // Vite dev server or static serving
  if (app.get("env") === "development") {
    // Non-literal specifier prevents esbuild from bundling server/vite.ts
    // (and its top-level `import from "vite"`) into the production bundle.
    const devEntry = "./vite.js";
    const { setupVite } = await import(devEntry);
    await setupVite(app, server);
  } else {
    serveStaticFiles(app);
  }

  server.listen({ port, host: "0.0.0.0" }, () => {
    logger.info(`Server listening on port ${port}`);
  });

  // Periodic context cleanup (every 30 min)
  setInterval(() => {
    cleanExpiredContext().catch((err) =>
      logger.warn("Context cleanup failed", {
        errorMessage: err instanceof Error ? err.message : String(err),
      }),
    );
  }, 30 * 60 * 1000).unref();
})();
