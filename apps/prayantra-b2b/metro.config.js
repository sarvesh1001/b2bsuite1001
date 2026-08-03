const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Monorepo support
config.watchFolders = [
  path.resolve(__dirname, "../../packages"),
];

// Resolve shared packages
config.resolver.extraNodeModules = {
  "@b2b/shared-types": path.resolve(
    __dirname,
    "../../packages/shared-types/src"
  ),
  "@b2b/api-client": path.resolve(
    __dirname,
    "../../packages/api-client/src"
  ),
};

// Ensure Metro searches both workspace and local node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "../../node_modules"),
  path.resolve(__dirname, "node_modules"),
];

// SVG support
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};

config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== "svg"
);

config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  "svg",
];

module.exports = config;