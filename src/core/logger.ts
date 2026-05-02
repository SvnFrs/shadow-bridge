import { env } from "./env.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  provider?: string;
  query?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  error?: string;
}

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const configuredLevel = env.logLevel.toLowerCase() as LogLevel;
const minimumLevel = levelPriority[configuredLevel] ?? levelPriority.info;

const shouldLog = (level: LogLevel) => levelPriority[level] >= minimumLevel;

const stringifyContext = (context: LogContext): string => {
  const entries = Object.entries(context).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return "";
  return ` ${JSON.stringify(Object.fromEntries(entries))}`;
};

export const log = (level: LogLevel, message: string, context: LogContext = {}): void => {
  if (!shouldLog(level)) return;
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}${stringifyContext(context)}`;
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
};
