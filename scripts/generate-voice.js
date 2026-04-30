const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// CONFIGURATION
const PIPER_EXE = 'C:\\dev\\PIPER TTS VOICE\\piper\\piper.exe';
// Using the model we just downloaded
const MODEL_PATH = 'C:\\dev\\PIPER TTS VOICE\\en_US-amy-medium.onnx';

const OUTPUT_DIR = path.join(__dirname, '../apps/mobile/assets/sounds/voice');

// Assets with PROSODY and PUNCTUATION for natural speech
const ASSETS = {
    // Magic Fingers
    'magic_intro.mp3': 'Tap... the thumb.',
    'magic_pattern.mp3': 'Follow... the pattern!',
    'tap_finger_1.mp3': 'Tap finger one.',
    'tap_finger_2.mp3': 'Tap finger two.',
    'tap_finger_3.mp3': 'Tap finger three.',
    'tap_finger_4.mp3': 'Tap finger four.',
    'tap_finger_5.mp3': 'Tap finger five.',

    // Shape Sorting
    'drag_circle.mp3': 'Drag the circle... to its hole.',
    'drag_square.mp3': 'Drag the square.',
    'drag_triangle.mp3': 'Drag the triangle.',
    'drag_star.mp3': 'Drag the star.',
    'drag_heart.mp3': 'Drag the heart.',
    'drag_pentagon.mp3': 'Drag the pentagon.',
    'drag_hexagon.mp3': 'Drag the hexagon.',
    'drag_diamond.mp3': 'Drag the diamond.',
    'shape_error.mp3': 'Not... that one.',
    'shape_success.mp3': 'Perfect fit!',

    // Pop Bubbles
    'pop_bubbles.mp3': 'Pop! ... The bubbles!',
    'pop_all_hurray.mp3': 'All popped! ... Hurray!',

    // Body Parts
    'touch_head.mp3': 'Touch... the head.',
    'touch_eyes.mp3': 'Touch... the eyes.',
    'touch_nose.mp3': 'Touch... the nose.',
    'touch_mouth.mp3': 'Touch... the mouth.',
    'touch_ears.mp3': 'Touch... the ears.',
    'touch_shoulders.mp3': 'Touch... the shoulders.',
    'touch_arms.mp3': 'Touch... the arms.',
    'touch_hands.mp3': 'Touch... the hands.',
    'touch_tummy.mp3': 'Touch... the tummy.',
    'touch_legs.mp3': 'Touch... the legs.',
    'touch_feet.mp3': 'Touch... the feet.',
    'that_is_head.mp3': 'Yes! That is the head.',
    'that_is_eyes.mp3': 'Yes! Those are the eyes.',
    'that_is_nose.mp3': 'Yes! That... is the nose.',
    'that_is_mouth.mp3': 'Yes! That is the mouth.',
    'that_is_ears.mp3': 'Yes! Those... are the ears.',
    'that_is_shoulders.mp3': 'Yes! Those are the shoulders.',
    'that_is_arms.mp3': 'Yes! Those... are the arms.',
    'that_is_hands.mp3': 'Yes! Those... are the hands.',
    'that_is_tummy.mp3': 'Yes! That is the tummy.',
    'that_is_legs.mp3': 'Yes! Those... are the legs.',
    'that_is_feet.mp3': 'Yes! Those... are the feet.',

    // Color Match
    'find_red.mp3': 'Find... the red color.',
    'find_blue.mp3': 'Find... the blue color.',
    'find_green.mp3': 'Find... the green color.',
    'find_yellow.mp3': 'Find... the yellow color.',
    'find_purple.mp3': 'Find... the purple color.',
    'find_orange.mp3': 'Find... the orange color.',
    'find_pink.mp3': 'Find... the pink color.',
    'find_cyan.mp3': 'Find... the cyan color.',
    'find_lime.mp3': 'Find... the lime color.',
    'find_teal.mp3': 'Find... the teal color.',
    'find_brown.mp3': 'Find... the brown color.',

    // Yes/No Game - Slower pacing with pauses
    'yesno_apple.mp3': 'Is this,... an apple?',
    'yesno_dog.mp3': 'Is this,... a dog?',
    'yesno_car.mp3': 'Is this,... a car?',
    'yesno_fish.mp3': 'Is this,... a fish?',
    'yesno_bird.mp3': 'Is this,... a bird?',
    'yesno_cat.mp3': 'Is this,... a cat?',
    'yesno_sun_yellow.mp3': 'Is the sun,... yellow?',
    'yesno_grass_green.mp3': 'Is the grass,... green?',
    'yesno_sky_blue.mp3': 'Is the sky,... blue?',
    'yesno_strawberry_red.mp3': 'Is a strawberry,... red?',
    'yesno_lemon_purple.mp3': 'Is a lemon,... purple?',
    'yesno_snow_black.mp3': 'Is snow,... black?',
    'yesno_cats_meow.mp3': 'Do cats,... meow?',
    'yesno_birds_fly.mp3': 'Do birds,... fly?',
    'yesno_fish_walk.mp3': 'Do fish,... walk?',
    'yesno_dogs_quack.mp3': 'Do dogs,... quack?',
    'yesno_cows_moo.mp3': 'Do cows,... moo?',
    'yesno_snakes_run.mp3': 'Do snakes,... run?',
    'yesno_ice_cold.mp3': 'Is ice,... cold?',
    'yesno_fire_hot.mp3': 'Is fire,... hot?',
    'yesno_rock_soft.mp3': 'Is a rock,... soft?',
    'yesno_candy_sweet.mp3': 'Is candy,... sweet?',
    'yesno_cars_fly.mp3': 'Do cars,... fly?',
    'yesno_rain_dry.mp3': 'Is rain,... dry?',

    // Number Tracing
    'trace_number_1.mp3': 'Trace... the number one.',
    'trace_number_2.mp3': 'Trace... the number two.',
    'trace_number_3.mp3': 'Trace... the number three.',
    'trace_number_4.mp3': 'Trace... the number four.',
    'trace_number_5.mp3': 'Trace... the number five.',
    'trace_number_6.mp3': 'Trace... the number six.',
    'trace_number_7.mp3': 'Trace... the number seven.',
    'trace_number_8.mp3': 'Trace... the number eight.',
    'trace_number_9.mp3': 'Trace... the number nine.',
    'trace_number_0.mp3': 'Trace... the number zero.',
    'trace_perfect.mp3': 'Perfect... number!',
    'trace_letter_perfect.mp3': 'Perfect... letter!',
    'trace_error.mp3': 'Oops! Stay inside the line.',

    // Stacking Game
    'stack_intro.mp3': 'Build it... high!',
    'stack_start_here.mp3': 'Start... here.',
    'stack_tower_built.mp3': 'Tower... built!',
    'stack_fall.mp3': 'Oh no... it fell!',

    // Counting Numbers (for stacking)
    'count_1.mp3': 'One!',
    'count_2.mp3': 'Two!',
    'count_3.mp3': 'Three!',
    'count_4.mp3': 'Four!',
    'count_5.mp3': 'Five!',

    // Numbers 0-9 (for number tracing)
    'say_0.mp3': 'Zero!',
    'say_1.mp3': 'One!',
    'say_2.mp3': 'Two!',
    'say_3.mp3': 'Three!',
    'say_4.mp3': 'Four!',
    'say_5.mp3': 'Five!',
    'say_6.mp3': 'Six!',
    'say_7.mp3': 'Seven!',
    'say_8.mp3': 'Eight!',
    'say_9.mp3': 'Nine!',

    // Point It Out Game
    'find_red_car.mp3': 'Find... the red car!',
    'find_teddy_bear.mp3': 'Find... the teddy bear!',
    'find_green_apple.mp3': 'Find... the green apple!',
    'find_red_ball.mp3': 'Find... the red ball!',
    'find_blue_book.mp3': 'Find... the blue book!',
    'find_yellow_banana.mp3': 'Find... the yellow banana!',
    'find_blue_cup.mp3': 'Find... the blue cup!',
    'find_white_spoon.mp3': 'Find... the white spoon!',
    'find_cookie_jar.mp3': 'Find... the cookie jar!',
    'find_toy_robot.mp3': 'Find... the toy robot!',
    'find_flashlight.mp3': 'Find... the flashlight!',
    'find_slippers.mp3': 'Find... the slippers!',
    'find_star_pillow.mp3': 'Find... the star pillow!',
    'find_purple_block.mp3': 'Find... the purple block!',
    'find_toy_airplane.mp3': 'Find... the toy airplane!',
    'find_spinning_top.mp3': 'Find... the spinning top!',
    'find_colorful_ball.mp3': 'Find... the colorful ball!',
    'find_watering_can.mp3': 'Find... the watering can!',
    'find_garden_trowel.mp3': 'Find... the garden trowel!',
    'find_ladybug.mp3': 'Find... the ladybug!',
    'find_sun_hat.mp3': 'Find... the sun hat!',

    // Bathroom (Expansion)
    'find_yellow_duck.mp3': 'Find... the yellow duck.',
    'find_green_shampoo.mp3': 'Find... the green shampoo bottle.',
    'find_blue_toothbrush.mp3': 'Find... the blue toothbrush.',
    'find_blue_towel.mp3': 'Find... the blue towel.',

    // Garage (Expansion)
    'find_red_bicycle.mp3': 'Find... the red bicycle.',
    'find_blue_toolbox.mp3': 'Find... the blue tool box.',
    'find_soccer_ball.mp3': 'Find... the soccer ball.',
    'find_cardboard_box.mp3': 'Find... the cardboard box.',

    // Letters A-Z (for letter tracing)
    'say_A.mp3': 'A!',
    'say_B.mp3': 'B!',
    'say_C.mp3': 'C!',
    'say_D.mp3': 'D!',
    'say_E.mp3': 'E!',
    'say_F.mp3': 'F!',
    'say_G.mp3': 'G!',
    'say_H.mp3': 'H!',
    'say_I.mp3': 'I!',
    'say_J.mp3': 'J!',
    'say_K.mp3': 'K!',
    'say_L.mp3': 'L!',
    'say_M.mp3': 'M!',
    'say_N.mp3': 'N!',
    'say_O.mp3': 'O!',
    'say_P.mp3': 'P!',
    'say_Q.mp3': 'Q!',
    'say_R.mp3': 'R!',
    'say_S.mp3': 'S!',
    'say_T.mp3': 'T!',
    'say_U.mp3': 'U!',
    'say_V.mp3': 'V!',
    'say_W.mp3': 'W!',
    'say_X.mp3': 'X!',
    'say_Y.mp3': 'Y!',
    'say_Z.mp3': 'Z!',

    // Emotions Game
    'find_happy.mp3': 'Find... the happy face.',
    'find_sad.mp3': 'Find... the sad face.',
    'find_angry.mp3': 'Find... the angry face.',
    'find_surprised.mp3': 'Find... the surprised face.',
    'find_scared.mp3': 'Find... the scared face.',
    'find_sleepy.mp3': 'Find... the sleepy face.',
    'find_silly.mp3': 'Find... the silly face.',
    'find_loving.mp3': 'Find... the loving face.',
    'that_is_happy.mp3': 'Yes! That is... happy!',
    'that_is_sad.mp3': 'Yes! That is... sad.',
    'that_is_angry.mp3': 'Yes! That is... angry.',
    'that_is_surprised.mp3': 'Yes! That is... surprised!',
    'that_is_scared.mp3': 'Yes! That is... scared.',
    'that_is_sleepy.mp3': 'Yes! That is... sleepy.',
    'that_is_silly.mp3': 'Yes! That is... silly!',
    'that_is_loving.mp3': 'Yes! That is... loving.',

    // Size Ordering
    'order_smallest_largest.mp3': 'Tap items... smallest... to largest.',
    'order_perfect.mp3': 'Perfect... order!',
    'order_error.mp3': 'Try... smallest first.',

    // Animal Sounds Game - 36 Animals
    // Question prompts
    'who_says_woof.mp3': 'Who says... Woof woof?',
    'who_says_meow.mp3': 'Who says... Meow?',
    'who_says_moo.mp3': 'Who says... Moo?',
    'who_says_oink.mp3': 'Who says... Oink oink?',
    'who_says_neigh.mp3': 'Who says... Neigh?',
    'who_says_baa.mp3': 'Who says... Baa?',
    'who_says_meh.mp3': 'Who says... Meh?',
    'who_says_cockadoodledoo.mp3': 'Who says... Cock a doodle doo?',
    'who_says_cluck.mp3': 'Who says... Cluck cluck?',
    'who_says_quack.mp3': 'Who says... Quack?',
    'who_says_gobble.mp3': 'Who says... Gobble gobble?',
    'who_says_roar.mp3': 'Who says... Roar?',
    'who_says_trumpet.mp3': 'Who says... Trumpet?',
    'who_says_oohaah.mp3': 'Who says... Ooh ooh ah ah?',
    'who_says_growl.mp3': 'Who says... Growl?',
    'who_says_howl.mp3': 'Who says... Howl?',
    'who_says_ribbit.mp3': 'Who says... Ribbit?',
    'who_says_hiss.mp3': 'Who says... Hiss?',
    'who_says_hoot.mp3': 'Who says... Hoot hoot?',
    'who_says_buzz.mp3': 'Who says... Buzz?',
    'who_says_tweet.mp3': 'Who says... Tweet tweet?',
    'who_says_squawk.mp3': 'Who says... Squawk?',
    'who_says_caw.mp3': 'Who says... Caw caw?',
    'who_says_screech.mp3': 'Who says... Screech?',
    'who_says_honk.mp3': 'Who says... Honk?',
    'who_says_click.mp3': 'Who says... Click click?',
    'who_says_whoo.mp3': 'Who says... Whooo?',
    'who_says_arp.mp3': 'Who says... Arp arp?',
    'who_says_blub.mp3': 'Who says... Blub blub?',
    'who_says_clickclack.mp3': 'Who says... Click clack?',
    'who_says_squeak.mp3': 'Who says... Squeak?',
    'who_says_thump.mp3': 'Who says... Thump thump?',
    'who_says_rawr.mp3': 'Who says... Rawr?',
    'who_says_ugh.mp3': 'Who says... Ugh ugh?',
    'who_says_bark.mp3': 'Who says... Bark?',

    // Animal name confirmations
    'yes_dog.mp3': 'Yes! Thats a dog!',
    'yes_cat.mp3': 'Yes! Thats a cat!',
    'yes_cow.mp3': 'Yes! Thats a cow!',
    'yes_pig.mp3': 'Yes! Thats a pig!',
    'yes_horse.mp3': 'Yes! Thats a horse!',
    'yes_sheep.mp3': 'Yes! Thats a sheep!',
    'yes_goat.mp3': 'Yes! Thats a goat!',
    'yes_rooster.mp3': 'Yes! Thats a rooster!',
    'yes_chicken.mp3': 'Yes! Thats a chicken!',
    'yes_duck.mp3': 'Yes! Thats a duck!',
    'yes_turkey.mp3': 'Yes! Thats a turkey!',
    'yes_lion.mp3': 'Yes! Thats a lion!',
    'yes_elephant.mp3': 'Yes! Thats an elephant!',
    'yes_monkey.mp3': 'Yes! Thats a monkey!',
    'yes_bear.mp3': 'Yes! Thats a bear!',
    'yes_wolf.mp3': 'Yes! Thats a wolf!',
    'yes_frog.mp3': 'Yes! Thats a frog!',
    'yes_snake.mp3': 'Yes! Thats a snake!',
    'yes_owl.mp3': 'Yes! Thats an owl!',
    'yes_bee.mp3': 'Yes! Thats a bee!',
    'yes_bird.mp3': 'Yes! Thats a bird!',
    'yes_parrot.mp3': 'Yes! Thats a parrot!',
    'yes_crow.mp3': 'Yes! Thats a crow!',
    'yes_eagle.mp3': 'Yes! Thats an eagle!',
    'yes_penguin.mp3': 'Yes! Thats a penguin!',
    'yes_dolphin.mp3': 'Yes! Thats a dolphin!',
    'yes_whale.mp3': 'Yes! Thats a whale!',
    'yes_seal.mp3': 'Yes! Thats a seal!',
    'yes_fish.mp3': 'Yes! Thats a fish!',
    'yes_crab.mp3': 'Yes! Thats a crab!',
    'yes_mouse.mp3': 'Yes! Thats a mouse!',
    'yes_hamster.mp3': 'Yes! Thats a hamster!',
    'yes_rabbit.mp3': 'Yes! Thats a rabbit!',
    'yes_tiger.mp3': 'Yes! Thats a tiger!',
    'yes_gorilla.mp3': 'Yes! Thats a gorilla!',
    'yes_zebra.mp3': 'Yes! Thats a zebra!',
    'yes_dinosaur.mp3': 'Yes! Thats a dinosaur!',

    // Animal sounds ONLY (no "who says") - for tapping animals
    'sound_woof.mp3': 'Woof woof!',
    'sound_meow.mp3': 'Meow!',
    'sound_moo.mp3': 'Moo!',
    'sound_oink.mp3': 'Oink oink!',
    'sound_neigh.mp3': 'Neigh!',
    'sound_baa.mp3': 'Baa!',
    'sound_meh.mp3': 'Meh!',
    'sound_cockadoodledoo.mp3': 'Cock a doodle doo!',
    'sound_cluck.mp3': 'Cluck cluck!',
    'sound_quack.mp3': 'Quack!',
    'sound_gobble.mp3': 'Gobble gobble!',
    'sound_roar.mp3': 'Roar!',
    'sound_trumpet.mp3': 'Trumpet!',
    'sound_oohaah.mp3': 'Ooh ooh ah ah!',
    'sound_growl.mp3': 'Growl!',
    'sound_howl.mp3': 'Howl!',
    'sound_ribbit.mp3': 'Ribbit!',
    'sound_hiss.mp3': 'Hiss!',
    'sound_hoot.mp3': 'Hoot hoot!',
    'sound_buzz.mp3': 'Buzz!',
    'sound_tweet.mp3': 'Tweet tweet!',
    'sound_squawk.mp3': 'Squawk!',
    'sound_caw.mp3': 'Caw caw!',
    'sound_screech.mp3': 'Screech!',
    'sound_honk.mp3': 'Honk!',
    'sound_click.mp3': 'Click click!',
    'sound_whoo.mp3': 'Whooo!',
    'sound_arp.mp3': 'Arp arp!',
    'sound_blub.mp3': 'Blub blub!',
    'sound_clickclack.mp3': 'Click clack!',
    'sound_squeak.mp3': 'Squeak!',
    'sound_thump.mp3': 'Thump thump!',
    'sound_rawr.mp3': 'Rawr!',
    'sound_ugh.mp3': 'Ugh ugh!',
    'sound_bark.mp3': 'Bark!',

    // Generic Feedback
    'feedback_success.mp3': 'Great job!',
    'feedback_retry.mp3': 'Try... again.',
    'feedback_yes_correct.mp3': 'Yes! Correct!',
    'feedback_no_correct.mp3': 'No! Correct!',
    'feedback_no_correct.mp3': 'No! Correct!',
    'feedback_oops.mp3': 'Oops! ... Try again.',

    // SFX replacements (Placeholders)
    'pop_sfx.mp3': 'Pop!',
};

