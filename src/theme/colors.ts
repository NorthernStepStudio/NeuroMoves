// Premium Kid-Friendly Theme
// Warm, inviting, and professional design system

export const theme = {
  colors: {
    // Backgrounds - Soft, clean, inviting
    bgPrimary: '#fafbfc',         // Off-white with warmth
    bgSecondary: '#ffffff',        // Pure white
    bgTertiary: '#f3f4f6',         // Subtle gray
    bgWarm: '#fffbeb',             // Warm cream

    // Primary accent - Friendly coral/orange
    accentPrimary: '#f97316',      // Warm orange
    accentSecondary: '#fb923c',    // Light orange
    accentSoft: '#fed7aa',         // Very soft orange

    // Secondary accent - Calming teal
    teal: '#14b8a6',
    tealLight: '#5eead4',
    tealSoft: '#ccfbf1',

    // Additional accents
    purple: '#8b5cf6',
    purpleLight: '#a78bfa',
    blue: '#3b82f6',
    blueLight: '#93c5fd',
    pink: '#ec4899',
    pinkLight: '#f9a8d4',

    // Text - High contrast for readability
    textPrimary: '#111827',        // Near black
    textSecondary: '#4b5563',      // Dark gray
    textMuted: '#9ca3af',          // Medium gray
    textLight: '#d1d5db',          // Light gray

    // Glass effects
    glassBg: 'rgba(255, 255, 255, 0.9)',
    glassBorder: 'rgba(0, 0, 0, 0.05)',

    // Status colors
    success: '#10b981',            // Emerald
    successLight: '#d1fae5',
    warning: '#f59e0b',            // Amber
    warningLight: '#fef3c7',
    error: '#ef4444',              // Red
    errorLight: '#fee2e2',

    // Card backgrounds
    cardBg: '#ffffff',
    cardBorder: 'rgba(0, 0, 0, 0.04)',

    // Focus/highlight
    focusYellow: '#fef3c7',
    focusOrange: '#ffedd5',
    highlight: '#fbbf24',

    // Category colors
    categoryMotor: '#22c55e',
    categoryCognitive: '#3b82f6',
    categorySpeech: '#8b5cf6',
    categorySensory: '#f97316',
  },

  gradients: {
    // Soft, subtle gradients
    background: ['#fafbfc', '#f3f4f6'] as [string, string],
    hero: ['#ffffff', '#fafbfc'] as [string, string],
    primary: ['#f97316', '#fb923c'] as [string, string],
    warm: ['#fffbeb', '#fef3c7'] as [string, string],
    teal: ['#14b8a6', '#5eead4'] as [string, string],
    purple: ['#8b5cf6', '#a78bfa'] as [string, string],
    sunset: ['#f97316', '#ec4899'] as [string, string],
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  },

  borderRadius: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
    xxl: 36,
    full: 9999
  },

  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 19,
    xl: 22,
    xxl: 28,
    xxxl: 36,
    hero: 42
  },

  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1
    },
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3
    },
    cardHover: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 6
    },
    button: {
      shadowColor: '#f97316',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 4
    },
    glow: {
      shadowColor: '#f97316',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8
    }
  }
};

export const colors = theme.colors;
export const gradients = theme.gradients;
export const spacing = theme.spacing;
export const borderRadius = theme.borderRadius;
export const fontSize = theme.fontSize;
export const fontWeight = theme.fontWeight;
export const shadows = theme.shadows;
