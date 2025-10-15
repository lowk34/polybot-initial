import { logger } from "../logger.js";
import { loadConfig } from "../config.js";

export type SignMode = "ENV_KEY" | "EXTERNAL_SIGNER";

export class PolymarketCLOBStub {
  private cfg = loadConfig();

  async placeOrder(): Promise<void> {
    if (this.cfg.PAPER_MODE) {
      logger.warn("PAPER_MODE=true: real order placement disabled");
      return;
    }

    if (this.cfg.SIGN_MODE === "ENV_KEY") {
      if (!this.cfg.ENV_PRIVATE_KEY) {
        throw new Error("ENV_PRIVATE_KEY missing");
      }
      if (!this.cfg.ALLOW_ENV_KEY_IN_PROD) {
        throw new Error("ENV_KEY not allowed in production without explicit ALLOW_ENV_KEY_IN_PROD=true");
      }
      logger.warn("Using ENV_KEY signing (not recommended)");
      // sign with ENV_PRIVATE_KEY...
    } else {
      // EXTERNAL_SIGNER path
      logger.info("Using EXTERNAL_SIGNER (preferred)");
      // call out to external signer service (not implemented here)
    }

    logger.info("Would place real order here via CLOB client (stub)");
  }
}
