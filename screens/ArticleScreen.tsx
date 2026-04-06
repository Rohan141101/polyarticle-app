import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  ScrollView,
  Share,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useSettings } from '../context/SettingsContext'
import { API_URL } from '../lib/api'

type Article = {
  id: string
  title: string
  summary: string
  image?: string
  category: string
  source?: string
  publishedAt?: string
  url?: string
}

type Props = {
  article: Article
  onBack: () => void
}

export default function ArticleScreen({ article, onBack }: Props) {
  const { settings } = useSettings()
  const isDark = settings.darkMode
  const bg = isDark ? '#000' : '#fff'
  const text = isDark ? '#fff' : '#000'
  const sub = isDark ? '#aaa' : '#555'

  const shareUrl = `${API_URL}/article/${article.id}`

  const openOriginal = async () => {
    if (!article.url) return
    try {
      const supported = await Linking.canOpenURL(article.url)
      if (supported) {
        await Linking.openURL(article.url)
      } else {
        Alert.alert('Error', 'Cannot open this link')
      }
    } catch {
      Alert.alert('Error', 'Failed to open article')
    }
  }

  const handleShare = async () => {
    try {
      await Share.share({
        title: article.title,
        message: `${article.title}\n\n${shareUrl}`,
        url: shareUrl, // iOS uses this for rich preview
      })
    } catch {}
  }

  function formatTime(dateString?: string) {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color={text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={24} color={text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Image
          source={{
            uri: article.image ?? 'https://images.unsplash.com/photo-1635647317468-c4dbcdb6195c',
          }}
          style={styles.image}
        />

        <View style={styles.content}>
          <Text style={[styles.category, { color: '#777' }]}>
            {article.category?.toUpperCase()}
          </Text>

          <Text style={[styles.title, { color: text }]}>{article.title}</Text>

          {(article.source || article.publishedAt) && (
            <Text style={[styles.meta, { color: sub }]}>
              {article.source ?? ''}
              {article.source && article.publishedAt ? '  •  ' : ''}
              {formatTime(article.publishedAt)}
            </Text>
          )}

          <Text style={[styles.summary, { color: sub }]}>{article.summary}</Text>

          {article.url && (
            <TouchableOpacity style={styles.readButton} onPress={openOriginal}>
              <Text style={styles.readButtonText}>Read Full Article</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: { padding: 4 },
  shareBtn: { padding: 4 },
  image: { width: '100%', height: 260 },
  content: { padding: 20 },
  category: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
  },
  meta: {
    fontSize: 13,
    marginBottom: 14,
  },
  summary: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 24,
  },
  readButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  readButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
})