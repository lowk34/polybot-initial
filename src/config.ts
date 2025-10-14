import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  // Mode & clients
  PAPER_MODE: z.coerce.boolean().default(true),
  PUBLIC_CLIENT: z.enum(["mock"]).default("mock"),
  MOCK_MARKET_IDS: z.string().default("nfl-yes-no-1,nfl-yes-no-2"),

  // Engine cadence & limits
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
  MAX_TRADE_USD: z.coerce.number().positive().default(1),
  DAILY_CAP_USD: z.coerce.number().positive().default(10),
  MAX_MARKETS_MONITORED: z.coerce.number().int().positive().default(50),
  REQUESTS_PER_MINUTE: z.coerce.number().int().positive().default(120),

  // Risk/edge/fees
  TOTAL_FEE_BPS: z.coerce.number().int().nonnegative().default(200),
  EDGE_BPS: z.coerce.number().int().nonnegative().default(100),
  MAX_SLIPPAGE_PCT: z.coerce.number().nonnegative().default(1),

  // Execution behavior (paper)
  TIME_IN_FORCE: z.enum(["IOC", "FOK"]).default("IOC"),
  FILL_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),
  CANCEL_IF_PARTIAL: z.coerce.boolean().default(true),

  // Live trading integration (stubs)
  SIGN_MODE: z.enum(["ENV_KEY", "EXTERNAL_SIGNER"]).default("EXTERNAL_SIGNER"),
  ENV_PRIVATE_KEY: z.string().optional(),
  ALLOW_ENV_KEY_IN_PROD: z.coerce.boolean().default(false),

  // Logging
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  PRETTY_LOGS: z.coerce.boolean().default(true),

  // Notifications (optional)
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
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
