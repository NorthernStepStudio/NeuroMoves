import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, shadows } from '../theme/colors';

type LanguageCode = 'en' | 'es' | 'it';

interface LanguageGateScreenProps {
  selectedLanguage: LanguageCode;
  onSelectLanguage: (language: LanguageCode) => Promise<void>;
}

const OPTIONS_KEYS = ['en', 'es', 'it'] as const;

export default function LanguageGateScreen({
  selectedLanguage,
  onSelectLanguage
}: LanguageGateScreenProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const handleSelect = async (language: LanguageCode) => {
    if (busy) {
      return;
    }

    setBusy(true);
    await onSelectLanguage(language);
    setBusy(false);
  };

  return (
    <LinearGradient colors={['#fff7ed', '#fafbfc']} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>NEUROMOVES</Text>
        <Text style={styles.title}>{t('languageGate.title')}</Text>
        <Text style={styles.subtitle}>{t('languageGate.subtitle')}</Text>

        <View style={styles.options}>
          {OPTIONS_KEYS.map((code) => {
            const selected = code === selectedLanguage;
            return (
              <Pressable
                key={code}
                disabled={busy}
                onPress={() => void handleSelect(code)}
                style={({ pressed }) => [
                  styles.option,
                  selected ? styles.optionActive : null,
                  pressed || busy ? styles.optionPressed : null
                ]}
              >
                <Text style={[styles.optionLabel, selected ? styles.optionLabelActive : null]}>{t(`languageGate.${code}.label`)}</Text>
                <Text style={styles.optionSubtitle}>{t(`languageGate.${code}.subtitle`)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.xl,
    ...shadows.card
  },
  eyebrow: {
    color: colors.accentPrimary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2
  },
  title: {
    marginTop: 10,
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '800'
  },
  subtitle: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600'
  },
  options: {
    marginTop: spacing.lg,
    gap: spacing.sm
  },
  option: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgSecondary
  },
  optionActive: {
    borderColor: colors.accentPrimary,
    backgroundColor: '#fff7ed'
  },
  optionPressed: {
    opacity: 0.85
  },
  optionLabel: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '700'
  },
  optionLabelActive: {
    color: colors.accentPrimary
  },
  optionSubtitle: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600'
  }
});
