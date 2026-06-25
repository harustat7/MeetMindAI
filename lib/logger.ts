import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: {
    service: "meetmind-ai",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development"
  }
});
