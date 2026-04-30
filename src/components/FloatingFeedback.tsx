import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

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
    const floatAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(floatAnim, {
                toValue: -100,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
            })
        ]).start(() => onComplete());
    }, []);

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    left: x,
                    top: y,
                    opacity: opacityAnim,
                    transform: [{ translateY: floatAnim }],
                }
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
