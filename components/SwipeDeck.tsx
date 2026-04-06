import { View, StyleSheet, Image } from 'react-native'
import { useMemo, useRef, useCallback, useEffect } from 'react'
import SwipeCard from './SwipeCard'

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
  data: Item[]
  currentIndex: number
  onIndexChange: (newIndex: number) => void
  onLike?: (item: Item) => void
  onDislike?: (item: Item) => void
  onSave?: (item: Item) => void
  onOpenDetail?: (item: Item) => void
}

export default function SwipeDeck({
  data,
  currentIndex,
  onIndexChange,
  onLike,
  onDislike,
  onSave,
  onOpenDetail
}: Props) {

  const isTransitioning = useRef(false)

  const safeIndex = Math.min(currentIndex, Math.max(data.length - 1, 0))
  const hasNext = safeIndex < data.length - 1

  const visible = useMemo(() => {
    return {
      front: data[safeIndex] ?? null,
      back1: data[safeIndex + 1] ?? null,
      back2: data[safeIndex + 2] ?? null,
    }
  }, [data, safeIndex])

  const handleNext = useCallback(() => {
    if (isTransitioning.current) return
    if (!hasNext) return

    isTransitioning.current = true
    onIndexChange(safeIndex + 1)

    setTimeout(() => {
      isTransitioning.current = false
    }, 250)

  }, [hasNext, safeIndex, onIndexChange])

  useEffect(() => {
    if (visible.back1?.image && typeof visible.back1.image === 'string') {
      Image.prefetch(visible.back1.image)
    }
  }, [visible.back1])

  if (!data || data.length === 0) return null
  if (!visible.front) return null

  return (
    <View style={styles.container}>

      <View style={styles.shadowSlot} />

      {visible.back2 && (
        <View style={[styles.absoluteCard, styles.backCard2]}>
          <SwipeCard
            key={visible.back2.id}
            item={visible.back2}
            disabled
          />
        </View>
      )}

      {visible.back1 && (
        <View style={[styles.absoluteCard, styles.backCard1]}>
          <SwipeCard
            key={visible.back1.id}
            item={visible.back1}
            disabled
          />
        </View>
      )}

      <View style={[styles.absoluteCard, styles.frontCard]}>
        <SwipeCard
          key={visible.front.id}
          item={visible.front}
          onLike={() => {
            onLike?.(visible.front!)
            handleNext()
          }}
          onDislike={() => {
            onDislike?.(visible.front!)
            handleNext()
          }}
          onSave={() => {
            onSave?.(visible.front!)
            handleNext()
          }}
          onOpenDetail={() => {
            onOpenDetail?.(visible.front!)
          }}
        />
      </View>

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '90%',
    height: '94%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
  },
  shadowSlot: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 28,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  absoluteCard: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  backCard2: {
    zIndex: 0,
  },
  backCard1: {
    zIndex: 1,
  },
  frontCard: {
    zIndex: 2,
  },
})