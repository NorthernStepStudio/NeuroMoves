const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const defaultWorkspaceRoot = path.resolve(projectRoot, '../..');
const workspaceRoot = process.env.NSTEP_METRO_WORKSPACE_ROOT
  ? path.resolve(process.env.NSTEP_METRO_WORKSPACE_ROOT)
  : defaultWorkspaceRoot;

const config = getDefaultConfig(projectRoot);

// Windows security tools can block Metro's child-process workers with EPERM.
// A single worker keeps transforms in-process and makes Expo Go startup reliable.
config.maxWorkers = 1;

function samePath(left, right) {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}

function uniquePaths(paths) {
  const seen = new Set();
  return paths.filter((value) => {
    const key = path.resolve(value).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const nodePathRoots = (process.env.NODE_PATH || '')
  .split(path.delimiter)
  .filter(Boolean)
  .map((value) => path.resolve(value));

config.watchFolders = uniquePaths([
  samePath(workspaceRoot, projectRoot) ? null : path.resolve(workspaceRoot, 'node_modules'),
  ...nodePathRoots,
].filter(Boolean));
config.resolver.nodeModulesPaths = uniquePaths([
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
  ...nodePathRoots,
]);

function escapePathForRegex(value) {
  let normalized = value.replace(/\\/g, '/');
  const driveLetterMatch = normalized.match(/^([a-zA-Z]):/);
  let prefix = '';
  if (driveLetterMatch) {
    const letter = driveLetterMatch[1];
    prefix = `[${letter.toLowerCase()}${letter.toUpperCase()}]:`;
    normalized = normalized.substring(2);
  }
  return prefix + normalized
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\//g, '[\\\\/]');
}

const androidAppPath = path.join(__dirname, 'android', 'app');
const androidBuildIgnores = [
  new RegExp(`^${escapePathForRegex(path.join(androidAppPath, '.cxx'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(androidAppPath, 'build'))}[\\\\/].*`),
];

const projectLocalIgnores = [
  new RegExp(`^${escapePathForRegex(path.join(projectRoot, 'dist'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(projectRoot, 'logs'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(projectRoot, 'test_assets'))}[\\\\/].*`),
];

// Exclude transient, non-project folders at workspace root that can appear/disappear
// while Gradle snapshots JS bundle task inputs on Windows.
// Also exclude large workspace-level directories that Metro doesn't need to crawl
// for this React Native app — prevents multi-minute hangs during Metro initialization.
const workspaceIgnores = !samePath(workspaceRoot, projectRoot) ? [
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, '.tmp'))}[^\\\\/]*[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, 'tmp'))}[^\\\\/]*[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, 'build-artifacts'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, 'b'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, 'b-cxx'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, 'archive'))}[\\\\/].*`),
  // Large workspace directories unrelated to this React Native app
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, '.next'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, 'dist'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, 'src'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, 'packages'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, 'tools'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, 'studioos'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, 'migrations'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, 'data'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, 'public'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, 'docs'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, '.wrangler'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, '.github'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, '.vscode'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, '.agents'))}[\\\\/].*`),
  new RegExp(`^${escapePathForRegex(path.join(workspaceRoot, 'private-keys'))}[\\\\/].*`),
] : [];

const ignorePatterns = [...androidBuildIgnores, ...projectLocalIgnores, ...workspaceIgnores];

const existingBlockList = config.resolver.blockList;
if (Array.isArray(existingBlockList)) {
  config.resolver.blockList = [...existingBlockList, ...ignorePatterns];
} else if (existingBlockList) {
  config.resolver.blockList = [existingBlockList, ...ignorePatterns];
} else {
  config.resolver.blockList = ignorePatterns;
}

module.exports = config;
