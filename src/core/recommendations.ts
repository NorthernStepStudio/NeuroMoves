import { Activity, ActivityAttempt, SettingsState } from './types';

function daysSince(dateISO: string): number {
  const then = new Date(dateISO).getTime();
  const now = new Date().getTime();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

export function buildDailyPlan(
  activities: Activity[],
  attempts: ActivityAttempt[],
  settings: SettingsState
): Activity[] {
  const scoreMap = new Map<string, number>();

  for (const activity of activities) {
    const history = attempts.filter((entry) => entry.activityId === activity.id);
    const lastAttempt = history[0];
    let score = 0;

    if (!lastAttempt) {
      score += 10;
    } else {
      score += Math.min(7, daysSince(lastAttempt.dateISO));
      if (lastAttempt.result === 'skipped') score += 2;
      if (lastAttempt.result === 'success') score -= 1;
    }

    if (settings.childAgeMonths <= 24 && activity.type === 'trace') {
      score -= 2;
    }

    scoreMap.set(activity.id, score);
  }

  const sorted = [...activities].sort((a, b) => {
    return (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0);
  });

  const speech = sorted.filter((activity) => activity.category === 'speech');
  const ot = sorted.filter((activity) => activity.category === 'ot');

  const plan: Activity[] = [];
  if (speech[0]) plan.push(speech[0]);
  if (ot[0]) plan.push(ot[0]);
  if (ot[1]) plan.push(ot[1]);

  return plan.slice(0, 3);
}
