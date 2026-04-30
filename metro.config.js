const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// The @nss/response-os package lives outside this project via file: link.
// Metro needs watchFolders to resolve symlinked packages outside the project root.
const responseOsRoot = path.resolve(__dirname, 'vendor', 'response-os');
config.watchFolders = [responseOsRoot];
config.resolver.nodeModulesPaths = [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(responseOsRoot, 'node_modules'),
];

module.exports = config;

