import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PUBLIC_CLIENT: z.enum(["mock"]).default("mock"),
  MOCK_MARKET_IDS: z.string().default("nfl-yes-no-1,nfl-yes-no-2"),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1500),
  MAX_TRADE_USD: z.coerce.number().positive().default(5),
  TOTAL_FEE_BPS: z.coerce.number().int().nonnegative().default(200),
  EDGE_BPS: z.coerce.number().int().nonnegative().default(25),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  PRETTY_LOGS: z.coerce.boolean().default(true),
});

export type RuntimeConfig = z.infer<typeof envSchema> & {
  mockMarketIds: string[];
  feeFraction: number; // total fee as fraction of notional
  edgeFraction: number; // required extra edge
};

export function loadConfig(): RuntimeConfig {
  const parsed = envSchema.parse(process.env);
  const mockMarketIds = parsed.MOCK_MARKET_IDS.split(",").map((s) => s.trim()).filter(Boolean);
  const feeFraction = parsed.TOTAL_FEE_BPS / 10_000;
  const edgeFraction = parsed.EDGE_BPS / 10_000;
  return { ...parsed, mockMarketIds, feeFraction, edgeFraction };
}
