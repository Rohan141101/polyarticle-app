import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import SwipeDeck from '../components/SwipeDeck'
import { useSettings } from '../context/SettingsContext'
import { useEffect, useState, useRef, useCallback } from 'react'
import { fetchNews, fetchRegionalNews } from '../lib/api'
import { eventLogger } from '../utils/eventLogger'
import { useAuth } from '../context/AuthContext'
import mobileAds, {
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads'

const INTERSTITIAL_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : (Platform.select({
      ios: process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID,
      android: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID,
      default: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID,
    }) || TestIds.INTERSTITIAL)

const BANNER_ID = __DEV__
  ? TestIds.BANNER
  : (Platform.select({
      ios: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID,
      android: process.env.EXPO_PUBLIC_ADMOB_BANNER_ID,
      default: process.env.EXPO_PUBLIC_ADMOB_BANNER_ID,
    }) || TestIds.BANNER)

const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_ID)

const CATEGORIES = [
  'For You',
  'Regional',
  'World',
  'Politics',
  'Business',
  'Stocks',
  'Crypto',
  'Sports',
  'Entertainment',
  'Technology',
  'Health',
  'General',
]

type Article = {
  id: string
  title: string
  summary: string
  image?: string
  url?: string
  source?: string
  publishedAt?: string
  category?: string
  country?: string
  type: 'article'
}

type NativeAdItem = {
  id: string
  title: string
  summary: string
  category: string
  type: 'ad'
}

type FeedItem = Article | NativeAdItem

type Props = {
  onProfilePress: () => void
  onOpenArticle: (article: Article) => void
}

const NATIVE_AD_INTERVAL = 6

function buildFeedItems(items: any[], category: string, pageNumber: number): FeedItem[] {
  const categoryKey = category.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  return items.flatMap((item, index) => {
    const article = { ...item, type: 'article' as const }

    if ((index + 1) % NATIVE_AD_INTERVAL !== 0) {
      return [article]
    }

    return [
      article,
      {
        id: `native-ad-${categoryKey}-${pageNumber}-${index}`,
        title: 'Sponsored',
        summary: '',
        category: 'Sponsored',
        type: 'ad' as const,
      },
    ]
  })
}

