const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

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

// Exclude transient, non-project folders at workspace root that can appear/disappear
// while Gradle snapshots JS bundle task inputs on Windows.
const workspaceTransientIgnores = [
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, '.tmp'))}[^\\\\/]*[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, 'tmp'))}[^\\\\/]*[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, 'build-artifacts'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, 'b'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, 'b-cxx'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, 'archive'))}[\\\\/].*`),
];

const ignorePatterns = [...androidBuildIgnores, ...workspaceTransientIgnores];

const existingBlockList = config.resolver.blockList;
if (Array.isArray(existingBlockList)) {
  config.resolver.blockList = [...existingBlockList, ...ignorePatterns];
} else if (existingBlockList) {
  config.resolver.blockList = [existingBlockList, ...ignorePatterns];
} else {
  config.resolver.blockList = ignorePatterns;
}

module.exports = config;

