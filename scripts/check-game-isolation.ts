import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(process.cwd(), 'src');
const GAMES_DIR = path.join(SRC_DIR, 'games');

// We enforce that game modules do NOT import from each other
// and do not import legacy monolithic context directly if they are refactored.
const REQUIRED_FILES = ['.logic.ts', '.config.ts', '.tts.ts', 'Screen.tsx'];

function checkGameIsolation() {
    let hasErrors = false;
    const games = fs.readdirSync(GAMES_DIR).filter(file => {
        return fs.statSync(path.join(GAMES_DIR, file)).isDirectory();
    });

    console.log(`Checking isolation for ${games.length} games...`);

    for (const game of games) {
        const gamePath = path.join(GAMES_DIR, game);
        const files = fs.readdirSync(gamePath);

        // 1. Check required structure
        const missingFiles = REQUIRED_FILES.filter(ext => !files.some(f => f.endsWith(ext)));
        if (missingFiles.length > 0) {
            console.warn(`[WARNING] Game '${game}' is missing isolated files: ${missingFiles.join(', ')}`);
        }

        // 2. Check for cross-game imports
        for (const file of files) {
            if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;
            
            const content = fs.readFileSync(path.join(gamePath, file), 'utf-8');
            
            // Look for imports going back up to the games directory then into another game
            // e.g. import ... from '../other-game/...'
            const crossGameRegex = /from\s+['"]\.\.\/(?!systems|components|theme|core|services)([^'"]+)['"]/g;
            let match;
            while ((match = crossGameRegex.exec(content)) !== null) {
                const importPath = match[1];
                // if it's another game folder, that's a violation
                if (games.includes(importPath.split('/')[0]) && importPath.split('/')[0] !== game) {
                    console.error(`[ERROR] Isolation violation in ${game}/${file}: imports from another game -> ${importPath}`);
                    hasErrors = true;
                }
            }
        }
    }

    if (hasErrors) {
        console.error('Architecture guard failed! Cross-game coupling detected.');
        process.exit(1);
    }
    
    // 3. Verify Registry Guard
    const gameTypesContent = fs.readFileSync(path.join(SRC_DIR, 'core', 'gameTypes.ts'), 'utf-8');
    const appNavContent = fs.readFileSync(path.join(SRC_DIR, 'navigation', 'AppNavigator.tsx'), 'utf-8');
    const gamesScreenContent = fs.readFileSync(path.join(SRC_DIR, 'screens', 'GamesScreen.tsx'), 'utf-8');
    const homeScreenContent = fs.readFileSync(path.join(SRC_DIR, 'screens', 'HomeScreen.tsx'), 'utf-8');

    // 3a. Check for legacy folder imports
    const allTsxFiles = [appNavContent, gamesScreenContent, homeScreenContent, ...fs.readdirSync(path.join(SRC_DIR, 'systems', 'game')).map(f => fs.readFileSync(path.join(SRC_DIR, 'systems', 'game', f), 'utf-8'))];
    
    if (allTsxFiles.some(content => content.includes('src/screens/games/'))) {
        console.error('[ERROR] Found active import pointing to legacy src/screens/games/ folder!');
        hasErrors = true;
    }

    // 3b. Verify disabled games are hidden in public lists
    if (!gamesScreenContent.includes('.filter(') || !gamesScreenContent.includes('.enabled')) {
        console.error('[ERROR] GamesScreen is not filtering by enabled games!');
        hasErrors = true;
    }
    if (!homeScreenContent.includes('.filter(') || !homeScreenContent.includes('.enabled')) {
        console.error('[ERROR] HomeScreen is not filtering by enabled games!');
        hasErrors = true;
    }

    // 3c. Verify disabled games route to DisabledGameScreen
    if (!appNavContent.includes('DisabledGameScreen')) {
        console.error('[ERROR] AppNavigator is missing DisabledGameScreen guard!');
        hasErrors = true;
    }
    if (!appNavContent.includes('enabled ?') && !appNavContent.includes('DisabledGameScreen')) {
        console.error('[ERROR] AppNavigator is not protecting disabled game routes dynamically!');
        hasErrors = true;
    }

    if (hasErrors) {
        console.error('Architecture guard failed during registry validation.');
        process.exit(1);
    } else {
        console.log('Architecture & Registry guard passed! All checked games are cleanly isolated and routed.');
        process.exit(0);
    }
}

checkGameIsolation();
