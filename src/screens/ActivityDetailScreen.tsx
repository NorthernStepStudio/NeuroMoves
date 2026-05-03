import React, { useMemo, useState } from 'react';
import { Alert, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { ACTIVITIES } from '../data/activities';
import { AttemptResult, ActivityAttempt } from '../core/types';
import { saveAttempt } from '../core/storage';
import { colors, spacing, borderRadius } from '../theme/colors';

interface RouteParams {
  activityId: string;
}

export default function ActivityDetailScreen() {
  const route = useRoute();
  const { activityId } = route.params as RouteParams;
  const activity = ACTIVITIES.find((item) => item.id === activityId);
  const [tapCount, setTapCount] = useState(0);
  const [dragComplete, setDragComplete] = useState(false);
  const [traceProgress, setTraceProgress] = useState(0);

  const dragResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderRelease: (_, gesture) => {
          const inZone = gesture.moveX > 220 && gesture.moveY < 280;
          if (inZone) setDragComplete(true);
        }
      }),
    []
  );

  const traceResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gesture) => {
          const progress = Math.min(1, Math.max(0, gesture.dx / 200));
          setTraceProgress(progress);
        },
        onPanResponderRelease: () => {
          if (traceProgress >= 0.9) {
            setTraceProgress(1);
          }
        }
      }),
    [traceProgress]
  );

  if (!activity) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <Text style={styles.title}>Activity not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleResult = async (result: AttemptResult) => {
    const attempt: ActivityAttempt = {
      id: `${activity.id}-${Date.now()}`,
      activityId: activity.id,
      dateISO: new Date().toISOString(),
      result
    };
    await saveAttempt(attempt);
    Alert.alert('Saved', 'Progress updated.');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
        <Text style={styles.title}>{activity.title}</Text>
        <Text style={styles.desc}>{activity.description}</Text>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Prompts</Text>
          {activity.prompts.map((prompt) => (
            <Text key={prompt} style={styles.prompt}>- {prompt}</Text>
          ))}
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Coaching Tips</Text>
          {activity.tips.map((tip) => (
            <Text key={tip} style={styles.prompt}>- {tip}</Text>
          ))}
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Why It Helps</Text>
          {activity.benefits.map((benefit) => (
            <Text key={benefit} style={styles.prompt}>- {benefit}</Text>
          ))}
        </View>

        {activity.type === 'tap' && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Tap Practice</Text>
            <Pressable onPress={() => setTapCount((count) => count + 1)} style={styles.tapTarget}>
              <Text style={styles.tapText}>Tap ({tapCount})</Text>
            </Pressable>
          </View>
        )}

        {activity.type === 'drag' && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Drag Practice</Text>
            <View style={styles.dragZone}>
              <View style={[styles.dropZone, dragComplete && styles.dropComplete]} />
              <View {...dragResponder.panHandlers} style={styles.dragItem} />
            </View>
            <Text style={styles.helper}>{dragComplete ? 'Great drop!' : 'Drag the circle into the square.'}</Text>
          </View>
        )}

        {activity.type === 'trace' && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Trace Practice</Text>
            <View style={styles.traceTrack}>
              <View style={[styles.traceFill, { width: `${Math.round(traceProgress * 100)}%` }]} />
              <View {...traceResponder.panHandlers} style={styles.traceHandle} />
            </View>
            <Text style={styles.helper}>Slide across the track.</Text>
          </View>
        )}

        {activity.type === 'sensory' && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Calm Prompt</Text>
            <Text style={styles.helper}>Slow breathing with a steady rhythm.</Text>
          </View>
        )}

        <View style={styles.resultRow}>
          <Pressable onPress={() => handleResult('success')} style={[styles.resultButton, styles.resultSuccess]}>
            <Text style={styles.resultText}>Success</Text>
          </Pressable>
          <Pressable onPress={() => handleResult('tried')} style={[styles.resultButton, styles.resultTried]}>
            <Text style={styles.resultText}>Tried</Text>
          </Pressable>
          <Pressable onPress={() => handleResult('skipped')} style={[styles.resultButton, styles.resultSkipped]}>
            <Text style={styles.resultText}>Skipped</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgPrimary
  },
  scrollView: {
    flex: 1,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700'
  },
  desc: {
    color: colors.textSecondary,
    marginTop: 6
  },
  block: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassBg
  },
  blockTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm
  },
  prompt: {
    color: colors.textSecondary,
    marginBottom: 4
  },
  tapTarget: {
    marginTop: spacing.sm,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.accentSecondary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tapText: {
    color: colors.textPrimary,
    fontWeight: '700'
  },
  dragZone: {
    height: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginTop: spacing.sm,
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: spacing.md
  },
  dropZone: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: colors.accentSecondary,
    borderRadius: 8
  },
  dropComplete: {
    backgroundColor: 'rgba(255, 77, 77, 0.3)'
  },
  dragItem: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.accentSecondary
  },
  traceTrack: {
    marginTop: spacing.sm,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
    justifyContent: 'center'
  },
  traceFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 77, 77, 0.4)'
  },
  traceHandle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accentSecondary,
    marginLeft: 10
  },
  helper: {
    color: colors.textMuted,
    marginTop: spacing.sm
  },
  resultRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl
  },
  resultButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center'
  },
  resultSuccess: {
    backgroundColor: colors.success
  },
  resultTried: {
    backgroundColor: colors.warning
  },
  resultSkipped: {
    backgroundColor: colors.error
  },
  resultText: {
    color: '#fff',
    fontWeight: '700'
  }
});
