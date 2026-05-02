import { describe, expect, mock, test } from "bun:test";
import { downloadFile } from "../src/core/downloadClient.js";

describe("integration e2e flow", () => {
  test("searches, selects a result, and downloads the file", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/search?q=dragon%20ball") || url.includes("/api/search?q=dragon+ball")) {
        return new Response(JSON.stringify({
          query: "dragon ball",
          totalResults: 1,
          results: [
            {
              id: "13898444",
              source: "zlib",
              title: "Dragon Ball",
              author: "Akira Toriyama",
              sizeMb: 210.33,
              format: "azw3",
              downloadUrl: "https://files.example.test/dragon-ball.azw3",
            },
          ],
          errors: [],
        }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url === "https://files.example.test/dragon-ball.azw3") {
        return new Response(new Uint8Array([1, 2, 3, 4, 5]), {
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Length": "5",
          },
        });
      }

      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      const searchResponse = await fetch("http://localhost/api/search?q=dragon+ball&providers=zlib");
      expect(searchResponse.status).toBe(200);

      const searchPayload = await searchResponse.json() as {
        totalResults: number;
        results: Array<{ downloadUrl: string }>;
      };

      expect(searchPayload.totalResults).toBe(1);
      const selectedDownloadUrl = searchPayload.results[0]?.downloadUrl;
      expect(selectedDownloadUrl).toBe("https://files.example.test/dragon-ball.azw3");

      const downloadResponse = await downloadFile(selectedDownloadUrl);
      expect(downloadResponse.status).toBe(200);
      expect(downloadResponse.fileName).toBe("dragon-ball.azw3");
      expect(downloadResponse.contentType).toBe("application/octet-stream");
      expect(downloadResponse.sizeBytes).toBe(5);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
