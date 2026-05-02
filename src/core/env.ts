export interface AppEnv {
  port: number;
  searchTimeoutMs: number;
  logLevel: string;
  zlibBaseUrl?: string;
  zlibEmail?: string;
  zlibPassword?: string;
  annasBaseUrl?: string;
  tve4uUsername?: string;
  tve4uPassword?: string;
}

const envValue = (key: string): string | undefined => {
  const value = Bun.env[key];
  return value && value.length > 0 ? value : undefined;
};

const numberValue = (key: string, fallback: number): number => {
  const value = envValue(key);
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const env: AppEnv = {
  port: numberValue("PORT", 3000),
  searchTimeoutMs: numberValue("SEARCH_TIMEOUT_MS", 15000),
  logLevel: envValue("LOG_LEVEL") ?? "info",
  zlibBaseUrl: envValue("ZLIB_BASE_URL"),
  zlibEmail: envValue("ZLIB_EMAIL"),
  zlibPassword: envValue("ZLIB_PASSWORD"),
  annasBaseUrl: envValue("ANNAS_BASE_URL"),
  tve4uUsername: envValue("TVE4U_USERNAME"),
  tve4uPassword: envValue("TVE4U_PASSWORD"),
};