function main() {
    const args = process.argv.slice(2);
    const filterIdx = args.indexOf('--filter');
    const filter = filterIdx !== -1 ? args[filterIdx + 1] : null;

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    if (!fs.existsSync(MODEL_PATH)) {
        console.error(`ERROR: Voice model not found at: ${MODEL_PATH}`);
        process.exit(1);
    }

    const assetsToProcess = Object.entries(ASSETS).filter(([filename]) => {
        if (!filter) return true;
        return filename.includes(filter);
    });

    console.log(`Generating ${assetsToProcess.length} voice assets...`);

    for (const [filename, text] of assetsToProcess) {
        const uniqueId = Math.random().toString(36).substring(7);
        const tempWav = path.join(OUTPUT_DIR, `temp_${uniqueId}.wav`);
        const outFile = path.join(OUTPUT_DIR, filename);

        // 1. Generate WAV using Piper
        // echo "Text" | piper ... -f test.wav
        const piperCmd = `echo "${text}" | "${PIPER_EXE}" --model "${MODEL_PATH}" --output_file "${tempWav}"`;

        try {
            console.log(`Generating: ${filename} with text: "${text}"`);
            execSync(piperCmd);

            // 2. Post-process with ffmpeg
            // - Normalize volume
            // - Convert to MP3
            // - Apply slight compression (optional but implicit in MP3 conversion usually good enough for simple voice)
            // -y overwrite output
            // -b:a 192k for decent quality
            const ffmpegCmd = `ffmpeg -y -i "${tempWav}" -af "loudnorm=I=-16:TP=-1.5:LRA=11" -b:a 192k "${outFile}"`;

            execSync(ffmpegCmd, { stdio: 'ignore' }); // Suppress ffmpeg output spam

        } catch (e) {
            console.error(`Failed to generate ${filename}:`, e.message);
        } finally {
            if (fs.existsSync(tempWav)) {
                fs.unlinkSync(tempWav);
            }
        }
    }

    console.log('Done!');
}

main();
