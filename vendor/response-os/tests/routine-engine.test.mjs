import assert from 'node:assert/strict';
import test from 'node:test';

import { RoutineEngine } from '../dist/index.js';

function totalMinutes(routine) {
  return routine.steps.reduce((sum, step) => {
    const minutes = Number.parseInt(step.time, 10);
    return sum + (Number.isFinite(minutes) ? minutes : 0);
  }, 0);
}

test('RoutineEngine creates steps within time limit', () => {
  const engine = new RoutineEngine();
  const routine = engine.generateRoutine({
    ageRange: '3-6',
    goals: ['focus'],
    timeAvailable: 6,
  });

  assert.ok(routine.steps.length >= 1);
  assert.ok(totalMinutes(routine) <= 6);
  assert.equal(routine.disclaimer, 'Not medical advice.');
});

test('RoutineEngine falls back to a safe default step when no template matches', () => {
  const engine = new RoutineEngine();
  const routine = engine.generateRoutine({
    ageRange: '15-18',
    goals: ['nonexistent-goal'],
    timeAvailable: 3,
  });

  assert.equal(routine.steps.length, 1);
  assert.equal(routine.steps[0].activity, 'Gentle Stretching');
});

test('RoutineEngine rejects invalid age range format', () => {
  const engine = new RoutineEngine();
  assert.throws(
    () =>
      engine.generateRoutine({
        ageRange: 'bad-value',
        goals: ['focus'],
        timeAvailable: 5,
      }),
    /invalid agerange/i
  );
});
