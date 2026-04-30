export interface TracePoint {
  x: number;
  y: number;
}

export interface TraceValidationOptions {
  minPoints?: number;
  minStrokeDistance?: number;
  pathTolerance?: number;
  startTolerance?: number;
  requiredOnPathRatio?: number;
  requiredCoverage?: number;
}

export interface TraceValidationResult {
  isValid: boolean;
  reason:
  | 'not_enough_points'
  | 'stroke_too_short'
  | 'start_off_path'
  | 'off_path'
  | 'insufficient_coverage';
  totalPoints: number;
  strokeDistance: number;
  onPathRatio: number;
  coverage: number;
  startDistance: number;
}

const DEFAULTS: Required<TraceValidationOptions> = {
  minPoints: 5,
  minStrokeDistance: 15,
  pathTolerance: 75,
  startTolerance: 100,
  requiredOnPathRatio: 0.60,
  requiredCoverage: 0.85,
};

type Segment =
  | { kind: 'line'; from: TracePoint; to: TracePoint }
  | { kind: 'quad'; from: TracePoint; ctrl: TracePoint; to: TracePoint };

export function validateTraceStroke(
  points: TracePoint[],
  guidePath: string,
  options: TraceValidationOptions = {}
): TraceValidationResult {
  const cfg: Required<TraceValidationOptions> = { ...DEFAULTS, ...options };
  const cleanPoints = points.filter(
    (p) => Number.isFinite(p.x) && Number.isFinite(p.y)
  );

  if (cleanPoints.length < cfg.minPoints) {
    return buildResult(false, 'not_enough_points', cleanPoints, 0, 0, 0, 9999);
  }

  const strokeDistance = getPolylineLength(cleanPoints);
  if (strokeDistance < cfg.minStrokeDistance) {
    return buildResult(
      false,
      'stroke_too_short',
      cleanPoints,
      strokeDistance,
      0,
      0,
      9999
    );
  }

  const guideSamples = sampleGuidePath(guidePath);
  if (guideSamples.length < 2) {
    return buildResult(
      false,
      'insufficient_coverage',
      cleanPoints,
      strokeDistance,
      0,
      0,
      9999
    );
  }

  const startDistance = getDistance(cleanPoints[0], guideSamples[0]);
  if (startDistance > cfg.startTolerance) {
    return buildResult(
      false,
      'start_off_path',
      cleanPoints,
      strokeDistance,
      0,
      0,
      startDistance
    );
  }

  const toleranceSq = cfg.pathTolerance * cfg.pathTolerance;

  let onPathPoints = 0;
  for (const p of cleanPoints) {
    if (minDistanceSqToCollection(p, guideSamples) <= toleranceSq) {
      onPathPoints += 1;
    }
  }
  const onPathRatio = onPathPoints / cleanPoints.length;
  if (onPathRatio < cfg.requiredOnPathRatio) {
    return buildResult(
      false,
      'off_path',
      cleanPoints,
      strokeDistance,
      onPathRatio,
      0,
      startDistance
    );
  }

  const coverageStride = Math.max(1, Math.floor(guideSamples.length / 120));
  let coveredGuidePoints = 0;
  let coverageChecks = 0;
  for (let i = 0; i < guideSamples.length; i += coverageStride) {
    coverageChecks += 1;
    if (minDistanceSqToCollection(guideSamples[i], cleanPoints) <= toleranceSq) {
      coveredGuidePoints += 1;
    }
  }
  const coverage = coverageChecks > 0 ? coveredGuidePoints / coverageChecks : 0;
  if (coverage < cfg.requiredCoverage) {
    return buildResult(
      false,
      'insufficient_coverage',
      cleanPoints,
      strokeDistance,
      onPathRatio,
      coverage,
      startDistance
    );
  }

  return buildResult(
    true,
    'insufficient_coverage',
    cleanPoints,
    strokeDistance,
    onPathRatio,
    coverage,
    startDistance
  );
}

function buildResult(
  isValid: boolean,
  reason: TraceValidationResult['reason'],
  points: TracePoint[],
  strokeDistance: number,
  onPathRatio: number,
  coverage: number,
  startDistance: number
): TraceValidationResult {
  return {
    isValid,
    reason,
    totalPoints: points.length,
    strokeDistance,
    onPathRatio,
    coverage,
    startDistance,
  };
}

function sampleGuidePath(path: string): TracePoint[] {
  const segments = parseSegments(path);
  if (segments.length === 0) return [];

  const points: TracePoint[] = [clonePoint(segments[0].from)];
  for (const segment of segments) {
    if (segment.kind === 'line') {
      const steps = 14;
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        points.push({
          x: lerp(segment.from.x, segment.to.x, t),
          y: lerp(segment.from.y, segment.to.y, t),
        });
      }
    } else {
      const steps = 18;
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        const inv = 1 - t;
        points.push({
          x:
            inv * inv * segment.from.x +
            2 * inv * t * segment.ctrl.x +
            t * t * segment.to.x,
          y:
            inv * inv * segment.from.y +
            2 * inv * t * segment.ctrl.y +
            t * t * segment.to.y,
        });
      }
    }
  }
  return points;
}

function parseSegments(path: string): Segment[] {
  const tokens = path.match(/[MLQ]|-?\d*\.?\d+/g);
  if (!tokens) return [];

  const segments: Segment[] = [];
  let cursor: TracePoint | null = null;
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i++];
    if (token === 'M') {
      const point = readPoint(tokens, i);
      if (!point) break;
      cursor = point.value;
      i = point.nextIndex;
      continue;
    }

    if (token === 'L' && cursor) {
      const point = readPoint(tokens, i);
      if (!point) break;
      segments.push({ kind: 'line', from: clonePoint(cursor), to: point.value });
      cursor = point.value;
      i = point.nextIndex;
      continue;
    }

    if (token === 'Q' && cursor) {
      const ctrlPoint = readPoint(tokens, i);
      if (!ctrlPoint) break;
      const endPoint = readPoint(tokens, ctrlPoint.nextIndex);
      if (!endPoint) break;
      segments.push({
        kind: 'quad',
        from: clonePoint(cursor),
        ctrl: ctrlPoint.value,
        to: endPoint.value,
      });
      cursor = endPoint.value;
      i = endPoint.nextIndex;
      continue;
    }
  }

  return segments;
}

function readPoint(tokens: string[], startIndex: number): { value: TracePoint; nextIndex: number } | null {
  const x = Number(tokens[startIndex]);
  const y = Number(tokens[startIndex + 1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  return {
    value: { x, y },
    nextIndex: startIndex + 2,
  };
}

function getPolylineLength(points: TracePoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += getDistance(points[i - 1], points[i]);
  }
  return total;
}

function minDistanceSqToCollection(point: TracePoint, collection: TracePoint[]): number {
  let minSq = Number.POSITIVE_INFINITY;
  for (const candidate of collection) {
    const dx = point.x - candidate.x;
    const dy = point.y - candidate.y;
    const sq = dx * dx + dy * dy;
    if (sq < minSq) minSq = sq;
  }
  return minSq;
}

function getDistance(a: TracePoint, b: TracePoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function clonePoint(point: TracePoint): TracePoint {
  return { x: point.x, y: point.y };
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}
