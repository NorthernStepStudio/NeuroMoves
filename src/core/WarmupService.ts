import i18n from '../i18n';
import { VOICE_ASSETS } from './VoiceAssets';

/**
 * WarmupService
 * 
 * This service pre-generates and caches essential voice assets 
 * to ensure a zero-latency experience during gameplay.
 */
export const WarmupService = {
    isInterrupted: false,
    stop: () => {
        WarmupService.isInterrupted = true;
    },
    warmup: async (speak: (text: string, options?: any) => Promise<void>) => {
        WarmupService.isInterrupted = false;
        console.log('[WarmupService] Starting background warmup...');
        
        try {
            // Helper to check for interruption
            const check = () => {
                if (WarmupService.isInterrupted) throw new Error('INTERRUPTED');
            };

            // 1. Warm up Numbers 0-10 (High Priority)
            const numbers = Array.from({ length: 11 }, (_, i) => i.toString());
            for (const n of numbers) {
                check();
                // Pre-fetch the number itself
                await speak(n, { shouldOnlyCache: true });
                check();
                // Pre-fetch the instruction
                await speak(i18n.t('numberTracing.instruction', { number: n }), { shouldOnlyCache: true });
                await speak(i18n.t('numberRecognition.instruction', { number: n }), { shouldOnlyCache: true });
                // Small breath to allow other requests
                await new Promise(r => setTimeout(r, 500));
            }

            // 2. Warm up Letters A-Z (Medium Priority)
            const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
            for (const l of letters) {
                await speak(l, { shouldOnlyCache: true });
                await speak(i18n.t('tracing.instruction', { letter: l }), { shouldOnlyCache: true });
            }

            // 3. Warm up Common Feedback
            const feedbackKeys = [
                'numberTracing.successMessage',
                'numberTracing.greatTracing',
                'tracing.successMessage',
                'tracing.greatTracing',
                'colorMatch.successMessage',
                'yesNo.greatJob',
                'common.clean'
            ];
            
            for (const key of feedbackKeys) {
                await speak(i18n.t(key), { shouldOnlyCache: true });
            }

            console.log('[WarmupService] Warmup completed successfully.');
        } catch (error) {
            console.warn('[WarmupService] Warmup interrupted:', error);
        }
    }
};
