import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

// Keep splash screen visible while fonts/auth load
SplashScreen.preventAutoHideAsync().catch(() => { });

const LANGUAGE_SELECTION_KEY = '@neuromoves_language_selected';
const LANGUAGE_CODE_KEY = '@neuromoves_language';
export type LanguageCode = 'en' | 'es' | 'it';

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  const [isReady, setIsReady] = useState(false);
  const [languageReady, setLanguageReady] = useState(false);
  const [showLanguageGate, setShowLanguageGate] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');

  useEffect(() => {
    // Initialize RevenueCat early
    SubscriptionService.init();

    if (!fontsLoaded) {
      return;
    }

    const loadLanguageChoice = async () => {
      const [savedFlag, savedLanguage] = await Promise.all([
        AsyncStorage.getItem(LANGUAGE_SELECTION_KEY),
        AsyncStorage.getItem(LANGUAGE_CODE_KEY)
      ]);

      const normalized: LanguageCode = (savedLanguage === 'es' || savedLanguage === 'it') ? savedLanguage : 'en';
      await i18n.changeLanguage(normalized);
      setSelectedLanguage(normalized);
      setShowLanguageGate(true); // Always show language gate first
      setLanguageReady(true);
      setIsReady(true);
      SplashScreen.hideAsync().catch(() => { });
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

  if (showLanguageGate) {
    return (
      <LanguageGateScreen
        selectedLanguage={selectedLanguage}
        onSelectLanguage={handleLanguageSelect}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <StatusBar style="dark" />
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}
