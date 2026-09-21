// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite on web ships SQLite as WebAssembly inside a worker; Metro must
// treat .wasm as an asset for the static web export used by the screenshot CI.
config.resolver.assetExts.push('wasm');

// Road-sign artwork: a static `import Sign from './x.svg'` becomes a React
// component at build time (docs/05-Data-Schema.md §2.1). A missing file is a
// bundling failure, never a blank box at runtime.
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer/expo');
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts.push('svg');

module.exports = config;
