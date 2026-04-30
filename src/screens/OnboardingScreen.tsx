import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../core/AuthContext';
import { loadSettings, saveSettings } from '../core/storage';
import {
  deriveBaselineDifficulty,
  DevelopmentFocus,
  InitialAssessmentAnswers,
  saveOnboardingRecord
} from '../core/onboarding';
import { borderRadius, colors, fontSize, spacing } from '../theme/colors';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'it', label: 'Italian' }
];

const FOCUS_OPTIONS: Array<{ value: DevelopmentFocus; label: string; subtitle: string }> = [
  { value: 'motor', label: 'Motor Skills', subtitle: 'Fine and gross motor coordination' },
  { value: 'speech', label: 'Speech', subtitle: 'Early language and communication' },
  { value: 'cognitive', label: 'Cognitive', subtitle: 'Memory, matching, and problem-solving' },
  { value: 'sensory', label: 'Sensory', subtitle: 'Sound and sensory engagement' }
];

const ASSESSMENT_QUESTIONS: Array<{ key: keyof InitialAssessmentAnswers; label: string }> = [
  { key: 'followsTwoStepInstructions', label: 'Can follow two-step instructions' },
  { key: 'usesShortPhrases', label: 'Uses short phrases (2-3 words)' },
  { key: 'completesSimplePuzzles', label: 'Completes simple matching/puzzle tasks' }
];

