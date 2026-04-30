import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccountService } from '../services/AccountService';
import { API_BASE_URL } from '../services/ApiConfig';
import { useNavigation } from '@react-navigation/native';
import { loadSettings, saveSettings, resetAllProgress } from '../core/storage';
import { SettingsState } from '../core/types';
import { colors, spacing, borderRadius, fontSize, shadows } from '../theme/colors';
import { useGame } from '../core/GameContext';
import { useAuth } from '../core/AuthContext';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

type LanguageCode = 'en' | 'es' | 'it';
const LANGUAGE_SELECTION_KEY = '@neuromoves_language_selected';
const LANGUAGE_CODE_KEY = '@neuromoves_language';

// Legal content
const PRIVACY_POLICY = `Privacy Policy

NeuroMoves ("we", "our", or "us") is committed to protecting your privacy.
This application is designed for parents to use with their children. We do not collect personally identifiable information from children. All child profiles, progress data, and daily journals are stored locally on your device unless you explicitly choose to back them up or sync them.

If you create a parent account, we may collect your email address for authentication and account recovery purposes. We use standard analytics to understand how the app is used and to improve the experience. We do not share your data with advertisers.

Children's Privacy:
This app is designed for parents to use with their children. We comply with COPPA (Children's Online Privacy Protection Act) requirements.

Contact:
For privacy concerns, contact us at privacy@reallifesteps.app`;

const TERMS_OF_SERVICE = `Terms of Service

By using NeuroMoves, you agree to these terms.
The app provides educational content and tracking tools. You are responsible for the physical safety of your child during all activities. The content is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.

We reserve the right to modify these terms or the app's features at any time. Accounts that violate our policies may be terminated.`;

const DISCLAIMER_TEXT = `Medical Disclaimer

NeuroMoves does not diagnose, treat, or cure any condition. Always consult with a licensed Speech-Language Pathologist or Occupational Therapist for professional guidance.
The activities in this app are designed as supplementary developmental practice, not clinical therapy. Use this app at your own risk.

Independence Statement:
NeuroMoves is an independent educational app developed to support families. We are not affiliated with, endorsed by, or connected to any medical institution, healthcare organization, government agency, or educational authority.

The activities provided are general developmental exercises designed to complement—not replace—professional therapy and guidance.`;

const ABOUT_TEXT = `About NeuroMoves

NeuroMoves is an independent educational app created to help children develop essential skills from an early age—and to support parents in guiding that journey.

Our Purpose:
We believe in the power of early development. Our goal is simple: help kids build the motor, speech, cognitive, and sensory skills they need—as early as possible—through fun, parent-guided daily practice.

Who We Are:
We are independent developers passionate about early childhood development. We created this app to make developmental practice accessible, engaging, and effective for families everywhere.

What We Are NOT:
• We are not a medical institution
• We are not affiliated with any hospital or clinic
• We are not connected to any government agency
• We do not receive funding from healthcare organizations
• We are not a substitute for professional therapy

Important Note:
While our activities are designed to support development, they are not a replacement for professional evaluation or therapy. Always consult qualified healthcare professionals for diagnosis, treatment, and personalized guidance.`;

const ACTIVITY_GUIDE = `Activity Guide

Our games and activities are designed to support different areas of child development. Here's what each category helps with:

🤸 MOTOR SKILLS
Activities that develop fine and gross motor control.

• Pop Bubbles - Develops hand-eye coordination and finger tapping precision
• Letter Tracing - Builds pre-writing skills and finger control
• Stacking - Improves spatial awareness and motor planning
• Magic Fingers - Strengthens finger isolation and dexterity
• Shape Sorting - Enhances grasp patterns and visual-motor integration

🧠 THINKING (COGNITIVE)
Activities that build problem-solving and recognition skills.

• Color Match - Develops color recognition and matching abilities
• Yes/No - Builds decision-making and concept understanding
• Point It Out - Improves visual scanning and object recognition
• Emotions - Teaches emotional recognition and social awareness
• Body Parts - Builds body awareness and vocabulary
• Size Ordering - Develops comparison and sequencing skills

🗣️ SPEECH
Activities that support communication development.

• Baby Signs - Introduces basic sign language to support early communication

👂 SENSORY
Activities that engage sensory processing.

• Animal Sounds - Develops auditory discrimination and association

Each activity adapts to your child's progress and provides gentle feedback to encourage learning.`;

