import React from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Dimensions } from "react-native";
import { GameShell } from "../../systems/game/GameShell";
import { useAnimalMatchGame } from "./animalMatch.logic";
import {
  FARM_PIECES,
  FARM_SLOTS,
  BOARD_WIDTH,
  BOARD_HEIGHT,
} from "./gameData/farmAnimals";

// Legacy components to be moved to shared later
import { PuzzleBoard } from "../../features/puzzle/components/PuzzleBoard";
import { DraggablePiece } from "../../features/puzzle/components/DraggablePiece";
import { RewardFeedback } from "../../features/puzzle/components/RewardFeedback";
import { colors } from "../../theme/colors";

const { width: screenWidth } = Dimensions.get("window");
const BOARD_MARGIN_X = (screenWidth - BOARD_WIDTH) / 2;
const BOARD_Y = 20;

const FIXED_BOARD_LAYOUT = {
  x: BOARD_MARGIN_X,
  y: BOARD_Y,
  width: BOARD_WIDTH,
  height: BOARD_HEIGHT,
};

export function AnimalMatchScreen() {
  const { t } = useTranslation();

  const {
    placedPieces,
    showCongrats,
    handlePieceDrop,
    handleRestart,
    playSound,
  } = useAnimalMatchGame();

  return (
    <GameShell
      title={t("animalMatch.title")}
      level={1}
      score={placedPieces.length * 10}
      onRestart={handleRestart}
    >
      <View style={styles.gameArea}>
        <PuzzleBoard slots={FARM_SLOTS} placedPieces={placedPieces} />

        {FARM_PIECES.map((piece) => (
          <DraggablePiece
            key={piece.id}
            piece={piece}
            slot={FARM_SLOTS.find((s) => s.id === piece.slotId)!}
            boardLayout={FIXED_BOARD_LAYOUT}
            isPlaced={placedPieces.includes(piece.id)}
            onDrop={(id, x, y) => handlePieceDrop(id, x, y, FIXED_BOARD_LAYOUT)}
            onPress={() => playSound(piece.name)}
          />
        ))}
      </View>

      <RewardFeedback
        isVisible={showCongrats}
        onReplay={handleRestart}
        onNext={() => {}} // Usually goes back or next level
      />
    </GameShell>
  );
}

const styles = StyleSheet.create({
  gameArea: {
    flex: 1,
    position: "relative",
    backgroundColor: "#F8F9FA",
  },
});
