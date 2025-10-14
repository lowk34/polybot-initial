import { Market, OrderBook, Outcome, PublicClient } from "../types.js";
import { loadConfig } from "../config.js";

const cfg = loadConfig();

export class MockPolymarketPublicClient implements PublicClient {
  private markets: Market[];

  constructor() {
    this.markets = cfg.mockMarketIds.map((id, idx) => ({
      id,
      question: `Mock Market ${idx + 1} (${id})`,
      outcomes: ["YES", "NO"],
    }));
  }

  async listMarkets(): Promise<Market[]> {
    return this.markets;
  }

  async getOrderBook(marketId: string): Promise<OrderBook> {
    // Generate pseudo-random, but somewhat mean-reverting best asks/bids per market
    const base = Math.abs(hashToUnit(marketId + Date.now().toString()));
    const yesAsk = clamp(0.3 + 0.4 * base + noise(), 0.05, 0.95);
    const noAsk = clamp(1 - yesAsk + 0.02 * (Math.random() - 0.5), 0.05, 0.95);

    const yesBid = clamp(yesAsk - spread(), 0.01, yesAsk - 0.01);
    const noBid = clamp(noAsk - spread(), 0.01, noAsk - 0.01);

    return {
      marketId,
      bestAsk: {
        YES: { price: yesAsk, size: 100 + Math.floor(50 * Math.random()) },
        NO: { price: noAsk, size: 100 + Math.floor(50 * Math.random()) },
      },
      bestBid: {
        YES: { price: yesBid, size: 100 + Math.floor(50 * Math.random()) },
        NO: { price: noBid, size: 100 + Math.floor(50 * Math.random()) },
      },
      ts: Date.now(),
    };
  }
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function noise(): number {
  return (Math.random() - 0.5) * 0.06; // +/- 3 cents
}

function spread(): number {
  return Math.random() * 0.04 + 0.01; // 1%..5%
}

function hashToUnit(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0) / 2 ** 32;
}
