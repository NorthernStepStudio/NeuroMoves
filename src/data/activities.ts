import { Activity } from '../core/types';

export const ACTIVITIES: Activity[] = [
  {
    id: 'speech-sounds-ma',
    title: 'Sound Imitation: ma',
    description: 'Practice the ma sound together.',
    category: 'speech',
    type: 'speech',
    durationMinutes: 3,
    prompts: [
      'Say "ma" slowly and clearly.',
      'Pause and wait for your child to try.',
      'Repeat two times with a smile.'
    ],
    tips: ['Keep your face close and friendly.', 'Celebrate any attempt.'],
    benefits: ['Builds early sound awareness.', 'Encourages first syllables.']
  },
  {
    id: 'speech-sounds-ba',
    title: 'Sound Imitation: ba',
    description: 'Practice the ba sound with a toy.',
    category: 'speech',
    type: 'speech',
    durationMinutes: 3,
    prompts: [
      'Hold a favorite toy and say "ba".',
      'Invite your child to copy the sound.',
      'Repeat slowly three times.'
    ],
    tips: ['Use gentle eye contact.', 'Let your child lead the pace.'],
    benefits: ['Supports lip closure control.', 'Reinforces sound copying.']
  },
  {
    id: 'speech-first-words',
    title: 'First Words',
    description: 'Choose a familiar word and repeat it.',
    category: 'speech',
    type: 'speech',
    durationMinutes: 4,
    prompts: [
      'Pick one word like "ball" or "up".',
      'Say it clearly and pause.',
      'Repeat it as you play.'
    ],
    tips: ['Stay consistent with one word.', 'Short sessions are best.'],
    benefits: ['Builds word understanding.', 'Links words to actions.']
  },
  {
    id: 'speech-repeat',
    title: 'Simple Repetition',
    description: 'Repeat a short phrase together.',
    category: 'speech',
    type: 'speech',
    durationMinutes: 4,
    prompts: [
      'Say a two word phrase like "more milk".',
      'Pause and invite imitation.',
      'Repeat with a soft rhythm.'
    ],
    tips: ['Use a calm voice.', 'Praise any attempt.'],
    benefits: ['Encourages combining words.', 'Builds listening stamina.']
  },
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
