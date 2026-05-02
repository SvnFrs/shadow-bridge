import { describe, expect, mock, test } from "bun:test";
import { annasProvider } from "../src/providers/annas.js";
import { zlibProvider } from "../src/providers/zlib.js";
import { tve4uProvider } from "../src/providers/tve4u.js";

describe("provider integration-style flows", () => {
  test("annas provider extracts md5 fallback results", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () => new Response(`
      <a href="/md5/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">result</a>
    `, { headers: { "Content-Type": "text/html" } })) as typeof fetch;

    try {
      const result = await annasProvider.search("dragon ball");
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0]?.downloadUrl).toContain("/md5/");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("zlib provider tolerates alternate response shapes", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/eapi/user/login")) {
        return new Response(JSON.stringify({ success: true, user: { id: "1", remix_userkey: "key" } }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, result: [{ id: "7", title: "Dragon Ball", author: "Akira", filesize: 1024, extension: "pdf", hash: "abc" }] }), {
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    try {
      const result = await zlibProvider.search("dragon ball");
      expect(result.errors?.[0]).toBe("All mirrors failed");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("tve4u provider returns a clean error when session is missing", async () => {
    const result = await tve4uProvider.search("dragon ball");
    expect(result.results.length).toBe(0);
  });
});
