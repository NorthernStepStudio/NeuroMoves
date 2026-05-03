export interface TracePoint {
  x: number;
  y: number;
}

export interface TraceValidationOptions {
  pathTolerance?: number;
  requiredCoverage?: number;
}

const DEFAULTS: Required<TraceValidationOptions> = {
  pathTolerance: 30, // Much more precise to match the new 'pen' look
  requiredCoverage: 0.98, // Must cover almost the entire letter to pass
};

/**
 * Samples a guide path to create a series of "Checkpoints".
 * Tracing is successful when a certain percentage of these checkpoints are "visited".
 */
export function generateCheckpoints(guidePath: string, spacing: number = 25): TracePoint[] {
  const points = sampleGuidePath(guidePath, spacing);
  return points;
}

/**
 * Checks which checkpoints have been visited by a stroke.
 */
export function updateCheckpoints(
  checkpoints: { point: TracePoint; visited: boolean }[],
  newPoint: TracePoint,
  tolerance: number = DEFAULTS.pathTolerance
): number {
  let newlyVisited = 0;
  const toleranceSq = tolerance * tolerance;

  for (const cp of checkpoints) {
    if (!cp.visited) {
      const dx = newPoint.x - cp.point.x;
      const dy = newPoint.y - cp.point.y;
      if (dx * dx + dy * dy <= toleranceSq) {
        cp.visited = true;
        newlyVisited++;
      }
    }
  }
  return newlyVisited;
}

export interface TraceValidationResult {
  isValid: boolean;
  coverage: number;
}

export function checkTracingProgress(
  checkpoints: { point: TracePoint; visited: boolean }[],
  options: TraceValidationOptions = {}
): TraceValidationResult {
  const cfg = { ...DEFAULTS, ...options };
  const visitedCount = checkpoints.filter(cp => cp.visited).length;
  const coverage = checkpoints.length > 0 ? visitedCount / checkpoints.length : 0;

  return {
    isValid: coverage >= cfg.requiredCoverage,
    coverage
  };
}

// Internal Utilities
type Segment =
  | { kind: 'line'; from: TracePoint; to: TracePoint }
  | { kind: 'quad'; from: TracePoint; ctrl: TracePoint; to: TracePoint };

function sampleGuidePath(path: string, stepSize: number): TracePoint[] {
  const segments = parseSegments(path);
  if (segments.length === 0) return [];

  const points: TracePoint[] = [];
  
  for (const segment of segments) {
    if (segment.kind === 'line') {
      const dist = getDistance(segment.from, segment.to);
      const steps = Math.max(1, Math.floor(dist / stepSize));
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        points.push({
          x: lerp(segment.from.x, segment.to.x, t),
          y: lerp(segment.from.y, segment.to.y, t),
        });
      }
    } else {
      // Quad curve approximation
      const steps = 15;
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const inv = 1 - t;
        points.push({
          x: inv * inv * segment.from.x + 2 * inv * t * segment.ctrl.x + t * t * segment.to.x,
          y: inv * inv * segment.from.y + 2 * inv * t * segment.ctrl.y + t * t * segment.to.y,
        });
      }
    }
  }

  // Remove very close duplicates
  return points.filter((p, i, self) => 
    i === 0 || getDistance(p, self[i-1]) > 5
  );
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
      segments.push({ kind: 'line', from: { ...cursor }, to: point.value });
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
        from: { ...cursor },
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
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { value: { x, y }, nextIndex: startIndex + 2 };
}

function getDistance(a: TracePoint, b: TracePoint): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}
