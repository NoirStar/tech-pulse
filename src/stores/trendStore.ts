import { create } from 'zustand'
import type { TrendItem, KeywordTrend, HotKeyword, FeedItem, Source, Category } from '@/types'

interface TrendState {
  // 데이터
  items: TrendItem[]
  keywords: KeywordTrend[]
  hotKeywords: HotKeyword[]
  feed: FeedItem[]

  // 필터
  selectedSources: Source[]
  selectedCategories: Category[]
  searchQuery: string
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d'

  // 상태
  isLoading: boolean
  lastUpdated: string | null
  error: string | null

  // 액션
  setItems: (items: TrendItem[]) => void
  setKeywords: (keywords: KeywordTrend[]) => void
  setHotKeywords: (keywords: HotKeyword[]) => void
  setFeed: (feed: FeedItem[]) => void
  toggleSource: (source: Source) => void
  toggleCategory: (category: Category) => void
  setSearchQuery: (query: string) => void
  setTimeRange: (range: '1h' | '6h' | '24h' | '7d' | '30d') => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useTrendStore = create<TrendState>((set) => ({
  // 데이터
  items: [],
  keywords: [],
  hotKeywords: [],
  feed: [],

  // 필터
  selectedSources: [],
  selectedCategories: [],
  searchQuery: '',
  timeRange: '24h',

  // 상태
  isLoading: false,
  lastUpdated: null,
  error: null,

  // 액션
  setItems: (items) => set({ items, lastUpdated: new Date().toISOString() }),
  setKeywords: (keywords) => set({ keywords }),
  setHotKeywords: (keywords) => set({ hotKeywords: keywords }),
  setFeed: (feed) => set({ feed }),
  toggleSource: (source) =>
    set((state) => ({
      selectedSources: state.selectedSources.includes(source)
        ? state.selectedSources.filter((s) => s !== source)
        : [...state.selectedSources, source],
    })),
  toggleCategory: (category) =>
    set((state) => ({
      selectedCategories: state.selectedCategories.includes(category)
        ? state.selectedCategories.filter((c) => c !== category)
        : [...state.selectedCategories, category],
    })),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setTimeRange: (range) => set({ timeRange: range }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}))
