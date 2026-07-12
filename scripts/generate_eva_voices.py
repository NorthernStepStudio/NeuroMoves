raise SystemExit("Retired. Use scripts/rebuild-eva-tts-assets.cjs for the local EVA asset workflow.")

import os
import sys
import asyncio
import edge_tts

VOICE = "en-US-AvaNeural"
RATE = "-10%"  # Slower rate for child-friendliness
PITCH = "+0Hz"
VOLUME = "+0%"
FORCE_REGENERATE = True  # Overwrite existing audio files

APP_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(APP_ROOT, "assets", "audio", "tts", "eva")
SRC_DIR = os.path.join(APP_ROOT, "src", "audio", "tts")

def clean_text_for_speech(text):
    """
    Cleans punctuation like ellipses (...) or commas which might cause engine stuttering
    or bad pausing, ensuring the TTS reads normal words.
    """
    cleaned = text.replace("...", " ").replace(",...", " ")
    # Remove excessive spacing
    while "  " in cleaned:
        cleaned = cleaned.replace("  ", " ")
    return cleaned.strip()

# Define the base lines list
VOICE_LINES = []

def add_line(line_id, text, game, category, subdir):
    VOICE_LINES.append({
        "id": line_id,
        "text": text,
        "game": game,
        "category": category,
        "filename": f"{line_id}.mp3",
        "subdir": subdir
    })

# 1. Pop Bubbles
add_line("pop_bubbles_instruction", "Pop the bubbles!", "pop-bubbles", "instruction", "pop-bubbles")
add_line("pop_all_hurray", "All popped! Hurray!", "pop-bubbles", "finish", "pop-bubbles")

# 2. Color Match
add_line("find_matching_color", "Find the matching color", "color-match", "instruction", "color-match")
add_line("find_color", "Find the matching color", "color-match", "instruction", "color-match")
colors = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan", "lime", "teal", "brown"]
for c in colors:
    add_line(f"find_{c}", f"Find the {c} color", "color-match", "prompt", "color-match")

# 3. Animal Match
add_line("match_animals", "Match the animals", "animal-match", "instruction", "animal-match")
add_line("match_same_ones", "Match the same ones", "animal-match", "prompt", "animal-match")

# 4. Point It Out
items = {
    "red_car": "Find the red car",
    "teddy_bear": "Find the teddy bear",
    "green_apple": "Find the green apple",
    "red_ball": "Find the red ball",
    "blue_book": "Find the blue book",
    "yellow_banana": "Find the yellow banana",
    "blue_cup": "Find the blue cup",
    "white_spoon": "Find the white spoon",
    "cookie_jar": "Find the cookie jar",
    "toy_robot": "Find the toy robot",
    "flashlight": "Find the flashlight",
    "slippers": "Find the slippers",
    "star_pillow": "Find the star pillow",
    "purple_block": "Find the purple block",
    "toy_airplane": "Find the toy airplane",
    "spinning_top": "Find the spinning top",
    "colorful_ball": "Find the colorful ball",
    "watering_can": "Find the watering can",
    "garden_trowel": "Find the garden trowel",
    "ladybug": "Find the ladybug",
    "sun_hat": "Find the sun hat",
    "yellow_duck": "Find the yellow duck",
    "green_shampoo": "Find the green shampoo bottle",
    "blue_toothbrush": "Find the blue toothbrush",
    "blue_towel": "Find the blue towel",
    "red_bicycle": "Find the red bicycle",
    "blue_toolbox": "Find the blue tool box",
    "soccer_ball": "Find the soccer ball",
    "cardboard_box": "Find the cardboard box"
}
for item_id, item_text in items.items():
    add_line(f"find_{item_id}", item_text, "point-it-out", "prompt", "point-it-out")

# 5. Shape Sorting
add_line("shape_sorting_instruction", "Drag the shapes to their holes", "shape-sorting", "instruction", "shape-sorting")
shapes = ["circle", "square", "triangle", "star", "heart", "pentagon", "hexagon", "diamond"]
for s in shapes:
    if s == "circle":
        add_line("drag_circle", "Drag the circle to its hole", "shape-sorting", "prompt", "shape-sorting")
    else:
        add_line(f"drag_{s}", f"Drag the {s}", "shape-sorting", "prompt", "shape-sorting")
