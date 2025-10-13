#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { logger } from "./logger.js";
import { MockPolymarketPublicClient } from "./clients/polymarketPublicClient.js";
import { PaperExecutionClient } from "./clients/paperExecution.js";
import { Engine } from "./engine/engine.js";

async function main() {
  const cfg = loadConfig();
  logger.info({ cfg }, "bot starting");

  const publicClient = new MockPolymarketPublicClient();
  const execClient = new PaperExecutionClient();
  const engine = new Engine(publicClient, execClient);

  const args = new Set(process.argv.slice(2));
  const runOnce = args.has("--once") || process.env.RUN_ONCE === "true";

  if (runOnce) {
    logger.info("running single iteration (--once)");
    await engine.runOnce();
    return;
  }

  const ac = new AbortController();
  process.on("SIGINT", () => {
    logger.warn("SIGINT received, shutting down...");
    ac.abort();
  });
  process.on("SIGTERM", () => {
    logger.warn("SIGTERM received, shutting down...");
    ac.abort();
  });

  await engine.runLoop(ac.signal);
}

main().catch((err) => {
  logger.error({ err }, "fatal error");
  process.exit(1);
});
