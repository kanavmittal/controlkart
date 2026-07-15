// Learn more: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// #1 - Watch all files in the monorepo (needed so Metro sees changes to
// workspace packages under apps/ and packages/).
config.watchFolders = [workspaceRoot];

// #2 - Resolve modules from this app's node_modules first, then fall back
// to the workspace root's node_modules (pnpm keeps most packages there).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// #3 - pnpm stores packages in a content-addressed store and links them
// into node_modules via symlinks; Metro needs symlink resolution enabled
// to follow those links correctly.
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
