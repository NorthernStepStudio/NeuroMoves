import React, { useMemo, useState } from 'react';
import { Alert, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { useRoute } from '@react-navigation/native';
import { ACTIVITIES } from '../data/activities';
import { AttemptResult, ActivityAttempt } from '../core/types';
import { saveAttempt } from '../core/storage';
import { colors, spacing, borderRadius, fontSize } from '../theme/colors';

interface RouteParams {
  activityId: string;
}

export default function ActivityDetailScreen() {
  const route = useRoute();
  const { activityId } = route.params as RouteParams;
  const activity = ACTIVITIES.find((item) => item.id === activityId);
  const [audioUri, setAudioUri] = useState<string | undefined>();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
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
      result,
      audioUri
    };
    await saveAttempt(attempt);
    Alert.alert('Saved', 'Progress updated.');
  };

  const startRecording = async () => {
    try {
      // Stop any playing sound first
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
      }

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone required', 'Enable microphone access to record.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true
      });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
    } catch (e) {
      console.error('Recording error:', e);
      Alert.alert('Recording failed', 'Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setAudioUri(uri || undefined);
      setRecording(null);
    } catch (e) {
      console.error('Stop recording error:', e);
      setRecording(null);
    }
  };

  const playRecording = async () => {
    if (!audioUri) return;

    try {
      // If already playing, stop
      if (sound && isPlaying) {
        await sound.stopAsync();
        setIsPlaying(false);
        return;
      }

      // Unload previous sound if exists
      if (sound) {
        await sound.unloadAsync();
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUri });
      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });

      await newSound.playAsync();
    } catch (e) {
      console.error('Playback error:', e);
      Alert.alert('Playback failed', 'Could not play the recording.');
      setIsPlaying(false);
    }
  };

  const deleteRecording = () => {
    Alert.alert(
      'Delete Recording',
      'Are you sure you want to delete this recording?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (sound) {
              await sound.unloadAsync();
              setSound(null);
            }
            setAudioUri(undefined);
            setIsPlaying(false);
          }
        }
      ]
    );
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

        {activity.category === 'speech' && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>🎤 Voice Recording</Text>

            {/* Record Button */}
            <Pressable
              onPress={recording ? stopRecording : startRecording}
              style={[styles.recordButton, recording && styles.recordingActive]}
            >
              <Text style={styles.recordText}>
                {recording ? '⏹️ Stop Recording' : '🎙️ Start Recording'}
              </Text>
            </Pressable>

            {/* Playback Controls (shown after recording) */}
            {audioUri && !recording && (
              <View style={styles.playbackSection}>
                <Text style={styles.recordingLabel}>✅ Recording saved!</Text>
                <Pressable
                  onPress={playRecording}
                  style={({ pressed }) => [styles.playButton, pressed && { opacity: 0.8 }]}
                >
                  <Text style={styles.playButtonText}>
                    {isPlaying ? '⏹️ Stop Playback' : '▶️ Play Recording'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={deleteRecording}
                  style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.8 }]}
                >
                  <Text style={styles.deleteButtonText}>🗑️ Delete Recording</Text>
                </Pressable>
              </View>
            )}
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
  recordButton: {
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.accentPrimary,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  recordingActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  recordText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: fontSize.base,
  },
  playbackSection: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#dcfce7',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  recordingLabel: {
    color: '#15803d',
    fontWeight: '700',
    fontSize: fontSize.base,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  playbackButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  playButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#3b82f6',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  playButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: fontSize.md,
  },
  deleteButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fef2f2',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#fca5a5',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: fontSize.sm,
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
