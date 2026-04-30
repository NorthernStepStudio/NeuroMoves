import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import ActivityCard from '../components/ActivityCard';
import { ACTIVITIES } from '../data/activities';
import { colors, gradients, spacing } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { ActivityCategory } from '../core/types';

const categories: ActivityCategory[] = ['speech', 'ot'];

export default function ActivityListScreen() {
  const navigation = useNavigation();
  const [activeCategory, setActiveCategory] = useState<ActivityCategory>('speech');

  const data = ACTIVITIES.filter((activity) => activity.category === activeCategory);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient colors={gradients.background} style={styles.container}>
        <View style={styles.toggleRow}>
          {categories.map((category) => (
            <Pressable
              key={category}
              onPress={() => setActiveCategory(category)}
              style={[styles.toggle, activeCategory === category && styles.toggleActive]}
            >
              <Text style={styles.toggleText}>{category.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

        <FlatList
          contentContainerStyle={styles.list}
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ActivityCard
              activity={item}
              onPress={() => (navigation.navigate as any)('ActivityDetail', { activityId: item.id })}
            />
          )}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgPrimary
  },
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary
  },
  toggleRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm
  },
  toggle: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center'
  },
  toggleActive: {
    backgroundColor: colors.glassBg,
    borderColor: colors.accentSecondary
  },
  toggleText: {
    color: colors.textPrimary,
    fontWeight: '700'
  },
  list: {
    padding: spacing.md
  }
});
