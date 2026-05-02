// @ts-ignore bun:sqlite is provided by the Bun runtime.
import { Database } from "bun:sqlite";

const db = new Database("sessions.sqlite");

// Initialize schema
db.run(`
  CREATE TABLE IF NOT EXISTS sessions (
    provider TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (provider, key)
  );
`);

export class SessionDb {
  getToken(provider: string, key: string): string | undefined {
    const row = db.query("SELECT value FROM sessions WHERE provider = ? AND key = ?").get(provider, key) as { value: string } | null;
    return row?.value;
  }

  setToken(provider: string, key: string, value: string): void {
    db.run(
      "INSERT INTO sessions (provider, key, value, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(provider, key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
      provider,
      key,
      value
    );
  }

  getBaseUrl(provider: string): string | undefined {
    return this.getToken(provider, "base_url");
  }

  setBaseUrl(provider: string, url: string): void {
    this.setToken(provider, "base_url", url);
  }

  clearProvider(provider: string): void {
    db.run("DELETE FROM sessions WHERE provider = ?", provider);
  }
}

export const sessionDb = new SessionDb();
