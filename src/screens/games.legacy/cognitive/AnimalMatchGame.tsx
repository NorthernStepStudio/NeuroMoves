import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '../../../core/GameContext';
import { colors, spacing, borderRadius, shadows } from '../../../theme/colors';

import { PuzzleBoard } from '../../../features/puzzle/components/PuzzleBoard';
import { DraggablePiece } from '../../../features/puzzle/components/DraggablePiece';
import { RewardFeedback } from '../../../features/puzzle/components/RewardFeedback';
import { usePuzzleGame } from '../../../features/puzzle/usePuzzleGame';
import { usePuzzleAudioManager } from '../../../features/puzzle/audioManager';
import { VoiceService } from '../../../core/VoiceService';
import { FARM_PIECES, FARM_SLOTS, BOARD_WIDTH, BOARD_HEIGHT } from './gameData/farmAnimals';
import { Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const BOARD_MARGIN_X = (screenWidth - BOARD_WIDTH) / 2;
const BOARD_Y = 20; // Matches marginTop in PuzzleBoard styles

const FIXED_BOARD_LAYOUT = {
  x: BOARD_MARGIN_X,
  y: BOARD_Y,
  width: BOARD_WIDTH,
  height: BOARD_HEIGHT
};

export default function AnimalMatchGame() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { startGame, endGame, speak, unlockInput } = useGame();
  const { playAnimalSound, playAnimalName } = usePuzzleAudioManager();
  
  const { 
    placedPieces, 
    isComplete, 
    showCongrats, 
    handlePieceDrop, 
    resetPuzzle,
    scheduleTimer,
    clearAudioTimers
  } = usePuzzleGame(FARM_PIECES, FARM_SLOTS);

  useEffect(() => {
    let mounted = true;
    
    async function initGame() {
      await startGame('animal-match');
      if (mounted) {
        // Only speak after engine is fully started and deck is cleared
        scheduleTimer(() => {
          speak(t('animalMatch.instruction'));
        }, 200);
      }
    }

    initGame();

    return () => {
      mounted = false;
      endGame();
    };
  }, []);

  useEffect(() => {
    if (isComplete) {
      // Sync with the 3.5s congrats overlay timing in usePuzzleGame
      scheduleTimer(async () => {
        unlockInput(); // Ensure UI is unlocked for the congrats screen
        await VoiceService.stop(); // Force stop any lingering animal names
        speak(t('animalMatch.greatJob'));
      }, 3500);
    }
  }, [isComplete, speak]);

  const handleReplay = () => {
    resetPuzzle();
    scheduleTimer(() => speak(t('animalMatch.instruction')), 100);
  };

  const handleNext = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient colors={['#F8F9FA', '#E9ECEF']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <Pressable 
          style={styles.backButton} 
          onPress={handleNext}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Ionicons name="arrow-back" size={28} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t('animalMatch.title')}</Text>
        <Pressable 
          style={styles.restartButton} 
          onPress={handleReplay}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="refresh" size={24} color={colors.accentPrimary} />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.gameArea}>
        <PuzzleBoard 
          slots={FARM_SLOTS} 
          placedPieces={placedPieces} 
        />
        
        {FARM_PIECES.map(piece => (
          <DraggablePiece 
            key={piece.id} 
            piece={piece} 
            slot={FARM_SLOTS.find(s => s.id === piece.slotId)!}
            boardLayout={FIXED_BOARD_LAYOUT}
            isPlaced={placedPieces.includes(piece.id)}
            onDrop={(id, x, y) => handlePieceDrop(id, x, y, FIXED_BOARD_LAYOUT)}
            onPress={() => {
              playAnimalSound(piece.soundCue);
              scheduleTimer(() => playAnimalName(piece.name), 1000);
            }}
          />
        ))}
      </View>

      <RewardFeedback 
        isVisible={showCongrats} 
        onReplay={handleReplay} 
        onNext={handleNext} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA', // Soft warm background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  gameArea: {
    flex: 1,
    position: 'relative',
  },
  restartButton: {
    padding: spacing.xs,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: colors.accentPrimary,
  }
});
