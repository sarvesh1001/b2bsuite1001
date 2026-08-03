# Combined Source Code

Total Files: 26

# File: AGENTS.md

```markdown
# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.
```

# File: App.tsx

```tsx
// apps/prayantra-b2b/App.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Alert, AppState, AppStateStatus } from 'react-native';

import Navigation from './src/navigation';
import { axiosInstance, setRefreshTokenFunction, setUnauthorizedCallback } from '@b2b/api-client';
import { AnimatedSplash } from './src/splash/AnimatedSplashScreen';
import { useUserAuthStore } from './src/store/userAuthStore';
import { getDeviceId } from './src/utils/device';
import { refreshUserAccessToken } from './src/services/auth';
import { resetToAuthScreen } from './src/navigation/navigationService';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// --- Global error handler (dev only) ---
if (__DEV__) {
  const originalHandler = ErrorUtils.getGlobalHandler?.();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('🔥 GLOBAL ERROR:', error);
    Alert.alert(
      'Unhandled Error',
      error?.message || 'Unknown error',
      [
        { text: 'OK' },
        { text: 'Details', onPress: () => console.log(error?.stack) },
      ],
      { cancelable: false }
    );
    if (originalHandler) originalHandler(error, isFatal);
  });
}

SplashScreen.preventAutoHideAsync();

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'http://localhost:8080/api/v1';

export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const {
    isAuthenticated,
    deviceId,
    setDeviceIdInStore,
    validateSession,
    clearSession,
    logout,
    updateTokens,
  } = useUserAuthStore();

  // ✅ Fix: use 'number' (not NodeJS.Timeout) for React Native
  const refreshTimerRef = useRef<number | null>(null);
  const isFirstForeground = useRef(true);
  const hasRefreshedOnLaunch = useRef(false);

  const [fontsLoaded] = useFonts({
    ...MaterialCommunityIcons.font,
  });

  // 1. Configure Axios and fetch device ID
  useEffect(() => {
    async function prepare() {
      try {
        axiosInstance.defaults.baseURL = apiBaseUrl;
        if (!deviceId) {
          const freshDeviceId = await getDeviceId();
          setDeviceIdInStore(freshDeviceId);
        } else {
          setDeviceIdInStore(deviceId);
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        console.error('❌ [App] prepare() error:', error);
      } finally {
        setIsReady(true);
      }
    }
    prepare();
  }, []);

  // 2. Define the refresh function (memoized) – FIXED token extraction
  const doRefresh = useCallback(async (): Promise<{ accessToken: string; refreshToken: string }> => {
    console.log('🔄 [App] doRefresh() called');
    const refreshToken = useUserAuthStore.getState().refreshToken;
    if (!refreshToken) {
      console.error('❌ [App] No refresh token');
      throw new Error('No refresh token');
    }
    try {
      // ✅ The response contains a nested `data` property with the tokens
      const response = await refreshUserAccessToken(refreshToken);
      const { access_token, refresh_token } = response.data;
      console.log('🔄 [App] New tokens received:', { access_token, refresh_token });

      updateTokens(access_token, refresh_token);
      return { accessToken: access_token, refreshToken: refresh_token };
    } catch (error: any) {
      console.error('❌ [App] refreshUserAccessToken error:', error.message, error.response?.status);
      throw error;
    }
  }, [updateTokens]);

  // 3. Set refresh function for interceptor
  useEffect(() => {
    setRefreshTokenFunction(doRefresh);
    return () => setRefreshTokenFunction(null);
  }, [doRefresh]);

  // 4. Set unauthorized callback (called by interceptor when refresh fails)
  useEffect(() => {
    const onUnauthorized = () => {
      console.warn('🚫 [App] Unauthorized callback triggered');
      clearSession(); // preserves savedUserId, savedPhone, savedHasMpin
      resetToAuthScreen(); // will route to MPIN verification if saved user exists
    };
    setUnauthorizedCallback(onUnauthorized);
    return () => setUnauthorizedCallback(null);
  }, [clearSession]);

  // 5. Proactive refresh timer – NOW EVERY 10 SECONDS FOR TESTING
  useEffect(() => {
    const startTimer = () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = setInterval(() => {
        if (useUserAuthStore.getState().isAuthenticated) {
          console.log('⏰ [App] Timer tick - doing proactive refresh');
          doRefresh().catch((err) => console.error('❌ [App] Proactive refresh error:', err));
        }
      }, 27000); // 🔁 10 seconds (was 270000)
    };

    if (isAuthenticated) {
      startTimer();
    } else if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [isAuthenticated, doRefresh]);

  // 6. Proactive Refresh on Launch – sets isAuthReady when done
  useEffect(() => {
    async function refreshOnLaunch() {
      if (hasRefreshedOnLaunch.current) return;

      console.log('🚀 [App] refreshOnLaunch - starting');

      const refreshToken = useUserAuthStore.getState().refreshToken;

      if (!refreshToken) {
        // No refresh token – log out completely (clears everything including saved user)
        logout();
        resetToAuthScreen();
        hasRefreshedOnLaunch.current = true;
        setIsAuthReady(true);
        await SplashScreen.hideAsync();
        return;
      }

      try {
        await doRefresh();
        console.log('✅ [App] Proactive refresh succeeded on launch');
      } catch (error) {
        console.warn('❌ [App] Proactive refresh failed on launch:', error);
      } finally {
        hasRefreshedOnLaunch.current = true;
        setIsAuthReady(true);
        await SplashScreen.hideAsync();
      }
    }

    if (isReady && fontsLoaded) {
      refreshOnLaunch();
    }
  }, [isReady, fontsLoaded, doRefresh, logout]);

  // 7. Re-validate when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated) {
        if (isFirstForeground.current) {
          isFirstForeground.current = false;
          return;
        }
        validateSession().catch((err) => console.error('❌ [App] validateSession error:', err));
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated, validateSession]);

  const handleSplashFinish = () => {
    setIsSplashVisible(false);
  };

  // Wait for assets AND auth validation before rendering navigation
  if (!isReady || !fontsLoaded || !isAuthReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        {isSplashVisible ? (
          <AnimatedSplash onFinish={handleSplashFinish} />
        ) : (
          <PaperProvider>
            <StatusBar style="dark" />
            <Navigation />
          </PaperProvider>
        )}
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
```

# File: CLAUDE.md

```markdown
@AGENTS.md
```

# File: android/app/build.gradle

```gradle
apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
apply plugin: "com.facebook.react"

def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()

/**
 * This is the configuration block to customize your React Native Android app.
 * By default you don't need to apply any configuration, just uncomment the lines you need.
 */
react {
    entryFile = file(["node", "-e", "require('expo/scripts/resolveAppEntry')", projectRoot, "android", "absolute"].execute(null, rootDir).text.trim())
    reactNativeDir = new File(["node", "--print", "require.resolve('react-native/package.json')"].execute(null, rootDir).text.trim()).getParentFile().getAbsoluteFile()
    hermesCommand = new File(["node", "--print", "require.resolve('hermes-compiler/package.json', { paths: [require.resolve('react-native/package.json')] })"].execute(null, rootDir).text.trim()).getParentFile().getAbsolutePath() + "/hermesc/%OS-BIN%/hermesc"
    codegenDir = new File(["node", "--print", "require.resolve('@react-native/codegen/package.json', { paths: [require.resolve('react-native/package.json')] })"].execute(null, rootDir).text.trim()).getParentFile().getAbsoluteFile()

    enableBundleCompression = (findProperty('android.enableBundleCompression') ?: false).toBoolean()
    // Use Expo CLI to bundle the app, this ensures the Metro config
    // works correctly with Expo projects.
    cliFile = new File(["node", "--print", "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })"].execute(null, rootDir).text.trim())
    bundleCommand = "export:embed"

    /* Folders */
     //   The root of your project, i.e. where "package.json" lives. Default is '../..'
    // root = file("../../")
    //   The folder where the react-native NPM package is. Default is ../../node_modules/react-native
    // reactNativeDir = file("../../node_modules/react-native")
    //   The folder where the react-native Codegen package is. Default is ../../node_modules/@react-native/codegen
    // codegenDir = file("../../node_modules/@react-native/codegen")

    /* Variants */
    //   The list of variants to that are debuggable. For those we're going to
    //   skip the bundling of the JS bundle and the assets. By default is just 'debug'.
    //   If you add flavors like lite, prod, etc. you'll have to list your debuggableVariants.
    // debuggableVariants = ["liteDebug", "prodDebug"]

    /* Bundling */
    //   A list containing the node command and its flags. Default is just 'node'.
    // nodeExecutableAndArgs = ["node"]

    //
    //   The path to the CLI configuration file. Default is empty.
    // bundleConfig = file(../rn-cli.config.js)
    //
    //   The name of the generated asset file containing your JS bundle
    // bundleAssetName = "MyApplication.android.bundle"
    //
    //   The entry file for bundle generation. Default is 'index.android.js' or 'index.js'
    // entryFile = file("../js/MyApplication.android.js")
    //
    //   A list of extra flags to pass to the 'bundle' commands.
    //   See https://github.com/react-native-community/cli/blob/main/docs/commands.md#bundle
    // extraPackagerArgs = []

    /* Hermes Commands */
    //   The hermes compiler command to run. By default it is 'hermesc'
    // hermesCommand = "$rootDir/my-custom-hermesc/bin/hermesc"
    //
    //   The list of flags to pass to the Hermes compiler. By default is "-O", "-output-source-map"
    // hermesFlags = ["-O", "-output-source-map"]

    /* Autolinking */
    autolinkLibrariesWithApp()
}

/**
 * Set this to true in release builds to optimize the app using [R8](https://developer.android.com/topic/performance/app-optimization/enable-app-optimization).
 */
def enableMinifyInReleaseBuilds = (findProperty('android.enableMinifyInReleaseBuilds') ?: false).toBoolean()

/**
 * The preferred build flavor of JavaScriptCore (JSC)
 *
 * For example, to use the international variant, you can use:
 * `def jscFlavor = 'org.webkit:android-jsc-intl:+'`
 *
 * The international variant includes ICU i18n library and necessary data
 * allowing to use e.g. `Date.toLocaleString` and `String.localeCompare` that
 * give correct results when using with locales other than en-US. Note that
 * this variant is about 6MiB larger per architecture than default.
 */
def jscFlavor = 'io.github.react-native-community:jsc-android:2026004.+'

android {
    ndkVersion rootProject.ext.ndkVersion

    buildToolsVersion rootProject.ext.buildToolsVersion
    compileSdk rootProject.ext.compileSdkVersion

    namespace 'com.sarvesh1001.prayantra'
    defaultConfig {
        applicationId 'com.sarvesh1001.prayantra'
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0.0"

        buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL", "\"${findProperty('reactNativeReleaseLevel') ?: 'stable'}\""
    }
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug
            def enableShrinkResources = findProperty('android.enableShrinkResourcesInReleaseBuilds') ?: 'false'
            shrinkResources enableShrinkResources.toBoolean()
            minifyEnabled enableMinifyInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
            def enablePngCrunchInRelease = findProperty('android.enablePngCrunchInReleaseBuilds') ?: 'true'
            crunchPngs enablePngCrunchInRelease.toBoolean()
        }
    }
    packagingOptions {
        jniLibs {
            def enableLegacyPackaging = findProperty('expo.useLegacyPackaging') ?: 'false'
            useLegacyPackaging enableLegacyPackaging.toBoolean()
        }
    }
    androidResources {
        ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:!CVS:!thumbs.db:!picasa.ini:!*~'
    }
}

// Apply static values from `gradle.properties` to the `android.packagingOptions`
// Accepts values in comma delimited lists, example:
// android.packagingOptions.pickFirsts=/LICENSE,**/picasa.ini
["pickFirsts", "excludes", "merges", "doNotStrip"].each { prop ->
    // Split option: 'foo,bar' -> ['foo', 'bar']
    def options = (findProperty("android.packagingOptions.$prop") ?: "").split(",");
    // Trim all elements in place.
    for (i in 0..<options.size()) options[i] = options[i].trim();
    // `[] - ""` is essentially `[""].filter(Boolean)` removing all empty strings.
    options -= ""

    if (options.length > 0) {
        println "android.packagingOptions.$prop += $options ($options.length)"
        // Ex: android.packagingOptions.pickFirsts += '**/SCCS/**'
        options.each {
            android.packagingOptions[prop] += it
        }
    }
}

dependencies {
    // The version of react-native is set by the React Native Gradle Plugin
    implementation("com.facebook.react:react-android")

    def isGifEnabled = (findProperty('expo.gif.enabled') ?: "") == "true";
    def isWebpEnabled = (findProperty('expo.webp.enabled') ?: "") == "true";
    def isWebpAnimatedEnabled = (findProperty('expo.webp.animated') ?: "") == "true";

    if (isGifEnabled) {
        // For animated gif support
        implementation("com.facebook.fresco:animated-gif:${expoLibs.versions.fresco.get()}")
    }

    if (isWebpEnabled) {
        // For webp support
        implementation("com.facebook.fresco:webpsupport:${expoLibs.versions.fresco.get()}")
        if (isWebpAnimatedEnabled) {
            // Animated webp support
            implementation("com.facebook.fresco:animated-webp:${expoLibs.versions.fresco.get()}")
        }
    }

    if (hermesEnabled.toBoolean()) {
        implementation("com.facebook.react:hermes-android")
    } else {
        implementation jscFlavor
    }
}
```

