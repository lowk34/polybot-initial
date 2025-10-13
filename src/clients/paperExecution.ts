import { ExecutionClient, ExecutionFill, Outcome } from "../types.js";
import { logger } from "../logger.js";

export class PaperExecutionClient implements ExecutionClient {
  async placeBuy(marketId: string, outcome: Outcome, maxPrice: number, usdAmount: number): Promise<ExecutionFill | null> {
    if (usdAmount <= 0) return null;
    const contracts = usdAmount / maxPrice;
    const fill: ExecutionFill = {
      marketId,
      outcome,
      price: maxPrice,
      contracts,
      usd: usdAmount,
      ts: Date.now(),
    };
    logger.info({ marketId, outcome, maxPrice, usdAmount, contracts }, "paper fill");
    return fill;
  }
}
