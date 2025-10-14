import { OrderBook, StrategyDecision } from "../types.js";
import { loadConfig } from "../config.js";

const cfg = loadConfig();

export function evaluateUnderround(orderBook: OrderBook): StrategyDecision {
  const yesAsk = orderBook.bestAsk.YES?.price ?? null;
  const noAsk = orderBook.bestAsk.NO?.price ?? null;

  if (yesAsk === null || noAsk === null) {
    return { shouldTrade: false, reason: "missing best ask" };
    }

  const sumAsk = yesAsk + noAsk;
  const theoreticalUnderround = 1 - sumAsk;
  const netEdge = theoreticalUnderround - cfg.feeFraction;

  if (netEdge > cfg.edgeFraction) {
    return {
      shouldTrade: true,
      reason: `edge ${(netEdge * 100).toFixed(2)}%`,
      yesAsk,
      noAsk,
      sumAsk,
      netEdge,
    };
  }
  return {
    shouldTrade: false,
    reason: `no edge (net ${(netEdge * 100).toFixed(2)}%)`,
    yesAsk,
    noAsk,
    sumAsk,
    netEdge,
  };
}