# File: android/app/src/main/java/com/sarvesh1001/prayantra/MainActivity.kt

```kotlin
package com.sarvesh1001.prayantra
import expo.modules.splashscreen.SplashScreenManager

import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    // setTheme(R.style.AppTheme);
    // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY) sync-f3ff59a738c56c9a6119210cb55f0b613eb8b6af
    SplashScreenManager.registerOnActivity(this)
    // @generated end expo-splashscreen
    super.onCreate(null)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
```

# File: android/app/src/main/java/com/sarvesh1001/prayantra/MainApplication.kt

```kotlin
package com.sarvesh1001.prayantra

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        }
    )
  }

  override fun onCreate() {
    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
```

# File: android/build.gradle

```gradle
// Top-level build file where you can add configuration options common to all sub-projects/modules.

buildscript {
  repositories {
    google()
    mavenCentral()
  }
  dependencies {
    classpath('com.android.tools.build:gradle')
    classpath('com.facebook.react:react-native-gradle-plugin')
    classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')
  }
}

allprojects {
  repositories {
    google()
    mavenCentral()
    maven { url 'https://www.jitpack.io' }
  }
}

apply plugin: "expo-root-project"
apply plugin: "com.facebook.react.rootproject"
```

# File: android/gradle/wrapper/gradle-wrapper.properties

```properties
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-9.3.1-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
```

# File: android/gradle.properties

```properties
# Project-wide Gradle settings.

# IDE (e.g. Android Studio) users:
# Gradle settings configured through the IDE *will override*
# any settings specified in this file.

# For more details on how to configure your build environment visit
# http://www.gradle.org/docs/current/userguide/build_environment.html

# Specifies the JVM arguments used for the daemon process.
# The setting is particularly useful for tweaking memory settings.
# Default value: -Xmx512m -XX:MaxMetaspaceSize=256m
org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m -Dhttps.protocols=TLSv1.2,TLSv1.3

# When configured, Gradle will run in incubating parallel mode.
# This option should only be used with decoupled projects. More details, visit
# http://www.gradle.org/docs/current/userguide/multi_project_builds.html#sec:decoupled_projects
org.gradle.parallel=true

# AndroidX package structure to make it clearer which packages are bundled with the
# Android operating system, and which are packaged with your app's APK
# https://developer.android.com/topic/libraries/support-library/androidx-rn
android.useAndroidX=true

# Enable AAPT2 PNG crunching
android.enablePngCrunchInReleaseBuilds=true

# Use this property to specify which architecture you want to build.
# You can also override it from the CLI using
# ./gradlew <task> -PreactNativeArchitectures=x86_64
reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64

# Use this property to enable support to the new architecture.
# This will allow you to use TurboModules and the Fabric render in
# your application. You should enable this flag either if you want
# to write custom TurboModules/Fabric components OR use libraries that
# are providing them.
newArchEnabled=true

# Use this property to enable or disable the Hermes JS engine.
# If set to false, you will be using JSC instead.
hermesEnabled=true

# Use this property to enable edge-to-edge display support.
# This allows your app to draw behind system bars for an immersive UI.
# Note: Only works with ReactActivity and should not be used with custom Activity.
edgeToEdgeEnabled=true

# Enable GIF support in React Native images (~200 B increase)
expo.gif.enabled=true
# Enable webp support in React Native images (~85 KB increase)
expo.webp.enabled=true
# Enable animated webp support (~3.4 MB increase)
# Disabled by default because iOS doesn't support animated webp
expo.webp.animated=false

# Enable network inspector
EX_DEV_CLIENT_NETWORK_INSPECTOR=true

# Use legacy packaging to compress native libraries in the resulting APK.
expo.useLegacyPackaging=false

expo.inlineModules.watchedDirectories=[]
```

# File: android/settings.gradle

```gradle
pluginManagement {
  def reactNativeGradlePlugin = new File(
    providers.exec {
      workingDir(rootDir)
      commandLine("node", "--print", "require.resolve('@react-native/gradle-plugin/package.json', { paths: [require.resolve('react-native/package.json')] })")
    }.standardOutput.asText.get().trim()
  ).getParentFile().absolutePath
  includeBuild(reactNativeGradlePlugin)
  
  def expoPluginsPath = new File(
    providers.exec {
      workingDir(rootDir)
      commandLine("node", "--print", "require.resolve('expo-modules-autolinking/package.json', { paths: [require.resolve('expo/package.json')] })")
    }.standardOutput.asText.get().trim(),
    "../android/expo-gradle-plugin"
  ).absolutePath
  includeBuild(expoPluginsPath)
}

plugins {
  id("com.facebook.react.settings")
  id("expo-autolinking-settings")
}

extensions.configure(com.facebook.react.ReactSettingsExtension) { ex ->
  if (System.getenv('EXPO_USE_COMMUNITY_AUTOLINKING') == '1') {
    ex.autolinkLibrariesFromCommand()
  } else {
    ex.autolinkLibrariesFromCommand(expoAutolinking.rnConfigCommand)
  }
}
expoAutolinking.useExpoModules()

rootProject.name = 'Prayantra'

expoAutolinking.useExpoVersionCatalog()

include ':app'
includeBuild(expoAutolinking.reactNativeGradlePlugin)
```

# File: babel.config.js

```javascript
module.exports = function(api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      plugins: [
        // Required for react-native-reanimated v4
        'react-native-reanimated/plugin',
      ],
    };
  };
```

# File: clean_c.py

```python
#!/usr/bin/env python3

from pathlib import Path
import mimetypes

ROOT = Path(".")
OUTPUT_FILE = "combined_code.md"

# Directories to ignore
IGNORE_DIRS = {
    ".git",
    ".github",
    ".next",
    ".turbo",
    ".expo",
    ".expo-shared",
    ".idea",
    ".vscode",
    ".cache",
    "__pycache__",
    ".pytest_cache",

    "node_modules",
    "dist",
    "coverage",
    "vendor",
    "Pods",

    # Build folders
    "build",
    ".gradle",
    ".cxx",
    ".kotlin",

    # Generated
    "generated",
    "tmp",
    "intermediates",
    "outputs",
    "reports",
    "executionHistory",
    "expanded",
    "fileHashes",
    "fileChanges",
    "checksums",
}

# Ignore exact filenames
IGNORE_FILENAMES = {
    ".DS_Store",
    ".gitignore",
    ".gitattributes",
    ".editorconfig",
    ".prettierrc",
    ".prettierignore",
    ".eslintignore",
    ".npmrc",

    ".env",
    ".env.local",
    ".env.production",
    ".env.development",

    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lockb",
    "Cargo.lock",
    "composer.lock",

    "debug.keystore",
}

# Ignore docs
IGNORE_PREFIXES = (
    "README",
    "LICENSE",
    "CHANGELOG",
    "CONTRIBUTING",
    "CODE_OF_CONDUCT",
)

# Allowed source extensions
CODE_EXTENSIONS = {
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",

    ".go",
    ".py",
    ".java",
    ".kt",
    ".kts",
    ".swift",

    ".xml",
    ".gradle",
    ".properties",

    ".css",
    ".scss",
    ".html",

    ".json",
    ".yaml",
    ".yml",

    ".sql",
    ".graphql",
    ".proto",

    ".sh",
    ".md",
}

# Important config files
ALLOWED_FILES = {
    "package.json",
    "tsconfig.json",
    "turbo.json",
    "pnpm-workspace.yaml",
    "pnpm-workspace.yml",

    "app.json",
    "eas.json",

    "metro.config.js",
    "metro.config.cjs",

    "babel.config.js",
    "babel.config.cjs",

    "next.config.js",
    "next.config.ts",

    "vite.config.js",
    "vite.config.ts",

    "jest.config.js",
    "jest.config.ts",

    "eslint.config.js",
    "eslint.config.mjs",

    "tailwind.config.js",
    "tailwind.config.ts",

    "gradle.properties",
    "settings.gradle",
    "build.gradle",
    "gradle-wrapper.properties",

    "AndroidManifest.xml",
}

LANGUAGE_MAP = {
    ".ts": "typescript",
    ".tsx": "tsx",
    ".js": "javascript",
    ".jsx": "jsx",
    ".mjs": "javascript",
    ".cjs": "javascript",

    ".go": "go",
    ".py": "python",
    ".java": "java",
    ".kt": "kotlin",
    ".kts": "kotlin",
    ".swift": "swift",

    ".xml": "xml",
    ".gradle": "gradle",
    ".properties": "properties",

    ".css": "css",
    ".scss": "scss",
    ".html": "html",

    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",

    ".sql": "sql",
    ".graphql": "graphql",
    ".proto": "proto",

    ".sh": "bash",
    ".md": "markdown",
}


def is_binary(path: Path):
    mime, _ = mimetypes.guess_type(path)

    if mime and not mime.startswith("text"):
        return True

    try:
        with open(path, "rb") as f:
            return b"\0" in f.read(2048)
    except Exception:
        return True


def should_skip(path: Path):
    # Ignore directories
    for part in path.parts:
        if part in IGNORE_DIRS:
            return True

    # Ignore filenames
    if path.name in IGNORE_FILENAMES:
        return True

    # Ignore docs
    if path.name.startswith(IGNORE_PREFIXES):
        return True

    # Always allow important config
    if path.name in ALLOWED_FILES:
        return False

    # Only keep desired source files
    return path.suffix.lower() not in CODE_EXTENSIONS


files = []

print("Scanning project...")

for file in ROOT.rglob("*"):
    if not file.is_file():
        continue

    if should_skip(file):
        continue

    if is_binary(file):
        continue

    files.append(file)

files.sort()

with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
    out.write("# Combined Source Code\n\n")
    out.write(f"Total Files: {len(files)}\n\n")

    for file in files:
        rel = file.relative_to(ROOT)
        lang = LANGUAGE_MAP.get(file.suffix.lower(), "")

        print(rel)

        out.write(f"# File: {rel}\n\n")
        out.write(f"```{lang}\n")

        try:
            text = file.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            text = file.read_text(encoding="latin-1")

        out.write(text)

        if not text.endswith("\n"):
            out.write("\n")

        out.write("```\n\n")

