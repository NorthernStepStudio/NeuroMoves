import React from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PuzzleSlotData } from '../types';
import { colors, spacing } from '../../../theme/colors';
import { BOARD_WIDTH, BOARD_HEIGHT } from '../../../games/animal-match/gameData/farmAnimals';

interface Props {
  slots: PuzzleSlotData[];
  placedPieces: string[];
}

const PIECE_HINTS: Record<string, string> = {
  cow: '\u{1F404}',
  sheep: '\u{1F411}',
  horse: '\u{1F40E}',
  pig: '\u{1F416}',
  duck: '\u{1F986}',
  rooster: '\u{1F413}',
  dog: '\u{1F415}',
  cat: '\u{1F408}',
};

const { width: screenWidth } = Dimensions.get('window');
const BOARD_MARGIN_X = (screenWidth - BOARD_WIDTH) / 2;

export function PuzzleBoard({ slots, placedPieces }: Props) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E5D3B3', '#D9C5A0', '#C8B08A']}
        style={styles.board}
      >
      {slots.map((slot) => {
        const isPlaced = placedPieces.includes(slot.expectedPieceId);
        const hintEmoji = PIECE_HINTS[slot.expectedPieceId] ?? '';
        return (
          <View
            key={slot.id}
            style={[
              styles.slot,
              {
                left: slot.x,
                top: slot.y,
                width: slot.width,
                height: slot.height,
                borderRadius: slot.width / 2,
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.02)']}
              style={styles.slotInner}
            />
            {!isPlaced ? <Text style={styles.slotHint} pointerEvents="none">{hintEmoji}</Text> : null}
          </View>
        );
      })}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    marginLeft: BOARD_MARGIN_X,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    borderRadius: 32,
    backgroundColor: '#D9C5A0',
  },
  board: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    borderWidth: 8,
    borderColor: '#B08D57',
    position: 'relative',
    overflow: 'hidden',
  },
  slot: {
    position: 'absolute',
    backgroundColor: '#C8B08A',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotInner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  slotHint: {
    fontSize: 38,
    opacity: 0.35,
  },
});
