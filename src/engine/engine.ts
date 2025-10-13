import { ExecutionClient, PublicClient } from "../types.js";
import { evaluateUnderround } from "../strategies/underroundArb.js";
import { logger } from "../logger.js";
import { loadConfig } from "../config.js";

const cfg = loadConfig();

export class Engine {
  constructor(private publicClient: PublicClient, private execClient: ExecutionClient) {}

  async runOnce(): Promise<void> {
    const markets = await this.publicClient.listMarkets();
    for (const m of markets) {
      const ob = await this.publicClient.getOrderBook(m.id);
      const decision = evaluateUnderround(ob);
      logger.debug({ marketId: m.id, decision }, "evaluated");

      if (decision.shouldTrade && decision.legUsd && ob.bestAsk.YES && ob.bestAsk.NO) {
        logger.info({ marketId: m.id, decision }, "placing paired buys (paper)");
        await Promise.all([
          this.execClient.placeBuy(m.id, "YES", ob.bestAsk.YES.price, decision.legUsd),
          this.execClient.placeBuy(m.id, "NO", ob.bestAsk.NO.price, decision.legUsd),
        ]);
      } else {
        logger.info({ marketId: m.id, reason: decision.reason }, "skip");
      }
    }
  }

  async runLoop(signal?: AbortSignal): Promise<void> {
    logger.info({ pollMs: cfg.POLL_INTERVAL_MS }, "engine loop start");
    while (!signal?.aborted) {
      try {
        await this.runOnce();
      } catch (err) {
        logger.error({ err }, "engine iteration error");
      }
      await sleep(cfg.POLL_INTERVAL_MS);
    }
  }
}

function sleep(ms: number): Promise<void> { return new Promise((res) => setTimeout(res, ms)); }
