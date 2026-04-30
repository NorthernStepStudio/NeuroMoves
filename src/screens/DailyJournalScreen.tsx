import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { addJournalEntry, deleteJournalEntry, JournalEntry, loadJournalEntries } from '../core/journal';
import { CompanionSyncService } from '../services/CompanionSyncService';
import { useAuth } from '../core/AuthContext';
import { borderRadius, colors, fontSize, shadows, spacing } from '../theme/colors';

export default function DailyJournalScreen() {
  const { selectedChild } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [text, setText] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);

  const refreshEntries = useCallback(async () => {
    if (selectedChild?.id) {
      await CompanionSyncService.sync(selectedChild.id).catch(() => undefined);
    }
    loadJournalEntries().then(setEntries);
  }, [selectedChild?.id]);

  useFocusEffect(
    useCallback(() => {
      refreshEntries();
    }, [refreshEntries])
  );

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow photo library access to attach journal photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3]
    });

    if (!result.canceled && result.assets?.length) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const saveEntry = async () => {
    if (!text.trim() && !photoUri) {
      Alert.alert('Add a note or photo', 'Please add some text or attach a photo first.');
      return;
    }

    await addJournalEntry({ text: text.trim() || 'Photo-only moment', photoUri });
    if (selectedChild?.id) {
      await CompanionSyncService.sync(selectedChild.id).catch(() => undefined);
    }
    setText('');
    setPhotoUri(undefined);
    refreshEntries();
  };

  const confirmDelete = (entry: JournalEntry) => {
    Alert.alert('Delete Entry', 'Are you sure you want to remove this journal entry?', [
      { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteJournalEntry(entry.id);
            if (selectedChild?.id) {
              await CompanionSyncService.deleteJournalEntryRemote(entry.id, selectedChild.id);
              await CompanionSyncService.sync(selectedChild.id).catch(() => undefined);
            }
            refreshEntries();
          }
        }
      ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Daily Journal</Text>
        <Text style={styles.headerSubtitle}>Track real-life wins outside the games.</Text>

        <View style={styles.composerCard}>
          <Text style={styles.sectionTitle}>New Entry</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            placeholder="What went well today? (e.g., used new words at dinner, followed 2-step directions)"
            placeholderTextColor={colors.textMuted}
            style={styles.textInput}
          />

          {photoUri ? (
            <View style={styles.photoPreviewBlock}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              <Pressable onPress={() => setPhotoUri(undefined)} style={styles.removePhotoButton}>
                <Text style={styles.removePhotoText}>Remove photo</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.composerActions}>
            <Pressable onPress={pickPhoto} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Attach Photo</Text>
            </Pressable>
            <Pressable onPress={saveEntry} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Save Entry</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Notes</Text>
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptySubtitle}>Add your first real-life win above.</Text>
          </View>
        ) : (
          entries.map(entry => (
            <View key={entry.id} style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryDate}>
                  {new Date(entry.createdAt).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
                <Pressable onPress={() => confirmDelete(entry)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              </View>

              <Text style={styles.entryText}>{entry.text}</Text>

              {entry.photoUri ? (
                <Image source={{ uri: entry.photoUri }} style={styles.entryPhoto} />
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    color: colors.textPrimary,
    fontWeight: '800'
  },
  headerSubtitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: fontSize.base,
    marginBottom: spacing.sm
  },
  composerCard: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm
  },
  textInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    color: colors.textPrimary,
    padding: spacing.sm,
    textAlignVertical: 'top',
    backgroundColor: colors.bgSecondary,
    marginBottom: spacing.sm
  },
  composerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.accentPrimary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    paddingVertical: spacing.sm
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700'
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    paddingVertical: spacing.sm
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontWeight: '600'
  },
  photoPreviewBlock: {
    marginBottom: spacing.sm
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs
  },
  removePhotoButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.sm
  },
  removePhotoText: {
    color: colors.error,
    fontWeight: '600',
    fontSize: fontSize.xs
  },
  entryCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs
  },
  entryDate: {
    color: colors.textMuted,
    fontSize: fontSize.xs
  },
  deleteText: {
    color: colors.error,
    fontWeight: '600',
    fontSize: fontSize.xs
  },
  entryText: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    marginBottom: spacing.sm
  },
  entryPhoto: {
    width: '100%',
    height: 180,
    borderRadius: borderRadius.md
  },
  emptyState: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    padding: spacing.lg
  },
  emptyTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.textPrimary
  },
  emptySubtitle: {
    marginTop: spacing.xs,
    color: colors.textSecondary
  }
});
