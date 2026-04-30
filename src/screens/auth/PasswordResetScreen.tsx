import React, { useState } from 'react';
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
import { useAuth } from '../../core/AuthContext';
import { borderRadius, colors, fontSize, spacing } from '../../theme/colors';

export default function PasswordResetScreen() {
  const navigation = useNavigation<any>();
  const { requestPasswordReset, confirmPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sendCode = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const response = await requestPasswordReset(email.trim());
      setCodeSent(true);
      if (response.debugCode) {
        Alert.alert('Debug Reset Code', `Use this code: ${response.debugCode}`);
      } else {
        Alert.alert('Reset Requested', response.message || 'Check your email for reset instructions.');
      }
    } catch (e: any) {
      setError(e?.message || 'Could not request reset code');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmReset = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await confirmPasswordReset(email.trim(), resetCode.trim(), newPassword);
    } catch (e: any) {
      setError(e?.message || 'Could not reset password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Request a code, then set a new password.</Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Account email"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          placeholderTextColor={colors.textMuted}
        />

        {!codeSent ? (
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed, submitting && styles.buttonDisabled]}
            onPress={sendCode}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Send Reset Code</Text>}
          </Pressable>
        ) : (
          <>
            <TextInput
              value={resetCode}
              onChangeText={setResetCode}
              placeholder="6-digit reset code"
              keyboardType="number-pad"
              style={styles.input}
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password"
              secureTextEntry
              style={styles.input}
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              secureTextEntry
              style={styles.input}
              placeholderTextColor={colors.textMuted}
            />
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed, submitting && styles.buttonDisabled]}
              onPress={confirmReset}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Confirm Reset</Text>}
            </Pressable>
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Back to login</Text>
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
