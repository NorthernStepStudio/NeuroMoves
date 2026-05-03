import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { GameControlHeader, GameInstruction, FeedbackOverlay } from '../../../components/GameComponents';
import { useGame } from '../../../core/GameContext';
import { colors, spacing } from '../../../theme/colors';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface Animal {
    name: string;
    emoji: string;
    sound: string;
    voiceKey: string;  // "who says woof woof" for questions
    soundKey: string;  // "woof woof" for tap feedback (sound only)
    category: 'farm' | 'wild' | 'bird' | 'sea' | 'pet';
}

// 34 Animals organized by category - voiceKey/soundKey match VoiceAssets.ts
// NOTE: Each animal must have a UNIQUE sound to prevent game confusion
const ANIMALS: Animal[] = [
    // Farm Animals
    { name: 'dog', emoji: '🐶', sound: 'Woof woof!', voiceKey: 'who says woof woof', soundKey: 'woof woof', category: 'farm' },
    { name: 'cat', emoji: '🐱', sound: 'Meow!', voiceKey: 'who says meow', soundKey: 'meow', category: 'pet' },
    { name: 'cow', emoji: '🐮', sound: 'Moo!', voiceKey: 'who says moo', soundKey: 'moo', category: 'farm' },
    { name: 'pig', emoji: '🐷', sound: 'Oink oink!', voiceKey: 'who says oink oink', soundKey: 'oink oink', category: 'farm' },
    { name: 'horse', emoji: '🐴', sound: 'Neigh!', voiceKey: 'who says neigh', soundKey: 'neigh', category: 'farm' },
    { name: 'sheep', emoji: '🐑', sound: 'Baa!', voiceKey: 'who says baa', soundKey: 'baa', category: 'farm' },
    { name: 'goat', emoji: '🐐', sound: 'Meh!', voiceKey: 'who says meh', soundKey: 'meh', category: 'farm' },
    { name: 'rooster', emoji: '🐓', sound: 'Cock-a-doodle-doo!', voiceKey: 'who says cock a doodle doo', soundKey: 'cock a doodle doo', category: 'farm' },
    { name: 'chicken', emoji: '🐔', sound: 'Cluck cluck!', voiceKey: 'who says cluck cluck', soundKey: 'cluck cluck', category: 'farm' },
    { name: 'duck', emoji: '🦆', sound: 'Quack!', voiceKey: 'who says quack', soundKey: 'quack', category: 'bird' },
    { name: 'turkey', emoji: '🦃', sound: 'Gobble gobble!', voiceKey: 'who says gobble gobble', soundKey: 'gobble gobble', category: 'bird' },
    // Wild Animals
    { name: 'lion', emoji: '🦁', sound: 'Roar!', voiceKey: 'who says roar', soundKey: 'roar', category: 'wild' },
    { name: 'elephant', emoji: '🐘', sound: 'Trumpet!', voiceKey: 'who says trumpet', soundKey: 'trumpet', category: 'wild' },
    { name: 'monkey', emoji: '🐵', sound: 'Ooh ooh ah ah!', voiceKey: 'who says ooh ooh ah ah', soundKey: 'ooh ooh ah ah', category: 'wild' },
    { name: 'bear', emoji: '🐻', sound: 'Growl!', voiceKey: 'who says growl', soundKey: 'growl', category: 'wild' },
    { name: 'wolf', emoji: '🐺', sound: 'Howl!', voiceKey: 'who says howl', soundKey: 'howl', category: 'wild' },
    { name: 'frog', emoji: '🐸', sound: 'Ribbit!', voiceKey: 'who says ribbit', soundKey: 'ribbit', category: 'wild' },
    { name: 'snake', emoji: '🐍', sound: 'Hiss!', voiceKey: 'who says hiss', soundKey: 'hiss', category: 'wild' },
    { name: 'gorilla', emoji: '🦍', sound: 'Ugh ugh!', voiceKey: 'who says ugh ugh', soundKey: 'ugh ugh', category: 'wild' },
    { name: 'zebra', emoji: '🦓', sound: 'Bark!', voiceKey: 'who says bark', soundKey: 'bark', category: 'wild' },
    // Birds
    { name: 'bird', emoji: '🐦', sound: 'Tweet tweet!', voiceKey: 'who says tweet tweet', soundKey: 'tweet tweet', category: 'bird' },
    { name: 'owl', emoji: '🦉', sound: 'Hoot hoot!', voiceKey: 'who says hoot hoot', soundKey: 'hoot hoot', category: 'bird' },
    { name: 'parrot', emoji: '🦜', sound: 'Squawk!', voiceKey: 'who says squawk', soundKey: 'squawk', category: 'bird' },
    { name: 'crow', emoji: '🐦‍⬛', sound: 'Caw caw!', voiceKey: 'who says caw caw', soundKey: 'caw caw', category: 'bird' },
    { name: 'eagle', emoji: '🦅', sound: 'Screech!', voiceKey: 'who says screech', soundKey: 'screech', category: 'bird' },
    { name: 'penguin', emoji: '🐧', sound: 'Honk!', voiceKey: 'who says honk', soundKey: 'honk', category: 'bird' },
    // Sea Creatures
    { name: 'dolphin', emoji: '🐬', sound: 'Click click!', voiceKey: 'who says click click', soundKey: 'click click', category: 'sea' },
    { name: 'whale', emoji: '🐋', sound: 'Whooo!', voiceKey: 'who says whooo', soundKey: 'whooo', category: 'sea' },
    { name: 'seal', emoji: '🦭', sound: 'Arp arp!', voiceKey: 'who says arp arp', soundKey: 'arp arp', category: 'sea' },
    { name: 'fish', emoji: '🐟', sound: 'Blub blub!', voiceKey: 'who says blub blub', soundKey: 'blub blub', category: 'sea' },
    { name: 'crab', emoji: '🦀', sound: 'Click clack!', voiceKey: 'who says click clack', soundKey: 'click clack', category: 'sea' },
    // More Pets & Others
    { name: 'mouse', emoji: '🐭', sound: 'Squeak!', voiceKey: 'who says squeak', soundKey: 'squeak', category: 'pet' },
    { name: 'chick', emoji: '🐥', sound: 'Cheep cheep!', voiceKey: 'who says cheep cheep', soundKey: 'cheep cheep', category: 'farm' },
    { name: 'tiger', emoji: '🐯', sound: 'Grrr Roar!', voiceKey: 'who says roar', soundKey: 'roar', category: 'wild' },
    { name: 'bee', emoji: '🐝', sound: 'Buzz!', voiceKey: 'who says buzz', soundKey: 'buzz', category: 'wild' },
    { name: 'dinosaur', emoji: '🦖', sound: 'RAWR!', voiceKey: 'who says rawr', soundKey: 'rawr', category: 'wild' },
];

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

