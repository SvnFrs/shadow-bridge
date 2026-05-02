import { httpClient } from "./httpClient.js";
import { getErrorMessage, log } from "./logger.js";
import { sessionDb } from "./sessionDb.js";

const DISCOVERY_SOURCES = [
  "https://open-slum.pages.dev/",
  "https://annas-archive.li/",
  "https://z-library.im/"
];

export const discoverLinks = async () => {
  log("info", "starting library link discovery");

  for (const source of DISCOVERY_SOURCES) {
    try {
      const response = await httpClient(source);
      const html = await response.text();

      // Discover Anna's Archive Mirrors
      if (source.includes("annas-archive") || source.includes("slum")) {
        const annasRegex = /https?:\/\/(annas-archive\.[a-z.]{2,6})/g;
        let match: RegExpExecArray | null;
        while ((match = annasRegex.exec(html)) !== null) {
          const domain = match[0].replace(/\/$/, "");
          if (!domain.includes("pages.dev") && !domain.includes("github.io")) {
            log("info", "discovered annas mirror", { provider: "annas", path: domain });
            // Check if it's responsive before setting
            try {
              const test = await httpClient(`${domain}/search?q=test`, { method: "HEAD" }, 5000);
              if (test.ok) {
                sessionDb.setBaseUrl("annas", domain);
                log("info", "updated annas base url", { provider: "annas", path: domain });
                break; // Found a working one
              }
            } catch {
              continue;
            }
          }
        }
      }

      // Discover Z-Library Mirrors
      if (source.includes("z-library") || source.includes("slum")) {
        const zlibRegex = /https?:\/\/(z-library\.[a-z.]{2,6}|z-lib\.[a-z.]{2,6}|1lib\.[a-z.]{2,6})/g;
        let match: RegExpExecArray | null;
        while ((match = zlibRegex.exec(html)) !== null) {
          const domain = match[0].replace(/\/$/, "");
          if (!domain.includes("pages.dev")) {
            log("info", "discovered zlib mirror", { provider: "zlib", path: domain });
            try {
              const test = await httpClient(`${domain}/eapi/user/login`, { method: "HEAD" }, 5000);
              if (test.status !== 404) {
                sessionDb.setBaseUrl("zlib", domain);
                log("info", "updated zlib base url", { provider: "zlib", path: domain });
                break;
              }
            } catch {
              continue;
            }
          }
        }
      }
    } catch (error: unknown) {
      log("warn", "discovery source failed", { path: source, error: getErrorMessage(error) });
    }
  }
};
