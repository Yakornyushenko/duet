const { AndroidConfig, withAppBuildGradle } = require('expo/config-plugins');

const withOptimizedResourceShrinking =
  AndroidConfig.BuildProperties.createBuildGradlePropsConfigPlugin(
    [
      {
        propName: 'android.r8.optimizedResourceShrinking',
        propValueGetter: () => 'true',
      },
    ],
    'withOptimizedResourceShrinking'
  );

function withR8Production(config) {
  config = withOptimizedResourceShrinking(config);

  return withAppBuildGradle(config, (config) => {
    const optimizedDefaultFile = /getDefaultProguardFile\(["']proguard-android-optimize\.txt["']\)/;
    const unoptimizedDefaultFile = /getDefaultProguardFile\(["']proguard-android\.txt["']\)/;

    if (optimizedDefaultFile.test(config.modResults.contents)) {
      return config;
    }

    if (!unoptimizedDefaultFile.test(config.modResults.contents)) {
      throw new Error('Unable to enable optimized R8 rules: default ProGuard file was not found.');
    }

    config.modResults.contents = config.modResults.contents.replace(
      unoptimizedDefaultFile,
      'getDefaultProguardFile("proguard-android-optimize.txt")'
    );

    return config;
  });
}

module.exports = withR8Production;
