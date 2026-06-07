const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const defaultWorkspaceRoot = path.resolve(projectRoot, '../..');
const workspaceRoot = process.env.NSTEP_METRO_WORKSPACE_ROOT
  ? path.resolve(process.env.NSTEP_METRO_WORKSPACE_ROOT)
  : defaultWorkspaceRoot;

const config = getDefaultConfig(projectRoot);

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
  samePath(workspaceRoot, projectRoot) ? null : workspaceRoot,
  ...nodePathRoots,
].filter(Boolean));
config.resolver.nodeModulesPaths = uniquePaths([
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
  ...nodePathRoots,
]);

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

