
// @ts-nocheck
import { useAnimatedStyle } from 'react-native-reanimated';

export const TestComponent = () => {
    const style = useAnimatedStyle(() => {
        'worklet';
        return { opacity: 1 };
    });
    return null;
};
