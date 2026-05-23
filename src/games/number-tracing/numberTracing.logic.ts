import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { NumberTracingState, TracePoint } from "./numberTracing.types";
import { NUMBER_GLYPHS } from "./numberTracing.glyphs";
import {
  speakNumberTracingPrompt,
  speakNumberTracingPraise,
  speakNumberTracingFeedback,
  stopNumberTracingTTS,
} from "./numberTracing.tts";
import { AudioManager } from "../../systems/audio/audioManager";
import { useTranslation } from "react-i18next";
import {
  generateCheckpoints,
  checkTracingProgress,
} from "./tracingValidation";

const NUMBER_GUIDES = Object.keys(NUMBER_GLYPHS).map((char) => ({
  char,
  guidePath: NUMBER_GLYPHS[char],
}));

const SMOOTHING_FACTOR = 0.8;
const MIN_MOVEMENT_PX = 1.2;
const INTERPOLATION_STEP_PX = 4;
const CHECKPOINT_SPACING = 10;
const SUBPATH_BREAK_MULTIPLIER = 3.2;
const SEQUENTIAL_TOLERANCE_PX = 24;
const SEQUENTIAL_LOOKAHEAD = 6;
const MIN_ADVANCE_MOVE_PX = 5;
const MAX_ADVANCE_PER_SAMPLE = 4;
const SUCCESS_REQUIRED_COVERAGE = 0.84;
const POST_TTS_ADVANCE_DELAY_MS = 450;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function buildRevealedPath(
  checkpoints: { point: TracePoint; visited: boolean }[],
  visitedCount: number,
): string {
  if (visitedCount <= 0 || checkpoints.length === 0) return "";

  const max = Math.min(visitedCount, checkpoints.length);
  const points = checkpoints.slice(0, max).map((cp) => cp.point);
  if (points.length === 0) return "";

  const breakDistance = CHECKPOINT_SPACING * SUBPATH_BREAK_MULTIPLIER;
  const breakDistanceSq = breakDistance * breakDistance;

  let path = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const cmd = dx * dx + dy * dy > breakDistanceSq ? "M" : "L";
    path += ` ${cmd}${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
  }

  return path;
}

export function useNumberTracingGame(canvasSize: number) {
  const { t } = useTranslation();
  const [state, setState] = useState<NumberTracingState>({
    level: 1,
    score: 0,
    targetNumber: "",
    isComplete: false,
    feedback: null,
  });

  const [isBusy, setIsBusy] = useState(false);
  const [hasTraceStarted, setHasTraceStarted] = useState(false);
  const [tracePathD, setTracePathD] = useState("");
  const [traceProgress, setTraceProgress] = useState(0);
  const [checkpoints, setCheckpoints] = useState<
    { point: TracePoint; visited: boolean }[]
  >([]);

  const checkpointsRef = useRef<{ point: TracePoint; visited: boolean }[]>([]);
  const nextCheckpointIndexRef = useRef(0);
  const lastTracePointRef = useRef<TracePoint | null>(null);
  const lastAdvancePointRef = useRef<TracePoint | null>(null);
  const currentItemRef = useRef("");
  const isCompletingRef = useRef(false);
  const progressLogBucketRef = useRef(-1);
  const doneRef = useRef(false);
  const offset = canvasSize * 0.15;

  const guide =
    NUMBER_GUIDES[(state.level - 1) % NUMBER_GUIDES.length] || NUMBER_GUIDES[0];
  const displayChar = guide.char;
  const guideDString = guide?.guidePath(canvasSize * 0.7) || "";

  const startDot = useMemo(() => {
    const m = guideDString.match(/^M([\d.]+),([\d.]+)/);
    if (m)
      return { x: parseFloat(m[1]) + offset, y: parseFloat(m[2]) + offset };
    return { x: canvasSize * 0.5, y: canvasSize * 0.15 };
  }, [guideDString, offset, canvasSize]);

  const updateProgressFromCheckpoints = useCallback(() => {
    const cps = checkpointsRef.current;
    if (cps.length === 0) {
      setTraceProgress(0);
      setTracePathD("");
      return;
    }
    let contiguousVisited = nextCheckpointIndexRef.current;
    while (contiguousVisited < cps.length && cps[contiguousVisited].visited) {
      contiguousVisited += 1;
    }
    nextCheckpointIndexRef.current = contiguousVisited;
    const visitedCount = contiguousVisited;
    setTraceProgress(visitedCount / cps.length);
    setTracePathD(buildRevealedPath(cps, visitedCount));

    const progressPercent = Math.round((visitedCount / cps.length) * 100);
    const progressBucket = Math.floor(progressPercent / 5);
    if (progressBucket !== progressLogBucketRef.current) {
      progressLogBucketRef.current = progressBucket;
      console.log("[TracingDebug][Number] progress", {
        item: currentItemRef.current,
        progressPercent,
        visitedCount,
        totalCheckpoints: cps.length,
      });
    }
  }, []);

  const advanceSequentialCheckpoints = useCallback((point: TracePoint) => {
    const cps = checkpointsRef.current;
    if (cps.length === 0) return 0;

    const idx = nextCheckpointIndexRef.current;
    if (idx >= cps.length) return 0;

    const end = Math.min(cps.length, idx + SEQUENTIAL_LOOKAHEAD);
    const toleranceSq = SEQUENTIAL_TOLERANCE_PX * SEQUENTIAL_TOLERANCE_PX;
    let matched = -1;

    for (let probe = idx; probe < end; probe += 1) {
      const dx = point.x - cps[probe].point.x;
      const dy = point.y - cps[probe].point.y;
      if (dx * dx + dy * dy <= toleranceSq) {
        matched = probe;
        break;
      }
    }

    if (matched === -1) return 0;

    const lastAdvance = lastAdvancePointRef.current;
    if (lastAdvance) {
      const movedDx = point.x - lastAdvance.x;
      const movedDy = point.y - lastAdvance.y;
      const movedSq = movedDx * movedDx + movedDy * movedDy;
      if (movedSq < MIN_ADVANCE_MOVE_PX * MIN_ADVANCE_MOVE_PX) {
        return 0;
      }
    }

    const matchedLimited = Math.min(matched, idx + MAX_ADVANCE_PER_SAMPLE);
    let newlyVisited = 0;
    for (let fill = idx; fill <= matchedLimited; fill += 1) {
      if (!cps[fill].visited) {
        cps[fill].visited = true;
        newlyVisited += 1;
      }
    }

    nextCheckpointIndexRef.current = matchedLimited + 1;
    if (newlyVisited > 0) {
      lastAdvancePointRef.current = point;
    }
    return newlyVisited;
  }, []);

  const generateRound = useCallback(
    (level: number) => {
      doneRef.current = false;
      isCompletingRef.current = false;
      setHasTraceStarted(false);
      setTracePathD("");
      setTraceProgress(0);
      progressLogBucketRef.current = -1;
      nextCheckpointIndexRef.current = 0;
      lastTracePointRef.current = null;
      lastAdvancePointRef.current = null;

      const g = NUMBER_GUIDES[(level - 1) % NUMBER_GUIDES.length];
      currentItemRef.current = g.char;
      const gPath = g.guidePath(canvasSize * 0.7);
      const points = generateCheckpoints(gPath, CHECKPOINT_SPACING);
      const cps = points.map((p) => ({ point: p, visited: false }));

      setCheckpoints(cps);
      checkpointsRef.current = cps;

      setState((prev) => ({
        ...prev,
        level,
        targetNumber: g.char,
        isComplete: false,
        feedback: null,
      }));

      stopNumberTracingTTS().then(() => {
        console.log("[TracingDebug][Number] prompt start", {
          item: g.char,
          level,
        });
        void speakNumberTracingPrompt(g.char, {
          debugLabel: `number-prompt-${g.char}`,
        });
      });
    },
    [canvasSize],
  );

  const handleRestart = useCallback(() => {
    stopNumberTracingTTS();
    setState((prev) => ({ ...prev, level: 1, score: 0 }));
    generateRound(1);
  }, [generateRound]);

  useEffect(() => {
    generateRound(1);
    return () => {
      stopNumberTracingTTS();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSuccess = useCallback(async () => {
    if (doneRef.current || isCompletingRef.current) return;
    const completedItem = currentItemRef.current;
    const completedLevel = state.level;
    console.log("[TracingDebug][Number] completion detected", {
      currentItemBeforeCompletion: currentItemRef.current,
      completedItem,
      completedLevel,
    });

    isCompletingRef.current = true;
    doneRef.current = true;
    setIsBusy(true);
    setTracePathD(
      buildRevealedPath(checkpointsRef.current, checkpointsRef.current.length),
    );
    setTraceProgress(1);

    setState((prev) => ({
      ...prev,
      isComplete: true,
      score: prev.score + 10,
      feedback: {
        type: "success",
        message: t("tracing.greatTracing"),
        emoji: "🎨",
      },
    }));

    AudioManager.playSuccess();

    let didAdvance = false;
    try {
      await stopNumberTracingTTS();

      console.log("[TracingDebug][Number] tts start", {
        phase: "praise",
        completedItem,
      });
      await speakNumberTracingPraise({
        waitForCompletion: true,
        debugLabel: `number-praise-${completedItem}`,
      });
      console.log("[TracingDebug][Number] tts end", {
        phase: "praise",
        completedItem,
      });

      console.log("[TracingDebug][Number] tts start", {
        phase: "item",
        completedItem,
      });
      await speakNumberTracingFeedback(completedItem, {
        waitForCompletion: true,
        debugLabel: `number-item-${completedItem}`,
      });
      console.log("[TracingDebug][Number] tts end", {
        phase: "item",
        completedItem,
      });

      await sleep(POST_TTS_ADVANCE_DELAY_MS);

      const nextLevel = completedLevel + 1;
      const nextGuide =
        NUMBER_GUIDES[(nextLevel - 1) % NUMBER_GUIDES.length] ||
        NUMBER_GUIDES[0];
      const nextItem = nextGuide.char;
      console.log("[TracingDebug][Number] advancing", {
        completedItem,
        nextItem,
        nextLevel,
      });

      generateRound(nextLevel);
      didAdvance = true;
    } catch (error) {
      console.warn("[TracingDebug][Number] completion flow failed", error);
    } finally {
      if (!didAdvance) {
        doneRef.current = false;
      }
      setIsBusy(false);
      isCompletingRef.current = false;
    }
  }, [state.level, generateRound, t]);

  const handleTraceStart = useCallback(
    (x: number, y: number) => {
      if (state.isComplete || isBusy || isCompletingRef.current) return;
      if (!hasTraceStarted) {
        setHasTraceStarted(true);
      }

      const localPoint = { x: x - offset, y: y - offset };
      lastTracePointRef.current = localPoint;

      const newlyVisited = advanceSequentialCheckpoints(localPoint);
      if (newlyVisited > 0) {
        updateProgressFromCheckpoints();
        setCheckpoints([...checkpointsRef.current]);
      }
    },
    [
      state.isComplete,
      isBusy,
      hasTraceStarted,
      offset,
      advanceSequentialCheckpoints,
      updateProgressFromCheckpoints,
    ],
  );

  const handleTraceMove = useCallback(
    (x: number, y: number) => {
      if (state.isComplete || isBusy || isCompletingRef.current) return;

      const rawPoint = { x: x - offset, y: y - offset };
      const prevPoint = lastTracePointRef.current;
      let newlyVisited = 0;

      if (!prevPoint) {
        newlyVisited += advanceSequentialCheckpoints(rawPoint);
        lastTracePointRef.current = rawPoint;
      } else {
        const smoothedPoint = {
          x: prevPoint.x + (rawPoint.x - prevPoint.x) * SMOOTHING_FACTOR,
          y: prevPoint.y + (rawPoint.y - prevPoint.y) * SMOOTHING_FACTOR,
        };

        const dx = smoothedPoint.x - prevPoint.x;
        const dy = smoothedPoint.y - prevPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Skip micro-jitter while preserving intended movement.
        if (distance < MIN_MOVEMENT_PX) {
          lastTracePointRef.current = smoothedPoint;
          return;
        }

        // Fill gaps between sparse move events to avoid jumpy/stop-like tracing.
        const steps = Math.max(1, Math.ceil(distance / INTERPOLATION_STEP_PX));
        for (let i = 1; i <= steps; i += 1) {
          const t = i / steps;
          const interpolated = {
            x: prevPoint.x + dx * t,
            y: prevPoint.y + dy * t,
          };
          newlyVisited += advanceSequentialCheckpoints(interpolated);
        }

        lastTracePointRef.current = smoothedPoint;
      }

      if (newlyVisited > 0) {
        updateProgressFromCheckpoints();
        setCheckpoints([...checkpointsRef.current]);

        const result = checkTracingProgress(checkpointsRef.current, {
          requiredCoverage: SUCCESS_REQUIRED_COVERAGE,
        });
        if (result.isValid) {
          handleSuccess();
        }
      }
    },
    [
      state.isComplete,
      isBusy,
      offset,
      handleSuccess,
      advanceSequentialCheckpoints,
      updateProgressFromCheckpoints,
    ],
  );

  const handleTraceEnd = useCallback(() => {
    lastTracePointRef.current = null;

    if (!state.isComplete && !isBusy && !isCompletingRef.current) {
      const result = checkTracingProgress(checkpointsRef.current, {
        requiredCoverage: SUCCESS_REQUIRED_COVERAGE,
      });
      if (result.isValid) {
        handleSuccess();
      }
    }
  }, [state.isComplete, isBusy, handleSuccess]);

  return {
    state,
    isBusy,
    guideDString,
    tracePathD,
    traceProgress,
    hasTraceStarted,
    checkpoints,
    startDot,
    handleTraceStart,
    handleTraceMove,
    handleTraceEnd,
    handleRestart,
  };
}
