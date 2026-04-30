// bubblePop.js (Node.js)
// Run: node bubblePop.js
const fs = require("fs");

function writeWavMono16(path, samples, sampleRate = 44100) {
    // samples: Float32Array in [-1, 1]
    const numSamples = samples.length;
    const byteRate = sampleRate * 2; // 16-bit mono
    const blockAlign = 2;

    const buffer = Buffer.alloc(44 + numSamples * 2);

    // RIFF header
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(36 + numSamples * 2, 4);
    buffer.write("WAVE", 8);

    // fmt chunk
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16); // PCM
    buffer.writeUInt16LE(1, 20);  // AudioFormat PCM
    buffer.writeUInt16LE(1, 22);  // NumChannels
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(16, 34); // BitsPerSample

    // data chunk
    buffer.write("data", 36);
    buffer.writeUInt32LE(numSamples * 2, 40);

    // PCM samples
    for (let i = 0; i < numSamples; i++) {
        let s = Math.max(-1, Math.min(1, samples[i]));
        const int16 = Math.round(s * 32767);
        buffer.writeInt16LE(int16, 44 + i * 2);
    }

    fs.writeFileSync(path, buffer);
}

function bubblePop({ durationMs = 80, sampleRate = 44100 } = {}) {
    const n = Math.floor((durationMs / 1000) * sampleRate);
    const out = new Float32Array(n);

    // Bubble pop model:
    // - Fast envelope (attack 1ms, decay remainder)
    // - Pitch drops quickly (like a tiny "boop" + click)
    // - Add a tiny noise burst for "snap"
    const fStart = 700;   // Hz
    const fEnd = 120;     // Hz
    const attack = Math.max(1, Math.floor(0.001 * sampleRate));

    let phase = 0;
    for (let i = 0; i < n; i++) {
        const t = i / (n - 1);

        // Exponential pitch glide downward
        const freq = fStart * Math.pow(fEnd / fStart, t);
        phase += (2 * Math.PI * freq) / sampleRate;

        // Envelope: quick attack, fast decay
        const env =
            i < attack
                ? i / attack
                : Math.exp(-10 * (i - attack) / (n - attack)); // decay speed

        // Tone + tiny noise snap
        const tone = Math.sin(phase);
        const noise = (Math.random() * 2 - 1) * Math.exp(-40 * t); // noise fades super fast

        // Mix: mostly tone, some snap
        out[i] = (0.85 * tone + 0.25 * noise) * env;
    }

    // Soft clip just in case
    for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i] * 1.2);

    return out;
}

const samples = bubblePop({ durationMs: 90 });
writeWavMono16("bubble_pop.wav", samples);
console.log("Wrote bubble_pop.wav");
