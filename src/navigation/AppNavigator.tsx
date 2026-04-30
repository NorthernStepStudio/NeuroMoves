import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import HomeScreen from '../screens/HomeScreen';
import ActivityDetailScreen from '../screens/ActivityDetailScreen';
import GamesScreen from '../screens/GamesScreen';
import ProgressScreen from '../screens/ProgressScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { colors } from '../theme/colors';
import { GameProvider } from '../core/GameContext';
import { GameId } from '../core/gameTypes';
import { useAuth } from '../core/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import PasswordResetScreen from '../screens/auth/PasswordResetScreen';
import ChildProfilesScreen from '../screens/ChildProfilesScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
// Feature Screens
import DailyJournalScreen from '../screens/DailyJournalScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import AvatarStudioScreen from '../screens/AvatarStudioScreen';
import { AppErrorBoundary } from '../components/AppErrorBoundary';
import PaywallScreen from '../screens/PaywallScreen';

import {
  ColorMatchGame,
  YesNoGame,
  PopBubblesGame,
  PointItOutGame,
  StackingGame,
  ShapeSortingGame,
  BabySignsGame,
  MagicFingersGame,
  EmotionsGame,
  BodyPartsGame,
  AnimalSoundsGame,
  SizeOrderingGame,
  TracingGame,
  NumberTracingGame,
  LetterRecognitionGame,
  NumberRecognitionGame,
} from '../screens/games';

import MomentsGallery from '../screens/MomentsGallery';

type ChildProfilesParams = { requiredSetup?: boolean } | undefined;

export type RootStackParamList = {
  Tabs: undefined;
  ActivityDetail: { activityId: string };
  ColorMatchGame: undefined;
  YesNoGame: undefined;
  PopBubblesGame: undefined;
  PointItOutGame: undefined;
  StackingGame: undefined;
  ShapeSortingGame: undefined;
  BabySignsGame: undefined;
  MagicFingersGame: undefined;
  EmotionsGame: undefined;
  BodyPartsGame: undefined;
  AnimalSoundsGame: undefined;
  SizeOrderingGame: undefined;
  TracingGame: undefined;
  NumberTracingGame: undefined;
  LetterRecognitionGame: undefined;
  NumberRecognitionGame: undefined;
  MomentsGallery: undefined;
  ChildProfiles: ChildProfilesParams;
  DailyJournal: undefined;
  Achievements: undefined;
  AvatarStudio: undefined;
  Paywall: { gameId?: GameId } | undefined;
};

type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  PasswordReset: undefined;
};

export const GAME_SCREEN_MAP: Record<GameId, keyof RootStackParamList> = {
  'color-match': 'ColorMatchGame',
  'yes-no': 'YesNoGame',
  'pop-bubbles': 'PopBubblesGame',
  'point-it-out': 'PointItOutGame',
  'stacking': 'StackingGame',
  'shape-sorting': 'ShapeSortingGame',
  'baby-signs': 'BabySignsGame',
  'magic-fingers': 'MagicFingersGame',
  'emotions': 'EmotionsGame',
  'body-parts': 'BodyPartsGame',
  'animal-sounds': 'AnimalSoundsGame',
  'size-ordering': 'SizeOrderingGame',
  'tracing': 'TracingGame',
  'number-tracing': 'NumberTracingGame',
  'letter-recognition': 'LetterRecognitionGame',
  'number-recognition': 'NumberRecognitionGame',
};

const linking: { prefixes: string[]; config: { screens: Record<string, any> } } = {
  prefixes: [Linking.createURL('/'), 'neuromoves://'],
  config: {
    screens: {
      Tabs: {
        screens: {
          Home: 'home',
          Activities: 'activities',
          Progress: 'progress',
          Settings: 'settings',
        },
      },
      ColorMatchGame: 'game/color-match',
      YesNoGame: 'game/yes-no',
      PopBubblesGame: 'game/pop-bubbles',
      PointItOutGame: 'game/point-it-out',
      StackingGame: 'game/stacking',
      ShapeSortingGame: 'game/shape-sorting',
      BabySignsGame: 'game/baby-signs',
      MagicFingersGame: 'game/magic-fingers',
      EmotionsGame: 'game/emotions',
      BodyPartsGame: 'game/body-parts',
      AnimalSoundsGame: 'game/animal-sounds',
      SizeOrderingGame: 'game/size-ordering',
      TracingGame: 'game/tracing',
      NumberTracingGame: 'game/number-tracing',
      LetterRecognitionGame: 'game/letter-recognition',
      NumberRecognitionGame: 'game/number-recognition',
      DailyJournal: 'journal',
      Achievements: 'achievements',
      AvatarStudio: 'avatar',
      Paywall: 'upgrade',
      ChildProfiles: 'profiles',
      MomentsGallery: 'moments',
    },
  },
};

const RootStack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator();
const SetupStack = createStackNavigator<{
  Onboarding: undefined;
  ChildProfiles: ChildProfilesParams;
}>();

function Tabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgSecondary,
          borderTopWidth: 0,
          paddingTop: 8,
          paddingBottom: 8,
          height: 70,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 10,
        },
        tabBarActiveTintColor: colors.accentPrimary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const iconMap: Record<string, { outline: keyof typeof Ionicons.glyphMap; filled: keyof typeof Ionicons.glyphMap }> = {
            Home: { outline: 'home-outline', filled: 'home' },
            Activities: { outline: 'grid-outline', filled: 'grid' },
            Progress: { outline: 'bar-chart-outline', filled: 'bar-chart' },
            Settings: { outline: 'settings-outline', filled: 'settings' }
          };
          const icons = iconMap[route.name];
          return <Ionicons name={focused ? icons.filled : icons.outline} color={color} size={focused ? size + 2 : size} />;
        }
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarAccessibilityLabel: 'Home tab', tabBarLabel: t('nav.home') }} />
      <Tab.Screen name="Activities" component={GamesScreen} options={{ tabBarAccessibilityLabel: 'Activities tab', tabBarLabel: t('nav.activities') }} />
      <Tab.Screen name="Progress" component={ProgressScreen} options={{ tabBarAccessibilityLabel: 'Progress tab', tabBarLabel: t('nav.progress') }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarAccessibilityLabel: 'Settings tab', tabBarLabel: t('nav.settings') }} />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="PasswordReset" component={PasswordResetScreen} />
    </AuthStack.Navigator>
  );
}

function ChildSetupNavigator() {
  return (
    <SetupStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="Onboarding"
    >
      <SetupStack.Screen name="Onboarding" component={OnboardingScreen} />
      <SetupStack.Screen
        name="ChildProfiles"
        component={ChildProfilesScreen}
        initialParams={{ requiredSetup: true }}
      />
    </SetupStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgSecondary },
        headerTintColor: colors.textPrimary,
      }}
    >
      <RootStack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <RootStack.Screen name="ActivityDetail" component={ActivityDetailScreen} options={{ title: 'Activity' }} />

      <RootStack.Screen name="ColorMatchGame" component={ColorMatchGame} options={{ headerShown: false }} />
      <RootStack.Screen name="YesNoGame" component={YesNoGame} options={{ headerShown: false }} />
      <RootStack.Screen name="PopBubblesGame" component={PopBubblesGame} options={{ headerShown: false }} />
      <RootStack.Screen name="PointItOutGame" component={PointItOutGame} options={{ headerShown: false }} />
      <RootStack.Screen name="StackingGame" component={StackingGame} options={{ headerShown: false }} />
      <RootStack.Screen name="ShapeSortingGame" component={ShapeSortingGame} options={{ headerShown: false }} />
      <RootStack.Screen name="BabySignsGame" component={BabySignsGame} options={{ headerShown: false }} />
      <RootStack.Screen name="MagicFingersGame" component={MagicFingersGame} options={{ headerShown: false }} />
      <RootStack.Screen name="EmotionsGame" component={EmotionsGame} options={{ headerShown: false }} />
      <RootStack.Screen name="BodyPartsGame" component={BodyPartsGame} options={{ headerShown: false }} />
      <RootStack.Screen name="AnimalSoundsGame" component={AnimalSoundsGame} options={{ headerShown: false }} />
      <RootStack.Screen name="SizeOrderingGame" component={SizeOrderingGame} options={{ headerShown: false }} />
      <RootStack.Screen name="TracingGame" component={TracingGame} options={{ headerShown: false }} />
      <RootStack.Screen name="NumberTracingGame" component={NumberTracingGame} options={{ headerShown: false }} />
      <RootStack.Screen name="LetterRecognitionGame" component={LetterRecognitionGame} options={{ headerShown: false }} />
      <RootStack.Screen name="NumberRecognitionGame" component={NumberRecognitionGame} options={{ headerShown: false }} />
      <RootStack.Screen name="MomentsGallery" component={MomentsGallery} options={{ headerShown: false }} />
      <RootStack.Screen name="ChildProfiles" component={ChildProfilesScreen} options={{ title: 'Child Profiles' }} />
      <RootStack.Screen name="DailyJournal" component={DailyJournalScreen} options={{ title: 'Daily Journal' }} />
      <RootStack.Screen name="Achievements" component={AchievementsScreen} options={{ title: 'Achievements' }} />
      <RootStack.Screen name="AvatarStudio" component={AvatarStudioScreen} options={{ title: 'Avatar Studio' }} />
      <RootStack.Screen name="Paywall" component={PaywallScreen} options={{ title: 'Upgrade to Pro' }} />
    </RootStack.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.accentPrimary} />
      <Text style={styles.loadingText}>Loading account...</Text>
    </View>
  );
}

export default function AppNavigator() {
  const { initializing, isAuthenticated, selectedChild } = useAuth();

  if (initializing) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <AppErrorBoundary>
        <NavigationContainer>
          <AuthNavigator />
        </NavigationContainer>
      </AppErrorBoundary>
    );
  }

  if (!selectedChild) {
    return (
      <AppErrorBoundary>
        <NavigationContainer>
          <ChildSetupNavigator />
        </NavigationContainer>
      </AppErrorBoundary>
    );
  }

  return (
    <AppErrorBoundary>
      <GameProvider>
        <NavigationContainer linking={linking}>
          <MainNavigator />
        </NavigationContainer>
      </GameProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgPrimary
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary
  }
});
