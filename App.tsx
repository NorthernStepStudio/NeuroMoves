import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/core/AuthContext';
import LanguageGateScreen from './src/screens/LanguageGateScreen';
import { I18nextProvider } from 'react-i18next';
import i18n from './src/i18n';
import { SubscriptionService } from './src/services/SubscriptionService';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: false,
});

// Keep splash screen visible while fonts/auth load
SplashScreen.preventAutoHideAsync().catch(() => { });

const LANGUAGE_SELECTION_KEY = '@neuromoves_language_selected';
const LANGUAGE_CODE_KEY = '@neuromoves_language';
export type LanguageCode = 'en' | 'es' | 'it';

const normalizeLanguage = (value: string | null | undefined): LanguageCode => {
  if (!value) {
    return 'en';
  }

  const normalized = value.toLowerCase();
  if (normalized.startsWith('es')) {
    return 'es';
  }
  if (normalized.startsWith('it')) {
    return 'it';
  }
  return 'en';
};

function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  const [isReady, setIsReady] = useState(false);
  const [languageReady, setLanguageReady] = useState(false);
  const [showLanguageGate, setShowLanguageGate] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');

  useEffect(() => {
    // Subscription layer boots in local-unlocked mode for this build.
    SubscriptionService.init().catch(() => undefined);

    if (!fontsLoaded) {
      return;
    }

    const loadLanguageChoice = async () => {
      try {
        const [savedFlag, savedLanguage] = await Promise.all([
          AsyncStorage.getItem(LANGUAGE_SELECTION_KEY),
          AsyncStorage.getItem(LANGUAGE_CODE_KEY)
        ]);

        const hasLanguageSelection = savedFlag === '1';
        const initialLanguage = hasLanguageSelection
          ? normalizeLanguage(savedLanguage)
          : normalizeLanguage(i18n.language);

        await i18n.changeLanguage(initialLanguage);
        setSelectedLanguage(initialLanguage);
        setShowLanguageGate(!hasLanguageSelection);
      } finally {
        setLanguageReady(true);
        setIsReady(true);
        SplashScreen.hideAsync().catch(() => { });
      }
    };

    void loadLanguageChoice();
  }, [fontsLoaded]);

  const handleLanguageSelect = async (language: LanguageCode) => {
    setSelectedLanguage(language);
    await i18n.changeLanguage(language);
    await AsyncStorage.multiSet([
      [LANGUAGE_SELECTION_KEY, '1'],
      [LANGUAGE_CODE_KEY, language]
    ]);
    setShowLanguageGate(false);
  };

  if (!isReady || !languageReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18n}>
          <StatusBar style="dark" />
          <AuthProvider>
            {showLanguageGate ? (
              <LanguageGateScreen
                selectedLanguage={selectedLanguage}
                onSelectLanguage={handleLanguageSelect}
              />
            ) : (
              <AppNavigator />
            )}
          </AuthProvider>
        </I18nextProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

export default Sentry.wrap(App);