print(f"\n✅ Done!")
print(f"Files included : {len(files)}")
print(f"Output         : {OUTPUT_FILE}")
```

# File: combined_code.md

```markdown
# Combined Source Code

Total Files: 26

# File: AGENTS.md

```markdown
# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.
```

# File: App.tsx

```tsx
// apps/prayantra-b2b/App.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Alert, AppState, AppStateStatus } from 'react-native';

import Navigation from './src/navigation';
import { axiosInstance, setRefreshTokenFunction, setUnauthorizedCallback } from '@b2b/api-client';
import { AnimatedSplash } from './src/splash/AnimatedSplashScreen';
import { useUserAuthStore } from './src/store/userAuthStore';
import { getDeviceId } from './src/utils/device';
import { refreshUserAccessToken } from './src/services/auth';
import { resetToAuthScreen } from './src/navigation/navigationService';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// --- Global error handler (dev only) ---
if (__DEV__) {
  const originalHandler = ErrorUtils.getGlobalHandler?.();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('🔥 GLOBAL ERROR:', error);
    Alert.alert(
      'Unhandled Error',
      error?.message || 'Unknown error',
      [
        { text: 'OK' },
        { text: 'Details', onPress: () => console.log(error?.stack) },
      ],
      { cancelable: false }
    );
    if (originalHandler) originalHandler(error, isFatal);
  });
}

SplashScreen.preventAutoHideAsync();

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'http://localhost:8080/api/v1';

export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const {
    isAuthenticated,
    deviceId,
    setDeviceIdInStore,
    validateSession,
    clearSession,
    logout,
    updateTokens,
  } = useUserAuthStore();

  // ✅ Fix: use 'number' (not NodeJS.Timeout) for React Native
  const refreshTimerRef = useRef<number | null>(null);
  const isFirstForeground = useRef(true);
  const hasRefreshedOnLaunch = useRef(false);

  const [fontsLoaded] = useFonts({
    ...MaterialCommunityIcons.font,
  });

  // 1. Configure Axios and fetch device ID
  useEffect(() => {
    async function prepare() {
      try {
        axiosInstance.defaults.baseURL = apiBaseUrl;
        if (!deviceId) {
          const freshDeviceId = await getDeviceId();
          setDeviceIdInStore(freshDeviceId);
        } else {
          setDeviceIdInStore(deviceId);
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        console.error('❌ [App] prepare() error:', error);
      } finally {
        setIsReady(true);
      }
    }
    prepare();
  }, []);

  // 2. Define the refresh function (memoized) – FIXED token extraction
  const doRefresh = useCallback(async (): Promise<{ accessToken: string; refreshToken: string }> => {
    console.log('🔄 [App] doRefresh() called');
    const refreshToken = useUserAuthStore.getState().refreshToken;
    if (!refreshToken) {
      console.error('❌ [App] No refresh token');
      throw new Error('No refresh token');
    }
    try {
      // ✅ The response contains a nested `data` property with the tokens
      const response = await refreshUserAccessToken(refreshToken);
      const { access_token, refresh_token } = response.data;
      console.log('🔄 [App] New tokens received:', { access_token, refresh_token });

      updateTokens(access_token, refresh_token);
      return { accessToken: access_token, refreshToken: refresh_token };
    } catch (error: any) {
      console.error('❌ [App] refreshUserAccessToken error:', error.message, error.response?.status);
      throw error;
    }
  }, [updateTokens]);

  // 3. Set refresh function for interceptor
  useEffect(() => {
    setRefreshTokenFunction(doRefresh);
    return () => setRefreshTokenFunction(null);
  }, [doRefresh]);

  // 4. Set unauthorized callback (called by interceptor when refresh fails)
  useEffect(() => {
    const onUnauthorized = () => {
      console.warn('🚫 [App] Unauthorized callback triggered');
      clearSession(); // preserves savedUserId, savedPhone, savedHasMpin
      resetToAuthScreen(); // will route to MPIN verification if saved user exists
    };
    setUnauthorizedCallback(onUnauthorized);
    return () => setUnauthorizedCallback(null);
  }, [clearSession]);

  // 5. Proactive refresh timer – NOW EVERY 10 SECONDS FOR TESTING
  useEffect(() => {
    const startTimer = () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = setInterval(() => {
        if (useUserAuthStore.getState().isAuthenticated) {
          console.log('⏰ [App] Timer tick - doing proactive refresh');
          doRefresh().catch((err) => console.error('❌ [App] Proactive refresh error:', err));
        }
      }, 27000); // 🔁 10 seconds (was 270000)
    };

    if (isAuthenticated) {
      startTimer();
    } else if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [isAuthenticated, doRefresh]);

  // 6. Proactive Refresh on Launch – sets isAuthReady when done
  useEffect(() => {
    async function refreshOnLaunch() {
      if (hasRefreshedOnLaunch.current) return;

      console.log('🚀 [App] refreshOnLaunch - starting');

      const refreshToken = useUserAuthStore.getState().refreshToken;

      if (!refreshToken) {
        // No refresh token – log out completely (clears everything including saved user)
        logout();
        resetToAuthScreen();
        hasRefreshedOnLaunch.current = true;
        setIsAuthReady(true);
        await SplashScreen.hideAsync();
        return;
      }

      try {
        await doRefresh();
        console.log('✅ [App] Proactive refresh succeeded on launch');
      } catch (error) {
        console.warn('❌ [App] Proactive refresh failed on launch:', error);
      } finally {
        hasRefreshedOnLaunch.current = true;
        setIsAuthReady(true);
        await SplashScreen.hideAsync();
      }
    }

    if (isReady && fontsLoaded) {
      refreshOnLaunch();
    }
  }, [isReady, fontsLoaded, doRefresh, logout]);

  // 7. Re-validate when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated) {
        if (isFirstForeground.current) {
          isFirstForeground.current = false;
          return;
        }
        validateSession().catch((err) => console.error('❌ [App] validateSession error:', err));
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated, validateSession]);

  const handleSplashFinish = () => {
    setIsSplashVisible(false);
  };

  // Wait for assets AND auth validation before rendering navigation
  if (!isReady || !fontsLoaded || !isAuthReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        {isSplashVisible ? (
          <AnimatedSplash onFinish={handleSplashFinish} />
        ) : (
          <PaperProvider>
            <StatusBar style="dark" />
            <Navigation />
          </PaperProvider>
        )}
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
```

# File: CLAUDE.md

```markdown
@AGENTS.md
```

# File: android/app/build.gradle

```gradle
apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
apply plugin: "com.facebook.react"

def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()

/**
 * This is the configuration block to customize your React Native Android app.
 * By default you don't need to apply any configuration, just uncomment the lines you need.
 */
react {
    entryFile = file(["node", "-e", "require('expo/scripts/resolveAppEntry')", projectRoot, "android", "absolute"].execute(null, rootDir).text.trim())
    reactNativeDir = new File(["node", "--print", "require.resolve('react-native/package.json')"].execute(null, rootDir).text.trim()).getParentFile().getAbsoluteFile()
    hermesCommand = new File(["node", "--print", "require.resolve('hermes-compiler/package.json', { paths: [require.resolve('react-native/package.json')] })"].execute(null, rootDir).text.trim()).getParentFile().getAbsolutePath() + "/hermesc/%OS-BIN%/hermesc"
    codegenDir = new File(["node", "--print", "require.resolve('@react-native/codegen/package.json', { paths: [require.resolve('react-native/package.json')] })"].execute(null, rootDir).text.trim()).getParentFile().getAbsoluteFile()

    enableBundleCompression = (findProperty('android.enableBundleCompression') ?: false).toBoolean()
    // Use Expo CLI to bundle the app, this ensures the Metro config
    // works correctly with Expo projects.
    cliFile = new File(["node", "--print", "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })"].execute(null, rootDir).text.trim())
    bundleCommand = "export:embed"

    /* Folders */
     //   The root of your project, i.e. where "package.json" lives. Default is '../..'
    // root = file("../../")
    //   The folder where the react-native NPM package is. Default is ../../node_modules/react-native
    // reactNativeDir = file("../../node_modules/react-native")
    //   The folder where the react-native Codegen package is. Default is ../../node_modules/@react-native/codegen
    // codegenDir = file("../../node_modules/@react-native/codegen")

    /* Variants */
    //   The list of variants to that are debuggable. For those we're going to
    //   skip the bundling of the JS bundle and the assets. By default is just 'debug'.
    //   If you add flavors like lite, prod, etc. you'll have to list your debuggableVariants.
    // debuggableVariants = ["liteDebug", "prodDebug"]

    /* Bundling */
    //   A list containing the node command and its flags. Default is just 'node'.
    // nodeExecutableAndArgs = ["node"]

    //
    //   The path to the CLI configuration file. Default is empty.
    // bundleConfig = file(../rn-cli.config.js)
    //
    //   The name of the generated asset file containing your JS bundle
    // bundleAssetName = "MyApplication.android.bundle"
    //
    //   The entry file for bundle generation. Default is 'index.android.js' or 'index.js'
    // entryFile = file("../js/MyApplication.android.js")
    //
    //   A list of extra flags to pass to the 'bundle' commands.
    //   See https://github.com/react-native-community/cli/blob/main/docs/commands.md#bundle
    // extraPackagerArgs = []

    /* Hermes Commands */
    //   The hermes compiler command to run. By default it is 'hermesc'
    // hermesCommand = "$rootDir/my-custom-hermesc/bin/hermesc"
    //
    //   The list of flags to pass to the Hermes compiler. By default is "-O", "-output-source-map"
    // hermesFlags = ["-O", "-output-source-map"]

    /* Autolinking */
    autolinkLibrariesWithApp()
}

/**
 * Set this to true in release builds to optimize the app using [R8](https://developer.android.com/topic/performance/app-optimization/enable-app-optimization).
 */
def enableMinifyInReleaseBuilds = (findProperty('android.enableMinifyInReleaseBuilds') ?: false).toBoolean()

/**
 * The preferred build flavor of JavaScriptCore (JSC)
 *
 * For example, to use the international variant, you can use:
 * `def jscFlavor = 'org.webkit:android-jsc-intl:+'`
 *
 * The international variant includes ICU i18n library and necessary data
 * allowing to use e.g. `Date.toLocaleString` and `String.localeCompare` that
 * give correct results when using with locales other than en-US. Note that
 * this variant is about 6MiB larger per architecture than default.
 */
def jscFlavor = 'io.github.react-native-community:jsc-android:2026004.+'

android {
    ndkVersion rootProject.ext.ndkVersion

    buildToolsVersion rootProject.ext.buildToolsVersion
    compileSdk rootProject.ext.compileSdkVersion

    namespace 'com.sarvesh1001.prayantra'
    defaultConfig {
        applicationId 'com.sarvesh1001.prayantra'
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0.0"

        buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL", "\"${findProperty('reactNativeReleaseLevel') ?: 'stable'}\""
    }
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug
            def enableShrinkResources = findProperty('android.enableShrinkResourcesInReleaseBuilds') ?: 'false'
            shrinkResources enableShrinkResources.toBoolean()
            minifyEnabled enableMinifyInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
            def enablePngCrunchInRelease = findProperty('android.enablePngCrunchInReleaseBuilds') ?: 'true'
            crunchPngs enablePngCrunchInRelease.toBoolean()
        }
    }
    packagingOptions {
        jniLibs {
            def enableLegacyPackaging = findProperty('expo.useLegacyPackaging') ?: 'false'
            useLegacyPackaging enableLegacyPackaging.toBoolean()
        }
    }
    androidResources {
        ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:!CVS:!thumbs.db:!picasa.ini:!*~'
    }
}

// Apply static values from `gradle.properties` to the `android.packagingOptions`
// Accepts values in comma delimited lists, example:
// android.packagingOptions.pickFirsts=/LICENSE,**/picasa.ini
["pickFirsts", "excludes", "merges", "doNotStrip"].each { prop ->
    // Split option: 'foo,bar' -> ['foo', 'bar']
    def options = (findProperty("android.packagingOptions.$prop") ?: "").split(",");
    // Trim all elements in place.
    for (i in 0..<options.size()) options[i] = options[i].trim();
    // `[] - ""` is essentially `[""].filter(Boolean)` removing all empty strings.
    options -= ""

    if (options.length > 0) {
        println "android.packagingOptions.$prop += $options ($options.length)"
        // Ex: android.packagingOptions.pickFirsts += '**/SCCS/**'
        options.each {
            android.packagingOptions[prop] += it
        }
    }
}

dependencies {
    // The version of react-native is set by the React Native Gradle Plugin
    implementation("com.facebook.react:react-android")

    def isGifEnabled = (findProperty('expo.gif.enabled') ?: "") == "true";
    def isWebpEnabled = (findProperty('expo.webp.enabled') ?: "") == "true";
    def isWebpAnimatedEnabled = (findProperty('expo.webp.animated') ?: "") == "true";

    if (isGifEnabled) {
        // For animated gif support
        implementation("com.facebook.fresco:animated-gif:${expoLibs.versions.fresco.get()}")
    }

    if (isWebpEnabled) {
        // For webp support
        implementation("com.facebook.fresco:webpsupport:${expoLibs.versions.fresco.get()}")
        if (isWebpAnimatedEnabled) {
            // Animated webp support
            implementation("com.facebook.fresco:animated-webp:${expoLibs.versions.fresco.get()}")
        }
    }

    if (hermesEnabled.toBoolean()) {
        implementation("com.facebook.react:hermes-android")
    } else {
        implementation jscFlavor
    }
}
```