export default function AnimalSoundsGame() {
    const navigation = useNavigation();
    const {
        gameState,
        nextLevel,
        recordSuccess,
        recordError,
        showFeedback,
        feedback,
        playSuccess,
        playError,
        speak,
        startGame,
        resetCurrentGameProgress,
        settings,
        isBusy,
        lockInput
    } = useGame();

    const [targetAnimal, setTargetAnimal] = useState<Animal>(ANIMALS[0]);
    const [options, setOptions] = useState<Animal[]>([]);
    const soundPulse = useRef(new Animated.Value(1)).current;

    // Bag randomization to prevent repetitions
    const animalBagRef = useRef<Animal[]>([]);
    const lastSpokenLevelRef = useRef<number>(-1);

    // Register game on mount
    useEffect(() => {
        startGame('animal-sounds');
    }, [startGame]);

    // Age-based difficulty
    const ageMonths = settings?.childAgeMonths ?? 48;

    const getOptionsCount = useCallback(() => {
        let maxOptions = 6;
        if (ageMonths < 36) maxOptions = 3;      // Toddler
        else if (ageMonths < 48) maxOptions = 4; // Early Preschool
        else if (ageMonths < 60) maxOptions = 5; // Late Preschool

        return Math.min(2 + Math.floor(gameState.level / 2), maxOptions);
    }, [gameState.level, ageMonths]);

    // Replenish bag when empty
    const replenishBag = useCallback(() => {
        // Filter by age for younger kids
        let availableAnimals = ANIMALS;
        if (ageMonths < 36) {
            // Toddlers: farm + common pets only
            availableAnimals = ANIMALS.filter(a => a.category === 'farm' || a.category === 'pet');
        } else if (ageMonths < 48) {
            // Early preschool: no sea creatures
            availableAnimals = ANIMALS.filter(a => a.category !== 'sea');
        }
        animalBagRef.current = shuffleArray(availableAnimals);
    }, [ageMonths]);

    // Generate round with no repetitions - returns the target animal
    const generateRound = useCallback((): Animal => {
        if (animalBagRef.current.length < getOptionsCount()) {
            replenishBag();
        }

        const numOptions = getOptionsCount();
        const selectedOptions: Animal[] = [];

        // Pull from bag without repetition
        for (let i = 0; i < numOptions && animalBagRef.current.length > 0; i++) {
            selectedOptions.push(animalBagRef.current.pop()!);
        }

        // Pick target from selected options
        const target = selectedOptions[Math.floor(Math.random() * selectedOptions.length)];

        setTargetAnimal(target);
        setOptions(shuffleArray(selectedOptions));

        // Pulse animation for sound card
        soundPulse.setValue(1);
        Animated.loop(
            Animated.sequence([
                Animated.timing(soundPulse, {
                    toValue: 1.05,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(soundPulse, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        return target;
    }, [getOptionsCount, replenishBag, soundPulse]);

    // Initialize on level change - speak only once
    useEffect(() => {
        if (lastSpokenLevelRef.current !== gameState.level) {
            lastSpokenLevelRef.current = gameState.level;

            const newTarget = generateRound();

            // Speak the question after a delay
            setTimeout(() => {
                speak(newTarget.voiceKey);
            }, 500);
        }
    }, [gameState.level]);

    // NOTE: Removed duplicate useEffect that was causing echo
    // The first useEffect already handles speaking on level change

    // Tap to hear sound again
    const handlePlaySound = useCallback(() => {
        speak(targetAnimal.voiceKey);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [speak, targetAnimal]);

    // Handle animal selection
    const handleAnimalPress = useCallback((animal: Animal) => {
        if (isBusy) return; // Block input while processing

        lockInput(1600); // Lock for duration of feedback
        soundPulse.stopAnimation();

        if (animal.name === targetAnimal.name) {
            recordSuccess();
            playSuccess();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Voice feedback using pre-generated Piper voice
            const article = ['elephant', 'owl', 'eagle'].includes(animal.name) ? 'an' : 'a';
            speak(`yes thats ${article} ${animal.name}`);

            showFeedback({
                type: 'success',
                message: `Yes! ${animal.emoji} says "${animal.sound}"`,
                emoji: animal.emoji,
            });

            setTimeout(() => {
                nextLevel();
            }, 1500);
        } else {
            recordError();
            playError();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

            // Play this animal's sound so kids learn what it says
            speak(animal.soundKey);

            showFeedback({
                type: 'error',
                message: `That's a ${animal.name}! Try again!`,
                emoji: animal.emoji,
            }, 1500);
        }
    }, [targetAnimal, isBusy, lockInput, recordSuccess, recordError, nextLevel, showFeedback, playSuccess, playError, soundPulse, speak]);

    const handleResetLevel = useCallback(() => {
        generateRound();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, [generateRound]);

    const handleRestartGame = useCallback(async () => {
        animalBagRef.current = [];
        await resetCurrentGameProgress();
    }, [resetCurrentGameProgress]);

    const optionSize = Math.min((width - spacing.lg * 2 - spacing.md * 2) / Math.min(getOptionsCount(), 3), 130);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <GameControlHeader
                onExit={() => navigation.goBack()}
                onResetLevel={handleResetLevel}
                onRestartGame={handleRestartGame}
            />

            <GameInstruction
                text="Which animal makes this sound?"
                subtext={`Level ${gameState.level} • ${getOptionsCount()} animals`}
            />

            <View style={styles.gameArea}>
                {/* Sound display - tap to play */}
                <Pressable onPress={handlePlaySound}>
                    <Animated.View
                        style={[
                            styles.soundCard,
                            { transform: [{ scale: soundPulse }] },
                        ]}
                    >
                        <Text style={styles.soundIcon}>🔊</Text>
                        <Text style={styles.soundText}>"{targetAnimal.sound}"</Text>
                        <Text style={styles.tapHint}>Tap to hear again</Text>
                    </Animated.View>
                </Pressable>

                {/* Animal options */}
                <View style={styles.optionsContainer}>
                    {options.map((animal, index) => (
                        <Pressable
                            key={`${animal.name}-${index}`}
                            onPress={() => handleAnimalPress(animal)}
                            style={({ pressed }) => [
                                styles.animalOption,
                                {
                                    width: optionSize,
                                    height: optionSize,
                                    transform: [{ scale: pressed ? 0.9 : 1 }],
                                },
                            ]}
                        >
                            <Text style={[styles.animalEmoji, { fontSize: optionSize * 0.72 }]}>
                                {animal.emoji}
                            </Text>
                            <Text style={styles.animalName}>{animal.name}</Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            {/* Feedback at top under level indicator */}
            {feedback && (
                <FeedbackOverlay
                    visible={!!feedback}
                    type={feedback.type}
                    message={feedback.message}
                    emoji={feedback.emoji}
                    position="top"
                    topOffset={130}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    gameArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    soundCard: {
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        borderWidth: 2,
        borderColor: '#8b5cf6',
        borderRadius: 20,
        padding: spacing.lg,
        alignItems: 'center',
        marginBottom: spacing.lg,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    soundIcon: {
        fontSize: 38,
        marginBottom: spacing.sm,
    },
    soundText: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.textPrimary,
        fontStyle: 'italic',
    },
    tapHint: {
        color: colors.textSecondary,
        fontSize: 10,
        marginTop: spacing.sm,
        opacity: 0.8,
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.md,
        maxWidth: width - spacing.lg * 2,
    },
    animalOption: {
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    animalEmoji: {
        textAlign: 'center',
    },
    animalName: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
        textTransform: 'capitalize',
    },
});
