const fs = require('fs');
const https = require('https');
const path = require('path');

const DEST_DIR = 'C:\\dev\\PIPER TTS VOICE';
const MODEL_URL = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx';
const JSON_URL = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx.json';

const downloadFile = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);

        const request = (currentUrl) => {
            console.log(`Downloading ${currentUrl} to ${dest}...`);
            https.get(currentUrl, (response) => {
                if ([301, 302, 307, 308].includes(response.statusCode)) {
                    // Follow redirect
                    if (response.headers.location) {
                        const newUrl = new URL(response.headers.location, currentUrl).toString();
                        console.log(`Redirecting to: ${newUrl}`);
                        return request(newUrl);
                    }
                }

                if (response.statusCode !== 200) {
                    return reject(new Error(`Failed to download: ${response.statusCode}`));
                }

                response.pipe(file);

                file.on('finish', () => {
                    file.close(() => {
                        console.log(`Download completed: ${dest}`);
                        resolve();
                    });
                });
            }).on('error', (err) => {
                fs.unlink(dest, () => { });
                reject(err);
            });
        };

        request(url);
    });
};

const main = async () => {
    try {
        if (!fs.existsSync(DEST_DIR)) {
            console.error(`Destination directory does not exist: ${DEST_DIR}`);
            process.exit(1);
        }

        await downloadFile(MODEL_URL, path.join(DEST_DIR, 'en_US-amy-medium.onnx'));
        await downloadFile(JSON_URL, path.join(DEST_DIR, 'en_US-amy-medium.onnx.json'));

        console.log('All downloads finished successfully.');
    } catch (error) {
        console.error('Download failed:', error);
        process.exit(1);
    }
};

main();