add_line("shape_error", "Not that one", "shape-sorting", "wrong", "shape-sorting")
add_line("shape_success", "Perfect fit!", "shape-sorting", "success", "shape-sorting")

# 6. Size Ordering
add_line("size_ordering_instruction", "Arrange by size", "size-ordering", "instruction", "size-ordering")
add_line("order_smallest_largest", "Try smallest to largest", "size-ordering", "prompt", "size-ordering")
add_line("order_perfect", "Perfect order!", "size-ordering", "success", "size-ordering")
add_line("order_error", "Try smallest first", "size-ordering", "wrong", "size-ordering")

# 7. Yes/No Game
add_line("choose_correct_answer", "Choose the correct answer", "yes-no", "instruction", "yes-no")
add_line("touch_correct_answer", "Touch the correct answer", "yes-no", "instruction", "yes-no")
add_line("yes_no_instruction", "Is it", "yes-no", "instruction", "yes-no")

yesno_questions = {
    "apple": "Is this an apple?",
    "dog": "Is this a dog?",
    "car": "Is this a car?",
    "fish": "Is this a fish?",
    "bird": "Is this a bird?",
    "cat": "Is this a cat?",
    "sun_yellow": "Is the sun yellow?",
    "grass_green": "Is the grass green?",
    "sky_blue": "Is the sky blue?",
    "strawberry_red": "Is a strawberry red?",
    "lemon_purple": "Is a lemon purple?",
    "snow_black": "Is snow black?",
    "cats_meow": "Do cats meow?",
    "birds_fly": "Do birds fly?",
    "fish_walk": "Do fish walk?",
    "dogs_quack": "Do dogs quack?",
    "cows_moo": "Do cows moo?",
    "snakes_run": "Do snakes run?",
    "ice_cold": "Is ice cold?",
    "fire_hot": "Is fire hot?",
    "rock_soft": "Is a rock soft?",
    "candy_sweet": "Is candy sweet?",
    "cars_fly": "Do cars fly?",
    "rain_dry": "Is rain dry?"
}
for y_id, y_text in yesno_questions.items():
    add_line(f"yesno_{y_id}", y_text, "yes-no", "prompt", "yes-no")

# 8. Emotions Game
emotions = ["happy", "sad", "angry", "surprised", "scared", "sleepy", "silly", "loving"]
for e in emotions:
    add_line(f"who_is_feeling_{e}", f"Who is feeling {e}?", "emotions", "prompt", "emotions")
    add_line(f"find_{e}", f"Find the {e} face", "emotions", "prompt", "emotions")
    add_line(f"yes_that_is_{e}", f"Yes that is {e}", "emotions", "success", "emotions")

# 9. Letter Tracing & Recognition
add_line("find_letter", "Find the letter", "letter-recognition", "instruction", "letter-recognition")
add_line("trace_letter_perfect", "Perfect letter!", "letter-tracing", "success", "letter-tracing")
add_line("trace_letter_error", "Oops stay inside the line", "letter-tracing", "wrong", "letter-tracing")
add_line("trace_error", "Oops stay on the path", "letter-tracing", "wrong", "letter-tracing")
add_line("trace_start_green", "Start at the green dot", "letter-tracing", "prompt", "letter-tracing")
add_line("trace_try_following", "Try following the line", "letter-tracing", "prompt", "letter-tracing")

import string
for letter in string.ascii_uppercase:
    l_lower = letter.lower()
    add_line(f"say_{letter}", f"{letter}!", "global", "other", "global")
    add_line(f"find_letter_{l_lower}", f"Find the letter {l_lower}", "letter-recognition", "prompt", "letter-recognition")
    add_line(f"trace_letter_{l_lower}", f"Trace the letter {l_lower}", "letter-tracing", "prompt", "letter-tracing")

# 10. Number Tracing & Recognition
add_line("find_number", "Find the number", "number-recognition", "instruction", "number-recognition")
add_line("trace_perfect", "Perfect number!", "number-tracing", "success", "number-tracing")

num_words = {
    0: "Zero", 1: "One", 2: "Two", 3: "Three", 4: "Four",
    5: "Five", 6: "Six", 7: "Seven", 8: "Eight", 9: "Nine", 10: "Ten"
}
for n in range(11):
    word = num_words[n]
    add_line(f"say_{n}", f"{word}!", "global", "other", "global")
    add_line(f"find_number_{n}", f"Find the number {n}", "number-recognition", "prompt", "number-recognition")
    if n < 10:
        add_line(f"trace_number_{n}", f"Trace the number {n}", "number-tracing", "prompt", "number-tracing")

