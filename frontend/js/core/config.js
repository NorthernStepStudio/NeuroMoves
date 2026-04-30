/**
 * RealLife Steps - App Configuration
 */

import { API_BASE_URL } from './constants.js';

export const Config = {
    apiBase: API_BASE_URL,
    speech: {
        timeout: 5000,
        lang: 'en-US'
    },
    ui: {
        fadeTimeout: 500,
        modalAnimationDuration: 300
    },
    // Feature flags
    debug: false,
    use3DModules: true
};