interface SettingRowProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

function SettingRow({ icon, title, subtitle, onPress, rightElement }: SettingRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.settingRow, pressed && onPress && styles.settingRowPressed]}
      disabled={!onPress}
    >
      <Text style={styles.settingIcon}>{icon}</Text>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement || (onPress && <Text style={styles.chevron}>›</Text>)}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

interface LegalModalProps {
  visible: boolean;
  title: string;
  content: string;
  onClose: () => void;
}

function LegalModal({ visible, title, content, onClose }: LegalModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Done</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
          <Text style={styles.legalText}>{content}</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { reloadSettings } = useGame();
  const { selectedChild, logout } = useAuth();
  const [settings, setSettings] = useState<SettingsState>({
    childAgeMonths: 24,
    parentModeEnabled: true,
    audioMuted: false,
    voiceVolume: 1.0,
    sfxVolume: 1.0,
    voiceMuted: false,
    sfxMuted: false,
    hapticEnabled: true,
    hapticStrength: 'medium'
  });
  const [modalContent, setModalContent] = useState<{ title: string; content: string } | null>(null);
  const { t, i18n } = useTranslation();

  const changeLanguage = async (code: LanguageCode) => {
    await i18n.changeLanguage(code);
    await AsyncStorage.multiSet([
      [LANGUAGE_SELECTION_KEY, '1'],
      [LANGUAGE_CODE_KEY, code]
    ]);
  };

  useEffect(() => {
    loadSettings().then(setSettings);
  }, [selectedChild?.id]);

  // Helper to save settings and reload into GameContext
  const saveAndReload = async (next: SettingsState) => {
    setSettings(next);
    await saveSettings(next);
    await reloadSettings();
  };

  const updateAge = (delta: number) => {
    const nextAge = Math.max(12, Math.min(60, settings.childAgeMonths + delta));
    const next = { ...settings, childAgeMonths: nextAge };
    setSettings(next);
    saveSettings(next);
  };

  const toggleParentMode = () => {
    const newValue = !settings.parentModeEnabled;
    const next = { ...settings, parentModeEnabled: newValue };
    setSettings(next);
    saveSettings(next);

    // Show explanation
    Alert.alert(
      newValue ? 'Parent-Guided Mode ON' : 'Parent-Guided Mode OFF',
      newValue
        ? 'Activities will now include prompts and instructions designed for a parent to guide the child through each exercise. This is recommended for younger children.'
        : 'Activities will be simplified for more independent use. Parent supervision is still recommended for best results.',
      [{ text: 'Got it' }]
    );
  };

  const handleReset = () => {
    Alert.alert(
      'Reset All Progress',
      'This will clear all activity history and game progress. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            await resetAllProgress();
            Alert.alert('Reset Complete', 'All progress has been cleared.');
          }
        }
      ]
    );
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open link');
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>⚙️ {t('settings.title', { defaultValue: 'Settings' })}</Text>

        {/* Child Settings */}
        <SectionHeader title={t('settings.childProfile', { defaultValue: 'Child Profile' })} />
        <View style={styles.card}>
          <View style={styles.agePickerContainer}>
            <Text style={styles.agePickerIcon}>👶</Text>
            <Text style={styles.agePickerTitle}>{t('settings.childAge', { defaultValue: 'Child\'s Age' })}</Text>
          </View>

          <View style={styles.ageSelectors}>
            {/* Years */}
            <View style={styles.ageSelectorGroup}>
              <Text style={styles.ageSelectorLabel}>Years</Text>
              <View style={styles.ageSelectorRow}>
                <Pressable
                  onPress={() => updateAge(-12)}
                  style={({ pressed }) => [styles.ageButton, pressed && styles.ageButtonPressed]}
                >
                  <Text style={styles.ageButtonText}>−</Text>
                </Pressable>
                <TextInput
                  style={styles.ageInput}
                  value={String(Math.floor(settings.childAgeMonths / 12))}
                  onChangeText={(text) => {
                    const years = parseInt(text) || 0;
                    const months = settings.childAgeMonths % 12;
                    const total = Math.max(0, Math.min(10, years)) * 12 + months;
                    setSettings({ ...settings, childAgeMonths: total });
                    saveSettings({ ...settings, childAgeMonths: total });
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                  selectTextOnFocus
                />
                <Pressable
                  onPress={() => updateAge(12)}
                  style={({ pressed }) => [styles.ageButton, pressed && styles.ageButtonPressed]}
                >
                  <Text style={styles.ageButtonText}>+</Text>
                </Pressable>
              </View>
            </View>

            {/* Months */}
            <View style={styles.ageSelectorGroup}>
              <Text style={styles.ageSelectorLabel}>Months</Text>
              <View style={styles.ageSelectorRow}>
                <Pressable
                  onPress={() => updateAge(-1)}
                  style={({ pressed }) => [styles.ageButton, pressed && styles.ageButtonPressed]}
                >
                  <Text style={styles.ageButtonText}>−</Text>
                </Pressable>
                <TextInput
                  style={styles.ageInput}
                  value={String(settings.childAgeMonths % 12)}
                  onChangeText={(text) => {
                    const years = Math.floor(settings.childAgeMonths / 12);
                    const months = Math.max(0, Math.min(11, parseInt(text) || 0));
                    const total = years * 12 + months;
                    setSettings({ ...settings, childAgeMonths: total });
                    saveSettings({ ...settings, childAgeMonths: total });
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                  selectTextOnFocus
                />
                <Pressable
                  onPress={() => updateAge(1)}
                  style={({ pressed }) => [styles.ageButton, pressed && styles.ageButtonPressed]}
                >
                  <Text style={styles.ageButtonText}>+</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <Text style={styles.ageSummary}>
            Total: {settings.childAgeMonths} months
          </Text>
        </View>
        <View style={styles.card}>
          <SettingRow
            icon="👶"
            title={t('settings.activeProfile', { defaultValue: 'Active Child Profile' })}
            subtitle={selectedChild ? `${selectedChild.name}` : t('settings.noChild', { defaultValue: 'No child selected' })}
            onPress={() => navigation.navigate('ChildProfiles')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="👨‍👩‍👧‍👦"
            title={t('settings.manageProfiles', { defaultValue: 'Manage Child Profiles' })}
            subtitle={t('settings.manageSub', { defaultValue: 'Add another child, switch profile, edit details' })}
            onPress={() => navigation.navigate('ChildProfiles')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="📘"
            title={t('settings.dailyJournal', { defaultValue: 'Daily Journal' })}
            subtitle={t('settings.journalSub', { defaultValue: 'Track real-life progress notes and photos' })}
            onPress={() => navigation.navigate('DailyJournal')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="🏅"
            title={t('settings.achievements', { defaultValue: 'Achievements' })}
            subtitle={t('settings.achievementsSub', { defaultValue: 'View unlocked milestones and sticker badges' })}
            onPress={() => navigation.navigate('Achievements')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="🧸"
            title={t('settings.avatarStudio', { defaultValue: 'Avatar Studio' })}
            subtitle={t('settings.avatarSub', { defaultValue: 'Customize companion character rewards' })}
            onPress={() => navigation.navigate('AvatarStudio')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="⭐"
            title={t('settings.upgradePro', { defaultValue: 'Upgrade to Pro' })}
            subtitle={t('settings.proSub', { defaultValue: 'Unlock all activities and advanced pathways' })}
            onPress={() => navigation.navigate('Paywall')}
          />
        </View>

        {/* App Settings */}
        <SectionHeader title={t('settings.appSettings', { defaultValue: 'App Settings' })} />
        <View style={styles.card}>
          <SettingRow
            icon="👨‍👩‍👧"
            title={t('settings.parentMode', { defaultValue: 'Parent-guided Mode' })}
            subtitle={t('settings.parentSub', { defaultValue: 'Activities require parent participation' })}
            rightElement={
              <Switch
                value={settings.parentModeEnabled}
                onValueChange={toggleParentMode}
                trackColor={{ false: '#e2e8f0', true: colors.accentPrimary }}
                thumbColor="#fff"
              />
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon="🌐"
            title={t('settings.language', { defaultValue: 'Language / Idioma / Lingua' })}
            subtitle={i18n.language === 'es' ? 'Español' : i18n.language === 'it' ? 'Italiano' : 'English'}
            onPress={() => {
              Alert.alert('Select Language', 'Elige el idioma / Scegli la lingua', [
                { text: 'English', onPress: () => changeLanguage('en') },
                { text: 'Español', onPress: () => changeLanguage('es') },
                { text: 'Italiano', onPress: () => changeLanguage('it') },
                { text: 'Cancel', style: 'cancel' }
              ]);
            }}
          />
        </View>

        {/* Audio Settings */}
        <SectionHeader title={t('settings.audioSettings', { defaultValue: 'Audio Settings' })} />
        <View style={styles.card}>
          {/* Voice Volume */}
          <View style={styles.audioRow}>
            <Text style={styles.audioIcon}>🗣️</Text>
            <View style={styles.audioContent}>
              <Text style={styles.audioTitle}>{t('settings.voiceVolume', { defaultValue: 'Voice Volume' })}</Text>
              <Text style={styles.audioSubtitle}>{t('settings.voiceSub', { defaultValue: 'Game instructions' })}</Text>
            </View>
            <View style={styles.audioControls}>
              <Pressable
                onPress={() => {
                  const next = { ...settings, voiceVolume: Math.max(0, (settings.voiceVolume ?? 1) - 0.05) };
                  saveAndReload(next);
                }}
                style={styles.audioButton}
              >
                <Text style={styles.audioButtonText}>−</Text>
              </Pressable>
              <Text style={styles.audioValue}>{Math.round((settings.voiceVolume ?? 1) * 100)}%</Text>
              <Pressable
                onPress={() => {
                  const next = { ...settings, voiceVolume: Math.min(1, (settings.voiceVolume ?? 1) + 0.05) };
                  saveAndReload(next);
                }}
                style={styles.audioButton}
              >
                <Text style={styles.audioButtonText}>+</Text>
              </Pressable>
              <Switch
                value={!settings.voiceMuted}
                onValueChange={(val) => {
                  const next = { ...settings, voiceMuted: !val };
                  saveAndReload(next);
                }}
                trackColor={{ false: '#e2e8f0', true: colors.accentPrimary }}
                thumbColor="#fff"
                style={{ marginLeft: spacing.sm }}
              />
            </View>
          </View>
          <View style={styles.divider} />
          {/* SFX Volume */}
          <View style={styles.audioRow}>
            <Text style={styles.audioIcon}>🔊</Text>
            <View style={styles.audioContent}>
              <Text style={styles.audioTitle}>{t('settings.sfx', { defaultValue: 'Sound Effects' })}</Text>
              <Text style={styles.audioSubtitle}>{t('settings.sfxSub', { defaultValue: 'Pop, success, error sounds' })}</Text>
            </View>
            <View style={styles.audioControls}>
              <Pressable
                onPress={() => {
                  const next = { ...settings, sfxVolume: Math.max(0, (settings.sfxVolume ?? 1) - 0.05) };
                  saveAndReload(next);
                }}
                style={styles.audioButton}
              >
                <Text style={styles.audioButtonText}>−</Text>
              </Pressable>
              <Text style={styles.audioValue}>{Math.round((settings.sfxVolume ?? 1) * 100)}%</Text>
              <Pressable
                onPress={() => {
                  const next = { ...settings, sfxVolume: Math.min(1, (settings.sfxVolume ?? 1) + 0.05) };
                  saveAndReload(next);
                }}
                style={styles.audioButton}
              >
                <Text style={styles.audioButtonText}>+</Text>
              </Pressable>
              <Switch
                value={!settings.sfxMuted}
                onValueChange={(val) => {
                  const next = { ...settings, sfxMuted: !val };
                  saveAndReload(next);
                }}
                trackColor={{ false: '#e2e8f0', true: colors.accentPrimary }}
                thumbColor="#fff"
                style={{ marginLeft: spacing.sm }}
              />
            </View>
          </View>
        </View>

        {/* Sensory & Haptics */}
        <SectionHeader title={t('settings.sensoryHaptics', { defaultValue: 'Sensory & Haptics' })} />
        <View style={styles.card}>
          <SettingRow
            icon="📳"
            title={t('settings.haptic', { defaultValue: 'Haptic Feedback' })}
            subtitle={t('settings.hapticSub', { defaultValue: 'Vibration patterns during gameplay' })}
            rightElement={
              <Switch
                value={settings.hapticEnabled}
                onValueChange={(val) => {
                  const next = { ...settings, hapticEnabled: val };
                  saveAndReload(next);
                }}
                trackColor={{ false: '#e2e8f0', true: colors.accentPrimary }}
                thumbColor="#fff"
              />
            }
          />
          <View style={styles.divider} />
          <View style={styles.audioRow}>
            <Text style={styles.audioIcon}>⚡</Text>
            <View style={styles.audioContent}>
              <Text style={styles.audioTitle}>{t('settings.tactile', { defaultValue: 'Tactile Strength' })}</Text>
              <Text style={styles.audioSubtitle}>{settings.hapticStrength.charAt(0).toUpperCase() + settings.hapticStrength.slice(1)} {t('settings.intensity', { defaultValue: 'intensity' })}</Text>
            </View>
            <View style={styles.audioControls}>
              {(['low', 'medium', 'high'] as const).map((level) => (
                <Pressable
                  key={level}
                  onPress={() => {
                    const next = { ...settings, hapticStrength: level };
                    saveAndReload(next);
                  }}
                  style={[
                    styles.audioButton,
                    { width: 60 },
                    settings.hapticStrength === level && { backgroundColor: colors.accentPrimary }
                  ]}
                >
                  <Text style={[
                    styles.audioButtonText,
                    { fontSize: 12 },
                    settings.hapticStrength === level && { color: '#fff' }
                  ]}>
                    {level.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* About */}
        <SectionHeader title={t('settings.about', { defaultValue: 'About' })} />
        <View style={styles.card}>
          <SettingRow
            icon="🏠"
            title={t('settings.aboutApp', { defaultValue: 'About NeuroMoves' })}
            subtitle={t('settings.aboutSub', { defaultValue: 'Who we are and our mission' })}
            onPress={() => setModalContent({ title: t('settings.aboutApp'), content: ABOUT_TEXT })}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="📚"
            title={t('settings.guide', { defaultValue: 'Activity Guide' })}
            subtitle={t('settings.guideSub', { defaultValue: 'What each game helps develop' })}
            onPress={() => setModalContent({ title: t('settings.guide'), content: ACTIVITY_GUIDE })}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="💬"
            title={t('settings.contact', { defaultValue: 'Contact Support' })}
            subtitle="support@reallifesteps.app"
            onPress={() => openLink('mailto:support@reallifesteps.app')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="ℹ️"
            title={t('settings.version', { defaultValue: 'App Version' })}
            subtitle="1.0.0"
          />
        </View>

        {/* Legal & Privacy */}
        <SectionHeader title={t('settings.legalPrivacy', { defaultValue: 'Legal & Privacy' })} />
        <View style={styles.card}>
          <SettingRow
            icon="📜"
            title={t('settings.privacy', { defaultValue: 'Privacy Policy' })}
            subtitle={t('settings.privacySub', { defaultValue: 'How we protect your data' })}
            onPress={() => setModalContent({ title: t('settings.privacy'), content: PRIVACY_POLICY })}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="📋"
            title={t('settings.terms', { defaultValue: 'Terms of Service' })}
            subtitle={t('settings.termsSub', { defaultValue: 'Usage agreement' })}
            onPress={() => setModalContent({ title: t('settings.terms'), content: TERMS_OF_SERVICE })}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="⚕️"
            title={t('settings.medical', { defaultValue: 'Medical Disclaimer' })}
            subtitle={t('settings.medicalSub', { defaultValue: 'Important health information' })}
            onPress={() => setModalContent({ title: t('settings.medical'), content: DISCLAIMER_TEXT })}
          />
        </View>

        {/* Danger Zone */}
        <SectionHeader title={t('settings.dataManagement', { defaultValue: 'Data Management' })} />
        <View style={styles.card}>
          <Pressable onPress={handleReset} style={styles.dangerRow}>
            <Text style={styles.dangerIcon}>🗑️</Text>
            <View style={styles.settingContent}>
              <Text style={styles.dangerTitle}>{t('settings.resetProgress', { defaultValue: 'Reset All Progress' })}</Text>
              <Text style={styles.dangerSubtitle}>{t('settings.resetSub', { defaultValue: 'Clear all activity and game history' })}</Text>
            </View>
          </Pressable>
          <View style={styles.divider} />
          <SettingRow
            icon="📦"
            title={t('settings.exportData', { defaultValue: 'Export My Data' })}
            subtitle={t('settings.exportSub', { defaultValue: 'Download all your data as JSON' })}
            onPress={async () => {
              try {
                const token = await AccountService.getAccessToken();
                if (!token) { Alert.alert('Error', 'Not signed in'); return; }
                const resp = await fetch(`${API_BASE_URL}/auth/export-data`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                const json = await resp.json();
                if (json.success) {
                  Alert.alert('Data Exported', 'Your data has been retrieved. In a future update you will be able to save this as a file.\n\nChildren: ' + (json.data?.children?.length ?? 0));
                } else {
                  Alert.alert('Error', json.error || 'Export failed');
                }
              } catch (e: any) {
                Alert.alert('Error', e.message || 'Could not export data');
              }
            }}
          />
          <View style={styles.divider} />
          <Pressable
            onPress={() => {
              Alert.alert(
                'Delete Account',
                'This will PERMANENTLY delete your account and ALL child data. This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete Everything',
                    style: 'destructive',
                    onPress: () => {
                      Alert.alert(
                        'Are you sure?',
                        'This action is irreversible. All your data will be lost forever.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Yes, Delete My Account',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                const token = await AccountService.getAccessToken();
                                if (!token) { Alert.alert('Error', 'Not signed in'); return; }
                                const resp = await fetch(`${API_BASE_URL}/auth/account`, {
                                  method: 'DELETE',
                                  headers: { Authorization: `Bearer ${token}` },
                                });
                                const json = await resp.json();
                                if (json.success) {
                                  await logout();
                                  Alert.alert('Account Deleted', 'Your account and all data have been permanently removed.');
                                } else {
                                  Alert.alert('Error', json.error || 'Deletion failed');
                                }
                              } catch (e: any) {
                                Alert.alert('Error', e.message || 'Could not delete account');
                              }
                            },
                          },
                        ]
                      );
                    },
                  },
                ]
              );
            }}
            style={styles.dangerRow}
          >
            <Text style={styles.dangerIcon}>⚠️</Text>
            <View style={styles.settingContent}>
              <Text style={styles.dangerTitle}>{t('settings.deleteAccount', { defaultValue: 'Delete Account' })}</Text>
              <Text style={styles.dangerSubtitle}>{t('settings.deleteSub', { defaultValue: 'Permanently remove account and all data' })}</Text>
            </View>
          </Pressable>
          <View style={styles.divider} />
          <SettingRow
            icon="🚪"
            title={t('settings.logout', { defaultValue: 'Log Out' })}
            subtitle={t('settings.logoutSub', { defaultValue: 'Sign out of this parent account' })}
            onPress={() => {
              Alert.alert(
                t('settings.logoutPromptTitle', { defaultValue: 'Log Out' }),
                t('settings.logoutPromptMessage', { defaultValue: 'Do you want to sign out?' }), [
                { text: t('settings.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
                {
                  text: t('settings.logoutConfirm', { defaultValue: 'Log Out' }),
                  style: 'destructive',
                  onPress: async () => {
                    await logout();
                  }
                }
              ]);
            }}
          />
        </View>

        <Text style={styles.footerText}>
          {t('settings.footer', { defaultValue: 'Made with ❤️ for parents and children' })}
        </Text>
      </ScrollView>

      {/* Legal Modal */}
      <LegalModal
        visible={modalContent !== null}
        title={modalContent?.title || ''}
        content={modalContent?.content || ''}
        onClose={() => setModalContent(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  settingRowPressed: {
    backgroundColor: colors.bgTertiary,
  },
  settingIcon: {
    fontSize: 22,
    marginRight: spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  settingSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.glassBorder,
    marginLeft: spacing.md + 22 + spacing.md,
  },
  ageControls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ageButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageButtonPressed: {
    backgroundColor: colors.accentPrimary,
  },
  ageButtonText: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  agePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  agePickerIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  agePickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  ageSelectors: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  ageSelectorGroup: {
    alignItems: 'center',
  },
  ageSelectorLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  ageSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ageValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    minWidth: 40,
    textAlign: 'center',
  },
  ageInput: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    minWidth: 50,
    textAlign: 'center',
    backgroundColor: colors.bgTertiary,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  ageSummary: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.textMuted,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  dangerIcon: {
    fontSize: 22,
    marginRight: spacing.md,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
  dangerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  footerText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xl,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accentPrimary,
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: spacing.lg,
  },
  legalText: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  // Audio settings styles
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  audioIcon: {
    fontSize: 22,
    marginRight: spacing.md,
  },
  audioContent: {
    flex: 1,
  },
  audioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  audioSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  audioButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  audioValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    minWidth: 40,
    textAlign: 'center',
  },
});