# 11. Stacking
add_line("stack_the_blocks", "Stack the blocks!", "stacking", "instruction", "stacking")
add_line("build_it_high", "Build it high!", "stacking", "prompt", "stacking")
for i in range(1, 6):
    add_line(f"count_{i}", f"{num_words[i]}!", "stacking", "prompt", "stacking")
add_line("start_here", "Start here", "stacking", "prompt", "stacking")
add_line("tower_built", "Tower built!", "stacking", "finish", "stacking")
add_line("stack_fall", "Oh no it fell!", "stacking", "wrong", "stacking")

# 12. Animal Sounds
add_line("which_animal_says", "Which animal says", "animal-sounds", "instruction", "animal-sounds")
add_line("animal_sounds_instruction", "Which animal says", "animal-sounds", "instruction", "animal-sounds")

animals_sounds = {
    "bear": ("growl", "growl"),
    "bee": ("buzz", "buzz"),
    "bird": ("tweet_tweet", "tweet tweet"),
    "cat": ("meow", "meow"),
    "chick": ("cheep_cheep", "cheep cheep"),
    "chicken": ("cluck_cluck", "cluck cluck"),
    "cow": ("moo", "moo"),
    "crab": ("click_click", "click click"),
    "crow": ("caw_caw", "caw caw"),
    "dinosaur": ("rawr", "rawr"),
    "dog": ("woof_woof", "woof woof"),
    "dolphin": ("click_click", "click click"),
    "duck": ("quack", "quack"),
    "eagle": ("screech", "screech"),
    "elephant": ("trumpet", "trumpet"),
    "fish": ("blub_blub", "blub blub"),
    "frog": ("ribbit", "ribbit"),
    "goat": ("meh", "meh"),
    "horse": ("neigh", "neigh"),
    "lion": ("roar", "roar"),
    "monkey": ("ooh_ooh_ah_ah", "ooh ooh ah ah"),
    "mouse": ("squeak", "squeak"),
    "owl": ("hoot_hoot", "hoot hoot"),
    "parrot": ("squawk", "squawk"),
    "penguin": ("honk", "honk"),
    "pig": ("oink_oink", "oink oink"),
    "rooster": ("cock_a_doodle_doo", "cock a doodle doo"),
    "seal": ("arp_arp", "arp arp"),
    "sheep": ("baa", "baa"),
    "snake": ("hiss", "hiss"),
    "tiger": ("roar", "roar"),
    "turkey": ("gobble_gobble", "gobble gobble"),
    "whale": ("whooo", "whooo"),
    "wolf": ("howl", "howl"),
    "zebra": ("neigh", "neigh"),
    "hamster": ("squeak", "squeak"),
    "rabbit": ("squeak", "squeak"),
    "gorilla": ("ugh_ugh", "ugh ugh")
}

# Add confirmations and questions and sounds
added_sounds = set()
for animal, (sound_id, sound_text) in animals_sounds.items():
    add_line(f"who_says_{sound_id}", f"Who says {sound_text}?", "animal-sounds", "prompt", "animal-sounds")
    
    # Confirmations
    article = "an" if animal in ["elephant", "owl", "eagle", "otter"] else "a"
    add_line(f"yes_thats_{animal}", f"Yes, that's {article} {animal}!", "animal-sounds", "success", "animal-sounds")
    
    # Sounds (deduplicate)
    sound_key = f"sound_{sound_id}"
    if sound_key not in added_sounds:
        added_sounds.add(sound_key)
        add_line(sound_key, f"{sound_text.capitalize()}!", "animal-sounds", "prompt", "animal-sounds")

# 13. Global Feedback
add_line("great_job", "Great job!", "global", "success", "global")
add_line("good_job", "Good job!", "global", "success", "global")
add_line("nice_work", "Nice work!", "global", "success", "global")
add_line("you_did_it", "You did it!", "global", "success", "global")
add_line("you_finished", "You finished!", "global", "success", "global")
add_line("lets_keep_playing", "Let's keep playing!", "global", "success", "global")
add_line("almost", "Almost! Try again.", "global", "wrong", "global")
add_line("correct", "Correct!", "global", "success", "global")
add_line("feedback_oops", "Oops! Try again.", "global", "wrong", "global")
add_line("feedback_yes_correct", "Yes! Correct!", "global", "success", "global")
add_line("feedback_no_correct", "No! Correct!", "global", "success", "global")
add_line("feedback_retry", "Try again.", "global", "wrong", "global")

