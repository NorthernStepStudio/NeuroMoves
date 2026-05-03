import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  LetterTracingState,
  LetterCase,
  TracePoint,
} from "./letterTracing.types";
import { UPPERCASE_GLYPHS, LOWERCASE_GLYPHS } from "./letterTracing.glyphs";
import {
  speakLetterTracingPrompt,
  speakLetterTracingFeedback,
  stopLetterTracingTTS,
} from "./letterTracing.tts";
import { AudioManager } from "../../systems/audio/audioManager";
import { useTranslation } from "react-i18next";
import {
  generateCheckpoints,
  updateCheckpoints,
  checkTracingProgress,
} from "./tracingValidation";

const UPPER_GUIDES = Object.keys(UPPERCASE_GLYPHS).map((char) => ({
  char,
  guidePath: UPPERCASE_GLYPHS[char],
}));

const LOWER_GUIDES = Object.keys(LOWERCASE_GLYPHS).map((char) => ({
  char,
  guidePath: LOWERCASE_GLYPHS[char],
}));

export function useLetterTracingGame(
  letterCase: LetterCase,
  canvasSize: number,
) {
  const { t } = useTranslation();
  const [state, setState] = useState<LetterTracingState>({
    level: 1,
    score: 0,
    targetLetter: "",
    completedStrokes: 0,
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

  const guides = letterCase === "upper" ? UPPER_GUIDES : LOWER_GUIDES;
  const guide = guides[(state.level - 1) % guides.length] || guides[0];
  const displayChar =
    letterCase === "lower" ? guide.char.toLowerCase() : guide.char;
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

      const g = guides[(level - 1) % guides.length];
      const gPath = g.guidePath(canvasSize * 0.7);
      const points = generateCheckpoints(gPath, 5);
      const cps = points.map((p) => ({ point: p, visited: false }));

      setCheckpoints(cps);
      checkpointsRef.current = cps;

      setState((prev) => ({
        ...prev,
        level,
        targetLetter: letterCase === "lower" ? g.char.toLowerCase() : g.char,
        isComplete: false,
        feedback: null,
      }));

      stopLetterTracingTTS().then(() => {
        const letter = letterCase === "lower" ? g.char.toLowerCase() : g.char;
        speakLetterTracingPrompt(letter);
      });
    },
    [guides, canvasSize, letterCase, t],
  );

  const handleRestart = useCallback(() => {
    stopLetterTracingTTS();
    setState((prev) => ({ ...prev, level: 1, score: 0 }));
    generateRound(1);
  }, [generateRound]);

  const handleCaseChange = useCallback((newCase: LetterCase) => {
    stopLetterTracingTTS();
    setState((prev) => ({ ...prev, level: 1, score: 0 }));
    // The letterCase prop will update, which triggers a re-render
    // but generateRound depends on guides. We will handle the initialization via useEffect.
  }, []);

  useEffect(() => {
    generateRound(state.level);
    return () => {
      stopLetterTracingTTS();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letterCase]);

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

    // Speak letter name
    await speakLetterTracingFeedback(displayChar.toLowerCase());

    // Advance
    setTimeout(() => {
      generateRound(state.level + 1);
      setIsBusy(false);
    }, 3000);
  }, [displayChar, state.level, generateRound, t]);

  const handleTraceStart = useCallback(
    (x: number, y: number) => {
      if (state.isComplete || isBusy) return;
      setCurrentPath((prev) => (prev ? prev + ` M${x},${y}` : `M${x},${y}`));

      const newlyVisited = updateCheckpoints(
        checkpointsRef.current,
        { x: x - offset, y: y - offset },
        30,
      );
      if (newlyVisited > 0) {
        setCheckpoints([...checkpointsRef.current]);
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
      if (result.isValid) {
        handleSuccess();
      }
    }
  }, [state.isComplete, isBusy, handleSuccess]);

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
    handleCaseChange,
  };
}
