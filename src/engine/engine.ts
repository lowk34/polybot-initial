import { ExecutionClient, ExecutionFill, PublicClient } from "../types.js";
import { evaluateUnderround } from "../strategies/underroundArb.js";
import { logger } from "../logger.js";
import { loadConfig } from "../config.js";

const cfg = loadConfig();

export class Engine {
  constructor(private publicClient: PublicClient, private execClient: ExecutionClient) {}

  private dailySpentUsd = 0;

  async runOnce(): Promise<void> {
    const markets = await this.publicClient.listMarkets();
    const limited = markets.slice(0, cfg.MAX_MARKETS_MONITORED);
    for (const m of limited) {
      if (this.dailySpentUsd >= cfg.DAILY_CAP_USD) {
        logger.warn({ dailySpentUsd: this.dailySpentUsd, cap: cfg.DAILY_CAP_USD }, "daily cap reached, skipping");
        break;
      }
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

          // Simulate IOC/FOK and partial handling with timeout pairing logic
          const opts = {
            timeInForce: cfg.TIME_IN_FORCE as "IOC" | "FOK",
            cancelIfPartial: cfg.CANCEL_IF_PARTIAL,
            slippagePct: cfg.MAX_SLIPPAGE_PCT,
            fillTimeoutMs: cfg.FILL_TIMEOUT_MS,
            simulateLiquidity: undefined as number | undefined,
          };

          const yesPromise = this.execClient.placeBuy(m.id, "YES", yesPrice, yesUsd, { ...opts, simulateLiquidity: yesAvail });
          const noPromise = this.execClient.placeBuy(m.id, "NO", noPrice, noUsd, { ...opts, simulateLiquidity: noAvail });

          const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), cfg.FILL_TIMEOUT_MS));
          const result = await Promise.race<unknown>([
            Promise.all([yesPromise, noPromise]),
            timeout,
          ]);

          if (result === null) {
            logger.warn({ marketId: m.id }, "paired fill timeout reached, treating as cancel");
            continue;
          }

          const [yesRes, noRes] = result as [ExecutionFill | { partial: ExecutionFill; cancelled: boolean } | null, ExecutionFill | { partial: ExecutionFill; cancelled: boolean } | null];

          const yesFilledUsd = getFilledUsd(yesRes);
          const noFilledUsd = getFilledUsd(noRes);

          if (yesFilledUsd > 0 && noFilledUsd > 0) {
            this.dailySpentUsd += yesFilledUsd + noFilledUsd;
            logger.info({ marketId: m.id, yesFilledUsd, noFilledUsd, dailySpentUsd: this.dailySpentUsd }, "paired filled");
          } else if (yesFilledUsd > 0 || noFilledUsd > 0) {
            // If only one leg filled, cancel the other per policy
            logger.warn({ marketId: m.id, yesFilledUsd, noFilledUsd }, "unpaired fill occurred; other leg cancelled");
          } else {
            logger.info({ marketId: m.id }, "no fills executed");
          }
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

function getFilledUsd(res: ExecutionFill | { partial: ExecutionFill; cancelled: boolean } | null): number {
  if (!res) return 0;
  if ("usd" in res) return res.usd;
  return res.partial?.usd ?? 0;
}
