const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// supabase-js ships an OpenTelemetry shim that uses `import()` at runtime,
// which Hermes does not support. Disabling package "exports" resolution makes
// Metro fall back to "main"/"react-native" fields and skip the OTel chunk.
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: "./global.css" });
