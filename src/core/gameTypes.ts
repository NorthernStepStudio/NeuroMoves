// Game Types for Native 2D Games

export type GameId =
    | 'color-match'
    | 'yes-no'
    | 'pop-bubbles'
    | 'point-it-out'
    | 'stacking'
    | 'shape-sorting'
    | 'baby-signs'
    | 'magic-fingers'
    | 'emotions'
    | 'body-parts'
    | 'animal-sounds'
    | 'size-ordering'
    | 'tracing'
    | 'number-tracing'
    | 'letter-recognition'
    | 'number-recognition';

export interface GameConfig {
    id: GameId;
    title: string;
    description: string;
    icon: string;
    maxLevels: number;
    category: 'motor' | 'cognitive' | 'speech' | 'sensory';
}

export interface GameProgress {
    gameId: GameId;
    currentLevel: number;
    highestLevel: number;
    totalAttempts: number;
    successfulAttempts: number;
    lastPlayedAt: string | null;
}

export interface GameState {
    level: number;
    score: number;
    errors: number;
    isComplete: boolean;
    isPaused: boolean;
}

export interface FeedbackResult {
    type: 'success' | 'error' | 'hint';
    message: string;
    emoji?: string;
    position?: 'center' | 'top' | 'bottom';
    verticalPos?: number;
    confetti?: boolean;
    transparent?: boolean;
}

// Level configuration type for individual games
export interface LevelConfig {
    level: number;
    difficulty: number;
    targetCount?: number;
    timeLimit?: number;
}

// Game registry - all available games
export const GAME_REGISTRY: GameConfig[] = [
    {
        id: 'color-match',
        title: 'Color Match',
        description: 'Find the matching color',
        icon: '🎨',
        maxLevels: 10,
        category: 'cognitive',
    },
    {
        id: 'yes-no',
        title: 'Yes or No',
        description: 'Swipe to answer questions',
        icon: '👍',
        maxLevels: 10,
        category: 'cognitive',
    },
    {
        id: 'pop-bubbles',
        title: 'Pop Bubbles',
        description: 'Pop all the bubbles',
        icon: '🫧',
        maxLevels: 10,
        category: 'motor',
    },

    {
        id: 'point-it-out',
        title: 'Point It Out',
        description: 'Find hidden objects',
        icon: '🔍',
        maxLevels: 10,
        category: 'cognitive',
    },
    {
        id: 'stacking',
        title: 'Stacking',
        description: 'Stack blocks up high',
        icon: '🧱',
        maxLevels: 10,
        category: 'motor',
    },
    {
        id: 'shape-sorting',
        title: 'Shape Sorting',
        description: 'Drag shapes to their holes',
        icon: '🔷',
        maxLevels: 10,
        category: 'cognitive',
    },
    {
        id: 'baby-signs',
        title: 'Baby Signs',
        description: 'Learn sign language basics',
        icon: '🤟',
        maxLevels: 5,
        category: 'speech',
    },
    /*
        {
            id: 'magic-fingers',
            title: 'Magic Fingers',
            description: 'Finger isolation exercises',
            icon: '🖐️',
            maxLevels: 10,
            category: 'motor',
        },
    */
    {
        id: 'emotions',
        title: 'Emotions',
        description: 'Match the emotion faces',
        icon: '😊',
        maxLevels: 10,
        category: 'cognitive',
    },
    /*
        {
            id: 'body-parts',
            title: 'Body Parts',
            description: 'Touch the named body part',
            icon: '🧍',
            maxLevels: 10,
            category: 'cognitive',
        },
    */
    {
        id: 'animal-sounds',
        title: 'Animal Sounds',
        description: 'Match sounds to animals',
        icon: '🐶',
        maxLevels: 10,
        category: 'sensory',
    },
    {
        id: 'size-ordering',
        title: 'Size Ordering',
        description: 'Arrange by size',
        icon: '📏',
        maxLevels: 10,
        category: 'cognitive',
    },
    {
        id: 'tracing',
        title: 'Letter Tracing',
        description: 'Trace letters with your finger',
        icon: '✏️',
        maxLevels: 26,
        category: 'motor',
    },
    {
        id: 'number-tracing',
        title: 'Number Tracing',
        description: 'Learn to write numbers',
        icon: '1️⃣',
        maxLevels: 10,
        category: 'motor',
    },
    {
        id: 'letter-recognition',
        title: 'Letter Recognition',
        description: 'Find the matching letter',
        icon: '🔤',
        maxLevels: 26,
        category: 'cognitive',
    },
    {
        id: 'number-recognition',
        title: 'Number Recognition',
        description: 'Find the matching number',
        icon: '🔢',
        maxLevels: 10,
        category: 'cognitive',
    },
];

// Map game IDs to screen names (used for navigation)
export const GAME_SCREEN_MAP: Record<GameId, string> = {
    'color-match': 'ColorMatchGame',
    'yes-no': 'YesNoGame',
    'pop-bubbles': 'PopBubblesGame',

    'point-it-out': 'PointItOutGame',
    'stacking': 'StackingGame',
    'shape-sorting': 'ShapeSortingGame',
    'baby-signs': 'BabySignsGame',
    'magic-fingers': 'MagicFingersGame',
    'emotions': 'EmotionsGame',
    'body-parts': 'BodyPartsGame',
    'animal-sounds': 'AnimalSoundsGame',
    'size-ordering': 'SizeOrderingGame',
    'tracing': 'TracingGame',
    'number-tracing': 'NumberTracingGame',
    'letter-recognition': 'LetterRecognitionGame',
    'number-recognition': 'NumberRecognitionGame',
};
