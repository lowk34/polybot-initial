import { ExecutionClient, ExecutionFill, Outcome } from "../types.js";
import { logger } from "../logger.js";
import { loadConfig } from "../config.js";

const cfg = loadConfig();

export class PaperExecutionClient implements ExecutionClient {
  async placeBuy(
    marketId: string,
    outcome: Outcome,
    maxPrice: number,
    usdAmount: number,
    options?: {
      timeInForce?: "IOC" | "FOK";
      cancelIfPartial?: boolean;
      slippagePct?: number;
      fillTimeoutMs?: number;
      simulateLiquidity?: number;
    }
  ): Promise<ExecutionFill | { partial: ExecutionFill; cancelled: boolean } | null> {
    if (usdAmount <= 0) return null;

    const timeInForce = options?.timeInForce ?? cfg.TIME_IN_FORCE;
    const cancelIfPartial = options?.cancelIfPartial ?? cfg.CANCEL_IF_PARTIAL;
    const slippagePct = Math.max(0, options?.slippagePct ?? cfg.MAX_SLIPPAGE_PCT);
    const simulateLiquidity = options?.simulateLiquidity ?? Number.POSITIVE_INFINITY;

    const worstAcceptablePrice = maxPrice * (1 + slippagePct / 100);
    // In this simple simulator, we assume execution at maxPrice, limited by available liquidity
    const desiredContracts = usdAmount / maxPrice;
    const filledContracts = Math.min(desiredContracts, simulateLiquidity);

    if (filledContracts <= 0) {
      return null;
    }

    const fill: ExecutionFill = {
      marketId,
      outcome,
      price: Math.min(maxPrice, worstAcceptablePrice),
      contracts: filledContracts,
      usd: filledContracts * maxPrice,
      ts: Date.now(),
    };

    const fullyFilled = filledContracts >= desiredContracts;
    if (timeInForce === "FOK" && !fullyFilled) {
      logger.info({ marketId, outcome }, "paper FOK not fully filled, cancel");
      return { partial: fill, cancelled: true };
    }

    if (!fullyFilled && cancelIfPartial) {
      logger.info({ marketId, outcome }, "paper IOC partial, cancel rest");
      return { partial: fill, cancelled: true };
    }

    logger.info({ marketId, outcome, price: fill.price, contracts: fill.contracts, usd: fill.usd }, "paper fill");
    return fill;
  }
}
