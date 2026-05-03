import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';

/**
 * Thin banner displayed at the top of the screen when the device is offline.
 * Uses a simple periodic fetch-based connectivity check.
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(-40)).current;

  useEffect(() => {
    let mounted = true;

    const checkConnectivity = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        await fetch('https://clients3.google.com/generate_204', {
          method: 'HEAD',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (mounted) setIsOffline(false);
      } catch {
        if (mounted) setIsOffline(true);
      }
    };

    checkConnectivity();
    const interval = setInterval(checkConnectivity, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOffline ? 0 : -40,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline, slideAnim]);

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}
      accessibilityRole="alert"
      accessibilityLabel="You are offline. Changes will sync when connectivity is restored."
    >
      <Text style={styles.text}>{'\u{1F4E1}  You\'re offline - changes will sync later'}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: colors.warning ?? '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  text: {
    color: '#1c1917',
    fontSize: 13,
    fontWeight: '600',
  },
});
