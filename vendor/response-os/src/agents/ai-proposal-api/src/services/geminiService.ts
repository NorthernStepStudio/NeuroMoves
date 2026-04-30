import { SupportedLanguage } from "@nss/proposal-core";

interface GeminiInput {
  description: string;
  timelineDays: number;
  validityDays: number;
  contractorName: string;
  clientName: string;
  includePermitAllowance: boolean;
  language: SupportedLanguage;
  images: Array<{ mimetype: string; buffer: Buffer }>;
}

interface GeminiResult {
  draft: string;
  model: string;
}

const languagePrompt: Record<SupportedLanguage, string> = {
  en: "Return response content in English.",
  es: "Return response content in Spanish.",
  it: "Return response content in Italian."
};

const fileToInlinePart = async (file: { mimetype: string; buffer: Buffer }) => ({
  inlineData: {
    mimeType: file.mimetype || "image/jpeg",
    data: file.buffer.toString("base64")
  }
});

export const generateGeminiDraft = async (
  input: GeminiInput
): Promise<GeminiResult | null> => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

  if (!apiKey) {
    return null;
  }

  const imageParts = await Promise.all(
    input.images.slice(0, 3).map((image) => fileToInlinePart(image))
  );

  const prompt = [
    "You are creating a realistic contractor proposal draft for a U.S. small contractor.",
    languagePrompt[input.language],
    "Return JSON only with this exact shape:",
    "{",
    '  "projectType": "string",',
    '  "estimatedArea": number,',
    '  "lineItems": [{"description":"string","amount":number}],',
    '  "contractSummary": "string",',
    '  "assumptions": ["string"],',
    '  "inclusions": ["string"],',
    '  "exclusions": ["string"],',
    '  "notesToClient": ["string"],',
    '  "terms": ["string"]',
    "}",
    "Guidelines:",
    "- Amounts must be in USD and realistic for professional contractor work.",
    "- Do not underbid; include professional overhead, mobilization, and coordination value.",
    "- If scope mentions demo/removal/replace/existing teardown, include a demolition line item.",
    "- Provide 4 to 6 line items.",
    "- Keep contractSummary to 2-3 sentences.",
    "- Keep language professional and legally cautious.",
    `Contractor: ${input.contractorName}`,
    `Client: ${input.clientName}`,
    `Timeline target: ${input.timelineDays} days`,
    `Proposal validity: ${input.validityDays} days`,
    `Include permit allowance: ${input.includePermitAllowance ? "yes" : "no"}`,
    "Project scope:",
    input.description
  ].join("\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }, ...imageParts]
          }
        ]
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed (${response.status})`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

  if (!responseText) {
    throw new Error("Gemini returned empty response.");
  }

  return {
    draft: responseText,
    model
  };
};
