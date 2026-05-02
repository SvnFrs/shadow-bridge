import * as cheerio from "cheerio";
import { httpClient } from "../core/httpClient.js";
import { env } from "../core/env.js";
import { sessionDb } from "../core/sessionDb.js";
import { getErrorMessage, log } from "../core/logger.js";
import type { BookResult, ProviderSearchResult, SearchProvider, FileType } from "../types/index.js";

const normalizeTitle = (value: string): string => value.replace(/\s+/g, " ").trim();

const ANNAS_MIRRORS = [
  "https://annas-archive.li",
  "https://annas-archive.gl",
  "https://annas-archive.pk",
  "https://annas-archive.gd",
  "https://annas-archive.org",
  "https://annas-archive.se",
];

export const annasProvider: SearchProvider = {
  name: "annas",
  async search(query: string): Promise<ProviderSearchResult> {
    const discoveredUrl = sessionDb.getBaseUrl("annas");
    const configuredUrl = env.annasBaseUrl;

    // Reliability first: prioritize known working mirrors and discovered URLs
    const mirrors = [...new Set([
      ...(discoveredUrl ? [discoveredUrl] : []),
      ...(configuredUrl ? [configuredUrl] : []),
      ...ANNAS_MIRRORS,
    ])];

    for (const baseUrl of mirrors) {
      try {
        const searchUrl = `${baseUrl}/search?q=${encodeURIComponent(query)}`;
        // Reduce timeout to 6s per mirror to allow faster rotation within the 15s global limit
        const response = await httpClient(searchUrl, {}, 6000);
        const html = await response.text();

        if (html.includes("cf-browser-verification") || html.includes("Cloudflare")) {
          log("warn", "annas mirror blocked by cloudflare", { provider: "annas", baseUrl });
          continue;
        }

        const $ = cheerio.load(html);
        const results: BookResult[] = [];

        // Broad selection: look for any link containing /md5/
        $("a").each((_, el) => {
          const $el = $(el);
          const href = $el.attr("href") || "";
          if (!href.includes("/md5/")) return;
          
          const md5 = href.split("/").pop() || "";
          if (md5.length < 32) return;
          
          // Capture the title from various nested elements
          let title = $el.find("h3").first().text().trim();
          if (!title) title = $el.find(".line-clamp-2").first().text().trim();
          if (!title) title = $el.find("div").not(".italic").first().text().trim();
          
          // If still no title, use the plain text of the entire link block
          if (!title) {
            title = $el.text().split("\n")[0].trim();
          }

          const author = $el.find("div.italic").first().text().trim() || "Unknown";
          const metaText = $el.text();
          const formatMatch = /\[([a-z0-9]+)\]/i.exec(metaText);
          const sizeMatch = /(\d+(?:\.\d+)?)\s*(MB|KB|GB)/i.exec(metaText);

          let sizeMb = 0;
          if (sizeMatch) {
            const val = parseFloat(sizeMatch[1]);
            const unit = sizeMatch[2].toUpperCase();
            sizeMb = unit === "GB" ? val * 1024 : unit === "KB" ? val / 1024 : val;
          }

          if (title && title.length > 2) {
            results.push({
              id: md5,
              source: "annas",
              title: normalizeTitle(title),
              author: normalizeTitle(author),
              sizeMb: parseFloat(sizeMb.toFixed(2)),
              format: (formatMatch?.[1].toLowerCase() || "unknown") as FileType,
              downloadUrl: href.startsWith("http") ? href : `${baseUrl}${href}`,
            });
          }
        });

        if (results.length > 0) {
          log("info", "annas search completed", { provider: "annas", query, results: results.length });
          sessionDb.setBaseUrl("annas", baseUrl);
          return { results };
        }
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        log("warn", "annas mirror failed", { provider: "annas", baseUrl, error: message });
      }
    }

    return { results: [], errors: ["All Anna's Archive mirrors failed or returned 0 results"] };
  },
};
