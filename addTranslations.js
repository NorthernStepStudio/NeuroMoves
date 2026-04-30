const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'i18n', 'translations');

const files = {
    en: path.join(localesDir, 'en.json'),
    es: path.join(localesDir, 'es.json'),
    it: path.join(localesDir, 'it.json'),
};

const newKeys = {
    en: {
        colorMatch: {
            title: "Color Match",
            findText: "Find the matching color",
            instruction: "Find the color {{color}}",
            successMessage: "You got it!",
            tryAgain: "Try again!",
            hintText: "Match the colors",
            level: "Level",
            colors: "Colors"
        },
        pointItOut: {
            title: "Point It Out",
            instruction: "Find the {{object}}",
            successMessage: "You found it!",
            tryAgain: "Try again!"
        },
        shapeSorting: {
            title: "Shape Sorting",
            instruction: "Drag the shapes to their holes",
            successMessage: "Great job!",
            tryAgain: "Keep trying"
        },
        babySigns: {
            title: "Baby Signs",
            instruction: "Show me the sign for {{sign}}"
        },
        emotions: {
            title: "Emotions",
            instruction: "Who is feeling {{emotion}}?"
        },
        bodyParts: {
            title: "Body Parts",
            instruction: "Touch the {{part}}"
        },
        animalSounds: {
            title: "Animal Sounds",
            instruction: "Which animal says {{sound}}?"
        },
        sizeOrdering: {
            title: "Size Ordering",
            instruction: "Arrange by size"
        },
        letterRecognition: {
            title: "Letter Recognition",
            instruction: "Find the letter {{letter}}",
            tryAgain: "Try again!",
            hint: "Tap the matching letter"
        },
        tracing: {
            title: "Letter Tracing",
            instruction: "Trace the letter {{letter}}",
            case: "Case",
            startGreen: "Start at the green dot!",
            successMessage: "Great tracing!",
            greatTracing: "Great tracing!",
            tracingError: "Oops, stay on the path!",
            tryFollowing: "Try following the line"
        },
        numberTracing: {
            title: "Number Tracing",
            instruction: "Trace the number {{number}}",
            startGreen: "Start at the green dot!",
            successMessage: "Great tracing!",
            greatTracing: "Great tracing!",
            tracingError: "Oops, stay on the path!",
            tryFollowing: "Try following the line"
        },
        games: {
            "color-match": { title: "Color Match", description: "Find the matching color" },
            "yes-no": { title: "Yes or No", description: "Swipe to answer questions" },
            "pop-bubbles": { title: "Pop Bubbles", description: "Pop all the bubbles" },
            "point-it-out": { title: "Point It Out", description: "Find hidden objects" },
            "stacking": { title: "Stacking", description: "Stack blocks up high" },
            "shape-sorting": { title: "Shape Sorting", description: "Drag shapes to their holes" },
            "baby-signs": { title: "Baby Signs", description: "Learn sign language basics" },
            "magic-fingers": { title: "Magic Fingers", description: "Finger isolation exercises" },
            "emotions": { title: "Emotions", description: "Match the emotion faces" },
            "body-parts": { title: "Body Parts", description: "Touch the named body part" },
            "animal-sounds": { title: "Animal Sounds", description: "Match sounds to animals" },
            "size-ordering": { title: "Size Ordering", description: "Arrange by size" },
            "tracing": { title: "Letter Tracing", description: "Trace letters with your finger" },
            "number-tracing": { title: "Number Tracing", description: "Learn to write numbers" },
            "letter-recognition": { title: "Letter Recognition", description: "Find the matching letter" },
            "number-recognition": { title: "Number Recognition", description: "Find the matching number" }
        },
        game: { level: "Level", score: "Score" },
        activities: { ready: "activities ready.", proActive: "Pro active.", freeActive: "Free tier active." },
        settings: {
            title: "Settings",
            childProfile: "Child Profile",
            childAge: "Child Age",
            activeProfile: "Active Child Profile",
            noChild: "No child selected",
            manageProfiles: "Manage Child Profiles",
            manageSub: "Add another child, switch profile, edit details",
            dailyJournal: "Daily Journal",
            journalSub: "Track real-life progress notes and photos",
            achievements: "Achievements",
            achievementsSub: "View unlocked milestones and sticker badges",
            avatarStudio: "Avatar Studio",
            avatarSub: "Customize companion character rewards",
            upgradePro: "Upgrade to Pro",
            proSub: "Unlock all activities and advanced pathways",
            appSettings: "App Settings",
            parentMode: "Parent-guided Mode",
            parentSub: "Activities require parent participation",
            audioSettings: "Audio Settings",
            voiceVolume: "Voice Volume",
            voiceSub: "Game instructions",
            sfx: "Sound Effects",
            sfxSub: "Pop, success, error sounds",
            sensoryHaptics: "Sensory & Haptics",
            haptic: "Haptic Feedback",
            hapticSub: "Vibration patterns during gameplay",
            tactile: "Tactile Strength",
            intensity: "intensity",
            about: "About",
            aboutApp: "About NeuroMoves",
            aboutSub: "Who we are and our mission",
            guide: "Activity Guide",
            guideSub: "What each game helps develop",
            contact: "Contact Support",
            version: "App Version",
            legalPrivacy: "Legal & Privacy",
            privacy: "Privacy Policy",
            privacySub: "How we protect your data",
            terms: "Terms of Service",
            termsSub: "Usage agreement",
            medical: "Medical Disclaimer",
            medicalSub: "Important health information",
            dataManagement: "Data Management",
            resetProgress: "Reset All Progress",
            resetSub: "Clear all activity and game history",
            exportData: "Export My Data",
            exportSub: "Download all your data as JSON",
            deleteAccount: "Delete Account",
            deleteSub: "Permanently remove account and all data",
            logout: "Log Out",
            logoutSub: "Sign out of this parent account",
            logoutPromptTitle: "Log Out",
            logoutPromptMessage: "Do you want to sign out?",
            logoutConfirm: "Log Out",
            cancel: "Cancel",
            footer: "Made with ❤️ for parents and children"
        },
        progress: {
            title: "Progress",
            subtitle: "Track your child profile over time.",
            exportPdf: "Export PDF Report",
            shareOt: "Share with OT/SLP",
            dayStreak: "Day Streak",
            startToday: "Start today.",
            greatConsistency: "Great consistency.",
            excellentMomentum: "Excellent momentum.",
            stickers: "Achievement Stickers",
            unlocked: "unlocked",
            noStickers: "No stickers yet. Keep practicing and journaling.",
            successRate: "Success Rate",
            successes: "Successes",
            tried: "Tried",
            speechAttempts: "Speech Attempts",
            otAttempts: "OT Attempts",
            skillProgress: "Skill Progress",
            levels: "levels",
            recentActivity: "Recent Activity",
            noActivity: "No activity yet",
            completeToPopulate: "Complete activities to populate this timeline."
        },
        categories: {
            motor: "Motor Skills",
            cognitive: "Thinking",
            speech: "Speech",
            sensory: "Sensory",
            motorDesc: "Build coordination and movement",
            cognitiveDesc: "Build matching and problem solving",
            sensoryDesc: "Build sensory awareness"
        },
        common: { clean: "Clean" },
        language: "Language"
    },
    es: {
        colorMatch: {
            title: "Combinar Colores",
            findText: "Encuentra el color",
            instruction: "Encuentra el color {{color}}",
            successMessage: "¡Lo lograste!",
            tryAgain: "¡Inténtalo de nuevo!",
            hintText: "Une los colores",
            level: "Nivel",
            colors: "Colores"
        },
        pointItOut: {
            title: "Señálalo",
            instruction: "Encuentra el {{object}}",
            successMessage: "¡Lo encontraste!",
            tryAgain: "¡Inténtalo de nuevo!"
        },
        shapeSorting: {
            title: "Ordenar Formas",
            instruction: "Arrastra las formas a sus agujeros",
            successMessage: "¡Buen trabajo!",
            tryAgain: "Sigue intentando"
        },
        babySigns: {
            title: "Señas de Bebé",
            instruction: "Muéstrame la seña de {{sign}}"
        },
        emotions: {
            title: "Emociones",
            instruction: "¿Quién se siente {{emotion}}?"
        },
        bodyParts: {
            title: "Partes del Cuerpo",
            instruction: "Toca el {{part}}"
        },
        animalSounds: {
            title: "Sonidos de Animales",
            instruction: "¿Qué animal hace {{sound}}?"
        },
        sizeOrdering: {
            title: "Ordenar por Tamaño",
            instruction: "Ordena por tamaño"
        },
        letterRecognition: {
            title: "Reconocer Letras",
            instruction: "Encuentra la letra {{letter}}",
            tryAgain: "¡Inténtalo de nuevo!",
            hint: "Toca la letra correcta"
        },
        tracing: {
            title: "Trazar Letras",
            instruction: "Traza la letra {{letter}}",
            case: "Caja",
            startGreen: "¡Empieza en el punto verde!",
            successMessage: "¡Gran trazado!",
            greatTracing: "¡Gran trazado!",
            tracingError: "¡Uy, mantente en el camino!",
            tryFollowing: "Intenta seguir la línea"
        },
        numberTracing: {
            title: "Trazar Números",
            instruction: "Traza el número {{number}}",
            startGreen: "¡Empieza en el punto verde!",
            successMessage: "¡Gran trazado!",
            greatTracing: "¡Gran trazado!",
            tracingError: "¡Uy, mantente en el camino!",
            tryFollowing: "Intenta seguir la línea"
        },
        games: {
            "color-match": { title: "Color", description: "Encuentra el color igual" },
            "yes-no": { title: "Sí o No", description: "Desliza para responder" },
            "pop-bubbles": { title: "Explotar Burbujas", description: "Explota todas" },
            "point-it-out": { title: "Señálalo", description: "Encuentra objetos ocultos" },
            "stacking": { title: "Apilar", description: "Apila los bloques muy alto" },
            "shape-sorting": { title: "Formas", description: "Arrastra las formas" },
            "baby-signs": { title: "Señas", description: "Aprende el lenguaje de señas" },
            "magic-fingers": { title: "Dedos Mágicos", description: "Ejercicios de dedos" },
            "emotions": { title: "Emociones", description: "Combina las caras" },
            "body-parts": { title: "Cuerpo", description: "Toca la parte del cuerpo" },
            "animal-sounds": { title: "Animales", description: "Combina los sonidos" },
            "size-ordering": { title: "Tamaños", description: "Ordena por tamaño" },
            "tracing": { title: "Trazar Letras", description: "Traza las letras" },
            "number-tracing": { title: "Trazar Números", description: "Aprende a escribir números" },
            "letter-recognition": { title: "Letras", description: "Encuentra la letra" },
            "number-recognition": { title: "Números", description: "Encuentra el número" }
        },
        game: { level: "Nivel", score: "Puntos" },
        activities: { ready: "juegos listos.", proActive: "Pro activo.", freeActive: "Nivel gratis activo." },
        settings: {
            title: "Ajustes",
            childProfile: "Perfil del Niño",
            childAge: "Edad",
            activeProfile: "Perfil Activo",
            noChild: "Ningún niño seleccionado",
            manageProfiles: "Administrar Perfiles",
            manageSub: "Añadir otro, cambiar perfil o editar",
            dailyJournal: "Diario",
            journalSub: "Registra notas y fotos de su progreso real",
            achievements: "Logros",
            achievementsSub: "Ver insignias y recompensas",
            avatarStudio: "Estudio Avatar",
            avatarSub: "Personaliza al compañero",
            upgradePro: "Mejora a Pro",
            proSub: "Desbloquea todo el contenido",
            appSettings: "Ajustes de la App",
            parentMode: "Modo Padres",
            parentSub: "Actividades guiadas por ti",
            audioSettings: "Audio",
            voiceVolume: "Volumen de Voz",
            voiceSub: "Instrucciones de los juegos",
            sfx: "Efectos de Sonido",
            sfxSub: "Sonidos de explotar, éxitos y errores",
            sensoryHaptics: "Sensorial y Háptica",
            haptic: "Vibración",
            hapticSub: "Vibra al interactuar",
            tactile: "Fuerza de la Vibración",
            intensity: "intensidad",
            about: "Acerca de",
            aboutApp: "Acerca de NeuroMoves",
            aboutSub: "Quiénes somos y nuestra misión",
            guide: "Guía de Actividades",
            guideSub: "Qué área desarrolla cada juego",
            contact: "Soporte",
            version: "Versión",
            legalPrivacy: "Legal y Privacidad",
            privacy: "Política de Privacidad",
            privacySub: "Cómo protegemos tus datos",
            terms: "Términos de Servicio",
            termsSub: "Acuerdo de uso",
            medical: "Aviso Médico",
            medicalSub: "Información importante",
            dataManagement: "Información",
            resetProgress: "Borrar Todo el Progreso",
            resetSub: "Borra la historia de juegos",
            exportData: "Exportar Información",
            exportSub: "Descarga toda la información como JSON",
            deleteAccount: "Borrar Cuenta",
            deleteSub: "Elimina permanentemente tu cuenta y data",
            logout: "Cerrar Sesión",
            logoutSub: "Cerrar sesión de esta cuenta",
            logoutPromptTitle: "Cerrar Sesión",
            logoutPromptMessage: "¿Quieres cerrar la sesión?",
            logoutConfirm: "Cerrar Sesión",
            cancel: "Cancelar",
            footer: "Hecho con ❤️ para padres e hijos"
        },
        progress: {
            title: "Progreso",
            subtitle: "Rastrea el perfil de tu hijo en el tiempo.",
            exportPdf: "Exportar Reporte PDF",
            shareOt: "Comparte con el Terapeuta",
            dayStreak: "Racha",
            startToday: "Empieza hoy.",
            greatConsistency: "Gran consistencia.",
            excellentMomentum: "Excelente ritmo.",
            stickers: "Calcomanías Logradas",
            unlocked: "desbloqueadas",
            noStickers: "Aún no hay calcomanías. Sigue practicando.",
            successRate: "% Éxito",
            successes: "Éxitos",
            tried: "Intentos",
            speechAttempts: "Intentos Habla",
            otAttempts: "Intentos Motricidad",
            skillProgress: "Progreso de Habilidades",
            levels: "niveles",
            recentActivity: "Actividad Reciente",
            noActivity: "Sin actividad todavía",
            completeToPopulate: "Completa actividades para llenar esto."
        },
        categories: {
            motor: "Motricidad",
            cognitive: "Pensamiento",
            speech: "Habla",
            sensory: "Sensorial",
            motorDesc: "Desarrolla coordinación y movimiento",
            cognitiveDesc: "Desarrolla resolución de problemas",
            sensoryDesc: "Desarrolla la percepción sensorial"
        },
        common: { clean: "Limpiar" },
        language: "Idioma"
    },
    it: {
        colorMatch: {
            title: "Abbina i Colori",
            findText: "Trova il colore",
            instruction: "Trova il colore {{color}}",
            successMessage: "Ben fatto!",
            tryAgain: "Riprova!",
            hintText: "Abbina i colori",
            level: "Livello",
            colors: "Colori"
        },
        pointItOut: {
            title: "Trovalo",
            instruction: "Trova {{object}}",
            successMessage: "Trovato!",
            tryAgain: "Riprova!"
        },
        shapeSorting: {
            title: "Ordina le Forme",
            instruction: "Trascina le forme",
            successMessage: "Ottimo lavoro!",
            tryAgain: "Continua a provare"
        },
        babySigns: {
            title: "Segni",
            instruction: "Mostrami il segno per {{sign}}"
        },
        emotions: {
            title: "Emozioni",
            instruction: "Chi si sente {{emotion}}?"
        },
        bodyParts: {
            title: "Parti del Corpo",
            instruction: "Tocca {{part}}"
        },
        animalSounds: {
            title: "Versi degli Animali",
            instruction: "Quale animale fa {{sound}}?"
        },
        sizeOrdering: {
            title: "Ordina per Dimensione",
            instruction: "Ordina per dimensione"
        },
        letterRecognition: {
            title: "Riconoscimento Lettere",
            instruction: "Trova la lettea {{letter}}",
            tryAgain: "Riprova!",
            hint: "Tocca la lettera corrispondente"
        },
        tracing: {
            title: "Traccia Lettere",
            instruction: "Traccia la lettera {{letter}}",
            case: "Maiuscolo/Minuscolo",
            startGreen: "Inizia dal punto verde!",
            successMessage: "Ottimo tratto!",
            greatTracing: "Ottimo tratto!",
            tracingError: "Ops, rimani sulla linea!",
            tryFollowing: "Prova a seguire la linea"
        },
        numberTracing: {
            title: "Traccia Numeri",
            instruction: "Traccia il numero {{number}}",
            startGreen: "Inizia dal punto verde!",
            successMessage: "Ottimo tratto!",
            greatTracing: "Ottimo tratto!",
            tracingError: "Ops, rimani sulla linea!",
            tryFollowing: "Prova a seguire la linea"
        },
        games: {
            "color-match": { title: "Colori", description: "Trova il colore corrispondente" },
            "yes-no": { title: "Sì o No", description: "Scorri per rispondere" },
            "pop-bubbles": { title: "Scoppia Bolle", description: "Scoppia tutte le bolle" },
            "point-it-out": { title: "Trovalo", description: "Trova gli oggetti nascosti" },
            "stacking": { title: "Impilare", description: "Impila i blocchi in alto" },
            "shape-sorting": { title: "Forme", description: "Trascina le forme" },
            "baby-signs": { title: "Segni", description: "Impara i segni di base" },
            "magic-fingers": { title: "Dita Magiche", description: "Esercizi per le dita" },
            "emotions": { title: "Emozioni", description: "Abbina le facce" },
            "body-parts": { title: "Corpo", description: "Tocca la parte del corpo" },
            "animal-sounds": { title: "Animali", description: "Abbina i suoni" },
            "size-ordering": { title: "Dimensioni", description: "Ordina per dimensione" },
            "tracing": { title: "Traccia Lettere", description: "Traccia le lettere con il dito" },
            "number-tracing": { title: "Traccia Numeri", description: "Impara a scrivere i numeri" },
            "letter-recognition": { title: "Lettere", description: "Trova la lettera" },
            "number-recognition": { title: "Numeri", description: "Trova il numero" }
        },
        game: { level: "Livello", score: "Punti" },
        activities: { ready: "giochi pronti.", proActive: "Pro attivo.", freeActive: "Livello gratuito attivo." },
        settings: {
            title: "Impostazioni",
            childProfile: "Profilo del Bambino",
            childAge: "Età",
            activeProfile: "Profilo Attivo",
            noChild: "Nessun bambino selezionato",
            manageProfiles: "Gestisci Profili",
            manageSub: "Aggiungi, cambia profilo o modifica",
            dailyJournal: "Diario",
            journalSub: "Tieni traccia dei progressi reali e foto",
            achievements: "Traguardi",
            achievementsSub: "Vedi medaglie e adesivi vinti",
            avatarStudio: "Studio Avatar",
            avatarSub: "Personalizza il compagno",
            upgradePro: "Passa a Pro",
            proSub: "Sblocca tutti i giochi",
            appSettings: "Impostazioni App",
            parentMode: "Modalità Genitori",
            parentSub: "Attività guidate da te",
            audioSettings: "Audio",
            voiceVolume: "Volume Voce",
            voiceSub: "Istruzioni vocali",
            sfx: "Effetti Sonori",
            sfxSub: "Suoni dei giochi",
            sensoryHaptics: "Feedback Tattile",
            haptic: "Vibrazione",
            hapticSub: "Vibra al tocco",
            tactile: "Forza Vibrazione",
            intensity: "intensità",
            about: "Info",
            aboutApp: "Info su NeuroMoves",
            aboutSub: "Chi siamo",
            guide: "Guida Attività",
            guideSub: "A cosa serve ogni gioco",
            contact: "Supporto",
            version: "Versione",
            legalPrivacy: "Privacy",
            privacy: "Informativa sulla Privacy",
            privacySub: "Come proteggiamo i tuoi dati",
            terms: "Termini",
            termsSub: "Condizioni d'uso",
            medical: "Avviso Medico",
            medicalSub: "Informazioni sanitarie",
            dataManagement: "Dati",
            resetProgress: "Cancella Progressi",
            resetSub: "Rimuovi tutta la cronologia",
            exportData: "Esporta Dati",
            exportSub: "Scarica un file JSON dei tuoi dati",
            deleteAccount: "Elimina Account",
            deleteSub: "Elimina permanentemente l'account",
            logout: "Esci",
            logoutSub: "Esci dal tuo account genitore",
            logoutPromptTitle: "Esci",
            logoutPromptMessage: "Vuoi uscire?",
            logoutConfirm: "Esci",
            cancel: "Annulla",
            footer: "Fatto con ❤️ per genitori e bambini"
        },
        progress: {
            title: "Progresso",
            subtitle: "Segui lo sviluppo del bambino.",
            exportPdf: "Esporta PDF",
            shareOt: "Condividi col terapeuta",
            dayStreak: "Giorni di fila",
            startToday: "Inizia oggi.",
            greatConsistency: "Costanza ottima.",
            excellentMomentum: "Slancio eccellente.",
            stickers: "Traguardi Raggiunti",
            unlocked: "sbloccati",
            noStickers: "Nessun adesivo ancora. Continua a praticare.",
            successRate: "% Successo",
            successes: "Successi",
            tried: "Tentati",
            speechAttempts: "Tentativi Parola",
            otAttempts: "Tentativi Motori",
            skillProgress: "Progresso Abilità",
            levels: "livelli",
            recentActivity: "Attività Recente",
            noActivity: "Nessuna attività ancora",
            completeToPopulate: "Completa un'attività per iniziare."
        },
        categories: {
            motor: "Motricità",
            cognitive: "Cognitivo",
            speech: "Linguaggio",
            sensory: "Sensoriale",
            motorDesc: "Sviluppa coordinazione e movimento",
            cognitiveDesc: "Sviluppa capacità di problem solving",
            sensoryDesc: "Sviluppa la percezione sensoriale"
        },
        common: { clean: "Pulisci" },
        language: "Lingua"
    }
};

for (const lang of Object.keys(files)) {
    const filePath = files[lang];
    try {
        let raw = fs.readFileSync(filePath, 'utf8');
        let data = JSON.parse(raw);

        // Merge newKeys
        data = { ...data, ...newKeys[lang] };

        fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
        console.log(`Updated ${filePath}`);
    } catch (err) {
        console.error(`Error processing ${filePath}:`, err);
    }
}