export default function Feed({ onProfilePress, onOpenArticle }: Props) {
  const { settings } = useSettings()
  const { loading } = useAuth()

  const [activeCategory, setActiveCategory] = useState('For You')
  const [articles, setArticles] = useState<FeedItem[]>([])
  const [page, setPage] = useState(1)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const swipeCountRef = useRef(0)
  const lastAdTimeRef = useRef(0)
  const interstitialLoaded = useRef(false)
  const dwellStartRef = useRef<number | null>(null)
  const loadingMoreRef = useRef(false)

  const isDark = settings.darkMode
  const bg = isDark ? '#000' : '#f7f7f7'
  const text = isDark ? '#fff' : '#000'
  const avatarBg = isDark ? '#333' : '#eaeaea'
  const pillActiveBg = isDark ? '#fff' : '#000'
  const pillActiveText = isDark ? '#000' : '#fff'
  const pillInactiveBg = isDark ? '#222' : '#eaeaea'
  const pillInactiveText = isDark ? '#aaa' : '#555'

  useEffect(() => {
    mobileAds().initialize()

    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      interstitialLoaded.current = true
    })

    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      interstitialLoaded.current = false
      interstitial.load()
    })

    interstitial.load()

    return () => {
      unsubscribeLoaded()
      unsubscribeClosed()
    }
  }, [])

  const maybeShowInterstitial = () => {
    const now = Date.now()
    if (
      swipeCountRef.current > 10 &&
      swipeCountRef.current % 6 === 0 &&
      now - lastAdTimeRef.current > 90000 &&
      interstitialLoaded.current
    ) {
      interstitial.show()
      lastAdTimeRef.current = now
    }
  }

  const loadInitial = useCallback(async () => {
    try {
      setInitialLoading(true)
      setError(null)
      setPage(1)
      setCurrentIndex(0)

      let response
      if (activeCategory === 'Regional') {
        response = await fetchRegionalNews(20)
      } else {
        response = await fetchNews(activeCategory, 1, 20)
      }

      const fetched = Array.isArray(response) ? response : []
      setArticles(buildFeedItems(fetched, activeCategory, 1))
    } catch (e: any) {
      setError(
        e?.message
          ? String(e.message)
          : typeof e === 'string'
          ? e
          : 'Something went wrong'
      )
    } finally {
      setInitialLoading(false)
    }
  }, [activeCategory])

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true)
      setError(null)
      setCurrentIndex(0)

      let response
      if (activeCategory === 'Regional') {
        response = await fetchRegionalNews(20)
      } else {
        response = await fetchNews(activeCategory, 1, 20, true)
      }

      const fetched = Array.isArray(response) ? response : []
      setArticles(buildFeedItems(fetched, activeCategory, 1))
      setPage(1)
    } catch {
      setError('Failed to refresh. Try again.')
    } finally {
      setRefreshing(false)
    }
  }, [activeCategory])

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || activeCategory === 'Regional') return

    try {
      loadingMoreRef.current = true
      setLoadingMore(true)

      const nextPage = page + 1
      const response = await fetchNews(activeCategory, nextPage, 20)
      const fetched = Array.isArray(response) ? response : []

      if (fetched.length > 0) {
        setArticles((prev) => [
          ...prev,
          ...buildFeedItems(fetched, activeCategory, nextPage),
        ])
        setPage(nextPage)
      }
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [activeCategory, page])

  useEffect(() => {
    if (!loading) loadInitial()
  }, [loading, loadInitial])

  useEffect(() => {
    if (articles.length > 0 && currentIndex >= articles.length - 5) {
      loadMore()
    }
  }, [currentIndex, articles.length, loadMore])

  useEffect(() => {
    if (dwellStartRef.current !== null && articles[currentIndex - 1]) {
      const prev = articles[currentIndex - 1]
      const dwell = Date.now() - dwellStartRef.current
      if (prev.type === 'article') {
        eventLogger.log({ content_id: prev.id, event_type: 'impression', dwell_time_ms: dwell })
      }
    }

    const current = articles[currentIndex]
    if (current) {
      dwellStartRef.current = Date.now()
      if (current.type === 'article') {
        eventLogger.log({ content_id: current.id, event_type: 'impression', position: currentIndex })
      }
    }
  }, [currentIndex])

  const handleSwipe = (type: 'swipe_left' | 'swipe_right', article: FeedItem) => {
    swipeCountRef.current++
    maybeShowInterstitial()

    if (article.type !== 'article') return

    const dwellTime =
      dwellStartRef.current !== null ? Date.now() - dwellStartRef.current : null
    eventLogger.log({ content_id: article.id, event_type: type, dwell_time_ms: dwellTime })
  }

  if (initialLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
        <ActivityIndicator style={{ marginTop: 100 }} color={text} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 70 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.topBar}>
            <Text style={[styles.logo, { color: text }]}>PolyArticle</Text>
            <TouchableOpacity onPress={onProfilePress}>
              <View style={[styles.avatar, { backgroundColor: avatarBg }]} />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillContainer}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[
                  styles.pill,
                  { backgroundColor: cat === activeCategory ? pillActiveBg : pillInactiveBg },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.pillText,
                    { color: cat === activeCategory ? pillActiveText : pillInactiveText },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={{ color: 'red', textAlign: 'center' }}>{error}</Text>
            </View>
          ) : (
            <View style={styles.swipeContainer}>
              {articles.length > 0 && (
                <SwipeDeck
                  key={activeCategory}
                  data={articles}
                  currentIndex={currentIndex}
                  onIndexChange={setCurrentIndex}
                  onLike={(a) => handleSwipe('swipe_right', a as FeedItem)}
                  onDislike={(a) => handleSwipe('swipe_left', a as FeedItem)}
                  onOpenDetail={(a) => {
                    if (a.type === 'article') onOpenArticle(a as Article)
                  }}
                />
              )}
              {loadingMore && <ActivityIndicator style={{ marginTop: 10 }} color={text} />}
            </View>
          )}
        </ScrollView>

        {/* Sticky banner ad at bottom */}
        <View style={[styles.stickyBanner, { backgroundColor: isDark ? '#111' : '#fff' }]}>
          <BannerAd unitId={BANNER_ID} size={BannerAdSize.BANNER} />
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  logo: { fontSize: 22, fontWeight: 'bold' },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  pillContainer: { paddingHorizontal: 10, paddingVertical: 6 },
  pill: {
    minWidth: 90,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillText: { fontSize: 13, fontWeight: '500' },
  swipeContainer: {
    flex: 1,
    minHeight: 600,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  stickyBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 6,
    elevation: 10,
  },
})