# File: android/app/src/main/java/com/sarvesh1001/prayantra/MainActivity.kt

```kotlin
package com.sarvesh1001.prayantra
import expo.modules.splashscreen.SplashScreenManager

import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    // setTheme(R.style.AppTheme);
    // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY) sync-f3ff59a738c56c9a6119210cb55f0b613eb8b6af
    SplashScreenManager.registerOnActivity(this)
    // @generated end expo-splashscreen
    super.onCreate(null)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
```

# File: android/app/src/main/java/com/sarvesh1001/prayantra/MainApplication.kt

```kotlin
package com.sarvesh1001.prayantra

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        }
    )
  }

  override fun onCreate() {
    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
```

# File: android/build.gradle

```gradle
// Top-level build file where you can add configuration options common to all sub-projects/modules.

buildscript {
  repositories {
    google()
    mavenCentral()
  }
  dependencies {
    classpath('com.android.tools.build:gradle')
    classpath('com.facebook.react:react-native-gradle-plugin')
    classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')
  }
}

allprojects {
  repositories {
    google()
    mavenCentral()
    maven { url 'https://www.jitpack.io' }
  }
}

apply plugin: "expo-root-project"
apply plugin: "com.facebook.react.rootproject"
```

# File: android/gradle/wrapper/gradle-wrapper.properties

```properties
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-9.3.1-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
```

# File: android/gradle.properties

```properties
# Project-wide Gradle settings.

# IDE (e.g. Android Studio) users:
# Gradle settings configured through the IDE *will override*
# any settings specified in this file.

# For more details on how to configure your build environment visit
# http://www.gradle.org/docs/current/userguide/build_environment.html

# Specifies the JVM arguments used for the daemon process.
# The setting is particularly useful for tweaking memory settings.
# Default value: -Xmx512m -XX:MaxMetaspaceSize=256m
org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m -Dhttps.protocols=TLSv1.2,TLSv1.3

# When configured, Gradle will run in incubating parallel mode.
# This option should only be used with decoupled projects. More details, visit
# http://www.gradle.org/docs/current/userguide/multi_project_builds.html#sec:decoupled_projects
org.gradle.parallel=true

# AndroidX package structure to make it clearer which packages are bundled with the
# Android operating system, and which are packaged with your app's APK
# https://developer.android.com/topic/libraries/support-library/androidx-rn
android.useAndroidX=true

# Enable AAPT2 PNG crunching
android.enablePngCrunchInReleaseBuilds=true

# Use this property to specify which architecture you want to build.
# You can also override it from the CLI using
# ./gradlew <task> -PreactNativeArchitectures=x86_64
reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64

# Use this property to enable support to the new architecture.
# This will allow you to use TurboModules and the Fabric render in
# your application. You should enable this flag either if you want
# to write custom TurboModules/Fabric components OR use libraries that
# are providing them.
newArchEnabled=true

# Use this property to enable or disable the Hermes JS engine.
# If set to false, you will be using JSC instead.
hermesEnabled=true

# Use this property to enable edge-to-edge display support.
# This allows your app to draw behind system bars for an immersive UI.
# Note: Only works with ReactActivity and should not be used with custom Activity.
edgeToEdgeEnabled=true

# Enable GIF support in React Native images (~200 B increase)
expo.gif.enabled=true
# Enable webp support in React Native images (~85 KB increase)
expo.webp.enabled=true
# Enable animated webp support (~3.4 MB increase)
# Disabled by default because iOS doesn't support animated webp
expo.webp.animated=false

# Enable network inspector
EX_DEV_CLIENT_NETWORK_INSPECTOR=true

# Use legacy packaging to compress native libraries in the resulting APK.
expo.useLegacyPackaging=false

expo.inlineModules.watchedDirectories=[]
```

# File: android/settings.gradle

```gradle
pluginManagement {
  def reactNativeGradlePlugin = new File(
    providers.exec {
      workingDir(rootDir)
      commandLine("node", "--print", "require.resolve('@react-native/gradle-plugin/package.json', { paths: [require.resolve('react-native/package.json')] })")
    }.standardOutput.asText.get().trim()
  ).getParentFile().absolutePath
  includeBuild(reactNativeGradlePlugin)
  
  def expoPluginsPath = new File(
    providers.exec {
      workingDir(rootDir)
      commandLine("node", "--print", "require.resolve('expo-modules-autolinking/package.json', { paths: [require.resolve('expo/package.json')] })")
    }.standardOutput.asText.get().trim(),
    "../android/expo-gradle-plugin"
  ).absolutePath
  includeBuild(expoPluginsPath)
}

plugins {
  id("com.facebook.react.settings")
  id("expo-autolinking-settings")
}

extensions.configure(com.facebook.react.ReactSettingsExtension) { ex ->
  if (System.getenv('EXPO_USE_COMMUNITY_AUTOLINKING') == '1') {
    ex.autolinkLibrariesFromCommand()
  } else {
    ex.autolinkLibrariesFromCommand(expoAutolinking.rnConfigCommand)
  }
}
expoAutolinking.useExpoModules()

rootProject.name = 'Prayantra'

expoAutolinking.useExpoVersionCatalog()

include ':app'
includeBuild(expoAutolinking.reactNativeGradlePlugin)
```

# File: metro.config.js

```javascript
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
```

# File: src/components/ErrorBoundary.tsx

```tsx
// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Text, View, StyleSheet, ScrollView, Modal, TouchableOpacity } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, componentStack: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 ErrorBoundary caught:', error);
    console.error('📌 Component stack:', errorInfo.componentStack);
    this.setState({ componentStack: errorInfo.componentStack || null });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, componentStack: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Modal visible={true} transparent={false} animationType="slide">
          <View style={styles.modalContainer}>
            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
              <Text style={styles.title}>❌ Rendering Error</Text>
              <Text style={styles.errorLabel}>Error:</Text>
              <Text style={styles.error}>{this.state.error?.message}</Text>
              <Text style={styles.stackTitle}>Component Stack:</Text>
              <Text style={styles.stack}>
                {this.state.componentStack || 'No stack available'}
              </Text>
              <TouchableOpacity style={styles.resetButton} onPress={this.handleReset}>
                <Text style={styles.resetText}>Try Again</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: '#fff', paddingTop: 40 },
  scrollContainer: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#ff0000' },
  errorLabel: { fontWeight: 'bold', marginTop: 12, fontSize: 16 },
  error: { color: '#cc0000', marginBottom: 12, fontSize: 16 },
  stackTitle: { fontWeight: 'bold', marginTop: 12, fontSize: 16 },
  stack: { fontSize: 12, color: '#333', fontFamily: 'monospace' },
  resetButton: { backgroundColor: '#7B2FBE', padding: 12, borderRadius: 8, marginTop: 20, alignItems: 'center' },
  resetText: { color: 'white', fontWeight: 'bold' },
});
```

# File: src/components/GradientHeader.tsx

```tsx
import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { StackHeaderRightProps } from '@react-navigation/stack';

interface HeaderProps {
  back?: {
    title?: string;
    href?: string;
  };
  navigation: any;
  route: any;
  options: {
    title?: string;
    headerTitle?: string | ((props: any) => React.ReactNode);
    headerShown?: boolean;
    headerRight?: (props: StackHeaderRightProps) => React.ReactNode;
  };
}

export function GradientHeader({ back, navigation, route, options }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const title =
    options?.title ||
    (typeof options?.headerTitle === 'string' ? options.headerTitle : '') ||
    route?.name ||
    '';

  // Get the right component, then ensure it's a valid element
  const rawRight = options?.headerRight ? options.headerRight({} as StackHeaderRightProps) : null;
  let rightComponent = rawRight;
  if (typeof rightComponent === 'string') {
    // Wrap string in a Text component
    rightComponent = <Text style={{ color: '#FFFFFF' }}>{rightComponent}</Text>;
  } else if (rightComponent && !React.isValidElement(rightComponent)) {
    // If it's something else (like number, boolean), wrap in Text
    rightComponent = <Text style={{ color: '#FFFFFF' }}>{String(rightComponent)}</Text>;
  }

  return (
    <LinearGradient
      colors={['#00B4DB', '#7B2FBE']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.header, { paddingTop: insets.top }]}
    >
      <View style={styles.container}>
        {back && (
          <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>{title}</Text>
        {rightComponent && <View style={styles.rightContainer}>{rightComponent}</View>}
      </View>
    </LinearGradient>
  );
}


const styles = StyleSheet.create({
  header: {
    width: '100%',
  },
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1, // pushes right content to the end
  },
  rightContainer: {
    marginLeft: 'auto',
  },
});
```

# File: src/navigation/index.tsx

