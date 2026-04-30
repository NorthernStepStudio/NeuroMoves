/**
 * Global Type Definitions
 * Fixing "Cannot find name" errors for global libraries and window properties.
 */

// Three.js is loaded via script tag in index.html, so it's global.
declare const THREE: any;

// Extend the Window interface for custom properties and browser-specific APIs
interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
    App: any;
}
