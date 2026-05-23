type GoogleMobileAdsModule = typeof import('react-native-google-mobile-ads')

let adsModule: GoogleMobileAdsModule | null = null

try {
  adsModule = require('react-native-google-mobile-ads') as GoogleMobileAdsModule
} catch {
  adsModule = null
}

export const adsAvailable = adsModule !== null

export const mobileAds = adsModule?.default ?? null
export const BannerAd = adsModule?.BannerAd ?? null
export const BannerAdSize = adsModule?.BannerAdSize ?? null
export const InterstitialAd = adsModule?.InterstitialAd ?? null
export const AdEventType = adsModule?.AdEventType ?? null
export const TestIds = adsModule?.TestIds ?? {}
export const NativeAd = adsModule?.NativeAd ?? null
export const NativeAdView = adsModule?.NativeAdView ?? null
export const NativeAsset = adsModule?.NativeAsset ?? null
export const NativeAssetType = adsModule?.NativeAssetType ?? null
export const NativeMediaAspectRatio = adsModule?.NativeMediaAspectRatio ?? null
export const NativeMediaView = adsModule?.NativeMediaView ?? null
