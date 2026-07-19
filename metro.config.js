// Support web d'expo-sqlite : le moteur wa-sqlite est livré en WebAssembly,
// Metro doit donc empaqueter les fichiers .wasm comme des assets.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wasm');

module.exports = config;
