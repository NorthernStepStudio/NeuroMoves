#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(appRoot, 'TTS_AUDIO_DESCRIPTIONS.md');
const assetsRoot = path.join(appRoot, 'assets', 'audio', 'tts', 'eva');
const srcRoot = path.join(appRoot, 'src', 'audio', 'tts');
const ttsUrl = process.env.EVA_TTS_URL || 'http://127.0.0.1:5002/api/v1/synthesize';

const activeDirs = [
  'global', 'color-match', 'animal-match', 'point-it-out', 'shape-sorting',
  'size-ordering', 'yes-no', 'emotions', 'letter-tracing', 'number-tracing',
  'letter-recognition', 'number-recognition', 'pop-bubbles', 'stacking',
  'animal-sounds',
];

const sectionToGame = [
  ['Shape Sorting Game', 'shape-sorting'],
  ['Pop Bubbles Game', 'pop-bubbles'],
  ['Color Match Game', 'color-match'],
  ['Yes/No Game', 'yes-no'],
  ['Number Tracing Game', 'number-tracing'],
  ['Stacking Game', 'stacking'],
  ['Say Numbers', 'global'],
  ['Point It Out Game', 'point-it-out'],
  ['Say Letters', 'global'],
  ['Emotions Game', 'emotions'],
  ['Size Ordering Game', 'size-ordering'],
  ['Generic Feedback / Praises', 'global'],
];

const skippedSections = new Set(['Magic Fingers Game', 'Body Parts Game', 'SFX replacements']);

const animals = [
  ['dog', 'woof_woof', 'woof woof'], ['cat', 'meow', 'meow'], ['cow', 'moo', 'moo'],
  ['pig', 'oink_oink', 'oink oink'], ['horse', 'neigh', 'neigh'], ['sheep', 'baa', 'baa'],
  ['goat', 'meh', 'meh'], ['rooster', 'cock_a_doodle_doo', 'cock a doodle doo'],
  ['chicken', 'cluck_cluck', 'cluck cluck'], ['duck', 'quack', 'quack'],
  ['turkey', 'gobble_gobble', 'gobble gobble'], ['lion', 'roar', 'roar'],
  ['elephant', 'trumpet', 'trumpet'], ['monkey', 'ooh_ooh_ah_ah', 'ooh ooh ah ah'],
  ['bear', 'growl', 'growl'], ['wolf', 'howl', 'howl'], ['frog', 'ribbit', 'ribbit'],
  ['snake', 'hiss', 'hiss'], ['gorilla', 'ugh_ugh', 'ugh ugh'], ['zebra', 'bark', 'bark'],
  ['bird', 'tweet_tweet', 'tweet tweet'], ['owl', 'hoot_hoot', 'hoot hoot'],
  ['parrot', 'squawk', 'squawk'], ['crow', 'caw_caw', 'caw caw'],
  ['eagle', 'screech', 'screech'], ['penguin', 'honk', 'honk'],
  ['dolphin', 'click_click', 'click click'], ['whale', 'whooo', 'whooo'],
  ['seal', 'arp_arp', 'arp arp'], ['fish', 'blub_blub', 'blub blub'],
  ['crab', 'click_clack', 'click clack'], ['mouse', 'squeak', 'squeak'],
  ['chick', 'cheep_cheep', 'cheep cheep'], ['tiger', 'roar', 'roar'],
  ['bee', 'buzz', 'buzz'], ['dinosaur', 'rawr', 'rawr'],
];

function idFromFilename(filename) {
  return path.basename(filename, path.extname(filename))
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .toLowerCase();
}

