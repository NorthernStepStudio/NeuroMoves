import { Activity } from '../core/types';

export const ACTIVITIES: Activity[] = [
  {
    id: 'ot-tap-targets',
    title: 'Tap Targets',
    description: 'Tap the glowing targets.',
    category: 'ot',
    type: 'tap',
    durationMinutes: 3,
    prompts: [
      'Tap each target when it appears.',
      'Encourage gentle taps.'
    ],
    tips: ['Use a steady rhythm.', 'Celebrate small wins.'],
    benefits: ['Improves finger isolation.', 'Strengthens visual-motor timing.']
  },
  {
    id: 'ot-drag-shapes',
    title: 'Drag and Drop Shapes',
    description: 'Drag the shape into the matching zone.',
    category: 'ot',
    type: 'drag',
    durationMinutes: 4,
    prompts: [
      'Drag the circle into the outlined area.',
      'Try again with a slow motion.'
    ],
    tips: ['Guide the hand lightly if needed.', 'Keep the tone playful.'],
    benefits: ['Builds grasp control.', 'Supports hand-eye coordination.']
  },
  {
    id: 'ot-tracing-line',
    title: 'Tracing Path',
    description: 'Trace the line from left to right.',
    category: 'ot',
    type: 'trace',
    durationMinutes: 3,
    prompts: [
      'Place a finger at the start.',
      'Move across the line slowly.'
    ],
    tips: ['Focus on smooth movement.', 'Pause if frustrated.'],
    benefits: ['Encourages pre-writing control.', 'Builds wrist stability.']
  },
  {
    id: 'ot-gross-motor',
    title: 'Move and Play',
    description: 'Follow simple movement prompts.',
    category: 'ot',
    type: 'prompt',
    durationMinutes: 4,
    prompts: [
      'Clap hands together.',
      'Jump like a frog.',
      'Touch your nose.'
    ],
    tips: ['Model the movement.', 'Keep it light.'],
    benefits: ['Strengthens large muscles.', 'Builds body awareness.']
  },
  {
    id: 'ot-sensory-calm',
    title: 'Calm Breathing',
    description: 'Slow breathing with gentle visuals.',
    category: 'ot',
    type: 'sensory',
    durationMinutes: 4,
    prompts: [
      'Breathe in slowly for four counts.',
      'Breathe out slowly for four counts.'
    ],
    tips: ['Dim the lights if possible.', 'Speak softly.'],
    benefits: ['Supports regulation.', 'Builds calm routines.']
  },
  {
    id: 'ot-visual-track',
    title: 'Visual Tracking',
    description: 'Follow the moving dot together.',
    category: 'ot',
    type: 'tap',
    durationMinutes: 3,
    prompts: [
      'Ask your child to look at the dot.',
      'Tap the dot when it stops.'
    ],
    tips: ['Move slowly.', 'Give gentle encouragement.'],
    benefits: ['Encourages visual focus.', 'Builds attention control.']
  }
];
