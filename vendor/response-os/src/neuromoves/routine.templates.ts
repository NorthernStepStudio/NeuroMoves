import type { RoutineStep } from '../core/types.js';

export interface ActivityTemplate extends RoutineStep {
  tags: string[];
  minAge: number;
  maxAge: number;
}

export const routineTemplates: ActivityTemplate[] = [
  {
    activity: 'Heavy Work: Wall Pushes',
    time: '2 mins',
    instructions: 'Stand facing a wall and push as hard as you can for 10 seconds, then rest. Repeat 5 times.',
    difficulty: 'easy',
    minAge: 3,
    maxAge: 12,
    tags: ['focus', 'calm', 'coordination'],
  },
  {
    activity: 'Animal Walks: Bear Walk',
    time: '3 mins',
    instructions: 'Walk on hands and feet across the room. Keep your hips high.',
    difficulty: 'medium',
    minAge: 2,
    maxAge: 7,
    tags: ['coordination', 'energy-burn'],
  },
  {
    activity: 'Mindful Breathing: Balloon Belly',
    time: '2 mins',
    instructions: 'Place hands on belly. Breathe in to inflate the balloon, breathe out to deflate.',
    difficulty: 'easy',
    minAge: 2,
    maxAge: 10,
    tags: ['calm', 'focus'],
  },
  {
    activity: 'Proprioception: Squeeze and Release',
    time: '3 mins',
    instructions: 'Squeeze a soft ball or pillow 10 times with each hand.',
    difficulty: 'easy',
    minAge: 2,
    maxAge: 8,
    tags: ['focus', 'calm'],
  },
  {
    activity: 'Gross Motor: Hopscotch Jump',
    time: '5 mins',
    instructions: 'Jump with two feet, then one foot, following a line or pattern on the floor.',
    difficulty: 'medium',
    minAge: 4,
    maxAge: 12,
    tags: ['coordination'],
  },
];
