import * as cheerio from "cheerio";
import { httpClient } from "../core/httpClient.js";
import { sessionDb } from "../core/sessionDb.js";
import { getErrorMessage, log } from "../core/logger.js";
import type { BookResult, ProviderSearchResult, SearchProvider, FileType } from "../types/index.js";

const LIBGEN_MIRRORS = [
  "https://libgen.li",
  "https://libgen.vg",
  "https://libgen.la",
  "https://libgen.bz",
  "https://libgen.gl",
];

export const libgenProvider: SearchProvider = {
  name: "libgen",
  async search(query: string): Promise<ProviderSearchResult> {
    const discoveredUrl = sessionDb.getBaseUrl("libgen");
    const mirrors = [...new Set([
      ...(discoveredUrl ? [discoveredUrl] : []),
      ...LIBGEN_MIRRORS,
    ])];

    for (const baseUrl of mirrors) {
      try {
        const searchUrl = `${baseUrl}/index.php?req=${encodeURIComponent(query)}`;
        // Reduce timeout to 6s for faster rotation
        const response = await httpClient(searchUrl, {}, 6000);
        const html = await response.text();

        if (html.includes("cf-browser-verification") || html.includes("Cloudflare") || response.status === 503) {
          log("warn", "libgen mirror unavailable or blocked", { provider: "libgen", baseUrl, status: response.status });
          continue;
        }

        const $ = cheerio.load(html);
        const results: BookResult[] = [];

        // Libgen.li uses a table with class 'c'
        $("table.c tr").each((i, el) => {
          if (i === 0) return; // Skip header row
          
          const cols = $(el).find("td");
          if (cols.length < 9) return;

          const author = $(cols[1]).text().trim();
          const titleEl = $(cols[2]).find("a").last();
          const title = titleEl.text().trim();
          const href = titleEl.attr("href") || "";
          const id = href.split("=").pop() || "";
          
          const sizeText = $(cols[7]).text().trim();
          const extension = $(cols[8]).text().trim().toLowerCase();
          
          // Mirror link is usually in the 10th column (index 9)
          const downloadUrl = $(cols[9]).find("a").first().attr("href") || "";

          // Parse size
          const sizeMatch = /(\d+(?:\.\d+)?)\s*(MB|KB|GB)/i.exec(sizeText);
          let sizeMb = 0;
          if (sizeMatch) {
            const val = parseFloat(sizeMatch[1]);
            const unit = sizeMatch[2].toUpperCase();
            sizeMb = unit === "GB" ? val * 1024 : unit === "KB" ? val / 1024 : val;
          }

          if (title) {
            results.push({
              id,
              source: "libgen",
              title,
              author,
              sizeMb: parseFloat(sizeMb.toFixed(2)),
              format: (extension || "unknown") as FileType,
              downloadUrl: downloadUrl.startsWith("http") ? downloadUrl : `${baseUrl}/${downloadUrl}`,
            });
          }
        });

        if (results.length > 0) {
          log("info", "libgen search completed", { provider: "libgen", query, results: results.length });
          sessionDb.setBaseUrl("libgen", baseUrl);
          return { results };
        }
      } catch (error: unknown) {
        log("warn", "libgen mirror failed", { provider: "libgen", baseUrl, error: getErrorMessage(error) });
      }
    }

    return { results: [], errors: ["All Libgen mirrors failed"] };
  },
};