function normalizeText(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[‘’`']/g, '')
    .replace(/[“”]/g, '')
    .replace(/\.\.\./g, ' ')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function categoryFor(id, section) {
  if (section === 'Pop Bubbles Game' && id.includes('all')) return 'finish';
  if (section === 'Generic Feedback / Praises') return /retry|oops/.test(id) ? 'wrong' : 'success';
  if (/error|oops/.test(id)) return 'wrong';
  if (/success|perfect|built/.test(id)) return 'success';
  if (/intro|instruction/.test(id)) return 'instruction';
  if (id.startsWith('yes_') || id.startsWith('that_is_')) return 'success';
  if (id.startsWith('feedback_')) return 'global';
  if (id.startsWith('say_')) return 'other';
  return 'prompt';
}

function add(lines, id, text, game, category = 'prompt') {
  if (!activeDirs.includes(game)) throw new Error(`Invalid voice folder ${game}`);
  const cleanId = idFromFilename(`${id}.mp3`);
  lines.push({
    id: cleanId,
    text,
    game,
    category,
    filename: `${cleanId}.mp3`,
    assetPath: `assets/audio/tts/eva/${game}/${cleanId}.mp3`,
  });
}

function readSavedLines() {
  const lines = [];
  const source = fs.readFileSync(sourcePath, 'utf8').split(/\r?\n/);
  let section = '';

  for (const raw of source) {
    const heading = raw.match(/^##\s+\d+\.\s+(.+)$/);
    if (heading) {
      section = heading[1].trim();
      continue;
    }
    if (skippedSections.has(section)) continue;
    const match = raw.match(/- `([^`]+)` - "(.+?)"/);
    if (!match) continue;
    const [, filename, text] = match;
    const game = sectionToGame.find(([name]) => section.startsWith(name))?.[1];
    if (!game) continue;

    let id = idFromFilename(filename);
    if (id === 'feedback_success') id = 'great_job_v2';
    if (id === 'pop_bubbles') id = 'pop_bubbles_instruction';
    if (id === 'stack_intro') id = 'stack_the_blocks';
    if (id === 'stack_start_here') id = 'start_here';
    if (id === 'stack_tower_built') id = 'tower_built';
    add(lines, id, id === 'pop_bubbles_instruction' ? 'Pop the bubbles!' : text, game, categoryFor(id, section));
  }

  for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
    add(lines, `say_${letter}`, `${letter.toUpperCase()}!`, 'global', 'other');
    add(lines, `find_letter_${letter}`, `Find the letter ${letter}`, 'letter-recognition', 'prompt');
  }

  const numberWords = [
    ['10', 'ten'], ['11', 'eleven'], ['12', 'twelve'], ['13', 'thirteen'],
    ['14', 'fourteen'], ['15', 'fifteen'], ['16', 'sixteen'],
    ['17', 'seventeen'], ['18', 'eighteen'], ['19', 'nineteen'],
    ['20', 'twenty'],
  ];
  for (const [number, word] of numberWords) {
    add(lines, `say_${number}`, `${word.charAt(0).toUpperCase()}${word.slice(1)}!`, 'global', 'other');
  }
  for (let number = 1; number <= 20; number += 1) {
    add(lines, `find_number_${number}`, `Find the number ${number}`, 'number-recognition', 'prompt');
  }

  add(lines, 'which_animal_says', 'Which animal says?', 'animal-sounds', 'instruction');
  const seenSounds = new Set();
  for (const [animal, soundId, soundText] of animals) {
    if (!seenSounds.has(soundId)) {
      seenSounds.add(soundId);
      add(lines, `who_says_${soundId}`, `Who says ${soundText}?`, 'animal-sounds', 'prompt');
      add(lines, `sound_${soundId}`, `${soundText.charAt(0).toUpperCase()}${soundText.slice(1)}!`, 'animal-sounds', 'prompt');
    }
    const article = ['eagle', 'elephant', 'owl'].includes(animal) ? 'an' : 'a';
    add(lines, `yes_thats_${animal}`, `Yes! That's ${article} ${animal}!`, 'animal-sounds', 'success');
  }

  add(lines, 'match_animals', 'Match the animals', 'animal-match', 'instruction');
  add(lines, 'good_job', 'Good job!', 'global', 'success');
  add(lines, 'nice_work', 'Nice work!', 'global', 'success');
  add(lines, 'you_did_it', 'You did it!', 'global', 'success');
  add(lines, 'you_finished', 'You finished!', 'global', 'finish');
  add(lines, 'lets_keep_playing', "Let's keep playing!", 'global', 'success');
  add(lines, 'almost', 'Almost! Try again.', 'global', 'wrong');
  add(lines, 'correct', 'Correct!', 'global', 'success');

  return dedupe(lines);
}

