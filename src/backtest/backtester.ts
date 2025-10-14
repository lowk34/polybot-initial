import fs from "fs";
import readline from "readline";
import { OrderBook } from "../types.js";
import { evaluateUnderround } from "../strategies/underroundArb.js";
import { loadConfig } from "../config.js";
import { logger } from "../logger.js";

export interface BacktestResult {
  trades: number;
  totalContracts: number;
  grossPnLUsd: number; // using idealized underround payoff
}

export async function backtestSnapshots(jsonlPath: string): Promise<BacktestResult> {
  const cfg = loadConfig();
  const fileStream = fs.createReadStream(jsonlPath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let trades = 0;
  let totalContracts = 0;
  let grossPnLUsd = 0;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const ob = JSON.parse(trimmed) as OrderBook;
      const decision = evaluateUnderround(ob);
      if (decision.shouldTrade && decision.yesAsk && decision.noAsk) {
        const perLegUsd = cfg.MAX_TRADE_USD;
        const contracts = Math.min(perLegUsd / decision.yesAsk, perLegUsd / decision.noAsk);
        const sumAsk = decision.yesAsk + decision.noAsk;
        const edge = 1 - sumAsk - cfg.feeFraction;
        if (contracts > 0 && edge > cfg.edgeFraction) {
          trades += 1;
          totalContracts += contracts;
          grossPnLUsd += contracts * edge;
        }
      }
    } catch (err) {
      logger.warn({ err }, "bad snapshot line, skipping");
    }
  }

  return { trades, totalContracts, grossPnLUsd };
}
