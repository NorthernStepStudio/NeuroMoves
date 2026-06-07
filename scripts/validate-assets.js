#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function fail(msg) { console.error(msg); process.exitCode = 2; }

const repoRoot = path.resolve(__dirname, '..');
const voiceAssetsPath = path.resolve(repoRoot, 'src', 'core', 'VoiceAssets.ts');
if (!fs.existsSync(voiceAssetsPath)) {
  fail(`VoiceAssets file not found at ${voiceAssetsPath}`);
  process.exit(2);
}

const content = fs.readFileSync(voiceAssetsPath, 'utf8');
const requireRegex = /require\((['\"`])(.+?)\1\)/g;
let m;
const missing = [];
const checked = new Set();
while ((m = requireRegex.exec(content)) !== null) {
  const reqPath = m[2];
  const resolved = path.resolve(path.dirname(voiceAssetsPath), reqPath);
  if (checked.has(resolved)) continue;
  checked.add(resolved);
  if (!fs.existsSync(resolved)) missing.push(resolved);
}

// Validate app.json icon and splash
const appJsonPath = path.resolve(repoRoot, 'app.json');
if (fs.existsSync(appJsonPath)) {
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    const icons = [];
    if (appJson.expo && appJson.expo.icon) icons.push(appJson.expo.icon);
    if (appJson.expo && appJson.expo.splash && appJson.expo.splash.image) icons.push(appJson.expo.splash.image);
    icons.forEach((p) => {
      const resolved = path.resolve(path.dirname(appJsonPath), p);
      if (!fs.existsSync(resolved)) missing.push(resolved);
    });
  } catch (e) {
    console.error('Failed to parse app.json', e);
  }
}

if (missing.length) {
  console.error('\nAsset validation failed. Missing files:');
  missing.forEach((m) => console.error(' -', m));
  console.error('\nPlease add or correct these assets before starting the dev server.');
  process.exit(2);
}

console.log('Asset validation passed — all referenced files exist.');
process.exit(0);
