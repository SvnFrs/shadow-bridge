import { httpClient } from "../core/httpClient.js";
import { env } from "../core/env.js";
import { sessionDb } from "../core/sessionDb.js";
import { getErrorMessage, log } from "../core/logger.js";
import type { BookResult, ProviderSearchResult, SearchProvider, FileType } from "../types/index.js";

const loginZlib = async (providedBaseUrl?: string) => {
  const baseUrl = providedBaseUrl || sessionDb.getBaseUrl("zlib") || env.zlibBaseUrl || "https://z-library.im";
  const email = env.zlibEmail;
  const password = env.zlibPassword;

  if (!email || !password) {
    throw new Error("ZLIB_EMAIL or ZLIB_PASSWORD not set");
  }

  const response = await httpClient(`${baseUrl}/eapi/user/login`, {
    method: "POST",
    body: new URLSearchParams({ email, password }),
    headers: {
      "X-App-Version": "2.5.1",
    },
  });

  const data = await response.json() as {
    success?: boolean;
    message?: string;
    user?: { id: string; remix_userkey: string };
  };

  if (!data.success || !data.user) {
    throw new Error(`Login failed: ${data.message ?? "Unknown error"}`);
  }

  sessionDb.setToken("zlib", "remix_userid", data.user.id);
  sessionDb.setToken("zlib", "remix_userkey", data.user.remix_userkey);
  sessionDb.setBaseUrl("zlib", baseUrl);
};

const ZLIB_MIRRORS = [
  "https://z-library.im",
  "https://z-lib.sk",
  "https://1lib.sk",
  "https://z-lib.gl",
  "https://z-lib.gd",
  "https://z-lib.io",
];

export const zlibProvider: SearchProvider = {
  name: "zlib",
  async search(query: string): Promise<ProviderSearchResult> {
    const discoveredUrl = sessionDb.getBaseUrl("zlib");
    const configuredUrl = env.zlibBaseUrl;

    const mirrors = [...new Set([
      ...(discoveredUrl ? [discoveredUrl] : []),
      ...(configuredUrl ? [configuredUrl] : []),
      ...ZLIB_MIRRORS,
    ])];

    for (const baseUrl of mirrors) {
      try {
        let userId = sessionDb.getToken("zlib", "remix_userid");
        let userKey = sessionDb.getToken("zlib", "remix_userkey");

        if (!userId || !userKey) {
          await loginZlib(baseUrl);
          userId = sessionDb.getToken("zlib", "remix_userid");
          userKey = sessionDb.getToken("zlib", "remix_userkey");
        }

        const response = await httpClient(`${baseUrl}/eapi/book/search`, {
          method: "POST",
          body: new URLSearchParams({
            message: query,
            limit: "50",
          }),
          headers: {
            "X-App-Version": "2.5.1",
            "Cookie": `remix_userid=${userId}; remix_userkey=${userKey}`,
          },
        });

        if (response.status === 401) {
          await loginZlib(baseUrl);
          return this.search(query);
        }

        const data = await response.json() as any;
        if (!data.success) {
          return { results: [], errors: [data.message || "Unknown error"] };
        }

        const results: BookResult[] = data.books.map((book: any) => ({
          id: String(book.id),
          source: "zlib",
          title: book.title,
          author: book.author,
          sizeMb: parseFloat((book.filesize / (1024 * 1024)).toFixed(2)),
          format: (book.extension || "unknown") as FileType,
          downloadUrl: `${baseUrl}/eapi/book/${book.id}/${book.hash}/file`,
        }));

        if (results.length === 0 && Array.isArray(data.result)) {
          const fallbackResults: BookResult[] = data.result.map((book: any) => ({
            id: String(book.id ?? book.md5 ?? book.hash ?? crypto.randomUUID()),
            source: "zlib",
            title: book.title ?? "Untitled",
            author: book.author ?? "Unknown",
            sizeMb: Number(book.filesize ? (Number(book.filesize) / (1024 * 1024)).toFixed(2) : 0),
            format: (book.extension || "unknown") as FileType,
            downloadUrl: `${baseUrl}/eapi/book/${book.id}/${book.hash}/file`,
          }));

          if (fallbackResults.length > 0) {
            log("warn", "zlib used fallback result shape", { provider: "zlib", query });
            return { results: fallbackResults };
          }
        }

        log("info", "zlib search completed", { provider: "zlib", query });
        return { results };
      } catch (error: unknown) {
        log("warn", "zlib mirror failed", { provider: "zlib", query, error: getErrorMessage(error) });
        continue;
      }
    }
    return { results: [], errors: ["All mirrors failed"] };
  },
};
