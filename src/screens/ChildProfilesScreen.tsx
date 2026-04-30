import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../core/AuthContext';
import { borderRadius, colors, fontSize, spacing } from '../theme/colors';

interface RouteParams {
  requiredSetup?: boolean;
}

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'it', label: 'Italian' }
];

export default function ChildProfilesScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { children, selectedChild, addChild, selectChild, deleteChild, updateChild, parent } = useAuth();
  const [name, setName] = useState('');
  const [ageMonths, setAgeMonths] = useState('24');
  const [language, setLanguage] = useState('en');
  const [editingId, setEditingId] = useState<number | null>(null);

  const requiredSetup = Boolean((route.params as RouteParams | undefined)?.requiredSetup);
  const canLeave = !requiredSetup || Boolean(selectedChild);
  const selectedLabel = useMemo(() => selectedChild ? `${selectedChild.name}` : 'None selected', [selectedChild]);

  const handleAddChild = async () => {
    const parsedAge = Number(ageMonths);
    if (!name.trim()) {
      Alert.alert('Child name required', 'Please enter a child name.');
      return;
    }
    try {
      await addChild({
        name: name.trim(),
        language,
        age_months: Number.isFinite(parsedAge) ? Math.max(0, parsedAge) : 24
      });
      setName('');
      setAgeMonths('24');
      setLanguage('en');
    } catch (e: any) {
      Alert.alert('Could not add child', e?.message || 'Please try again.');
    }
  };

  const promptDelete = (childId: number, childName: string) => {
    Alert.alert(
      'Delete Child Profile',
      `Delete "${childName}"? Progress history for this child will no longer be available.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChild(childId);
            } catch (e: any) {
              Alert.alert('Delete failed', e?.message || 'Please try again.');
            }
          }
        }
      ]
    );
  };

  const onSaveEdit = async (childId: number) => {
    const parsedAge = Number(ageMonths);
    try {
      await updateChild(childId, {
        name: name.trim() || undefined,
        language,
        age_months: Number.isFinite(parsedAge) ? Math.max(0, parsedAge) : undefined
      });
      setEditingId(null);
      setName('');
      setAgeMonths('24');
      setLanguage('en');
    } catch (e: any) {
      Alert.alert('Update failed', e?.message || 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Child Profiles</Text>
        <Text style={styles.subtitle}>
          Signed in as {parent?.email}. Select the active child or add another one.
        </Text>

        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Active Child</Text>
          <Text style={styles.bannerValue}>{selectedLabel}</Text>
        </View>

        {children.map((child) => {
          const isSelected = selectedChild?.id === child.id;
          const isEditing = editingId === child.id;

          return (
            <View key={child.id} style={[styles.childCard, isSelected && styles.childCardSelected]}>
              <View style={styles.childHeader}>
                <View>
                  <Text style={styles.childName}>{child.name}</Text>
                  <Text style={styles.childMeta}>
                    {child.language.toUpperCase()} - {child.age_months ?? 24} months
                  </Text>
                </View>
                <View style={styles.row}>
                  <Pressable onPress={() => selectChild(child.id)} style={styles.selectButton}>
                    <Text style={styles.selectButtonText}>{isSelected ? 'Selected' : 'Use'}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (isEditing) {
                        setEditingId(null);
                        return;
                      }
                      setEditingId(child.id);
                      setName(child.name);
                      setAgeMonths(String(child.age_months ?? 24));
                      setLanguage(child.language || 'en');
                    }}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>{isEditing ? 'Cancel' : 'Edit'}</Text>
                  </Pressable>
                  <Pressable onPress={() => promptDelete(child.id, child.name)} style={styles.deleteButton}>
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                </View>
              </View>

              {isEditing ? (
                <View style={styles.editPanel}>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                    placeholder="Child name"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TextInput
                    value={ageMonths}
                    onChangeText={setAgeMonths}
                    keyboardType="number-pad"
                    style={styles.input}
                    placeholder="Age (months)"
                    placeholderTextColor={colors.textMuted}
                  />
                  <View style={styles.languageRow}>
                    {LANGUAGE_OPTIONS.map(option => (
                      <Pressable
                        key={option.value}
                        onPress={() => setLanguage(option.value)}
                        style={[styles.languagePill, language === option.value && styles.languagePillSelected]}
                      >
                        <Text style={[styles.languagePillText, language === option.value && styles.languagePillTextSelected]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable onPress={() => onSaveEdit(child.id)} style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>Save Changes</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Add another child</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Child name"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            value={ageMonths}
            onChangeText={setAgeMonths}
            keyboardType="number-pad"
            style={styles.input}
            placeholder="Age in months (e.g. 24)"
            placeholderTextColor={colors.textMuted}
          />
          <View style={styles.languageRow}>
            {LANGUAGE_OPTIONS.map(option => (
              <Pressable
                key={option.value}
                onPress={() => setLanguage(option.value)}
                style={[styles.languagePill, language === option.value && styles.languagePillSelected]}
              >
                <Text style={[styles.languagePillText, language === option.value && styles.languagePillTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={handleAddChild} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Add Child</Text>
          </Pressable>
        </View>

        {canLeave ? (
          <Pressable onPress={() => navigation.goBack()} style={styles.doneButton}>
            <Text style={styles.doneButtonText}>
              {requiredSetup ? 'Continue to App' : 'Done'}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.blockingText}>
            Add and select at least one child profile to continue.
          </Text>
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
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textPrimary
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md
  },
  banner: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  bannerTitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: 'uppercase'
  },
  bannerValue: {
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: spacing.xs
  },
  childCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  childCardSelected: {
    borderColor: colors.accentPrimary
  },
  childHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  childName: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: fontSize.base
  },
  childMeta: {
    color: colors.textSecondary,
    marginTop: 2
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center'
  },
  selectButton: {
    backgroundColor: colors.accentPrimary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  selectButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: fontSize.xs
  },
  secondaryButton: {
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: fontSize.xs
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  deleteButtonText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: fontSize.xs
  },
  formCard: {
    marginTop: spacing.md,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md
  },
  formTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm
  },
  input: {
    backgroundColor: colors.bgPrimary,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  languageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm
  },
  languagePill: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  languagePillSelected: {
    borderColor: colors.accentPrimary,
    backgroundColor: '#e0f2fe'
  },
  languagePillText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs
  },
  languagePillTextSelected: {
    color: colors.accentPrimary,
    fontWeight: '700'
  },
  primaryButton: {
    backgroundColor: colors.accentPrimary,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    paddingVertical: spacing.sm
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700'
  },
  doneButton: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgTertiary,
    alignItems: 'center',
    paddingVertical: spacing.md
  },
  doneButtonText: {
    color: colors.textPrimary,
    fontWeight: '700'
  },
  blockingText: {
    color: colors.warning,
    marginTop: spacing.md,
    textAlign: 'center'
  },
  editPanel: {
    marginTop: spacing.sm,
    borderTopColor: colors.cardBorder,
    borderTopWidth: 1,
    paddingTop: spacing.sm
  }
});
