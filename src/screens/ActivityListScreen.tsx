import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import ActivityCard from '../components/ActivityCard';
import { ACTIVITIES } from '../data/activities';
import { colors, gradients, spacing } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';

export default function ActivityListScreen() {
  const navigation = useNavigation();
  const data = ACTIVITIES.filter((activity) => activity.category === 'ot');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient colors={gradients.background} style={styles.container}>
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
  list: {
    padding: spacing.md
  }
});
