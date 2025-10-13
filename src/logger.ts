import pino from "pino";
import { loadConfig } from "./config.js";

const cfg = loadConfig();

export const logger = pino({
  level: cfg.LOG_LEVEL,
  transport: cfg.PRETTY_LOGS
    ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } }
    : undefined,
});
