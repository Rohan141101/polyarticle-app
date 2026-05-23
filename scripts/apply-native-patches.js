const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')

function replaceInFile(relativePath, replacements) {
  const filePath = path.join(repoRoot, relativePath)

  if (!fs.existsSync(filePath)) {
    return
  }

  const original = fs.readFileSync(filePath, 'utf8')
  let next = original

  for (const [from, to] of replacements) {
    if (typeof from === 'string') {
      next = next.split(from).join(to)
      continue
    }

    next = next.replace(from, to)
  }

  if (next !== original) {
    fs.writeFileSync(filePath, next, 'utf8')
  }
}

replaceInFile(
  'node_modules/react-native-google-mobile-ads/android/src/main/java/io/invertase/googlemobileads/ReactNativeGoogleMobileAdsMediaViewManager.kt',
  [[
    ') : ViewGroupManager<ReactNativeGoogleMobileAdsMediaView>(reactContext),',
    ') : ViewGroupManager<ReactNativeGoogleMobileAdsMediaView>(),',
  ]]
)

replaceInFile(
  'node_modules/react-native-google-mobile-ads/android/src/main/java/io/invertase/googlemobileads/ReactNativeGoogleMobileAdsNativeAdViewManager.kt',
  [[
    ') : ViewGroupManager<ReactNativeGoogleMobileAdsNativeAdView>(reactContext),',
    ') : ViewGroupManager<ReactNativeGoogleMobileAdsNativeAdView>(),',
  ]]
)

replaceInFile(
  'node_modules/react-native-google-mobile-ads/android/src/main/java/io/invertase/googlemobileads/ReactNativeGoogleMobileAdsNativeModule.kt',
  [[
    '@ReactModule(ReactNativeGoogleMobileAdsNativeModule.NAME)',
    '@ReactModule(name = ReactNativeGoogleMobileAdsNativeModule.NAME)',
  ]]
)

replaceInFile(
  'node_modules/react-native-google-mobile-ads/android/src/main/java/io/invertase/googlemobileads/ReactNativeGoogleMobileAdsModule.kt',
  [
    [
      "import com.facebook.react.bridge.*\nimport com.google.android.gms.ads.MobileAds",
      "import com.facebook.react.bridge.*\nimport com.facebook.react.bridge.UiThreadUtil\nimport com.google.android.gms.ads.MobileAds",
    ],
    [
      'currentActivity ?: reactApplicationContext,',
      'getReactApplicationContext().currentActivity ?: getReactApplicationContext(),',
    ],
    [
      'reactApplicationContext.reactApplicationContext.currentActivity ?: reactApplicationContext,',
      'getReactApplicationContext().currentActivity ?: getReactApplicationContext(),',
    ],
    [
      'val activity = currentActivity',
      'val activity = getReactApplicationContext().currentActivity',
    ],
    [
      'activity.runOnUiThread {',
      'UiThreadUtil.runOnUiThread {',
    ],
    [
      'val activity = reactApplicationContext.currentActivity',
      'val activity = getReactApplicationContext().currentActivity',
    ],
    [
      'val activity = reactApplicationContext.currentActivity ?: return',
      'val activity = getReactApplicationContext().currentActivity ?: return',
    ],
    [
      `currentActivity?.runOnUiThread {
      MobileAds.openDebugMenu(currentActivity!!, adUnit)
    }`,
      `val activity = getReactApplicationContext().currentActivity ?: return
    UiThreadUtil.runOnUiThread {
      MobileAds.openDebugMenu(activity, adUnit)
    }`,
    ],
  ]
)

replaceInFile(
  'node_modules/react-native-reanimated/Common/cpp/reanimated/CSS/interpolation/transforms/TransformOperationInterpolator.h',
  [[
    /template <ResolvableOp TOperation>/g,
    'template <typename TOperation>\n  requires ResolvableOp<TOperation>',
  ]]
)

replaceInFile(
  'node_modules/react-native-reanimated/Common/cpp/reanimated/CSS/interpolation/transforms/TransformOperationInterpolator.cpp',
  [[
    /template <ResolvableOp TOperation>/g,
    'template <typename TOperation>\n  requires ResolvableOp<TOperation>',
  ]]
)
