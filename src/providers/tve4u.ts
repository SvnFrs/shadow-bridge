import * as cheerio from "cheerio";
import { env } from "../core/env.js";
import { httpClient } from "../core/httpClient.js";
import { sessionDb } from "../core/sessionDb.js";
import { getErrorMessage, log } from "../core/logger.js";
import type { BookResult, ProviderSearchResult, SearchProvider } from "../types/index.js";

const loginTve4u = async () => {
  const username = env.tve4uUsername;
  const password = env.tve4uPassword;

  if (!username || !password) {
    throw new Error("TVE4U_USERNAME or TVE4U_PASSWORD not set");
  }

  const loginPage = await httpClient("https://tve-4u.org/login/");
  const loginHtml = await loginPage.text();

  if (loginHtml.includes("cf-browser-verification") || loginHtml.includes("Cloudflare")) {
    throw new Error("TVE-4U is protected by Cloudflare. Manual session cookies may be required.");
  }

  const tokenMatch = /name=["']_xfToken["']\s+value=["']([^"']+)["']/.exec(loginHtml);
  const xfToken = tokenMatch?.[1] ?? "";

  const cookies1 = loginPage.headers.getSetCookie?.() || [loginPage.headers.get("set-cookie") || ""];
  const xfSession = cookies1.map((c) => /xf_session=([^;]+)/.exec(c)?.[1]).find(Boolean) || "";

  const response = await httpClient("https://tve-4u.org/login/login", {
    method: "POST",
    redirect: "manual",
    body: new URLSearchParams({
      login: username,
      matkhaune: password,
      remember: "1",
      register: "0",
      cookie_check: "1",
      _xfToken: xfToken,
      _xfResponseType: "json",
    }),
    headers: {
      Cookie: `xf_session=${xfSession}`,
    },
  });

  const setCookies = response.headers.getSetCookie?.() || [response.headers.get("set-cookie") || ""];
  const newXfUser = setCookies.map((c) => /xf_user=([^;]+)/.exec(c)?.[1]).find(Boolean);
  const newXfSession = setCookies.map((c) => /xf_session=([^;]+)/.exec(c)?.[1]).find(Boolean);

  if (!newXfUser || !newXfSession) {
    throw new Error("Login failed: Could not capture cookies");
  }

  sessionDb.setToken("tve4u", "xf_user", newXfUser);
  sessionDb.setToken("tve4u", "xf_session", newXfSession);
  sessionDb.setBaseUrl("tve4u", "https://tve-4u.org");
};

export const tve4uProvider: SearchProvider = {
  name: "tve4u",
  async search(query: string): Promise<ProviderSearchResult> {
    try {
      let xfUser = sessionDb.getToken("tve4u", "xf_user");
      let xfSession = sessionDb.getToken("tve4u", "xf_session");

      if (!xfUser || !xfSession) {
        await loginTve4u();
        xfUser = sessionDb.getToken("tve4u", "xf_user");
        xfSession = sessionDb.getToken("tve4u", "xf_session");
      }

      if (!xfUser || !xfSession) {
        return { results: [], errors: ["TVE-4U session unavailable"] };
      }

      const searchUrl = `https://tve-4u.org/search/search?keywords=${encodeURIComponent(query)}`;
      const response = await httpClient(searchUrl, {
        headers: {
          "Cookie": `xf_user=${xfUser}; xf_session=${xfSession}`,
        },
      });

      const html = await response.text();
      const $ = cheerio.load(html);
      const results: BookResult[] = [];

      // XenForo 1.x search results
      $(".discussionListItem").each((_: number, el: unknown) => {
        const titleEl = $(el).find(".title a").last();
        const title = titleEl.text().trim();
        const id = titleEl.attr("href")?.split(".")[1]?.replace("/", "") || "";
        const author = $(el).find(".posterDate .username").text().trim();

        results.push({
          id,
          source: "tve4u",
          title,
          author,
          sizeMb: 0,
          format: "unknown",
          downloadUrl: `https://tve-4u.org/threads/${id}/`,
        });
      });

      // Fallback for XenForo 2.x
      if (results.length === 0) {
        $(".structItem--thread").each((_: number, el: unknown) => {
          const titleEl = $(el).find(".structItem-title a").last();
          const title = titleEl.text().trim();
          const id = titleEl.attr("href")?.split(".")[1]?.replace("/", "") || "";
          const author = $(el).find(".structItem-startDate a").text().trim();

          results.push({
            id,
            source: "tve4u",
            title,
            author,
            sizeMb: 0,
            format: "unknown",
            downloadUrl: `https://tve-4u.org/threads/${id}/`,
          });
        });
      }

      log("info", "tve4u search completed", { provider: "tve4u", query });
      return { results };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      log("warn", "tve4u provider error", { provider: "tve4u", query, error: message });
      return { results: [], errors: [message] };
    }
  },
};
