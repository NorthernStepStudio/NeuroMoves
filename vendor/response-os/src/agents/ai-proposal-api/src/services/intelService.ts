import { ProposalIntel, SupportedLanguage } from "@nss/proposal-core";

interface BlsSeriesValue {
  year: string;
  period: string;
  periodName: string;
  value: string;
}

interface BlsResponse {
  Results?: {
    series?: Array<{
      seriesID: string;
      data: BlsSeriesValue[];
    }>;
  };
}

const notesByLanguage: Record<SupportedLanguage, string[]> = {
  en: [
    "Economic data source: U.S. Bureau of Labor Statistics Public Data API.",
    "Weather data source: Open-Meteo APIs (public usage with attribution)."
  ],
  es: [
    "Fuente economica: API publica de U.S. Bureau of Labor Statistics.",
    "Fuente de clima: APIs de Open-Meteo (uso publico con atribucion)."
  ],
  it: [
    "Fonte economica: API pubblica del U.S. Bureau of Labor Statistics.",
    "Fonte meteo: API Open-Meteo (uso pubblico con attribuzione)."
  ]
};

const toNumberOrNull = (value: string): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getLatestMonthlyValue = (entries: BlsSeriesValue[]): BlsSeriesValue | null => {
  for (const entry of entries) {
    if (entry.period.startsWith("M") && toNumberOrNull(entry.value) !== null) {
      return entry;
    }
  }

  return null;
};

const getYearOverYear = (
  entries: BlsSeriesValue[],
  latest: BlsSeriesValue | null
): number | null => {
  if (!latest) {
    return null;
  }

  const previousYear = String(Number(latest.year) - 1);
  const previous = entries.find(
    (entry) =>
      entry.year === previousYear &&
      entry.period === latest.period &&
      toNumberOrNull(entry.value) !== null
  );

  const latestValue = toNumberOrNull(latest.value);
  const previousValue = previous ? toNumberOrNull(previous.value) : null;

  if (latestValue === null || previousValue === null || previousValue === 0) {
    return null;
  }

  return Number((((latestValue - previousValue) / previousValue) * 100).toFixed(2));
};

const fetchMarketIntel = async (): Promise<ProposalIntel["market"]> => {
  const year = new Date().getUTCFullYear();
  const startyear = String(year - 1);
  const endyear = String(year);

  const response = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      seriesid: ["CUUR0000SA0", "LNS14000000"],
      startyear,
      endyear
    })
  });

  if (!response.ok) {
    throw new Error(`BLS request failed (${response.status})`);
  }

  const data = (await response.json()) as BlsResponse;
  const series = data.Results?.series ?? [];

  const cpiSeries = series.find((item) => item.seriesID === "CUUR0000SA0")?.data ?? [];
  const unemploymentSeries =
    series.find((item) => item.seriesID === "LNS14000000")?.data ?? [];

  const latestCpi = getLatestMonthlyValue(cpiSeries);
  const latestUnemployment = getLatestMonthlyValue(unemploymentSeries);

  const cpiIndex = latestCpi ? toNumberOrNull(latestCpi.value) : null;
  const cpiYearOverYear = getYearOverYear(cpiSeries, latestCpi);
  const unemploymentRate = latestUnemployment
    ? toNumberOrNull(latestUnemployment.value)
    : null;

  const referencePeriod = latestCpi
    ? `${latestCpi.periodName} ${latestCpi.year}`
    : "Unknown";

  return {
    cpiIndex,
    cpiYearOverYear,
    unemploymentRate,
    referencePeriod
  };
};

const fetchWeatherIntel = async (
  locationQuery: string,
  timelineDays: number
): Promise<ProposalIntel["weather"]> => {
  const geocodeResponse = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      locationQuery
    )}&count=1&language=en&format=json`
  );

  if (!geocodeResponse.ok) {
    throw new Error(`Open-Meteo geocoding failed (${geocodeResponse.status})`);
  }

  const geocodeData = (await geocodeResponse.json()) as {
    results?: Array<{
      name: string;
      admin1?: string;
      country?: string;
      latitude: number;
      longitude: number;
      timezone: string;
    }>;
  };

  const match = geocodeData.results?.[0];
  if (!match) {
    return null;
  }

  const forecastDays = Math.max(3, Math.min(7, timelineDays));

  const forecastResponse = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${match.latitude}&longitude=${match.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=${forecastDays}&timezone=auto`
  );

  if (!forecastResponse.ok) {
    throw new Error(`Open-Meteo forecast failed (${forecastResponse.status})`);
  }

  const forecastData = (await forecastResponse.json()) as {
    timezone?: string;
    daily?: {
      time: string[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_probability_max: number[];
    };
  };

  const daily = forecastData.daily;
  if (!daily) {
    return null;
  }

  const days = daily.time.map((date, index) => ({
    date,
    maxTempC: Number(daily.temperature_2m_max[index]?.toFixed(1) ?? 0),
    minTempC: Number(daily.temperature_2m_min[index]?.toFixed(1) ?? 0),
    precipitationProbability: Number(
      daily.precipitation_probability_max[index]?.toFixed(0) ?? 0
    )
  }));

  const highRiskDays = days.filter((day) => day.precipitationProbability >= 60).length;
  const riskLevel =
    highRiskDays >= 2 ? "high" : highRiskDays === 1 ? "moderate" : "low";

  return {
    locationName: [match.name, match.admin1, match.country].filter(Boolean).join(", "),
    timezone: forecastData.timezone ?? match.timezone,
    riskLevel,
    highRiskDays,
    days
  };
};

export const fetchPublicProposalIntel = async (
  locationQuery: string,
  timelineDays: number,
  language: SupportedLanguage
): Promise<ProposalIntel> => {
  const normalizedQuery = locationQuery.trim() || "United States";

  const [marketResult, weatherResult] = await Promise.allSettled([
    fetchMarketIntel(),
    fetchWeatherIntel(normalizedQuery, timelineDays)
  ]);

  return {
    fetchedAt: new Date().toISOString(),
    locationQuery: normalizedQuery,
    market: marketResult.status === "fulfilled" ? marketResult.value : null,
    weather: weatherResult.status === "fulfilled" ? weatherResult.value : null,
    sourceNotes: notesByLanguage[language]
  };
};
