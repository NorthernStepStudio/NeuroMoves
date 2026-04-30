export interface ScoringCandidate {
  id: string;
  attributes: Record<string, number>;
}

export interface ScoringWeights {
  [attribute: string]: number;
}

export interface ScoredCandidate {
  id: string;
  score: number;
}

export class ScoringEngine {
  rank(candidates: ScoringCandidate[], weights: ScoringWeights): ScoredCandidate[] {
    return candidates
      .map((candidate) => ({
        id: candidate.id,
        score: Object.entries(weights).reduce((sum, [attribute, weight]) => {
          return sum + (candidate.attributes[attribute] ?? 0) * weight;
        }, 0),
      }))
      .sort((a, b) => b.score - a.score);
  }
}
