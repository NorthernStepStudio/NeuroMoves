/**
 * RealLife Steps - Core Helpers
 */

/**
 * Hides an element by adding the 'hidden' class
 * @param {string} elementId 
 */
export const hideElement = (elementId) => {
    const el = document.getElementById(elementId);
    if (el) el.classList.add('hidden');
};

/**
 * Shows an element by removing the 'hidden' class
 * @param {string} elementId 
 */
export const showElement = (elementId) => {
    const el = document.getElementById(elementId);
    if (el) el.classList.remove('hidden');
};

/**
 * Toggles an element's visibility
 * @param {string} elementId 
 */
export const toggleElement = (elementId) => {
    const el = document.getElementById(elementId);
    if (el) el.classList.toggle('hidden');
};

/**
 * Safely parse JSON
 * @param {string} str 
 * @param {any} fallback 
 * @returns {any}
 */
export const safeJsonParse = (str, fallback = null) => {
    try {
        return JSON.parse(str);
    } catch (e) {
        return fallback;
    }
};

/**
 * Wait for a specifed amount of ms
 * @param {number} ms 
 * @returns {Promise}
 */
export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