# Deduplicate identical items sharing the exact normalized text & filename
seen_files = set()
deduped_voice_lines = []
for vl in VOICE_LINES:
    filepath = f"{vl['subdir']}/{vl['filename']}"
    if filepath not in seen_files:
        seen_files.add(filepath)
        deduped_voice_lines.append(vl)

# Global variables for silence padding bytes
silence_leading_bytes = b""
silence_trailing_bytes = b""

async def pregenerate_silence():
    """
    Generates a 1.2 second silent MP3 from edge_tts using the slash character,
    which is processed by the server as a pause without throwing errors.
    We extract 312ms (13 frames) for leading silence and 192ms (8 frames)
    for trailing silence.
    """
    global silence_leading_bytes, silence_trailing_bytes
    temp_file = os.path.join(APP_ROOT, "temp_silence.mp3")
    try:
        # Generate silent template
        communicate = edge_tts.Communicate("/", VOICE)
        await communicate.save(temp_file)
        
        with open(temp_file, "rb") as f:
            data = f.read()
            
        # MPEG-2 Mono 48kbps 24kHz frame size is 144 bytes.
        # Check index 0 for frame sync
        # 13 frames * 144 bytes = 1872 bytes (~312ms)
        # 8 frames * 144 bytes = 1152 bytes (~192ms)
        silence_leading_bytes = data[:1872]
        silence_trailing_bytes = data[:1152]
        print(f"Loaded silence templates. Leading: {len(silence_leading_bytes)} bytes, Trailing: {len(silence_trailing_bytes)} bytes.")
    except Exception as e:
        print(f"Error generating silence template: {e}", file=sys.stderr)
        # Fallback to empty bytes if fails
        silence_leading_bytes = b""
        silence_trailing_bytes = b""
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)

async def generate_file(text, dest_path):
    # Speak plain text
    speech_text = clean_text_for_speech(text)
    communicate = edge_tts.Communicate(speech_text, VOICE, rate=RATE, pitch=PITCH, volume=VOLUME)
    
    # Save standard generated audio
    await communicate.save(dest_path)
    
    # Prepend and append silence binary blocks locally
    if len(silence_leading_bytes) > 0 or len(silence_trailing_bytes) > 0:
        with open(dest_path, "rb") as f:
            speech_bytes = f.read()
            
        concat_bytes = silence_leading_bytes + speech_bytes + silence_trailing_bytes
        
        with open(dest_path, "wb") as f:
            f.write(concat_bytes)