function dedupe(lines) {
  const byText = new Map();
  for (const line of lines) {
    const key = normalizeText(line.text);
    const existing = byText.get(key);
    if (!existing || (existing.game !== 'global' && line.game === 'global')) {
      byText.set(key, line);
    }
  }
  const byId = new Map();
  for (const line of byText.values()) byId.set(line.id, line);
  return [...byId.values()].sort((a, b) => `${a.game}/${a.id}`.localeCompare(`${b.game}/${b.id}`));
}

function writeGeneratedFiles(lines) {
  fs.mkdirSync(srcRoot, { recursive: true });
  const q = (value) => JSON.stringify(value);

  fs.writeFileSync(path.join(srcRoot, 'evaVoiceLines.ts'), `// Generated by scripts/rebuild-eva-tts-assets.cjs
// Source of truth: TTS_AUDIO_DESCRIPTIONS.md plus active game pattern expansions.

export type EvaVoiceLine = {
  id: string;
  text: string;
  game: string;
  category: "instruction" | "prompt" | "success" | "wrong" | "finish" | "global" | "other";
  filename: string;
  assetPath: string;
};

export const EVA_VOICE_LINES: EvaVoiceLine[] = [
${lines.map((line) => `  {
    id: ${q(line.id)},
    text: ${q(line.text)},
    game: ${q(line.game)},
    category: ${q(line.category)},
    filename: ${q(line.filename)},
    assetPath: ${q(line.assetPath)}
  },`).join('\n')}
];
`);

  fs.writeFileSync(path.join(srcRoot, 'evaVoiceRegistry.ts'), `// Generated by scripts/rebuild-eva-tts-assets.cjs
// Static Expo require map for bundled EVA voice assets.

export const EVA_VOICE_REGISTRY = {
${lines.map((line) => `  ${line.id}: require("../../../assets/audio/tts/eva/${line.game}/${line.filename}"),`).join('\n')}
} as const;

export type EvaVoiceId = keyof typeof EVA_VOICE_REGISTRY;
`);

  fs.writeFileSync(path.join(srcRoot, 'evaVoiceResolver.ts'), `// Generated by scripts/rebuild-eva-tts-assets.cjs
// Resolves existing speak(text) calls to bundled EVA voice ids.

import { EVA_VOICE_LINES } from "./evaVoiceLines";
import { EvaVoiceId } from "./evaVoiceRegistry";

export function normalizeResolverText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\\u2018\\u2019\\u201a\\u201b\`']/g, "")
    .replace(/[\\u201c\\u201d]/g, "")
    .replace(/\\.\\.\\./g, " ")
    .replace(/[.,\\/#!$%\\^&\\*;:{}=\\-_\`~()?]/g, "")
    .replace(/\\s+/g, " ")
    .trim();
}

const TEXT_TO_ID_MAP: Record<string, EvaVoiceId> = {};

function addAlias(text: string, id: EvaVoiceId) {
  TEXT_TO_ID_MAP[normalizeResolverText(text)] = id;
}

EVA_VOICE_LINES.forEach((line) => addAlias(line.text, line.id as EvaVoiceId));

const numberAliases: Record<string, EvaVoiceId> = {
  "0": "say_0", zero: "say_0", "1": "say_1", one: "say_1",
  "2": "say_2", two: "say_2", "3": "say_3", three: "say_3",
  "4": "say_4", four: "say_4", "5": "say_5", five: "say_5",
  "6": "say_6", six: "say_6", "7": "say_7", seven: "say_7",
  "8": "say_8", eight: "say_8", "9": "say_9", nine: "say_9",
  "10": "say_10", ten: "say_10", "11": "say_11", eleven: "say_11",
  "12": "say_12", twelve: "say_12", "13": "say_13", thirteen: "say_13",
  "14": "say_14", fourteen: "say_14", "15": "say_15", fifteen: "say_15",
  "16": "say_16", sixteen: "say_16", "17": "say_17", seventeen: "say_17",
  "18": "say_18", eighteen: "say_18", "19": "say_19", nineteen: "say_19",
  "20": "say_20", twenty: "say_20",
};

Object.entries(numberAliases).forEach(([text, id]) => addAlias(text, id));
"abcdefghijklmnopqrstuvwxyz".split("").forEach((letter) => addAlias(letter, \`say_\${letter}\` as EvaVoiceId));

addAlias("great job", "great_job_v2");
addAlias("try again", "feedback_retry");
addAlias("oops try again", "feedback_oops");
addAlias("all popped hurray", "pop_all_hurray");
addAlias("do clean cars fly", "yesno_cars_fly");

// Stacking game aliases
addAlias("build it high", "stack_the_blocks");
addAlias("tower built", "tower_built");
addAlias("start here", "start_here");
addAlias("oh no it fell", "stack_fall");

export function resolveEvaVoiceId(text: string): EvaVoiceId | null {
  if (!text) return null;
  const matchedId = TEXT_TO_ID_MAP[normalizeResolverText(text)];
  if (!matchedId) {
    console.log(\`[TTSManager] Missing EVA voice line for text: "\${text}"\`);
  }
  return matchedId ?? null;
}
`);
}

