/**
 * VoiceAssets — Maps spoken text to bundled MP3 files.
 *
 * All TTS audio is pre-generated and shipped with the app bundle.
 * No API calls are made at runtime. The `getVoiceAsset(text)` function
 * normalizes the input text and returns a require()'d asset, or null
 * if no matching MP3 exists.
 *
 * Sources:
 *   - assets/audio/tts/eva/         (bundled EVA voice files)
 */

// ---------------------------------------------------------------------------
// Text normalizer — strips punctuation, lowercases, trims, collapses spaces
// ---------------------------------------------------------------------------

function normalizeKey(text: string): string {
    return text
        .toLowerCase()
        .replace(/['']/g, '')       // smart quotes / apostrophes
        .replace(/[^a-z0-9 ]/g, '') // strip all non-alphanumeric except spaces
        .replace(/\s+/g, '_')       // collapse whitespace → underscore
        .replace(/^_+|_+$/g, '');   // trim leading/trailing underscores
}

// ---------------------------------------------------------------------------
// Static EVA registry lives in src/audio/tts/evaVoiceRegistry.ts.
// ---------------------------------------------------------------------------

const EVA_ASSETS: Record<string, any> = {};

// ---------------------------------------------------------------------------
// Legacy voice fallback is intentionally disabled.
// ---------------------------------------------------------------------------

const LEGACY_ASSETS: Record<string, any> = {};
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Look up a bundled MP3 asset for the given spoken text.
 * Returns a require()'d asset suitable for expo-av, or null if no match.
 */
export function getVoiceAsset(text: string): any | null {
    if (!text) return null;
    const key = normalizeKey(text);
    if (!key) return null;

    // 1. Try bundled EVA assets
    if (EVA_ASSETS[key] !== undefined) {
        return EVA_ASSETS[key];
    }

    // 2. Legacy voice files are intentionally disabled.
    if (LEGACY_ASSETS[key] !== undefined) {
        return LEGACY_ASSETS[key];
    }

    // 3. No match
    return null;
}

/**
 * Exposed for debugging — lists all registered asset keys.
 */
export function getRegisteredKeys(): string[] {
    return [
        ...Object.keys(EVA_ASSETS),
        ...Object.keys(LEGACY_ASSETS),
    ];
}