async def main():
    print("Pregenerating silence templates...")
    await pregenerate_silence()
    
    print(f"Total deduplicated voice lines to process: {len(deduped_voice_lines)}")
    
    # Generate MP3 assets
    success_count = 0
    fail_count = 0
    missing_report = []

    for i, vl in enumerate(deduped_voice_lines):
        subdir_path = os.path.join(ASSETS_DIR, vl["subdir"])
        os.makedirs(subdir_path, exist_ok=True)
        dest_file = os.path.join(subdir_path, vl["filename"])
        
        # Overwrite check
        if not FORCE_REGENERATE and os.path.exists(dest_file) and os.path.getsize(dest_file) > 0:
            success_count += 1
            continue
            
        try:
            print(f"[{i+1}/{len(deduped_voice_lines)}] Generating: {dest_file} -> \"{vl['text']}\"")
            await generate_file(vl["text"], dest_file)
            success_count += 1
        except Exception as e:
            print(f"ERROR generating {vl['filename']}: {e}", file=sys.stderr)
            fail_count += 1
            missing_report.append(vl)

    # Write TypeScript Manifest files
    os.makedirs(SRC_DIR, exist_ok=True)
    
    # 1. Write evaVoiceLines.ts
    manifest_path = os.path.join(SRC_DIR, "evaVoiceLines.ts")
    with open(manifest_path, "w", encoding="utf-8") as f:
        f.write('''// Generated by scripts/generate_eva_voices.py
// Do not edit this file manually.

export type EvaVoiceLine = {
  id: string;
  text: string;
  game: string;
  category: "instruction" | "prompt" | "success" | "wrong" | "finish" | "global" | "other";
  filename: string;
  assetPath: string;
};

export const EVA_VOICE_LINES: EvaVoiceLine[] = [\n''')
        for vl in deduped_voice_lines:
            asset_path = f"assets/audio/tts/eva/{vl['subdir']}/{vl['filename']}"
            f.write(f'  {{\n')
            f.write(f'    id: "{vl["id"]}",\n')
            f.write(f'    text: {repr(vl["text"])},\n')
            f.write(f'    game: "{vl["game"]}",\n')
            f.write(f'    category: "{vl["category"]}",\n')
            f.write(f'    filename: "{vl["filename"]}",\n')
            f.write(f'    assetPath: "{asset_path}"\n')
            f.write(f'  }},\n')
        f.write('];\n')
    print("Wrote evaVoiceLines.ts manifest.")

    # 2. Write evaVoiceRegistry.ts
    registry_path = os.path.join(SRC_DIR, "evaVoiceRegistry.ts")
    with open(registry_path, "w", encoding="utf-8") as f:
        f.write('''// Generated by scripts/generate_eva_voices.py
// Do not edit this file manually.

export const EVA_VOICE_REGISTRY = {\n''')
        for vl in deduped_voice_lines:
            f.write(f'  {vl["id"]}: require("../../../assets/audio/tts/eva/{vl["subdir"]}/{vl["filename"]}"),\n')
        f.write('} as const;\n\n')
        f.write('export type EvaVoiceId = keyof typeof EVA_VOICE_REGISTRY;\n')
    print("Wrote evaVoiceRegistry.ts static require map.")

    # 3. Write evaVoiceResolver.ts
    resolver_path = os.path.join(SRC_DIR, "evaVoiceResolver.ts")
    with open(resolver_path, "w", encoding="utf-8") as f:
        f.write('''// Generated by scripts/generate_eva_voices.py
// Do not edit this file manually.

import { EVA_VOICE_LINES, EvaVoiceLine } from "./evaVoiceLines";
import { EvaVoiceId } from "./evaVoiceRegistry";

// Pre-normalize helper matching the text index mapping
export function normalizeResolverText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\\u2018\\u2019\\u201a\\u201b`']/g, "'") // normalize smart quotes
    .replace(/[.,\\/#!$%\\^&\\*;:{}=\\-_`~()?]/g, "") // strip punctuation
    .replace(/\\s+/g, " ")
    .trim();
}

const TEXT_TO_ID_MAP: Record<string, EvaVoiceId> = {};

// Initialize mapping
EVA_VOICE_LINES.forEach((line) => {
  const normalized = normalizeResolverText(line.text);
  // Ensure we register it
  TEXT_TO_ID_MAP[normalized] = line.id as EvaVoiceId;
});

/**
 * Normalizes input text and resolves it to a matching EvaVoiceId.
 * Returns null if no matching local EVA file exists.
 */
export function resolveEvaVoiceId(text: string): EvaVoiceId | null {
  if (!text) return null;
  const normalized = normalizeResolverText(text);
  const matchedId = TEXT_TO_ID_MAP[normalized];
  
  if (matchedId) {
    return matchedId;
  }
  
  return null;
}
''')
    print("Wrote evaVoiceResolver.ts helper.")

    # 4. Write MISSING_EVA_VOICE_LINES.md
    missing_report_path = os.path.join(SRC_DIR, "MISSING_EVA_VOICE_LINES.md")
    with open(missing_report_path, "w", encoding="utf-8") as f:
        f.write("# Missing EVA Voice Lines Report\n\n")
        if len(missing_report) == 0:
            f.write("All EVA voice lines are present.\n")
        else:
            f.write("The following EVA voice lines failed to generate or are missing from the registry:\n\n")
            f.write("| ID | Spoken Text | Game | Category | Expected Filename | Expected Path |\n")
            f.write("| --- | --- | --- | --- | --- | --- |\n")
            for m in missing_report:
                expected_path = f"assets/audio/tts/eva/{m['subdir']}/{m['filename']}"
                f.write(f"| {m['id']} | {m['text']} | {m['game']} | {m['category']} | {m['filename']} | {expected_path} |\n")
    print("Wrote MISSING_EVA_VOICE_LINES.md report.")

    print(f"\nExecution finished! Success: {success_count}, Failed: {fail_count}")

if __name__ == "__main__":
    asyncio.run(main())
