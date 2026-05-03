import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { NumberTracingState, TracePoint } from "./numberTracing.types";
import { NUMBER_GLYPHS } from "./numberTracing.glyphs";
import {
  speakNumberTracingPrompt,
  speakNumberTracingFeedback,
  stopNumberTracingTTS,
} from "./numberTracing.tts";
import { AudioManager } from "../../systems/audio/audioManager";
import { useTranslation } from "react-i18next";
import {
  generateCheckpoints,
  updateCheckpoints,
  checkTracingProgress,
} from "./tracingValidation";

const NUMBER_GUIDES = Object.keys(NUMBER_GLYPHS).map((char) => ({
  char,
  guidePath: NUMBER_GLYPHS[char],
}));

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
  const [currentPath, setCurrentPath] = useState("");
  const [checkpoints, setCheckpoints] = useState<
    { point: TracePoint; visited: boolean }[]
  >([]);

  const checkpointsRef = useRef<{ point: TracePoint; visited: boolean }[]>([]);
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

  const generateRound = useCallback(
    (level: number) => {
      doneRef.current = false;
      setCurrentPath("");

      const g = NUMBER_GUIDES[(level - 1) % NUMBER_GUIDES.length];
      const gPath = g.guidePath(canvasSize * 0.7);
      const points = generateCheckpoints(gPath, 5);
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
        const prompt = t("tracing.instruction", { letter: g.char });
        speakNumberTracingPrompt(prompt);
      });
    },
    [canvasSize, t],
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
    if (doneRef.current) return;
    doneRef.current = true;

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

    await speakNumberTracingFeedback(displayChar);

    setTimeout(() => {
      generateRound(state.level + 1);
      setIsBusy(false);
    }, 3000);
  }, [displayChar, state.level, generateRound, t]);

  const handleTraceStart = useCallback(
    (x: number, y: number) => {
      if (state.isComplete || isBusy) return;
      setCurrentPath(`M${x},${y}`);

      const newlyVisited = updateCheckpoints(
        checkpointsRef.current,
        { x: x - offset, y: y - offset },
        30,
      );
      if (newlyVisited > 0) {
        setCheckpoints([...checkpointsRef.current]);
        AudioManager.playPop(0.3);
      }
    },
    [state.isComplete, isBusy, offset],
  );

  const handleTraceMove = useCallback(
    (x: number, y: number) => {
      if (state.isComplete || isBusy) return;
      setCurrentPath((prev) => prev + ` L${x},${y}`);

      const newlyVisited = updateCheckpoints(
        checkpointsRef.current,
        { x: x - offset, y: y - offset },
        30,
      );
      if (newlyVisited > 0) {
        setCheckpoints([...checkpointsRef.current]);
        AudioManager.playPop(0.3);

        const result = checkTracingProgress(checkpointsRef.current);
        if (result.isValid) {
          handleSuccess();
        }
      }
    },
    [state.isComplete, isBusy, offset, handleSuccess],
  );

  const handleTraceEnd = useCallback(() => {
    if (!state.isComplete && !isBusy) {
      const result = checkTracingProgress(checkpointsRef.current);
      if (!result.isValid) {
        setCurrentPath("");
        const points = generateCheckpoints(guideDString, 5);
        const cps = points.map((p) => ({ point: p, visited: false }));
        setCheckpoints(cps);
        checkpointsRef.current = cps;

        AudioManager.playError();
        speakNumberTracingFeedback(t("tracing.tryAgain"));
        setState((prev) => ({
          ...prev,
          feedback: {
            type: "error",
            message: t("tracing.tryAgain"),
            emoji: "🤔",
          },
        }));
        setTimeout(
          () => setState((prev) => ({ ...prev, feedback: null })),
          1000,
        );
      }
    }
  }, [state.isComplete, isBusy, guideDString, t]);

  return {
    state,
    isBusy,
    guideDString,
    currentPath,
    checkpoints,
    startDot,
    handleTraceStart,
    handleTraceMove,
    handleTraceEnd,
    handleRestart,
  };
}
