import { ActivityAttempt } from './types';

export function getDailyStreak(attempts: ActivityAttempt[]): number {
  const days = new Set<string>();
  attempts.forEach((entry) => {
    days.add(entry.dateISO.slice(0, 10));
  });

  let streak = 0;
  for (let offset = 0; offset < 365; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}
