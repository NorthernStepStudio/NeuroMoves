import { useState, useCallback, useEffect } from "react";
import { SizeOrderingState, SizeItem } from "./sizeOrdering.types";
import { CATEGORIES } from "./sizeOrdering.config";
import {
  speakSizeOrderingPrompt,
  speakSizeOrderingFeedback,
  stopSizeOrderingTTS,
} from "./sizeOrdering.tts";
import { AudioManager } from "../../systems/audio/audioManager";
import { useTranslation } from "react-i18next";
import { useGame } from "../../core/GameContext"; // Only for settings

export function useSizeOrderingGame() {
  const { t } = useTranslation();
  const { settings } = useGame();

  const [state, setState] = useState<SizeOrderingState>({
    level: 1,
    score: 0,
    items: [],
    selectedItems: [],
    feedback: null,
  });

  const [isBusy, setIsBusy] = useState(false);

  const getItemCount = useCallback(
    (level: number) => {
      const ageMonths = settings?.childAgeMonths ?? 48;
      let maxItems = 6;

      if (ageMonths < 36) maxItems = 3;
      else if (ageMonths < 48) maxItems = 4;
      else if (ageMonths < 60) maxItems = 5;
      else maxItems = 6;

      return Math.min(3 + Math.floor(level / 2), maxItems);
    },
    [settings?.childAgeMonths],
  );

  const generateRound = useCallback(
    (level: number) => {
      setIsBusy(false);
      const count = getItemCount(level);
      const baseSize = 65;
      const sizeIncrement = 30;

      const category = CATEGORIES[(level - 1) % CATEGORIES.length];
      const itemTemplate =
        category.items[Math.floor(Math.random() * category.items.length)];

      const newItems: SizeItem[] = [];
      for (let i = 0; i < count; i++) {
        newItems.push({
          id: i,
          size: baseSize + i * sizeIncrement,
          color: itemTemplate.color,
          image: itemTemplate.image,
          name: itemTemplate.name,
        });
      }

      const shuffledItems = [...newItems].sort(() => Math.random() - 0.5);

      setState((prev) => ({
        ...prev,
        level,
        items: shuffledItems,
        selectedItems: [],
        feedback: null,
      }));

      stopSizeOrderingTTS().then(() => {
        speakSizeOrderingPrompt(t("sizeOrdering.instruction"));
      });
    },
    [getItemCount, t],
  );

  const handleRestart = useCallback(() => {
    stopSizeOrderingTTS();
    setState((prev) => ({ ...prev, level: 1, score: 0 }));
    generateRound(1);
  }, [generateRound]);

  useEffect(() => {
    generateRound(1);
    return () => {
      stopSizeOrderingTTS();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleItemSelect = useCallback(
    (item: SizeItem) => {
      if (isBusy) return;

      setState((prev) => {
        if (prev.selectedItems.some((s) => s.id === item.id)) return prev;

        const newSelected = [...prev.selectedItems, item];
        const newItems = prev.items.filter((i) => i.id !== item.id);

        AudioManager.playPop(0.3);
        speakSizeOrderingFeedback(String(newSelected.length));

        const targetCount = getItemCount(prev.level);

        if (newSelected.length === targetCount) {
          const isCorrect = newSelected.every((sItem, index) => {
            if (index === 0) return true;
            return sItem.size > newSelected[index - 1].size;
          });

          if (isCorrect) {
            setIsBusy(true);
            AudioManager.playSuccess();
            speakSizeOrderingFeedback(t("sizeOrdering.perfectOrder"));

            setTimeout(() => {
              generateRound(prev.level + 1);
            }, 1200);

            return {
              ...prev,
              score: prev.score + 10,
              items: newItems,
              selectedItems: newSelected,
              feedback: {
                type: "success",
                message: t("sizeOrdering.perfectOrder"),
                emoji: "🌟",
              },
            };
          } else {
            setIsBusy(true);
            AudioManager.playError();
            speakSizeOrderingFeedback(
              t("sizeOrdering.tryAgainMessage").replace("!", ""),
            );

            setTimeout(() => {
              generateRound(prev.level); // retry same level
            }, 1500);

            return {
              ...prev,
              items: newItems,
              selectedItems: newSelected,
              feedback: {
                type: "error",
                message: t("sizeOrdering.tryAgainMessage"),
                emoji: "☝️",
              },
            };
          }
        }

        return { ...prev, items: newItems, selectedItems: newSelected };
      });
    },
    [isBusy, getItemCount, generateRound, t],
  );

  return {
    state,
    isBusy,
    getItemCount,
    handleItemSelect,
    handleRestart,
  };
}