```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useUserAuthStore } from '../store/userAuthStore';
import { navigationRef, onNavigationReady } from './navigationService';

// Auth Screens
import PhoneInputScreen from '../screens/auth/PhoneInput';
import OTPVerificationScreen from '../screens/auth/OTPVerification';
import MPINSetupScreen from '../screens/auth/MPINSetup';
import MPINVerificationScreen from '../screens/auth/MPINVerification';
import MPINForgotScreen from '../screens/auth/MPINForgotScreen';
import CompanySelectionScreen from '../screens/auth/CompanySelectionScreen';

// Main (Dashboard)
import UserDashboard from '../screens/main/UserDashboard';

// QR Scanner (Web Login Pairing)
import WebLoginQRScanner from '../screens/auth/WebLoginQRScanner';

// Define param list including QRScanner
export type RootStackParamList = {
  PhoneInput: undefined;
  OTPVerification: { phone: string; userId?: string; hasMpin?: boolean; flowState?: string };
  MPINSetup: { userId: string; phone: string; companyId: string };
  MPINVerification: { phone: string; userId: string; companyId?: string };
  MPINForgot: { phone: string };
  CompanySelection: {
    userId: string;
    phone: string;
    hasMpin: boolean;
    from: 'setup' | 'verify';
  };
  QRScanner: undefined;
  Main: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function Navigation() {
  const {
    isAuthenticated,
    pendingUserId,
    pendingPhone,
    pendingHasMpin,
    savedUserId,
    savedPhone,
    savedHasMpin,
  } = useUserAuthStore();

  let initialRoute: keyof RootStackParamList = 'PhoneInput';

  if (isAuthenticated) {
    initialRoute = 'Main';
  } else if (pendingUserId && pendingPhone) {
    initialRoute = pendingHasMpin ? 'MPINVerification' : 'MPINSetup';
  } else if (savedUserId && savedPhone && savedHasMpin === true) {
    initialRoute = 'MPINVerification';
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={onNavigationReady}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
        <Stack.Screen name="PhoneInput" component={PhoneInputScreen} />
        <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
        <Stack.Screen name="MPINSetup" component={MPINSetupScreen} />
        <Stack.Screen name="MPINVerification" component={MPINVerificationScreen} />
        <Stack.Screen name="MPINForgot" component={MPINForgotScreen} />
        <Stack.Screen name="CompanySelection" component={CompanySelectionScreen} />
        <Stack.Screen name="QRScanner" component={WebLoginQRScanner} options={{ headerShown: false }} />
        <Stack.Screen name="Main" component={UserDashboard} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

# File: src/screens/auth/CompanySelectionScreen.tsx

```tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { getCompanyByEmployeePhone } from '../../services/auth';
import { useUserAuthStore } from '../../store/userAuthStore';
import { RootStackParamList } from '../../navigation';

type CompanySelectionRouteProp = RouteProp<RootStackParamList, 'CompanySelection'>;
type CompanySelectionNavigationProp = StackNavigationProp<RootStackParamList, 'CompanySelection'>;

interface Company {
  company_id: string;
  company_name: string;
}

export default function CompanySelectionScreen() {
  const navigation = useNavigation<CompanySelectionNavigationProp>();
  const route = useRoute<CompanySelectionRouteProp>();
  const { userId, phone, hasMpin, from } = route.params;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const { setCompanyId, setSavedUserId, setPendingMpinLogin } = useUserAuthStore();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const data = await getCompanyByEmployeePhone(phone);
      // data is an array of { company_id, company_name }
      setCompanies(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCompany = (companyId: string) => {
    setCompanyId(companyId);
    // Save pending user info (this will be used later)
    setPendingMpinLogin(userId, phone, hasMpin);
    setSavedUserId(userId, phone, hasMpin);

    // Navigate based on 'from' param
    if (from === 'setup') {
      navigation.navigate('MPINSetup', { userId, phone, companyId });
    } else {
      navigation.navigate('MPINVerification', { phone, userId, companyId });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7B2FBE" />
          <Text style={styles.loadingText}>Loading companies...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (companies.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text variant="headlineSmall" style={styles.title}>No Companies Found</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            You are not associated with any company. Please contact support.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Select Company</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Choose the company you want to access
        </Text>
      </View>

      <FlatList
        data={companies}
        keyExtractor={(item) => item.company_id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleSelectCompany(item.company_id)}
            activeOpacity={0.7}
          >
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.companyName}>
                  {item.company_name}
                </Text>
                <Text variant="bodySmall" style={styles.companyId}>
                  ID: {item.company_id}
                </Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#666' },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 },
  title: { fontWeight: 'bold', color: '#1A1A1A' },
  subtitle: { color: '#666', marginTop: 4 },
  listContent: { paddingHorizontal: 24, paddingBottom: 40 },
  card: { marginBottom: 12, borderRadius: 12, elevation: 2 },
  companyName: { fontWeight: '600', color: '#1A1A1A' },
  companyId: { color: '#888', marginTop: 2 },
});
```

# File: src/screens/auth/MPINForgotScreen.tsx

```tsx
// apps/prayantra-b2b/src/screens/auth/MPINForgotScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { sendForgotMPINOTP, verifyForgotMPINOTP } from '../../services/auth';
import { getDeviceId, getDeviceFingerprint } from '../../utils/device';
import { useUserAuthStore } from '../../store/userAuthStore';

type PaperTextInput = React.ElementRef<typeof TextInput>;

// MPIN strength checker
const isWeakMPIN = (mpin: string): boolean => {
  if (mpin.length !== 6) return true;
  if (/^(\d)\1{5}$/.test(mpin)) return true;
  const digits = mpin.split('').map(Number);
  const asc = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
  const desc = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
  if (asc || desc) return true;
  const common = ['123456', '654321', '111111', '000000', '121212', '112233'];
  if (common.includes(mpin)) return true;
  return false;
};

export default function MPINForgotScreen() {
  const [step, setStep] = useState<'sendOtp' | 'verifyOtp'>('sendOtp');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newMpin, setNewMpin] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const navigation = useNavigation();
  const route = useRoute();

  const { phone: routePhone } = (route.params as { phone: string }) || {};
  const { pendingPhone, savedPhone } = useUserAuthStore();
  const phone = routePhone || pendingPhone || savedPhone || '';

  const insets = useSafeAreaInsets();
  const otpInputRefs = useRef<Array<PaperTextInput | null>>([]);
  const mpinInputRefs = useRef<Array<PaperTextInput | null>>([]);

  const [deviceId, setDeviceId] = useState('');
  const [fingerprint, setFingerprint] = useState('');

  // ✅ FIX: use NodeJS.Timeout instead of number
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadDeviceInfo() {
      const id = await getDeviceId();
      const fp = await getDeviceFingerprint();
      setDeviceId(id);
      setFingerprint(fp);
    }
    loadDeviceInfo();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (cooldownSeconds > 0) {
      timerRef.current = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldownSeconds]);

  const handleSendOTP = async () => {
    if (!phone) {
      Alert.alert('Error', 'Phone number is missing. Please restart the process.');
      return;
    }
    setLoading(true);
    try {
      await sendForgotMPINOTP(phone, deviceId, fingerprint);
      Alert.alert('OTP Sent', 'A verification code has been sent to your phone.');
      setStep('verifyOtp');
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to send OTP.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      Alert.alert('Invalid OTP', 'Please enter all 6 digits.');
      return;
    }
    const mpinCode = newMpin.join('');
    if (mpinCode.length < 6) {
      Alert.alert('Invalid MPIN', 'Please enter all 6 digits for your new MPIN.');
      return;
    }
    if (isWeakMPIN(mpinCode)) {
      Alert.alert(
        'Weak MPIN',
        'Please choose a stronger MPIN (avoid repetitive, sequential, or common patterns).'
      );
      return;
    }

    setLoading(true);
    try {
      await verifyForgotMPINOTP(phone, mpinCode, otpCode, deviceId, fingerprint);
      Alert.alert('Success', 'Your MPIN has been reset successfully.');
      navigation.reset({
        index: 0,
        routes: [{ name: 'MPINVerification', params: { phone, userId: '' } }] as any,
      });
    } catch (error: any) {
      const status = error.response?.status;
      const msg = error.response?.data?.message || error.message || 'Verification failed.';

      if (status === 429) {
        const retryAfter = error.response?.data?.retry_after || 60;
        setCooldownSeconds(retryAfter);
        Alert.alert('Rate Limited', `Please wait ${retryAfter} seconds.`);
      } else if (msg.includes('invalid OTP')) {
        Alert.alert('Invalid OTP', 'The OTP you entered is incorrect. Please try again.');
      } else if (msg.includes('weak')) {
        Alert.alert('Weak MPIN', 'The MPIN you entered is too weak. Please choose a stronger one.');
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text.length === 1 && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (otp[index] !== '') {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
        if (index > 0) otpInputRefs.current[index - 1]?.focus();
      } else {
        if (index > 0) otpInputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleMpinChange = (text: string, index: number) => {
    const newMpinArr = [...newMpin];
    newMpinArr[index] = text;
    setNewMpin(newMpinArr);
    if (text.length === 1 && index < 5) {
      mpinInputRefs.current[index + 1]?.focus();
    }
  };

  const handleMpinKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (newMpin[index] !== '') {
        const newMpinArr = [...newMpin];
        newMpinArr[index] = '';
        setNewMpin(newMpinArr);
        if (index > 0) mpinInputRefs.current[index - 1]?.focus();
      } else {
        if (index > 0) mpinInputRefs.current[index - 1]?.focus();
      }
    }
  };

  const goBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text variant="displaySmall" style={styles.title}>
                Forgot MPIN
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                {step === 'sendOtp'
                  ? `We'll send a verification code to ${phone}`
                  : 'Enter the OTP and your new MPIN'}
              </Text>
            </View>

            {step === 'sendOtp' ? (
              <TouchableOpacity
                onPress={handleSendOTP}
                disabled={loading}
                activeOpacity={0.8}
                style={styles.buttonWrapper}
              >
                <LinearGradient
                  colors={['#00B4DB', '#7B2FBE']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.buttonGradient, loading && styles.buttonDisabled]}
                >
                  {loading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>Send OTP</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.otpContainer}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref: PaperTextInput | null) => {
                        otpInputRefs.current[index] = ref;
                      }}
                      mode="outlined"
                      value={digit}
                      onChangeText={(text) => handleOtpChange(text, index)}
                      onKeyPress={(e) => handleOtpKeyPress(e, index)}
                      keyboardType="numeric"
                      maxLength={1}
                      style={styles.otpInput}
                      outlineStyle={styles.otpOutline}
                      theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                      textAlign="center"
                      editable={!loading}
                    />
                  ))}
                </View>

                <View style={styles.mpinContainer}>
                  {newMpin.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref: PaperTextInput | null) => {
                        mpinInputRefs.current[index] = ref;
                      }}
                      mode="outlined"
                      value={digit}
                      onChangeText={(text) => handleMpinChange(text, index)}
                      onKeyPress={(e) => handleMpinKeyPress(e, index)}
                      keyboardType="numeric"
                      maxLength={1}
                      style={styles.mpinInput}
                      outlineStyle={styles.mpinOutline}
                      theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                      textAlign="center"
                      secureTextEntry
                      editable={!loading}
                    />
                  ))}
                </View>

                <TouchableOpacity
                  onPress={handleVerify}
                  disabled={loading || cooldownSeconds > 0}
                  activeOpacity={0.8}
                  style={styles.buttonWrapper}
                >
                  <LinearGradient
                    colors={['#00B4DB', '#7B2FBE']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.buttonGradient,
                      (loading || cooldownSeconds > 0) && styles.buttonDisabled,
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : cooldownSeconds > 0 ? (
                      <Text style={styles.buttonText}>Wait {cooldownSeconds}s</Text>
                    ) : (
                      <Text style={styles.buttonText}>Reset MPIN</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setStep('sendOtp')} style={styles.backButton}>
                  <Text style={styles.backText}>← Back to send OTP</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity onPress={goBack} style={styles.backButton}>
              <Text style={styles.backText}>← Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Styles are identical to admin – copy as is
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: { alignItems: 'center', marginBottom: 48 },
  title: { fontWeight: 'bold', textAlign: 'center', fontSize: 34, color: '#1A1A1A' },
  subtitle: { textAlign: 'center', marginTop: 8, color: '#666' },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpInput: { width: 48, height: 56, backgroundColor: 'white', fontSize: 20 },
  otpOutline: { borderRadius: 12 },
  mpinContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  mpinInput: { width: 48, height: 56, backgroundColor: 'white', fontSize: 20 },
  mpinOutline: { borderRadius: 12 },
  buttonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  backButton: { marginTop: 16, alignItems: 'center' },
  backText: { color: '#7B2FBE', fontSize: 16, fontWeight: '500' },
});
```

# File: src/screens/auth/MPINSetup.tsx

```tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { setupUserMPIN } from '../../services/auth';
import { getDeviceId, getDeviceFingerprint } from '../../utils/device';
import { useUserAuthStore } from '../../store/userAuthStore';
import { RootStackParamList } from '../../navigation';

