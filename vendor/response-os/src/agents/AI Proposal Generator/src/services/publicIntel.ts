import { ProposalIntel, SupportedLanguage } from "../types/proposal";
import { fetchPublicIntelFromApi } from "./api";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const seededInt = (seed: string): number => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
};

const mockIntelFallback = (
  locationQuery: string,
  timelineDays: number,
  language: SupportedLanguage
): ProposalIntel => {
  const normalizedLocation = locationQuery.trim() || "United States";
  const seed = seededInt(`${normalizedLocation}:${timelineDays}:${language}`);
  const cpiIndex = Number((315 + (seed % 190) / 10).toFixed(3));
  const cpiYoY = Number((2.4 + (seed % 27) / 10).toFixed(2));
  const unemployment = Number((3.3 + (seed % 19) / 10).toFixed(1));
  const forecastDays = clamp(Math.round(timelineDays), 3, 7);
  const weatherRiskRoll = seed % 100;
  const weatherRiskLevel =
    weatherRiskRoll > 72 ? "high" : weatherRiskRoll > 38 ? "moderate" : "low";
  const maxHighRisk = weatherRiskLevel === "high" ? forecastDays : weatherRiskLevel === "moderate" ? Math.max(1, Math.round(forecastDays / 3)) : 0;
  const highRiskDays = clamp(maxHighRisk, 0, forecastDays);

  return {
    fetchedAt: new Date().toISOString(),
    locationQuery: normalizedLocation,
    weather: {
      locationName: normalizedLocation,
      timezone: "America/New_York",
      riskLevel: weatherRiskLevel,
      highRiskDays,
      days: Array.from({ length: forecastDays }).map((_, index) => ({
        date: new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        maxTempC: clamp(10 + ((seed + index * 17) % 24), -8, 42),
        minTempC: clamp(2 + ((seed + index * 13) % 15), -14, 32),
        precipitationProbability: clamp(20 + ((seed + index * 23) % 70), 0, 100)
      }))
    },
    market: {
      cpiIndex,
      cpiYearOverYear: cpiYoY,
      unemploymentRate: unemployment,
      referencePeriod: "Fallback public snapshot"
    },
    sourceNotes: [
      "Public API unavailable; using local fallback market/weather model.",
      "Verify local permit calendars and supplier lead times before final contract."
    ]
  };
};

export const fetchPublicProposalIntel = async (
  locationQuery: string,
  timelineDays: number,
  language: SupportedLanguage
) => {
  try {
    return await fetchPublicIntelFromApi(locationQuery, timelineDays, language);
  } catch {
    return mockIntelFallback(locationQuery, timelineDays, language);
  }
};
