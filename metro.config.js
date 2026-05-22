const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// supabase-js ships an OpenTelemetry shim that uses runtime `import()`, which
// Hermes can't parse. Force the @supabase/* packages to resolve via legacy
// `main`/`react-native` fields (skipping the OTel-instrumented "exports" entry)
// without disabling package exports globally — that would break NativeWind on
// Windows where subpath resolution is stricter.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("@supabase/")) {
    return context.resolveRequest(
      { ...context, unstable_enablePackageExports: false },
      moduleName,
      platform,
    );
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
