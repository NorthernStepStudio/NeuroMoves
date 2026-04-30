/**
 * RealLife Steps OT - Localization Module
 * Supports: English (en), Spanish (es), Italian (it)
 */

const Localization = {
    currentLanguage: 'en',

    // Translation strings
    strings: {
        en: {
            // Home Screen
            pick_game: "Pick a Game!",
            fine_motor: "🖐️ Fine Motor Skills",
            visual_thinking: "👀 Visual & Thinking",
            communication: "💬 Communication",
            body_awareness: "🧍 Body Awareness",

            // Activities
            magic_fingers: "Magic Fingers",
            magic_fingers_desc: "Count with your fingers!",
            shape_sorting: "Shape Sorting",
            shape_sorting_desc: "Match the shapes!",
            stacking: "Stacking",
            stacking_desc: "Build a tower!",
            tracing: "Tracing",
            tracing_desc: "Follow the path!",
            point_it_out: "Point It Out",
            point_it_out_desc: "Find hidden things!",
            color_match: "Color Match",
            color_match_desc: "Find the colors!",
            pop_bubbles: "Pop Bubbles",
            pop_bubbles_desc: "Pop them all!",
            size_matters: "Size Matters",
            size_matters_desc: "Sort By Size!",
            sort_sizes: "Sort the items by size!",
            small: "Small",
            medium: "Medium",
            large: "Large",
            baby_signs: "Baby Signs",
            baby_signs_desc: "Learn sign language!",
            yes_no: "Yes or No",
            yes_no_desc: "Swipe to answer!",
            feelings: "Feelings",
            feelings_desc: "How do they feel?",
            body_parts: "Body Parts",
            body_parts_desc: "Where is your nose?",
            animal_sounds: "Animal Sounds",
            animal_sounds_desc: "What does it say?",

            // Game Screen
            level: "Level",

            // Instructions
            tap_fingers: "Tap the fingers in order!",
            find_the: "Find the",
            watch_and_tap: "Watch and tap along!",
            swipe_answer: "Swipe up for Yes, side for No!",
            drag_shape: "Drag the shape to the matching hole!",
            tap_to_stack: "Tap to stack blocks!",
            trace_line: "Trace the line with your finger!",
            tap_color: "Tap the {color} circle!",
            pop_all: "Pop all the bubbles!",
            find_face: "Which face is {emotion}?",
            where_is: "Where is the {part}?",
            what_says: "Find the animal that says {sound}",

            // Colors
            red: "red", blue: "blue", yellow: "yellow", green: "green",

            // Emotions
            happy: "happy", sad: "sad", angry: "angry", surprised: "surprised",

            // Body Parts
            nose: "nose", eyes: "eyes", mouth: "mouth", ears: "ears",

            // Feedback
            great_job: "Great job!",
            amazing: "Amazing!",
            wonderful: "Wonderful!",
            try_again: "Try again!",
            almost: "Almost there!",
            keep_going: "Keep going!",
            pop: "Pop!",

            // Hints
            hint_glow: "Look for the glow!",
            hint_direction: "Swipe this way →",

            // Modal
            select_language: "Select Language",

            // About & Legal
            about_title: "About RealLife Steps OT",
            mission_title: "Our Mission",
            mission_text: "Empowering every child to learn at their own pace through errorless play and positive reinforcement.",
            vision_title: "Our Vision",
            vision_text: "To provide accessible, engaging, and therapeutic digital companions for occupational therapy that kids love.",
            legal_title: "Legal",
            disclaimer_text: "Disclaimer: This application is an educational tool and does not constitute medical advice or replace professional occupational therapy.",
            close: "Close"
        },
        es: {
            // Home Screen
            pick_game: "¡Elige un Juego!",
            fine_motor: "🖐️ Deditos Hábiles",
            visual_thinking: "👀 Visual y Pensamiento",
            communication: "💬 Comunicación",
            body_awareness: "🧍 Conciencia Corporal",

            // Activities
            magic_fingers: "Dedos Mágicos",
            magic_fingers_desc: "¡Cuenta con tus dedos!",
            shape_sorting: "Ordenar Formas",
            shape_sorting_desc: "¡Une las formas!",
            stacking: "Apilar",
            stacking_desc: "¡Construye una torre!",
            tracing: "Trazar",
            tracing_desc: "¡Sigue el camino!",
            point_it_out: "Encuéntralo",
            point_it_out_desc: "¡Encuentra cosas ocultas!",
            color_match: "Colores",
            color_match_desc: "¡Encuentra los colores!",
            pop_bubbles: "Explota Burbujas",
            pop_bubbles_desc: "¡Explótalas todas!",
            baby_signs: "Señas de Bebé",
            baby_signs_desc: "¡Aprende lenguaje de señas!",
            yes_no: "Sí o No",
            yes_no_desc: "¡Desliza para responder!",
            feelings: "Emociones",
            feelings_desc: "¿Cómo se sienten?",
            body_parts: "Partes del Cuerpo",
            body_parts_desc: "¿Dónde está tu nariz?",
            animal_sounds: "Sonidos de Animales",
            animal_sounds_desc: "¿Qué dice?",

            // Game Screen
            level: "Nivel",

            // Instructions
            tap_fingers: "¡Toca los dedos en orden!",
            find_the: "Encuentra",
            watch_and_tap: "¡Mira y toca al ritmo!",
            swipe_answer: "¡Desliza arriba para Sí, al lado para No!",
            drag_shape: "¡Arrastra la forma al agujero correcto!",
            tap_to_stack: "¡Toca para apilar bloques!",
            trace_line: "¡Traza la línea con tu dedo!",
            tap_color: "¡Toca el círculo {color}!",
            pop_all: "¡Explota todas las burbujas!",
            find_face: "¿Cuál cara está {emotion}?",
            where_is: "¿Dónde está la {part}?",
            what_says: "Encuentra el animal que dice {sound}",

            // Colors
            red: "rojo", blue: "azul", yellow: "amarillo", green: "verde",

            // Emotions
            happy: "feliz", sad: "triste", angry: "enojado", surprised: "sorprendido",

            // Body Parts
            nose: "nariz", eyes: "ojos", mouth: "boca", ears: "orejas",

            // Feedback
            great_job: "¡Buen trabajo!",
            amazing: "¡Increíble!",
            wonderful: "¡Maravilloso!",
            try_again: "¡Inténtalo de nuevo!",
            almost: "¡Ya casi!",
            keep_going: "¡Sigue así!",
            pop: "¡Pop!",

            // Hints
            hint_glow: "¡Busca el brillo!",
            hint_direction: "Desliza así →",

            // Modal
            select_language: "Seleccionar Idioma",

            // About & Legal
            about_title: "Sobre RealLife Steps OT",
            mission_title: "Nuestra Misión",
            mission_text: "Empoderar a cada niño para aprender a su propio ritmo a través del juego sin errores.",
            vision_title: "Nuestra Visión",
            vision_text: "Proporcionar compañeros digitales accesibles y terapéuticos para terapia ocupacional.",
            legal_title: "Legal",
            disclaimer_text: "Aviso: Esta aplicación es educativa y no constituye consejo médico ni reemplaza terapia profesional.",
            close: "Cerrar"
        },
        it: {
            // Home Screen
            pick_game: "Scegli un Gioco!",
            fine_motor: "🖐️ Motricità Fine",
            visual_thinking: "👀 Visivo e Pensiero",
            communication: "💬 Comunicazione",
            body_awareness: "🧍 Consapevolezza del Corpo",

            // Activities
            magic_fingers: "Dita Magiche",
            magic_fingers_desc: "Conta con le dita!",
            shape_sorting: "Ordina Forme",
            shape_sorting_desc: "Abbina le forme!",
            stacking: "Impilare",
            stacking_desc: "Costruisci una torre!",
            tracing: "Tracciare",
            tracing_desc: "Segui il percorso!",
            point_it_out: "Trovalo",
            point_it_out_desc: "Trova le cose nascoste!",
            color_match: "Colori",
            color_match_desc: "Trova i colori!",
            pop_bubbles: "Scoppia Bolle",
            pop_bubbles_desc: "Scoppiale tutte!",
            baby_signs: "Segni del Bebè",
            baby_signs_desc: "Impara la lingua dei segni!",
            yes_no: "Sì o No",
            yes_no_desc: "Scorri per rispondere!",
            feelings: "Emozioni",
            feelings_desc: "Come si sentono?",
            body_parts: "Parti del Corpo",
            body_parts_desc: "Dov'è il tuo naso?",
            animal_sounds: "Versi degli Animali",
            animal_sounds_desc: "Cosa dice?",

            // Game Screen
            level: "Livello",

            // Instructions
            tap_fingers: "Tocca le dita in ordine!",
            find_the: "Trova",
            watch_and_tap: "Guarda e tocca a tempo!",
            swipe_answer: "Scorri su per Sì, di lato per No!",
            drag_shape: "Trascina la forma nel buco giusto!",
            tap_to_stack: "Tocca per impilare i blocchi!",
            trace_line: "Traccia la linea con il dito!",
            tap_color: "Tocca il cerchio {color}!",
            pop_all: "Scoppia tutte le bolle!",
            find_face: "Quale faccia è {emotion}?",
            where_is: "Dov'è il/la {part}?",
            what_says: "Trova l'animale che dice {sound}",

            // Colors
            red: "rosso", blue: "blu", yellow: "giallo", green: "verde",

            // Emotions
            happy: "felice", sad: "triste", angry: "arrabbiato", surprised: "sorpreso",

            // Body Parts
            nose: "naso", eyes: "occhi", mouth: "bocca", ears: "orecchie",

            // Feedback
            great_job: "Bravo!",
            amazing: "Fantastico!",
            wonderful: "Meraviglioso!",
            try_again: "Riprova!",
            almost: "Ci sei quasi!",
            keep_going: "Continua così!",
            pop: "Pop!",

            // Hints
            hint_glow: "Cerca la luce!",
            hint_direction: "Scorri così →",

            // Modal
            select_language: "Seleziona Lingua",

            // About & Legal
            about_title: "Su RealLife Steps OT",
            mission_title: "La Nostra Missione",
            mission_text: "Dare a ogni bambino il potere di imparare al proprio ritmo attraverso il gioco senza errori.",
            vision_title: "La Nostra Visione",
            vision_text: "Fornire strumenti digitali accessibili e terapeutici per la terapia occupazionale.",
            legal_title: "Legale",
            disclaimer_text: "Disclaimer: Questa app è uno strumento educativo e non sostituisce la terapia occupazionale professionale.",
            close: "Chiudi"
        }
    },

    /**
     * Initialize localization
     */
    init() {
        // Load saved language preference
        const saved = localStorage.getItem('reallife_steps_language');
        if (saved && this.strings[saved]) {
            this.currentLanguage = saved;
        }

        this.updateUI();
    },

    /**
     * Get translated string
     * @param {string} key - Translation key
     * @param {object} params - Optional parameters for interpolation
     * @returns {string} Translated string
     */
    get(key, params = {}) {
        const lang = this.strings[this.currentLanguage] || this.strings.en;
        let text = lang[key] || this.strings.en[key] || key;

        // Simple parameter interpolation
        Object.keys(params).forEach(param => {
            text = text.replace(`{${param}}`, params[param]);
        });

        return text;
    },

    /**
     * Set current language
     * @param {string} lang - Language code (en, es, it)
     */
    setLanguage(lang) {
        if (this.strings[lang]) {
            this.currentLanguage = lang;
            localStorage.setItem('reallife_steps_language', lang);
            this.updateUI();
            return true;
        }
        return false;
    },

    /**
     * Update all UI elements with data-i18n attribute
     */
    updateUI() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.get(key);
        });

        // Update HTML lang attribute
        document.documentElement.lang = this.currentLanguage;
    },

    /**
     * Get random encouragement message
     * @returns {string} Random encouragement
     */
    getEncouragement() {
        const messages = ['great_job', 'amazing', 'wonderful'];
        const key = messages[Math.floor(Math.random() * messages.length)];
        return this.get(key);
    },

    /**
     * Get redirect/try again message (Errorless Learning)
     * @returns {string} Gentle redirect message
     */
    getRedirect() {
        const messages = ['try_again', 'almost', 'keep_going'];
        const key = messages[Math.floor(Math.random() * messages.length)];
        return this.get(key);
    }
};

// Export for use in other modules
window.Localization = Localization;
