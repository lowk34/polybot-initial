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

      if (decision.shouldTrade && ob.bestAsk.YES && ob.bestAsk.NO && decision.yesAsk && decision.noAsk) {
        // Equal-contract sizing: choose contracts limited by per-leg USD and available best ask liquidity
        const perLegUsdCap = Math.max(1, Math.min(cfg.MAX_TRADE_USD, 10));
        const yesPrice = decision.yesAsk;
        const noPrice = decision.noAsk;

        const yesContractsCap = perLegUsdCap / yesPrice;
        const noContractsCap = perLegUsdCap / noPrice;
        const yesAvail = ob.bestAsk.YES.size;
        const noAvail = ob.bestAsk.NO.size;
        const contracts = Math.max(0, Math.min(yesContractsCap, noContractsCap, yesAvail, noAvail));

        if (contracts > 0) {
          const yesUsd = contracts * yesPrice;
          const noUsd = contracts * noPrice;
          logger.info(
            { marketId: m.id, contracts, yesUsd, noUsd, yesPrice, noPrice, reason: decision.reason },
            "placing paired buys (paper)"
          );
          await Promise.all([
            this.execClient.placeBuy(m.id, "YES", yesPrice, yesUsd),
            this.execClient.placeBuy(m.id, "NO", noPrice, noUsd),
          ]);
        } else {
          logger.info({ marketId: m.id }, "sizing resulted in zero contracts, skip");
        }
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