type PaperTextInput = React.ElementRef<typeof TextInput>;
type MPINSetupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MPINSetup'>;
type MPINSetupScreenRouteProp = RouteProp<RootStackParamList, 'MPINSetup'>;

const isWeakMPIN = (mpin: string): boolean => {
  if (mpin.length !== 6) return true;
  if (/^(\d)\1{5}$/.test(mpin)) return true;
  const digits = mpin.split('').map(Number);
  const asc = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
  const desc = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
  if (asc || desc) return true;
  const common = ['123456', '654321', '111111', '000000', '121212', '112233'];
  if (common.includes(mpin)) return true;
  return false;
};

export default function MPINSetupScreen() {
  const [mpin, setMpin] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);

  const navigation = useNavigation<MPINSetupScreenNavigationProp>();
  const route = useRoute<MPINSetupScreenRouteProp>();

  // ✅ Include companyId from route params
  const { userId, phone, companyId } = route.params;

  const insets = useSafeAreaInsets();
  const inputRefs = useRef<Array<PaperTextInput | null>>([]);

  const [deviceId, setDeviceId] = useState('');
  const [fingerprint, setFingerprint] = useState('');

  useEffect(() => {
    async function loadDeviceInfo() {
      const id = await getDeviceId();
      const fp = await getDeviceFingerprint();
      setDeviceId(id);
      setFingerprint(fp);
    }
    loadDeviceInfo();
    inputRefs.current[0]?.focus();
  }, []);

  const handleMpinChange = (text: string, index: number) => {
    const newMpin = [...mpin];
    newMpin[index] = text;
    setMpin(newMpin);
    if (text.length === 1 && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (mpin[index] !== '') {
        const newMpin = [...mpin];
        newMpin[index] = '';
        setMpin(newMpin);
        if (index > 0) inputRefs.current[index - 1]?.focus();
      } else {
        if (index > 0) inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleSetupMPIN = async () => {
    const mpinCode = mpin.join('');
    if (mpinCode.length < 6) {
      Alert.alert('Invalid MPIN', 'Please enter all 6 digits.');
      return;
    }

    if (isWeakMPIN(mpinCode)) {
      Alert.alert(
        'Weak MPIN',
        'Your MPIN is too weak. Please choose a different 6‑digit code (avoid sequential, repetitive, or common patterns).'
      );
      return;
    }

    setLoading(true);
    try {
      await setupUserMPIN(phone, mpinCode, deviceId, fingerprint);

      Alert.alert('Success', 'MPIN has been set. Please log in with your MPIN.');
      // ✅ Navigate to MPINVerification with companyId
      navigation.reset({
        index: 0,
        routes: [{ name: 'MPINVerification', params: { phone, userId, companyId } }],
      });
    } catch (error: any) {
      const status = error.response?.status;
      const msg = error.response?.data?.message || error.message || 'Setup failed.';

      if (status === 400) {
        if (msg.toLowerCase().includes('weak')) {
          Alert.alert('Weak MPIN', 'Your MPIN is too weak. Please try a different one.');
        } else if (msg.toLowerCase().includes('user not found')) {
          Alert.alert('Error', 'User not found. Please restart the process.');
        } else {
          Alert.alert('Error', msg);
        }
      } else if (status === 409) {
        Alert.alert('MPIN Exists', 'An MPIN already exists for this account. Please log in.');
        navigation.reset({
          index: 0,
          routes: [{ name: 'MPINVerification', params: { phone, userId, companyId } }],
        });
      } else if (status === 403) {
        Alert.alert('Permission Denied', msg || 'You do not have permission to set MPIN.');
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // (UI unchanged)
  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text variant="displaySmall" style={styles.title}>
                Set MPIN
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                Create a 6‑digit secure MPIN for quick access
              </Text>
            </View>

            <View style={styles.mpinContainer}>
              {mpin.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref: PaperTextInput | null) => {
                    inputRefs.current[index] = ref;
                  }}
                  mode="outlined"
                  value={digit}
                  onChangeText={(text) => handleMpinChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  style={styles.mpinInput}
                  outlineStyle={styles.mpinOutline}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                  textAlign="center"
                  secureTextEntry
                  editable={!loading}
                />
              ))}
            </View>

            <TouchableOpacity
              onPress={handleSetupMPIN}
              disabled={loading}
              activeOpacity={0.8}
              style={styles.buttonWrapper}
            >
              <LinearGradient
                colors={['#00B4DB', '#7B2FBE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.buttonGradient, loading && styles.buttonDisabled]}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Set MPIN</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.hintContainer}>
              <Text style={styles.hintText}>
                Use a unique 6‑digit code. Avoid 123456, 111111, etc.
              </Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 34,
    color: '#1A1A1A',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 8,
    color: '#666',
  },
  mpinContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  mpinInput: {
    width: 48,
    height: 56,
    backgroundColor: 'white',
    fontSize: 20,
  },
  mpinOutline: {
    borderRadius: 12,
  },
  buttonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  hintContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
});
```

# File: src/screens/auth/MPINVerification.tsx

```tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, CommonActions, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { verifyUserMPIN } from '../../services/auth';
import { getDeviceId, getDeviceFingerprint } from '../../utils/device';
import { useUserAuthStore } from '../../store/userAuthStore';
import { RootStackParamList } from '../../navigation';

type PaperTextInput = React.ElementRef<typeof TextInput>;
type MPINVerificationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MPINVerification'>;
type MPINVerificationScreenRouteProp = RouteProp<RootStackParamList, 'MPINVerification'>;

export default function MPINVerificationScreen() {
  const [mpin, setMpin] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const navigation = useNavigation<MPINVerificationScreenNavigationProp>();
  const route = useRoute<MPINVerificationScreenRouteProp>();

  const {
    pendingUserId,
    pendingPhone,
    pendingHasMpin,
    savedUserId,
    savedPhone,
    clearPendingMpinLogin,
    clearSavedUserId,
    login,
    companyId: storeCompanyId,
  } = useUserAuthStore();

  const routeParams = route.params;
  const phone = routeParams?.phone ?? pendingPhone ?? savedPhone ?? '';
  const userId = routeParams?.userId ?? pendingUserId ?? savedUserId ?? '';
  const companyId = routeParams?.companyId ?? storeCompanyId ?? undefined;

  const insets = useSafeAreaInsets();
  const inputRefs = useRef<Array<PaperTextInput | null>>([]);

  const [deviceId, setDeviceId] = useState('');
  const [fingerprint, setFingerprint] = useState('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadDeviceInfo() {
      const id = await getDeviceId();
      const fp = await getDeviceFingerprint();
      setDeviceId(id);
      setFingerprint(fp);
    }
    loadDeviceInfo();
    inputRefs.current[0]?.focus();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (cooldownSeconds > 0) {
      timerRef.current = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldownSeconds]);

  const handleMpinChange = (text: string, index: number) => {
    const newMpin = [...mpin];
    newMpin[index] = text;
    setMpin(newMpin);
    if (text.length === 1 && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (mpin[index] !== '') {
        const newMpin = [...mpin];
        newMpin[index] = '';
        setMpin(newMpin);
        if (index > 0) inputRefs.current[index - 1]?.focus();
      } else {
        if (index > 0) inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerifyMPIN = async () => {
    const mpinCode = mpin.join('');
    if (mpinCode.length < 6) {
      Alert.alert('Invalid MPIN', 'Please enter all 6 digits.');
      return;
    }

    if (cooldownSeconds > 0) {
      Alert.alert('Rate Limited', `Please wait ${cooldownSeconds} seconds.`);
      return;
    }

    if (!phone) {
      Alert.alert('Error', 'Phone number is missing. Please restart the process.');
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 [MPINVerification] Verifying MPIN for phone:', phone);
      const responseData = await verifyUserMPIN(
        phone,
        mpinCode,
        deviceId,
        fingerprint,
        companyId
      );

      // ✅ FIX: tokens are nested inside `responseData.data`
      const { user_id, company_id, company_name, tokens, phone: userPhone } = responseData.data;

      if (tokens?.access_token && user_id) {
        const user = {
          user_id,
          phone: userPhone || phone,
          company_id,
          company_name,
        };

        console.log('🧑‍💼 [MPINVerification] User object built:', user);

        clearPendingMpinLogin();
        login(tokens.access_token, tokens.refresh_token, user, deviceId, company_id);

        setTimeout(() => {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            })
          );
        }, 100);
      } else {
        console.warn('⚠️ [MPINVerification] Missing tokens or user_id in response');
        Alert.alert('Error', 'Login succeeded but tokens are missing. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ [MPINVerification] Verification error:', error);
      const status = error.response?.status;
      const msg = error.response?.data?.message || error.message || 'Verification failed.';

      // Handle specific error cases
      if (status === 429) {
        const retryAfter = error.response?.data?.retry_after || 60;
        setCooldownSeconds(retryAfter);
        Alert.alert('Too Many Attempts', `Please wait ${retryAfter} seconds.`);
      } else if (status === 401) {
        // This is the incorrect MPIN case (now correctly not triggering refresh)
        Alert.alert('Invalid MPIN', 'The MPIN you entered is incorrect. Please try again.');
      } else if (status === 400 && msg.toLowerCase().includes('user not found')) {
        Alert.alert('Error', 'User account not found. Please restart the process.');
        clearPendingMpinLogin();
        clearSavedUserId();
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'PhoneInput' }],
          })
        );
      } else if (msg.toLowerCase().includes('locked')) {
        Alert.alert('Account Locked', 'Your MPIN is locked due to multiple failed attempts. Please use Forgot MPIN.');
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotMPIN = () => {
    if (!phone) {
      Alert.alert('Error', 'Phone number is missing. Please restart the process.');
      return;
    }
    navigation.navigate('MPINForgot', { phone });
  };

  const handleChangePhone = () => {
    clearPendingMpinLogin();
    clearSavedUserId();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'PhoneInput' }],
      })
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text variant="displaySmall" style={styles.title}>
                Enter MPIN
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                Enter your 6‑digit MPIN to continue
              </Text>
            </View>

            <View style={styles.mpinContainer}>
              {mpin.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref: PaperTextInput | null) => {
                    inputRefs.current[index] = ref;
                  }}
                  mode="outlined"
                  value={digit}
                  onChangeText={(text) => handleMpinChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  style={styles.mpinInput}
                  outlineStyle={styles.mpinOutline}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                  textAlign="center"
                  secureTextEntry
                  editable={!loading && cooldownSeconds === 0}
                />
              ))}
            </View>

            <TouchableOpacity
              onPress={handleVerifyMPIN}
              disabled={loading || cooldownSeconds > 0}
              activeOpacity={0.8}
              style={styles.buttonWrapper}
            >
              <LinearGradient
                colors={['#00B4DB', '#7B2FBE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.buttonGradient,
                  (loading || cooldownSeconds > 0) && styles.buttonDisabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : cooldownSeconds > 0 ? (
                  <Text style={styles.buttonText}>Wait {cooldownSeconds}s</Text>
                ) : (
                  <Text style={styles.buttonText}>Verify MPIN</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.linksContainer}>
              <TouchableOpacity onPress={handleForgotMPIN} disabled={loading}>
                <Text style={styles.linkText}>Forgot MPIN?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleChangePhone}
                disabled={loading}
                style={styles.changePhoneButton}
              >
                <Text style={styles.linkText}>Change phone number</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 34,
    color: '#1A1A1A',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 8,
    color: '#666',
  },
  mpinContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  mpinInput: {
    width: 48,
    height: 56,
    backgroundColor: 'white',
    fontSize: 20,
  },
  mpinOutline: {
    borderRadius: 12,
  },
  buttonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  linksContainer: {
    marginTop: 24,
    alignItems: 'center',
    gap: 12,
  },
  linkText: {
    color: '#7B2FBE',
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 6,
  },
  changePhoneButton: {
    marginTop: 4,
  },
});
```

# File: src/screens/auth/OTPVerification.tsx

```tsx
// apps/prayantra-b2b/src/screens/auth/OTPVerification.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
  TouchableWithoutFeedback, Keyboard, Alert, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

