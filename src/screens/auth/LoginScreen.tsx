import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/build/providers/Google';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useAuth } from '../../core/AuthContext';
import { borderRadius, colors, fontSize, spacing } from '../../theme/colors';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { login, loginWithGoogle, loginMock } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  const googleAuthConfig = useMemo(() => {
    if (isExpoGo) {
      const expoClientId =
        process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ||
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

      const redirectUri = 'https://auth.expo.io/@northernstep/neuromoves';

      return {
        clientId: expoClientId,
        webClientId: expoClientId,
        redirectUri,
        responseType: AuthSession.ResponseType.IdToken,
        shouldAutoExchangeCode: false,
      };
    }

    return {
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    };
  }, [isExpoGo]);

  const [googleRequest, googleResponse, promptGoogleAuth] = Google.useIdTokenAuthRequest(googleAuthConfig);

  const googleConfigured = useMemo(() => {
    if (isExpoGo) {
      return Boolean(
        process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
      );
    }

    if (Platform.OS === 'ios') return Boolean(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
    if (Platform.OS === 'android') return Boolean(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);
    return Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
  }, [isExpoGo]);

  useEffect(() => {
    if (!googleResponse) return;

    if (googleResponse.type === 'error') {
      const params = googleResponse.params as Record<string, string> | undefined;
      setError(
        googleResponse.error?.message ||
        params?.error_description ||
        params?.error ||
        'Google sign-in failed'
      );
      return;
    }

    if (googleResponse.type !== 'success') return;

    const tokenFromParams = (googleResponse.params as Record<string, string> | undefined)?.id_token;
    const tokenFromAuth = googleResponse.authentication?.idToken;
    const idToken = tokenFromParams || tokenFromAuth;
    if (!idToken) return;

    (async () => {
      try {
        setSubmitting(true);
        setError(null);
        await loginWithGoogle(idToken);
      } catch (e: any) {
        setError(e?.message || 'Google sign-in failed');
      } finally {
        setSubmitting(false);
      }
    })();
  }, [googleResponse, loginWithGoogle]);

  const handleLogin = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e?.message || 'Could not sign in');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    if (!googleConfigured || !googleRequest) {
      setError(
        isExpoGo
          ? 'Google sign-in in Expo Go requires a web/expo client ID and authorized redirect URI.'
          : 'Google sign-in is not configured yet for this build.'
      );
      return;
    }
    setError(null);
    try {
      await promptGoogleAuth();
    } catch (e: any) {
      setError(e?.message || 'Google sign-in failed');
    }
  };

  const handleMockLogin = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await loginMock();
    } catch (e: any) {
      setError(e?.message || 'Mock login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Parent Login</Text>
        <Text style={styles.subtitle}>Sign in to manage your child profiles and sync progress.</Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          placeholderTextColor={colors.textMuted}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          style={styles.input}
          placeholderTextColor={colors.textMuted}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed, submitting && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Log In</Text>}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.googleButton, pressed && styles.buttonPressed]}
          onPress={handleGoogle}
          disabled={submitting || !googleConfigured}
        >
          <Text style={styles.googleButtonText}>
            {googleConfigured ? 'Continue with Google' : 'Google Sign-In (not configured)'}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.mockButton, pressed && styles.buttonPressed]}
          onPress={handleMockLogin}
          disabled={submitting}
        >
          <Text style={styles.mockButtonText}>Developer: Skip Login (Mock)</Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('PasswordReset')}>
          <Text style={styles.link}>Forgot password?</Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.link}>New parent account? Sign up</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    justifyContent: 'center'
  },
  content: {
    padding: spacing.lg,
    gap: spacing.sm
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textPrimary
  },
  subtitle: {
    color: colors.textSecondary,
    marginBottom: spacing.md
  },
  input: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.textPrimary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  primaryButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.accentPrimary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: fontSize.base
  },
  googleButton: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center'
  },
  googleButtonText: {
    color: colors.textPrimary,
    fontWeight: '600'
  },
  mockButton: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accentPrimary,
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center'
  },
  mockButtonText: {
    color: colors.accentPrimary,
    fontWeight: '600'
  },
  link: {
    color: colors.accentPrimary,
    textAlign: 'center',
    marginTop: spacing.sm
  },
  error: {
    color: colors.error,
    marginTop: spacing.xs
  },
  buttonPressed: {
    opacity: 0.9
  },
  buttonDisabled: {
    opacity: 0.6
  }
});
