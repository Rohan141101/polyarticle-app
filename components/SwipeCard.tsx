import {
  ActivityIndicator,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  Share,
  Platform,
} from 'react-native'
import { useRef, useEffect, useState } from 'react'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaAspectRatio,
  NativeMediaView,
  TestIds,
} from 'react-native-google-mobile-ads'
import { useSettings } from '../context/SettingsContext'
import { API_URL } from '../lib/api'

const { width, height } = Dimensions.get('window')

const NATIVE_ID = __DEV__
  ? TestIds.NATIVE
  : (Platform.select({
      ios: process.env.EXPO_PUBLIC_ADMOB_IOS_NATIVE_ID,
      android: process.env.EXPO_PUBLIC_ADMOB_NATIVE_ID,
      default: process.env.EXPO_PUBLIC_ADMOB_NATIVE_ID,
    }) || TestIds.NATIVE)

type SwipeStrength = 'soft' | 'hard'

type Item = {
  id: string
  category?: string
  title: string
  summary: string
  image?: string
  url?: string
  source?: string
  publishedAt?: string
  type?: 'article' | 'ad'
}

type Props = {
  item: Item
  onLike?: (strength: SwipeStrength) => void
  onDislike?: (strength: SwipeStrength) => void
  onSave?: () => void
  onOpenDetail?: () => void
  disabled?: boolean
}

const fallbackImage = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c'

export default function SwipeCard({
  item,
  onLike,
  onDislike,
  onSave,
  onOpenDetail,
  disabled,
}: Props) {
  const { settings } = useSettings()
  const pan = useRef(new Animated.ValueXY()).current
  const threshold = width * 0.35
  const isAd = item.type === 'ad'
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null)
  const [nativeAdFailed, setNativeAdFailed] = useState(false)

  useEffect(() => {
    if (!disabled) {
      pan.setValue({ x: 0, y: 0 })
    }
  }, [item.id, disabled])

  useEffect(() => {
    if (!isAd || disabled) {
      setNativeAd(null)
      return
    }

    let mounted = true
    let loadedAd: NativeAd | null = null

    setNativeAd(null)
    setNativeAdFailed(false)

    NativeAd.createForAdRequest(NATIVE_ID, {
      aspectRatio: NativeMediaAspectRatio.LANDSCAPE,
      startVideoMuted: true,
    })
      .then((ad) => {
        loadedAd = ad
        if (mounted) {
          setNativeAd(ad)
        } else {
          ad.destroy()
        }
      })
      .catch(() => {
        if (mounted) setNativeAdFailed(true)
      })

    return () => {
      mounted = false
      loadedAd?.destroy()
    }
  }, [disabled, isAd, item.id])

  const rotate = pan.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-15deg', '0deg', '15deg'],
  })

  const likeOpacity = pan.x.interpolate({
    inputRange: [0, threshold],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  const dislikeOpacity = pan.x.interpolate({
    inputRange: [-threshold, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  const triggerHaptic = (strength: SwipeStrength) => {
    if (!settings.haptics) return
    Haptics.impactAsync(
      strength === 'hard'
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Light
    )
  }

  const exit = (
    direction: 'right' | 'left' | 'up',
    strength: SwipeStrength = 'hard'
  ) => {
    let toValue

    if (direction === 'right') {
      toValue = { x: width * 1.4, y: 120 }
    } else if (direction === 'left') {
      toValue = { x: -width * 1.4, y: 120 }
    } else {
      toValue = { x: 0, y: -height }
    }

    triggerHaptic(strength)

    Animated.timing(pan, {
      toValue,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      if (direction === 'right') onLike?.(strength)
      if (direction === 'left') onDislike?.(strength)
      if (direction === 'up') onSave?.()
    })
  }

  const handleShare = async () => {
    const shareUrl = `${API_URL}/article/${item.id}`
    try {
      await Share.share({
        title: item.title,
        message: `${item.title}\n\n${shareUrl}`,
        url: shareUrl,
      })
    } catch {}
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gesture) => {
        const { dx, vx } = gesture

        if (dx > threshold || vx > 1.1) {
          exit('right')
        } else if (dx < -threshold || vx < -1.1) {
          exit('left')
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 6,
            tension: 80,
            useNativeDriver: true,
          }).start()
        }
      },
    })
  ).current

  function formatTime(dateString?: string) {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const renderNativeAd = () => {
    if (!nativeAd) {
      return (
        <View style={styles.adPlaceholder}>
          {nativeAdFailed ? (
            <Text style={styles.adPlaceholderText}>Ad unavailable</Text>
          ) : (
            <ActivityIndicator color="#111" />
          )}
        </View>
      )
    }

    return (
      <NativeAdView nativeAd={nativeAd} style={styles.nativeAd}>
        <View style={styles.adBadgeRow}>
          <Text style={styles.adBadge}>Ad</Text>
          {nativeAd.advertiser ? (
            <NativeAsset assetType={NativeAssetType.ADVERTISER}>
              <Text style={styles.adAdvertiser}>{nativeAd.advertiser}</Text>
            </NativeAsset>
          ) : null}
        </View>

        <NativeMediaView resizeMode="cover" style={styles.adMedia} />

        <View style={styles.adTextBlock}>
          <View style={styles.adHeader}>
            {nativeAd.icon ? (
              <NativeAsset assetType={NativeAssetType.ICON}>
                <Image source={{ uri: nativeAd.icon.url }} style={styles.adIcon} />
              </NativeAsset>
            ) : null}

            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Text style={styles.adHeadline} numberOfLines={2}>
                {nativeAd.headline}
              </Text>
            </NativeAsset>
          </View>

          {nativeAd.body ? (
            <NativeAsset assetType={NativeAssetType.BODY}>
              <Text style={styles.adBody} numberOfLines={3}>
                {nativeAd.body}
              </Text>
            </NativeAsset>
          ) : null}

          {nativeAd.callToAction ? (
            <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
              <Text style={styles.adCta}>{nativeAd.callToAction}</Text>
            </NativeAsset>
          ) : null}
        </View>
      </NativeAdView>
    )
  }

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { rotate },
          ],
        },
      ]}
      {...(!disabled ? panResponder.panHandlers : {})}
    >
      <Animated.View style={[styles.overlay, { opacity: likeOpacity, right: 30 }]}>
        <Text style={styles.likeText}>LIKE</Text>
      </Animated.View>

      <Animated.View style={[styles.overlay, { opacity: dislikeOpacity, left: 30 }]}>
        <Text style={styles.dislikeText}>NOPE</Text>
      </Animated.View>

      {isAd && (
        <View style={styles.contentWrap}>
          {disabled ? (
            <View style={styles.adPlaceholder}>
              <Text style={styles.adPlaceholderText}>Sponsored</Text>
            </View>
          ) : (
            renderNativeAd()
          )}
        </View>
      )}

      {!isAd && (
        <>
      <View style={styles.contentWrap}>
        <Image
          source={{ uri: item.image || fallbackImage }}
          style={styles.image}
        />

        {/* Share button — top right corner over image */}
        {!disabled && (
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Ionicons name="share-outline" size={16} color="#fff" />
          </TouchableOpacity>
        )}

        <View style={styles.textBlock}>
          <Text style={styles.category}>
            {item.category?.toUpperCase()}
          </Text>

          <Text style={styles.title}>{item.title}</Text>

          {(item.source || item.publishedAt) && (
            <Text style={styles.meta}>
              {item.source ?? ''} {item.source && item.publishedAt ? '•' : ''}{' '}
              {formatTime(item.publishedAt)}
            </Text>
          )}

          <Text style={styles.summary} numberOfLines={3}>
            {item.summary}
          </Text>
        </View>
      </View>

      <View style={styles.readMoreWrapper}>
        <TouchableOpacity activeOpacity={0.7} onPress={onOpenDetail}>
          <Text style={styles.readMore}>...Read More</Text>
        </TouchableOpacity>
      </View>
        </>
      )}

      <View style={styles.buttonBar} pointerEvents={disabled ? 'none' : 'auto'}>
        <Circle onPress={() => exit('left')}>
          <Ionicons name="close" size={26} color="#000" />
        </Circle>

        {!isAd && (
          <Circle onPress={() => exit('up')}>
            <Ionicons name="bookmark-outline" size={24} color="#000" />
          </Circle>
        )}

        <Circle onPress={() => exit('right')}>
          <Ionicons name="checkmark" size={32} color="#000" />
        </Circle>
      </View>
    </Animated.View>
  )
}