// ✅ USER IMPORTS
import { verifyUserOTP, sendUserOTP, getCompanyByEmployeePhone } from '../../services/auth';
import { getDeviceId, getDeviceFingerprint } from '../../utils/device';
import { useUserAuthStore } from '../../store/userAuthStore';
import { RootStackParamList } from '../../navigation';

type PaperTextInput = React.ElementRef<typeof TextInput>;
type OTPVerificationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OTPVerification'>;
type OTPVerificationScreenRouteProp = RouteProp<RootStackParamList, 'OTPVerification'>;

export default function OTPVerificationScreen() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const navigation = useNavigation<OTPVerificationScreenNavigationProp>();
  const route = useRoute<OTPVerificationScreenRouteProp>();
  const { phone, userId: initialUserId, hasMpin: initialHasMpin } = route.params;

  const insets = useSafeAreaInsets();
  const inputRefs = useRef<Array<PaperTextInput | null>>([]);

  const [deviceId, setDeviceId] = useState('');
  const [fingerprint, setFingerprint] = useState('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { setPendingMpinLogin, setSavedUserId, setCompanyId } = useUserAuthStore.getState();

  useEffect(() => {
    async function loadDeviceInfo() {
      const id = await getDeviceId();
      const fp = await getDeviceFingerprint();
      setDeviceId(id);
      setFingerprint(fp);
    }
    loadDeviceInfo();
    inputRefs.current[0]?.focus();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (cooldownSeconds > 0) {
      timerRef.current = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldownSeconds]);

  const handleOTPChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text.length === 1 && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (otp[index] !== '') {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
        if (index > 0) inputRefs.current[index - 1]?.focus();
      } else {
        if (index > 0) inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6‑digit code.');
      return;
    }
    setLoading(true);
    try {
      // ✅ Fix: extract data from the `data` property
      const verifyData = await verifyUserOTP(phone, otpCode, deviceId, fingerprint);
      const { user_id, has_mpin } = verifyData.data;  // ✅ Correct extraction

      if (!user_id) {
        Alert.alert('Verification Failed', 'Invalid OTP or expired.');
        setLoading(false);
        return;
      }

      // Fetch companies for this user
      const companies = await getCompanyByEmployeePhone(phone);

      if (!companies || companies.length === 0) {
        Alert.alert('No Company', 'You are not associated with any company.');
        setLoading(false);
        return;
      }

      // Save pending user info (used later)
      setPendingMpinLogin(user_id, phone, has_mpin);
      setSavedUserId(user_id, phone, has_mpin);

      console.log('🔍 OTP verification success, user_id:', user_id, 'has_mpin:', has_mpin);
      console.log('🏢 Companies fetched:', companies);

      if (companies.length === 1) {
        // Auto-select the only company
        const companyId = companies[0].company_id;
        setCompanyId(companyId);

        // ⏱️ Small delay to let state updates settle, then replace current screen
        setTimeout(() => {
          if (has_mpin === true) {
            navigation.replace('MPINVerification', { phone, userId: user_id, companyId });
          } else {
            navigation.replace('MPINSetup', { userId: user_id, phone, companyId });
          }
        }, 200);
      } else {
        // Multiple companies – show selection screen
        setTimeout(() => {
          navigation.replace('CompanySelection', {
            userId: user_id,
            phone,
            hasMpin: has_mpin,
            from: has_mpin ? 'verify' : 'setup',
          });
        }, 200);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Verification failed.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (cooldownSeconds > 0) return;
    setResendLoading(true);
    try {
      await sendUserOTP(phone, deviceId, fingerprint);
      Alert.alert('Success', 'OTP resent successfully.');
      setCooldownSeconds(30);
    } catch (error: any) {
      const hasRetryAfter = error.retryAfter;
      if (hasRetryAfter) {
        setCooldownSeconds(error.retryAfter);
        Alert.alert('Rate Limited', `Please wait ${error.retryAfter} seconds.`);
      } else {
        const msg = error.response?.data?.message || error.message || 'Failed to resend OTP.';
        Alert.alert('Error', msg);
      }
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Text variant="displaySmall" style={styles.title}>Enter OTP</Text>
              <Text variant="bodyMedium" style={styles.subtitle}>We sent a code to {phone}</Text>
            </View>

            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref: PaperTextInput | null) => { inputRefs.current[index] = ref; }}
                  mode="outlined"
                  value={digit}
                  onChangeText={(text) => handleOTPChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  style={styles.otpInput}
                  outlineStyle={styles.otpOutline}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                  textAlign="center"
                  editable={!loading}
                />
              ))}
            </View>

            <TouchableOpacity onPress={handleVerifyOTP} disabled={loading} activeOpacity={0.8} style={styles.buttonWrapper}>
              <LinearGradient colors={['#00B4DB', '#7B2FBE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.buttonGradient, loading && styles.buttonDisabled]}>
                {loading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.buttonText}>Verify OTP</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text variant="bodyMedium" style={styles.resendText}>Didn't receive the code?</Text>
              <TouchableOpacity
                onPress={handleResendOTP}
                disabled={resendLoading || loading || cooldownSeconds > 0}
                style={styles.resendButton}
              >
                <Text style={[styles.resendButtonLabel, (resendLoading || loading || cooldownSeconds > 0) && styles.resendDisabled]}>
                  {cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : resendLoading ? 'Sending...' : 'Resend'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  header: { marginBottom: 48, alignItems: 'center' },
  title: { fontWeight: 'bold', textAlign: 'center', fontSize: 34, color: '#1A1A1A' },
  subtitle: { textAlign: 'center', marginTop: 8, color: '#666' },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  otpInput: { width: 48, height: 56, backgroundColor: 'white', fontSize: 20 },
  otpOutline: { borderRadius: 12 },
  buttonWrapper: { borderRadius: 12, overflow: 'hidden', marginTop: 8, marginBottom: 16 },
  buttonGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  resendContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  resendText: { color: '#666' },
  resendButton: { marginLeft: 4, paddingVertical: 4 },
  resendButtonLabel: { fontSize: 16, fontWeight: '600', color: '#7B2FBE' },
  resendDisabled: { color: '#ccc' },
});
```

# File: src/screens/auth/PhoneInput.tsx

```tsx
// apps/prayantra-b2b/src/screens/auth/PhoneInput.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CountryPicker, CountryItem } from 'react-native-country-codes-picker';

// ✅ Import user services and store
import { initiateUserLogin, sendUserOTP, getCompanyByEmployeePhone } from '../../services/auth';
import { getDeviceId, getDeviceFingerprint } from '../../utils/device';
import { useUserAuthStore } from '../../store/userAuthStore';

export default function PhoneInputScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState<string>('IN');
  const [callingCode, setCallingCode] = useState('91');
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);

  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<RNTextInput>(null);

  const [deviceId, setDeviceId] = useState<string>('');
  const [fingerprint, setFingerprint] = useState<string>('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ✅ Destructure store actions
  const { 
    clearPendingMpinLogin, 
    savedUserId, 
    savedPhone,
    setCompanyId,
    setPendingMpinLogin,
    setSavedUserId,
  } = useUserAuthStore();

  useEffect(() => {
    async function loadDeviceInfo() {
      const id = await getDeviceId();
      const fp = await getDeviceFingerprint();
      setDeviceId(id);
      setFingerprint(fp);
    }
    loadDeviceInfo();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (retryAfterSeconds > 0) {
      timerRef.current = setInterval(() => {
        setRetryAfterSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [retryAfterSeconds]);

  const handleSendOTP = async () => {
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number (at least 10 digits).');
      return;
    }
    const fullNumber = `+${callingCode}${cleaned}`;
    setLoading(true);
    clearPendingMpinLogin();

    try {
      const initiateResponse = await initiateUserLogin(fullNumber, deviceId, fingerprint);
      const {
        user_exists,
        has_mpin,
        mpin_locked,
        device_trusted,
        flow_state,
        user_id: responseUserId,
        message,
      } = initiateResponse.data;

      if (mpin_locked) {
        Alert.alert(
          'Account Locked',
          'Your MPIN is locked. Please contact support.'
        );
        setLoading(false);
        return;
      }

      // ✅ TRUSTED DEVICE FLOW – fetch companies and handle selection
      if (has_mpin && device_trusted) {
        let userId = responseUserId || null;
        if (!userId && savedPhone === fullNumber && savedUserId) {
          userId = savedUserId;
        }
        if (userId) {
          try {
            // Fetch companies for this user
            const companies = await getCompanyByEmployeePhone(fullNumber);
            if (!companies || companies.length === 0) {
              Alert.alert('No Company', 'You are not associated with any company. Please contact support.');
              setLoading(false);
              return;
            }

            // If only one company, auto-select and go directly to MPIN verification
            if (companies.length === 1) {
              const companyId = companies[0].company_id;
              setCompanyId(companyId);
              // Save pending and saved user info for later
              setPendingMpinLogin(userId, fullNumber, true);
              setSavedUserId(userId, fullNumber, true);
              (navigation as any).navigate('MPINVerification', {
                phone: fullNumber,
                userId,
                companyId,
              });
            } else {
              // Multiple companies – show selection screen
              setPendingMpinLogin(userId, fullNumber, true);
              setSavedUserId(userId, fullNumber, true);
              (navigation as any).navigate('CompanySelection', {
                userId,
                phone: fullNumber,
                hasMpin: true,
                from: 'verify',
              });
            }
            setLoading(false);
            return;
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to load companies');
            setLoading(false);
            return;
          }
        } else {
          console.warn('No userId, falling back to OTP');
        }
      }

      // ✅ OTP FLOW – user exists but no MPIN, device not trusted, or no userId
      if (user_exists || !has_mpin || !device_trusted) {
        await sendUserOTP(fullNumber, deviceId, fingerprint);
        Alert.alert('OTP Sent', `A verification code has been sent to ${fullNumber}`);
        (navigation as any).navigate('OTPVerification', {
          phone: fullNumber,
          userId: responseUserId || undefined,
          hasMpin: has_mpin ?? false,
          flowState: flow_state,
        });
      } else {
        Alert.alert('Unexpected Flow', message || 'Please contact support.');
      }
    } catch (error: any) {
      const hasRetryAfter = !!error.retryAfter;
      if (hasRetryAfter) {
        setRetryAfterSeconds(error.retryAfter);
        Alert.alert(
          'Rate Limited',
          `Please wait ${error.retryAfter} seconds before trying again.`
        );
      } else {
        const msg = error.response?.data?.message || error.message || 'An error occurred.';
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const clearPhone = () => {
    setPhone('');
    inputRef.current?.focus();
  };

  const onSelectCountry = (item: CountryItem) => {
    setCountryCode(item.code);
    setCallingCode(item.dial_code.replace('+', ''));
    setCountryPickerVisible(false);
  };

  const isButtonDisabled = loading || retryAfterSeconds > 0;

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <LinearGradient
                colors={['#00B4DB', '#7B2FBE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.brandGradient}
              >
                <Text style={styles.brandText}>PRAYANTRA</Text>
              </LinearGradient>
              <Text variant="headlineMedium" style={styles.subtitle}>
                User Login
              </Text>
              <Text variant="bodyMedium" style={styles.description}>
                Enter your registered phone number
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.phoneContainer}>
                <TouchableOpacity
                  style={styles.countryPicker}
                  onPress={() => setCountryPickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.callingCode}>+{callingCode}</Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>

                <View style={styles.inputWrapper}>
                  <RNTextInput
                    ref={inputRef}
                    style={styles.phoneInput}
                    placeholder="Phone Number"
                    placeholderTextColor="#999"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    autoFocus
                    editable={!loading}
                    selectionColor="#7B2FBE"
                  />
                </View>

                {phone.length > 0 && (
                  <TouchableOpacity onPress={clearPhone} style={styles.clearButton}>
                    <Text style={styles.clearText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                onPress={handleSendOTP}
                disabled={isButtonDisabled}
                activeOpacity={0.8}
                style={styles.buttonWrapper}
              >
                <LinearGradient
                  colors={['#00B4DB', '#7B2FBE']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.buttonGradient, isButtonDisabled && styles.buttonDisabled]}
                >
                  {loading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : retryAfterSeconds > 0 ? (
                    <Text style={styles.buttonText}>Wait {retryAfterSeconds}s</Text>
                  ) : (
                    <Text style={styles.buttonText}>Send OTP</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text variant="bodySmall" style={styles.footerText}>
                By continuing you agree to our Terms & Privacy Policy
              </Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <CountryPicker
        show={countryPickerVisible}
        pickerButtonOnPress={onSelectCountry}
        onBackdropPress={() => setCountryPickerVisible(false)}
        onRequestClose={() => setCountryPickerVisible(false)}
        lang="en"
        style={{
          modal: {
            flex: 1,
            maxHeight: '80%',
            margin: 0,
            padding: 0,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: 'white',
            paddingBottom: insets.bottom || 10,
          },
          itemsList: {
            flex: 1,
            paddingHorizontal: 10,
          },
          textInput: {
            marginHorizontal: 16,
            marginBottom: 8,
            height: 44,
            backgroundColor: '#f5f5f5',
            borderRadius: 10,
            paddingHorizontal: 12,
          },
          countryButtonStyles: {
            paddingVertical: 12,
          },
          line: {
            marginHorizontal: 16,
          },
        }}
      />
    </SafeAreaView>
  );
}

// Styles unchanged
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  brandGradient: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
  },
  brandText: {
    fontSize: 28,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1A1A1A',
  },
  description: {
    color: '#666',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 4,
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  callingCode: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginRight: 4,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  inputWrapper: {
    flex: 1,
    marginLeft: 4,
  },
  phoneInput: {
    height: 50,
    fontSize: 16,
    color: '#1A1A1A',
    paddingVertical: 8,
    paddingHorizontal: 0,
    backgroundColor: 'white',
  },
  clearButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
  },
  buttonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 48,
    alignItems: 'center',
  },
  footerText: {
    color: '#999',
    textAlign: 'center',
  },
});
```

# File: src/screens/auth/WebLoginQRScanner.tsx

```tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation';
import { pairWebSession } from '../../services/auth';
import { useUserAuthStore } from '../../store/userAuthStore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Base64 from 'base-64'; // 👈 Import base64 encoder

type NavigationProp = StackNavigationProp<RootStackParamList, 'QRScanner'>;

export default function WebLoginQRScanner() {
  const navigation = useNavigation<NavigationProp>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { accessToken } = useUserAuthStore();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    if (!accessToken) {
      Alert.alert(
        'Not Logged In',
        'You need to be logged in to pair a web session.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [accessToken, navigation]);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanning || processing || !accessToken) return;
    setScanning(true);

    // 🔍 LOG: Raw scanned data (should be raw JSON, not base64)
    console.log('📱 [QR] Raw scanned data:', data);
    console.log('📱 [QR] Data type:', typeof data);
    console.log('📱 [QR] Data length:', data.length);

    try {
      // The QR contains raw JSON (decoded from base64 by the web app)
      const qrPayload = JSON.parse(data);
      console.log('📱 [QR] Parsed payload:', JSON.stringify(qrPayload, null, 2));
      console.log('📱 [QR] Available keys:', Object.keys(qrPayload));

      // Extract session ID from "sid"
      const session_id = qrPayload.sid;
      if (!session_id) {
        console.warn('⚠️ Missing "sid" in QR payload');
        Alert.alert('Invalid QR', 'The scanned QR code is missing session ID.');
        setScanning(false);
        return;
      }

      // The backend expects the original base64‑encoded QR data.
      // We re‑encode the raw JSON string to base64.
      const signature = Base64.encode(data);
      console.log('📱 [QR] Re‑encoded base64 signature:', signature.substring(0, 50) + '...');
      console.log('📱 [QR] Signature length:', signature.length);

      setProcessing(true);

      // 🔍 LOG: Calling API
      console.log('📱 [QR] Pairing with session:', session_id);
      await pairWebSession(session_id, signature, accessToken);

      Alert.alert(
        'Success',
        'Web session paired successfully! You can now log in on the web.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('❌ [QR] Error processing QR:', error);
      const msg = error.response?.data?.message || error.message || 'Pairing failed';
      Alert.alert('Pairing Error', msg);
      setScanning(false);
    } finally {
      setProcessing(false);
      setScanning(false);
    }
  };

  // Permission handling
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.permissionText}>
          Camera permission is required to scan QR codes.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan QR for Web Login</Text>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={handleBarcodeScanned}
        >
          {processing && (
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color="#7B2FBE" />
              <Text style={styles.overlayText}>Pairing...</Text>
            </View>
          )}
          <View style={styles.overlayFrame}>
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
          </View>
        </CameraView>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsText}>
          Point your camera at the QR code shown on the web login page.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  overlayFrame: {
    position: 'absolute',
    top: '30%',
    left: '15%',
    width: '70%',
    height: '40%',
    borderWidth: 0,
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#7B2FBE',
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#7B2FBE',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#7B2FBE',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#7B2FBE',
  },
  permissionText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  permissionButton: {
    backgroundColor: '#7B2FBE',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    alignSelf: 'center',
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  instructions: {
    padding: 20,
    backgroundColor: '#fff',
  },
  instructionsText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
});
```

# File: src/screens/main/UserDashboard.tsx

```tsx
// src/screens/main/UserDashboard.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUserAuthStore } from '../../store/userAuthStore';
import { resetToAuthScreen } from '../../navigation/navigationService';
import { RootStackParamList } from '../../navigation';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

export default function UserDashboard() {
  const { user, logout, clearSession } = useUserAuthStore();
  const navigation = useNavigation<NavigationProp>();

  const handleClearSession = () => {
    clearSession();
    resetToAuthScreen(); // goes to MPINVerification if saved credentials exist
  };

  const handleFullLogout = async () => {
    await logout();
    resetToAuthScreen(); // goes to PhoneInput because saved credentials are cleared
  };

  const handleScanQR = () => {
    navigation.navigate('QRScanner');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text variant="headlineMedium">Welcome, {user?.full_name || user?.phone || 'User'}!</Text>
        <Text variant="bodyMedium" style={styles.subtext}>
          Logged in as {user?.role || 'user'}
        </Text>

        <Button
          mode="contained"
          onPress={handleScanQR}
          style={styles.button}
          icon="qrcode-scan"
        >
          Scan QR for Web Login
        </Button>

        <Button mode="contained" onPress={handleClearSession} style={styles.button}>
          Clear Session
        </Button>

        <Button mode="contained" onPress={handleFullLogout} style={styles.button}>
          Full Logout
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  subtext: { marginTop: 8, color: '#666' },
  button: { marginTop: 20, width: '80%' },
});
```

# File: src/splash/AnimatedSplashScreen.tsx

```tsx
import React, { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

interface AnimatedSplashProps {
  onFinish: () => void;
}

export const AnimatedSplash = ({ onFinish }: AnimatedSplashProps) => {
  const { width } = useWindowDimensions();

  const titleSize = Math.min(width * 0.12, 56);
  const taglineSize = Math.max(14, width * 0.038);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const taglineOpacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });

    scale.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });

    taglineOpacity.value = withDelay(
      350,
      withTiming(1, {
        duration: 500,
      })
    );

    const timer = setTimeout(() => {
      onFinish();
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Animated.View style={logoStyle}>
          <MaskedView
            maskElement={
              <Text
                style={[
                  styles.title,
                  {
                    fontSize: titleSize,
                    letterSpacing: titleSize * 0.10,
                  },
                ]}
              >
                PRAYANTRA
              </Text>
            }
          >
            <LinearGradient
              colors={['#00B4DB', '#7B2FBE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            >
              <Text
                style={[
                  styles.title,
                  {
                    opacity: 0,
                    fontSize: titleSize,
                    letterSpacing: titleSize * 0.10,
                  },
                ]}
              >
                PRAYANTRA
              </Text>
            </LinearGradient>
          </MaskedView>
        </Animated.View>

        <Animated.Text
          style={[
            styles.tagline,
            subtitleStyle,
            {
              fontSize: taglineSize,
            },
          ]}
        >
          Integrate. Automate. Accelerate.
        </Animated.Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  center: {
    width: '90%',
    maxWidth: 700,
    alignItems: 'center',
    justifyContent: 'center',
  },

  gradient: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  title: {
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },

  tagline: {
    marginTop: 20,
    color: '#7B7B8D',
    fontWeight: '500',
    letterSpacing: 2,
    textAlign: 'center',
  },
});
```

