const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

function escapePathForRegex(value) {
  const normalized = value.replace(/\\/g, '/');
  return normalized
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\//g, '[\\\\/]');
}

const androidAppPath = path.join(__dirname, 'android', 'app');
const androidBuildIgnores = [
  new RegExp(`^${escapePathForRegex(path.join(androidAppPath, '.cxx'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(androidAppPath, 'build'))}[\\\\/].*`),
];

const existingBlockList = config.resolver.blockList;
if (Array.isArray(existingBlockList)) {
  config.resolver.blockList = [...existingBlockList, ...androidBuildIgnores];
} else if (existingBlockList) {
  config.resolver.blockList = [existingBlockList, ...androidBuildIgnores];
} else {
  config.resolver.blockList = androidBuildIgnores;
}

module.exports = config;