function Circle({
  children,
  onPress,
}: {
  children: React.ReactNode
  onPress?: () => void
}) {
  return (
    <TouchableOpacity style={styles.circle} onPress={onPress}>
      {children}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: '100%',
    height: '92%',
    borderRadius: 28,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  overlay: { position: 'absolute', top: 60, zIndex: 20 },
  likeText: { fontSize: 28, fontWeight: '900', color: '#22c55e' },
  dislikeText: { fontSize: 28, fontWeight: '900', color: '#ef4444' },
  contentWrap: { flex: 1 },
  image: { width: '100%', height: '55%' },
  shareButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  textBlock: { padding: 20 },
  category: { fontSize: 12, fontWeight: '700', color: '#777' },
  meta: { fontSize: 12, color: '#999', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  summary: { fontSize: 15, color: '#555' },
  readMoreWrapper: { alignItems: 'flex-end', paddingHorizontal: 20 },
  readMore: { fontSize: 14, fontWeight: '600', color: '#2563eb' },
  buttonBar: { flexDirection: 'row', justifyContent: 'center', gap: 30, marginBottom: -15 },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeAd: {
    flex: 1,
    backgroundColor: '#fff',
  },
  adPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  adPlaceholderText: {
    color: '#777',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  adBadgeRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adBadge: {
    overflow: 'hidden',
    borderRadius: 6,
    backgroundColor: '#facc15',
    color: '#111',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  adAdvertiser: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  adMedia: {
    width: '100%',
    height: '55%',
    backgroundColor: '#e5e7eb',
  },
  adTextBlock: {
    flex: 1,
    padding: 20,
  },
  adHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  adIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  adHeadline: {
    flex: 1,
    color: '#111',
    fontSize: 20,
    fontWeight: '800',
  },
  adBody: {
    color: '#555',
    fontSize: 15,
    lineHeight: 21,
  },
  adCta: {
    alignSelf: 'flex-start',
    marginTop: 18,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#111',
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
})