function prune(lines) {
  const keep = new Set(lines.map((line) => path.join(appRoot, line.assetPath)));
  if (!fs.existsSync(assetsRoot)) return;
  for (const dirent of walk(assetsRoot)) {
    if (dirent.endsWith('.mp3') && !keep.has(dirent)) fs.unlinkSync(dirent);
  }
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

async function generate(lines, force) {
  let failures = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const out = path.join(appRoot, line.assetPath);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    if (!force && fs.existsSync(out) && fs.statSync(out).size > 0) continue;
    console.log(`[${i + 1}/${lines.length}] ${line.id}: ${line.text}`);
    try {
      const response = await fetch(ttsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: line.text,
          voice: process.env.EVA_TTS_VOICE || 'en-US-AvaNeural',
          rate: Number(process.env.EVA_TTS_RATE || -10),
          pitch: Number(process.env.EVA_TTS_PITCH || 0),
          volume: Number(process.env.EVA_TTS_VOLUME || 0),
          format: 'mp3',
        }),
      });
      if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length) throw new Error('empty audio');
      fs.writeFileSync(out, bytes);
    } catch (error) {
      failures += 1;
      console.error(`Failed ${line.id}: ${error.message}`);
    }
  }
  return failures;
}

function writeMissingReport(lines) {
  const missing = lines.filter((line) => {
    const file = path.join(appRoot, line.assetPath);
    return !fs.existsSync(file) || fs.statSync(file).size === 0;
  });
  const reportPath = path.join(srcRoot, 'MISSING_EVA_VOICE_LINES.md');
  if (!missing.length) {
    fs.writeFileSync(reportPath, '# Missing EVA Voice Lines Report\n\nAll EVA voice lines are present.\n');
  } else {
    fs.writeFileSync(reportPath, `# Missing EVA Voice Lines Report

| Voice line id | Text | Expected filename | Expected path | Game | Category |
| --- | --- | --- | --- | --- | --- |
${missing.map((line) => `| \`${line.id}\` | ${line.text} | \`${line.filename}\` | \`${line.assetPath}\` | ${line.game} | ${line.category} |`).join('\n')}
`);
  }
  return missing;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  for (const dir of activeDirs) fs.mkdirSync(path.join(assetsRoot, dir), { recursive: true });
  const lines = readSavedLines();
  writeGeneratedFiles(lines);
  if (!args.has('--no-prune')) prune(lines);
  const failures = args.has('--manifest-only') ? 0 : await generate(lines, args.has('--force'));
  const missing = writeMissingReport(lines);
  console.log(`Voice lines in manifest: ${lines.length}`);
  console.log(`Generated/available files: ${lines.length - missing.length}`);
  console.log(`Missing files: ${missing.length}`);
  if (failures) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
