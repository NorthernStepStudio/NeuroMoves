// This service provides a wrapper for Speech-to-Text capabilities
// It uses a generic interface that can be backed by expo-speech-recognition or similar libs.

export interface SpeechRecognitionResult {
    text: string;
    isFinal: boolean;
}

export type SpeechRecognitionCallback = (result: SpeechRecognitionResult) => void;

export class SpeechRecognitionService {
    private static isListening = false;

    static async requestPermissions(): Promise<boolean> {
        // In a real implementation, we would call the library's permission request
        console.log('[SpeechRecognition] Requesting permissions...');
        return true;
    }

    static async startListening(onResult: SpeechRecognitionCallback): Promise<void> {
        if (this.isListening) return;
        this.isListening = true;

        console.log('[SpeechRecognition] Started listening...');

        // MOCK IMPLEMENTATION for demonstration since we don't want to break the build
        // with a missing native dependency. In production, this would bridge to the native STT engine.
        /*
        import * as SpeechRecognition from 'expo-speech-recognition';
        await SpeechRecognition.startAsync({
          language: 'en-US',
          onResult: (e) => onResult({ text: e.value[0], isFinal: e.isFinal })
        });
        */
    }

    static async stopListening(): Promise<void> {
        this.isListening = false;
        console.log('[SpeechRecognition] Stopped listening.');
        // await SpeechRecognition.stopAsync();
    }

    /**
     * Helper to check if a heard phrase matches a target name
     */
    static isMatch(heard: string, target: string): boolean {
        const normalizedHeard = heard.toLowerCase().trim();
        const normalizedTarget = target.toLowerCase().trim();

        // Simple inclusion check or fuzzy match
        return normalizedHeard.includes(normalizedTarget) || normalizedTarget.includes(normalizedHeard);
    }
}
