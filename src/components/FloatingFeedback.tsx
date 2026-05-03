import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    runOnJS 
} from 'react-native-reanimated';

interface FloatingFeedbackProps {
    text: string;
    x: number;
    y: number;
    onComplete: () => void;
    color?: string;
}

export const FloatingFeedback: React.FC<FloatingFeedbackProps> = ({
    text,
    x,
    y,
    onComplete,
    color = '#00f2ff'
}) => {
    const float = useSharedValue(0);
    const opacity = useSharedValue(1);

    useEffect(() => {
        float.value = withTiming(-100, { duration: 1000 });
        opacity.value = withTiming(0, { duration: 1000 }, (finished) => {
            if (finished) runOnJS(onComplete)();
        });
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [{ translateY: float.value }],
        };
    });

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    left: x,
                    top: y,
                },
                animatedStyle
            ]}
        >
            <Text style={[styles.text, { color, textShadowColor: color }]}>
                {text}
            </Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        zIndex: 1000,
        pointerEvents: 'none',
    },
    text: {
        fontSize: 40,
        fontWeight: '900',
        textAlign: 'center',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
});
