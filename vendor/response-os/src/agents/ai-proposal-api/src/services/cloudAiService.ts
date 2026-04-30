export type CloudAiMode = "refine" | "translate" | "qa";

const boostPathByMode: Record<CloudAiMode, string> = {
  refine: process.env.CLOUD_AI_REFINE_PATH?.trim() || "/api/proposals/refine",
  translate: process.env.CLOUD_AI_TRANSLATE_PATH?.trim() || "/api/proposals/translate",
  qa: process.env.CLOUD_AI_QA_PATH?.trim() || "/api/proposals/qa"
};

const cloudBaseUrl = (): string | null => {
  const value = process.env.CLOUD_AI_BASE_URL?.trim();
  return value ? value : null;
};

const cloudTimeoutMs = (): number => {
  const raw = Number(process.env.CLOUD_AI_TIMEOUT_MS ?? "15000");
  return Number.isFinite(raw) && raw > 0 ? raw : 15000;
};

export const isCloudAiConfigured = (): boolean => Boolean(cloudBaseUrl());

export const callCloudBoost = async (mode: CloudAiMode, payload: unknown): Promise<unknown | null> => {
  const baseUrl = cloudBaseUrl();
  if (!baseUrl) {
    return null;
  }

  const requestUrl = new URL(boostPathByMode[mode], baseUrl).toString();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), cloudTimeoutMs());

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    const apiKey = process.env.CLOUD_AI_API_KEY?.trim();
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(requestUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const result = (await response.json()) as unknown;
    if (!response.ok) {
      const reason =
        typeof result === "object" && result !== null && "error" in result
          ? (result as { error?: string }).error
          : `HTTP ${response.status}`;
      throw new Error(`Cloud AI request failed: ${reason || "Unknown error"}`);
    }

    return result;
  } finally {
    clearTimeout(timeoutId);
  }
};
