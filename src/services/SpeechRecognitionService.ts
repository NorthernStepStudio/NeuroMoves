export interface SpeechRecognitionResult {
  text: string;
  isFinal: boolean;
}

export type SpeechRecognitionCallback = (result: SpeechRecognitionResult) => void;

/**
 * Production-safe placeholder: speech recognition is currently disabled.
 * This prevents partial/mock behavior from surfacing as a broken feature.
 */
export class SpeechRecognitionService {
  private static isListening = false;
  private static warnedUnsupported = false;

  static isAvailable(): boolean {
    return false;
  }

  static async requestPermissions(): Promise<boolean> {
    if (__DEV__ && !this.warnedUnsupported) {
      console.warn('[SpeechRecognition] Disabled: no native STT implementation is configured for this build.');
      this.warnedUnsupported = true;
    }
    return false;
  }

  static async startListening(_onResult: SpeechRecognitionCallback): Promise<void> {
    this.isListening = false;
  }

  static async stopListening(): Promise<void> {
    this.isListening = false;
  }

  /**
   * Helper to check if a heard phrase matches a target name.
   */
  static isMatch(heard: string, target: string): boolean {
    const normalizedHeard = heard.toLowerCase().trim();
    const normalizedTarget = target.toLowerCase().trim();
    return normalizedHeard.includes(normalizedTarget) || normalizedTarget.includes(normalizedHeard);
  }
}
