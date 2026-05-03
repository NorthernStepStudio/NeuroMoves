import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme/colors';

import { ReactNode } from 'react';

interface GameShellProps {
    title: string;
    level: number;
    score: number;
    onRestart: () => void;
    children: any;
}

export function GameShell({ title, level, score, onRestart, children }: GameShellProps) {
    const navigation = useNavigation();

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.headerRow}>
                <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.textSecondary} />
                </Pressable>
                
                <View style={styles.rightControls}>
                    <Pressable onPress={onRestart} style={styles.iconBtn}>
                        <Ionicons name="refresh" size={24} color={colors.textSecondary} />
                    </Pressable>
                </View>
            </View>

            <View style={styles.titleRow}>
                <Text style={styles.titleText}>{title}</Text>
                <View style={styles.statsContainer}>
                    <View style={styles.statBadge}>
                        <Text style={styles.statLabel}>LEVEL</Text>
                        <Text style={styles.statValue}>{level}</Text>
                    </View>
                    <View style={styles.statBadge}>
                        <Text style={styles.statLabel}>SCORE</Text>
                        <Text style={styles.statValue}>{score}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.gameContent}>
                {children}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
    },
    iconBtn: {
        padding: spacing.sm,
    },
    rightControls: {
        flexDirection: 'row',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        marginTop: spacing.xs,
        marginBottom: spacing.md,
        backgroundColor: colors.bgPrimary,
        marginHorizontal: spacing.md,
        borderRadius: 16,
        paddingVertical: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    titleText: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    statBadge: {
        alignItems: 'center',
        backgroundColor: colors.bgPrimary,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 8,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textSecondary,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.bgPrimary,
    },
    gameContent: {
        flex: 1,
    }
});