export default function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const { addChild } = useAuth();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [childName, setChildName] = useState('');
  const [ageMonths, setAgeMonths] = useState('24');
  const [language, setLanguage] = useState('en');
  const [focus, setFocus] = useState<DevelopmentFocus>('motor');
  const [assessment, setAssessment] = useState<InitialAssessmentAnswers>({
    followsTwoStepInstructions: false,
    usesShortPhrases: false,
    completesSimplePuzzles: false
  });

  const parsedAgeMonths = useMemo(() => {
    const parsed = Number(ageMonths);
    if (!Number.isFinite(parsed)) return 24;
    return Math.max(12, Math.min(96, Math.round(parsed)));
  }, [ageMonths]);

  const baselineDifficulty = useMemo(
    () => deriveBaselineDifficulty(assessment),
    [assessment]
  );

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(childName.trim());
    return true;
  }, [childName, step]);

  const toggleAssessment = (key: keyof InitialAssessmentAnswers, value: boolean) => {
    setAssessment(prev => ({ ...prev, [key]: value }));
  };

  const handleFinish = async () => {
    if (!childName.trim()) {
      Alert.alert('Child name required', 'Please enter a child name to continue.');
      return;
    }

    try {
      setSubmitting(true);
      const child = await addChild({
        name: childName.trim(),
        language,
        age_months: parsedAgeMonths
      });

      const currentSettings = await loadSettings();
      await saveSettings({
        ...currentSettings,
        childAgeMonths: parsedAgeMonths
      });

      await saveOnboardingRecord({
        childId: child.id,
        childName: child.name,
        ageMonths: parsedAgeMonths,
        language,
        developmentFocus: focus,
        baselineDifficulty,
        assessment,
        completedAt: new Date().toISOString()
      });
    } catch (e: any) {
      Alert.alert('Setup failed', e?.message || 'Could not complete onboarding.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>First Run Setup</Text>
        <Text style={styles.subtitle}>
          Step {step + 1} of 3
        </Text>

        {step === 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Child Profile</Text>
            <TextInput
              value={childName}
              onChangeText={setChildName}
              placeholder="Child name"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <TextInput
              value={ageMonths}
              onChangeText={setAgeMonths}
              keyboardType="number-pad"
              placeholder="Age in months"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <View style={styles.pillRow}>
              {LANGUAGE_OPTIONS.map(option => (
                <Pressable
                  key={option.value}
                  onPress={() => setLanguage(option.value)}
                  style={[styles.pill, language === option.value && styles.pillSelected]}
                >
                  <Text style={[styles.pillText, language === option.value && styles.pillTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Development Focus</Text>
            {FOCUS_OPTIONS.map(option => (
              <Pressable
                key={option.value}
                onPress={() => setFocus(option.value)}
                style={[styles.optionRow, focus === option.value && styles.optionRowSelected]}
              >
                <Text style={styles.optionTitle}>{option.label}</Text>
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Initial Assessment</Text>
            <Text style={styles.assessmentHelp}>
              Answer based on your child&apos;s current day-to-day behavior.
            </Text>
            {ASSESSMENT_QUESTIONS.map(item => (
              <View key={item.key} style={styles.assessmentRow}>
                <Text style={styles.assessmentLabel}>{item.label}</Text>
                <View style={styles.assessmentButtons}>
                  <Pressable
                    onPress={() => toggleAssessment(item.key, true)}
                    style={[
                      styles.answerButton,
                      assessment[item.key] && styles.answerButtonSelected
                    ]}
                  >
                    <Text style={[styles.answerText, assessment[item.key] && styles.answerTextSelected]}>Yes</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => toggleAssessment(item.key, false)}
                    style={[
                      styles.answerButton,
                      !assessment[item.key] && styles.answerButtonSelected
                    ]}
                  >
                    <Text style={[styles.answerText, !assessment[item.key] && styles.answerTextSelected]}>No</Text>
                  </Pressable>
                </View>
              </View>
            ))}

            <View style={styles.baselineCard}>
              <Text style={styles.baselineTitle}>Recommended Starting Level</Text>
              <Text style={styles.baselineValue}>{baselineDifficulty.toUpperCase()}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          {step > 0 ? (
            <Pressable onPress={() => setStep(step - 1)} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </Pressable>
          ) : (
            <View style={styles.actionsSpacer} />
          )}

          {step < 2 ? (
            <Pressable
              onPress={() => setStep(step + 1)}
              disabled={!canContinue}
              style={[styles.primaryButton, !canContinue && styles.buttonDisabled]}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleFinish}
              disabled={submitting}
              style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Complete Setup</Text>
              )}
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={() => navigation.navigate('ChildProfiles', { requiredSetup: true })}
          style={styles.skipLink}
        >
          <Text style={styles.skipLinkText}>Open child profile manager</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary
  },
  content: {
    flex: 1,
    padding: spacing.lg
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: '800'
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md
  },
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.md
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontWeight: '700',
    marginBottom: spacing.sm
  },
  input: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs
  },
  pill: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  pillSelected: {
    borderColor: colors.accentPrimary,
    backgroundColor: '#e0f2fe'
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs
  },
  pillTextSelected: {
    color: colors.accentPrimary,
    fontWeight: '700'
  },
  optionRow: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs
  },
  optionRowSelected: {
    borderColor: colors.accentPrimary,
    backgroundColor: '#e0f2fe'
  },
  optionTitle: {
    color: colors.textPrimary,
    fontWeight: '700'
  },
  optionSubtitle: {
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: fontSize.xs
  },
  assessmentHelp: {
    color: colors.textSecondary,
    marginBottom: spacing.sm
  },
  assessmentRow: {
    marginBottom: spacing.sm
  },
  assessmentLabel: {
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  assessmentButtons: {
    flexDirection: 'row',
    gap: spacing.xs
  },
  answerButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    paddingVertical: spacing.xs
  },
  answerButtonSelected: {
    borderColor: colors.accentPrimary,
    backgroundColor: colors.accentPrimary
  },
  answerText: {
    color: colors.textPrimary,
    fontWeight: '600'
  },
  answerTextSelected: {
    color: '#fff'
  },
  baselineCard: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
    borderRadius: borderRadius.md,
    padding: spacing.sm
  },
  baselineTitle: {
    color: '#1e40af',
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    fontWeight: '700'
  },
  baselineValue: {
    color: '#1d4ed8',
    marginTop: 2,
    fontWeight: '800',
    fontSize: fontSize.base
  },
  actions: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm
  },
  actionsSpacer: {
    flex: 1
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.accentPrimary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
    justifyContent: 'center',
    paddingVertical: spacing.sm
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontWeight: '700'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  skipLink: {
    marginTop: spacing.md,
    alignItems: 'center'
  },
  skipLinkText: {
    color: colors.textSecondary,
    textDecorationLine: 'underline'
  }
});
