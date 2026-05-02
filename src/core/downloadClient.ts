import { env } from "./env.js";
import { getErrorMessage, log } from "./logger.js";
import type { DownloadResponse } from "../types/index.js";

const normalizeFileName = (input: string): string => {
  const fallback = "download.bin";
  const fromUrl = input.split("/").filter(Boolean).pop() || fallback;
  return fromUrl.split("?")[0] || fallback;
};

export const downloadFile = async (sourceUrl: string): Promise<DownloadResponse> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.searchTimeoutMs);

  try {
    const response = await fetch(sourceUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const contentLength = response.headers.get("content-length");
    const fileName = normalizeFileName(sourceUrl);
    const bytes = await response.arrayBuffer();

    if (!response.ok) {
      throw new Error(`Download failed with HTTP ${response.status}`);
    }

    return {
      sourceUrl,
      fileName,
      contentType,
      sizeBytes: contentLength ? Number(contentLength) : undefined,
      status: response.status,
    };
  } catch (error: unknown) {
    log("error", "download failed", { error: getErrorMessage(error), path: sourceUrl });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
