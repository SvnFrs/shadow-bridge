import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import app from "../src/index.js";

const originalFetch = globalThis.fetch;

describe("API e2e", () => {
  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("returns 400 for missing q parameter", async () => {
    const request = new Request("http://localhost/api/search");
    const response = await app.fetch(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Query parameter 'q' is required" });
  });

  test("returns aggregated results", async () => {
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/discover")) {
        return new Response("ok");
      }
      return new Response(`
        <html>
          <body>
            <a href="https://dweb.link/ipfs/QmYwAPJzv5CZsnAzt8auVZRnGzrL1NVr7Di5urN6byN1Ns">download</a>
          </body>
        </html>
      `, { headers: { "Content-Type": "text/html" } });
    }) as typeof fetch;

    const request = new Request("http://localhost/api/search?q=test&providers=annas");
    const response = await app.fetch(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.totalResults).toBe(1);
    expect(payload.results[0].downloadUrl).toBe("https://dweb.link/ipfs/QmYwAPJzv5CZsnAzt8auVZRnGzrL1NVr7Di5urN6byN1Ns");
    expect(payload.results[0].source).toBe("annas");
  });

  test("returns 400 when providers filter matches none", async () => {
    const request = new Request("http://localhost/api/search?q=test&providers=unknown");
    const response = await app.fetch(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "No matching providers configured" });
  });
});
