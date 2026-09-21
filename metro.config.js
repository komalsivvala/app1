// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite on web ships SQLite as WebAssembly inside a worker; Metro must
// treat .wasm as an asset for the static web export used by the screenshot CI.
config.resolver.assetExts.push('wasm');

module.exports = config;
