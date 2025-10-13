## Polymarket Liquidity/Underround Bot (Paper Trading)

This project is a starter bot that scans binary (YES/NO) markets for underround/arbitrage opportunities and simulates placing paired buys on both outcomes when the summed best-ask is below $1 after fees and an edge buffer. It ships with a mock public data client so you can run it immediately without API keys.

Important: This is a paper-trading starter for educational purposes. Markets are risky; past performance does not guarantee future results. You are responsible for all usage.

### What it does
- Loads a configurable list of markets
- Polls order books and computes underround: `1 - (askYES + askNO) - fees`
- If edge > threshold, buys both sides in equal USD size (paper execution)
- Tracks basic paper PnL inputs and prints logs

### Quick start (mock mode)
1. Prerequisites: Node.js 18.17+ (Node 20 recommended)
2. Install deps:
   ```bash
   npm install
   ```
3. Copy env and adjust if desired:
   ```bash
   cp .env.example .env
   ```
4. Run in dev (mock data):
   ```bash
   npm run dev
   ```

You should see logs every ~1.5s showing mock market underround checks and (occasionally) simulated paired fills.

### Configuration (.env)
- `PUBLIC_CLIENT` = `mock` (default). Real endpoints can be added later.
- `MOCK_MARKET_IDS` = comma-separated list of market IDs used in mock mode.
- `POLL_INTERVAL_MS` = polling interval.
- `MAX_TRADE_USD` = max USD per leg when an opportunity is found.
- `TOTAL_FEE_BPS` = total fee across both legs (e.g., 200 bps = 2%).
- `EDGE_BPS` = minimum extra edge you require over fees to trade.
- `LOG_LEVEL` = `debug` | `info` | `warn` | `error`.
- `PRETTY_LOGS` = `true` enables colorized pretty logs.

### Real trading (not enabled yet)
This starter focuses on paper execution. To trade live you will need to:
- Use Polymarket's official CLOB client and wallet integration
- Implement a real `ExecutionClient` that signs and submits orders
- Ensure robust risk, cancel/replace logic, and error handling

The architecture here cleanly separates components so you can later plug in a real public data client and execution client without rewriting the strategy/engine.

### Scripts
- `npm run dev` — run the bot with TS directly (development)
- `npm run build` — compile TypeScript to `dist`
- `npm start` — run compiled build (`dist/cli.js`)

### Project structure
- `src/cli.ts` — CLI entrypoint
- `src/config.ts` — env parsing and runtime config
- `src/logger.ts` — logger setup (pino)
- `src/types.ts` — shared types
- `src/clients/polymarketPublicClient.ts` — public data client interface + mock impl
- `src/clients/paperExecution.ts` — paper execution client
- `src/strategies/underroundArb.ts` — underround arbitrage strategy
- `src/engine/engine.ts` — engine and main loop

### Safety notes
- Fees, slippage, partial fills, and settlement mechanics matter a lot. The mock assumes instantaneous fills at best ask with simple fee modeling. Real markets will differ.
- Start with tiny size, extensive logging, and test in paper-only before considering real orders.
