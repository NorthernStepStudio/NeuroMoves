import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  runOnJS 
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { PuzzlePieceData, PuzzleSlotData } from '../types';
import { colors, shadows, spacing } from '../../../theme/colors';
import { BORDER_WIDTH } from '../../../games/animal-match/gameData/farmAnimals';
import { useGame } from '../../../core/GameContext';

const PIECE_SIZE = 70;
const HALF_PIECE = PIECE_SIZE / 2;

interface Props {
  piece: PuzzlePieceData;
  slot: PuzzleSlotData;
  boardLayout: { x: number; y: number; width: number; height: number } | null;
  isPlaced: boolean;
  onDrop: (pieceId: string, dropX: number, dropY: number) => boolean; // returns true if placed
  onPress?: () => void;
}

export function DraggablePiece({ piece, slot, boardLayout, isPlaced, onDrop, onPress }: Props) {
  const { isBusy } = useGame();
  
  // Shared values for high-performance animations
  const translateX = useSharedValue(piece.initialX);
  const translateY = useSharedValue(piece.initialY);
  const scale = useSharedValue(1);
  const isDragging = useSharedValue(false);

  // Offset storage for drag logic
  const contextX = useSharedValue(piece.initialX);
  const contextY = useSharedValue(piece.initialY);

  const handleDropEnd = (x: number, y: number) => {
    const centerX = x + HALF_PIECE;
    const centerY = y + HALF_PIECE;
    const success = onDrop(piece.id, centerX, centerY);

    if (!success) {
      // Snap back to initial position
      translateX.value = withSpring(piece.initialX);
      translateY.value = withSpring(piece.initialY);
    }
  };

  useEffect(() => {
    if (isPlaced && boardLayout) {
      const targetX = boardLayout.x + BORDER_WIDTH + slot.centerX - HALF_PIECE;
      const targetY = boardLayout.y + BORDER_WIDTH + slot.centerY - HALF_PIECE;
      
      translateX.value = withSpring(targetX);
      translateY.value = withSpring(targetY);
      
      scale.value = withTiming(1.2, { duration: 150 }, () => {
        scale.value = withSpring(1);
      });
    } else if (!isPlaced) {
      translateX.value = withSpring(piece.initialX);
      translateY.value = withSpring(piece.initialY);
    }
  }, [isPlaced, boardLayout, piece.initialX, piece.initialY, slot.centerX, slot.centerY]);

  // Gesture definition
  const panGesture = Gesture.Pan()
    .enabled(!isPlaced && !isBusy)
    .onStart(() => {
      isDragging.value = true;
      contextX.value = translateX.value;
      contextY.value = translateY.value;
      scale.value = withSpring(1.1);
    })
    .onUpdate((event) => {
      translateX.value = contextX.value + event.translationX;
      translateY.value = contextY.value + event.translationY;
    })
    .onEnd((event) => {
      isDragging.value = false;
      scale.value = withSpring(1);
      
      const finalX = contextX.value + event.translationX;
      const finalY = contextY.value + event.translationY;
      
      runOnJS(handleDropEnd)(finalX, finalY);
    });

  // Reanimated style hook - NO .value inside here for modern Reanimated 4 compliance
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      zIndex: isDragging.value ? 1000 : (isPlaced ? 100 : 200),
      // Dynamic shadow based on state
      shadowOpacity: withTiming(isDragging.value ? 0.3 : (isPlaced ? 0.05 : 0.15)),
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.pieceContainer,
          animatedStyle,
          !isDragging.value && !isPlaced && shadows.lg,
          isPlaced && shadows.sm,
        ]}
      >
        <Pressable 
          style={styles.pressableArea} 
          onPress={isPlaced ? onPress : undefined}
        >
          <LinearGradient
            colors={isPlaced ? ['#FFFFFF', '#F8FAFC'] : ['#FFFFFF', '#F1F5F9']}
            style={styles.gradient}
          >
            {piece.emoji ? (
              <Text style={styles.emojiText}>{piece.emoji}</Text>
            ) : (
              <View style={styles.placeholder} />
            )}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  pieceContainer: {
    position: 'absolute',
    width: PIECE_SIZE,
    height: PIECE_SIZE,
    borderRadius: HALF_PIECE,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressableArea: {
    width: '100%',
    height: '100%',
    borderRadius: HALF_PIECE,
    overflow: 'hidden',
  },
  gradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: HALF_PIECE,
  },
  emojiText: {
    fontSize: 50,
  },
  placeholder: {
    width: 50,
    height: 50,
    backgroundColor: colors.accentPrimary,
    borderRadius: 25,
  }
});
