export type Outcome = "YES" | "NO";

export interface Market {
  id: string;
  question: string;
  outcomes: Outcome[]; // ["YES","NO"] expected for this starter
}

export interface OrderBookLevel {
  price: number; // 0..1
  size: number; // contracts
}

export interface OrderBook {
  marketId: string;
  bestAsk: Record<Outcome, OrderBookLevel | null>;
  bestBid: Record<Outcome, OrderBookLevel | null>;
  ts: number;
}

export interface PublicClient {
  listMarkets(): Promise<Market[]>;
  getOrderBook(marketId: string): Promise<OrderBook>;
}

export interface ExecutionFill {
  marketId: string;
  outcome: Outcome;
  price: number; // fill price 0..1
  contracts: number;
  usd: number; // price * contracts
  ts: number;
}

export interface ExecutionClient {
  placeBuy(marketId: string, outcome: Outcome, maxPrice: number, usdAmount: number): Promise<ExecutionFill | null>;
}

export interface StrategyDecision {
  shouldTrade: boolean;
  reason: string;
  legUsd?: number; // per leg
}
