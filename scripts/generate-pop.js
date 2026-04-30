const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PIPER_EXE = 'C:\\dev\\PIPER TTS VOICE\\piper\\piper.exe';
const MODEL_PATH = 'C:\\dev\\PIPER TTS VOICE\\en_US-amy-medium.onnx';
const OUTPUT_FILE = path.join(__dirname, '../apps/mobile/assets/sounds/pop.mp3');
const TEMP_WAV = path.join(__dirname, '../apps/mobile/assets/sounds/temp_pop.wav');

const TEXT = 'Pop!';

function main() {
    console.log(`Generating pop sound to: ${OUTPUT_FILE}`);

    // Piper needs input via stdin. In Node execSync, we can pass 'input' option.
    try {
        const piperCmd = `"${PIPER_EXE}" --model "${MODEL_PATH}" --output_file "${TEMP_WAV}"`;
        execSync(piperCmd, { input: TEXT }); // This effectively pipes the text

        if (fs.existsSync(TEMP_WAV)) {
            // Convert to MP3
            const ffmpegCmd = `ffmpeg -y -i "${TEMP_WAV}" -af "loudnorm=I=-16:TP=-1.5:LRA=11" -b:a 192k "${OUTPUT_FILE}"`;
            execSync(ffmpegCmd);

            // Cleanup
            fs.unlinkSync(TEMP_WAV);
            console.log('Success!');
        } else {
            console.error('Piper failed to generate WAV');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

main();
