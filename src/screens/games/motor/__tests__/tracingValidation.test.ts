import { validateTraceStroke, TracePoint } from '../tracingValidation';

function linePoints(
  from: TracePoint,
  to: TracePoint,
  count: number,
  jitter = 0
): TracePoint[] {
  const points: TracePoint[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / Math.max(1, count - 1);
    points.push({
      x: from.x + (to.x - from.x) * t + (i % 2 === 0 ? jitter : -jitter),
      y: from.y + (to.y - from.y) * t,
    });
  }
  return points;
}

describe('validateTraceStroke', () => {
  it('accepts a path-following stroke', () => {
    const guide = 'M20,20 L140,20 L140,140';
    const points = [
      ...linePoints({ x: 22, y: 22 }, { x: 138, y: 20 }, 30, 1),
      ...linePoints({ x: 140, y: 24 }, { x: 140, y: 136 }, 30, 1),
    ];

    const result = validateTraceStroke(points, guide);
    expect(result.isValid).toBe(true);
  });

  it('rejects a stroke far away from the guide', () => {
    const guide = 'M20,20 L140,20 L140,140';
    const points = linePoints({ x: 20, y: 180 }, { x: 170, y: 180 }, 60);

    const result = validateTraceStroke(points, guide);
    expect(result.isValid).toBe(false);
  });

  it('rejects when starting too far from the guide start', () => {
    const guide = 'M20,20 L140,20';
    const points = linePoints({ x: 130, y: 140 }, { x: 140, y: 20 }, 40);

    const result = validateTraceStroke(points, guide);
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('start_off_path');
  });
});
