import { describe, it, expect, beforeEach } from 'vitest'
import { useTrendStore } from '@/stores/trendStore'
import type { TrendItem, FeedItem, HotKeyword, KeywordTrend } from '@/types'

// 스토어 초기 상태로 리셋하는 헬퍼
const resetStore = () => useTrendStore.setState(useTrendStore.getInitialState())

const mockTrendItem: TrendItem = {
  id: 'test-1',
  source: 'hackernews',
  title: 'Test trend item',
  url: 'https://example.com',
  score: 100,
  keywords: ['react', 'typescript'],
  category: 'frontend',
  collectedAt: new Date().toISOString(),
  metadata: {},
}

const mockFeedItem: FeedItem = {
  id: 'feed-1',
  source: 'github',
  title: 'Trending repo',
  url: 'https://github.com/test/repo',
  score: 500,
  timeAgo: '2시간 전',
  category: 'ai-ml',
}

const mockHotKeyword: HotKeyword = {
  keyword: 'DeepSeek',
  category: 'ai-ml',
  velocity: 340,
  mentions: 120,
  sources: ['hackernews', 'github', 'reddit'],
  rank: 1,
}

describe('trendStore', () => {
  beforeEach(() => {
    resetStore()
  })

  describe('초기 상태', () => {
    it('빈 배열과 기본값으로 초기화되어야 한다', () => {
      const state = useTrendStore.getState()
      expect(state.items).toEqual([])
      expect(state.keywords).toEqual([])
      expect(state.hotKeywords).toEqual([])
      expect(state.feed).toEqual([])
      expect(state.selectedSources).toEqual([])
      expect(state.selectedCategories).toEqual([])
      expect(state.searchQuery).toBe('')
      expect(state.timeRange).toBe('24h')
      expect(state.isLoading).toBe(false)
      expect(state.lastUpdated).toBeNull()
      expect(state.error).toBeNull()
    })
  })

  describe('데이터 액션', () => {
    it('setItems는 아이템을 설정하고 lastUpdated를 갱신한다', () => {
      const { setItems } = useTrendStore.getState()

      setItems([mockTrendItem])

      const state = useTrendStore.getState()
      expect(state.items).toHaveLength(1)
      expect(state.items[0].id).toBe('test-1')
      expect(state.lastUpdated).not.toBeNull()
    })

    it('setFeed는 피드를 설정한다', () => {
      const { setFeed } = useTrendStore.getState()

      setFeed([mockFeedItem])

      expect(useTrendStore.getState().feed).toHaveLength(1)
      expect(useTrendStore.getState().feed[0].source).toBe('github')
    })

    it('setHotKeywords는 급상승 키워드를 설정한다', () => {
      const { setHotKeywords } = useTrendStore.getState()

      setHotKeywords([mockHotKeyword])

      expect(useTrendStore.getState().hotKeywords).toHaveLength(1)
      expect(useTrendStore.getState().hotKeywords[0].keyword).toBe('DeepSeek')
    })
  })

  describe('필터 액션', () => {
    it('toggleSource는 소스를 토글한다 (추가/제거)', () => {
      const { toggleSource } = useTrendStore.getState()

      // 추가
      toggleSource('github')
      expect(useTrendStore.getState().selectedSources).toContain('github')

      // 또 추가
      toggleSource('hackernews')
      expect(useTrendStore.getState().selectedSources).toEqual(['github', 'hackernews'])

      // 제거 (이미 있는 것을 다시 토글)
      toggleSource('github')
      expect(useTrendStore.getState().selectedSources).toEqual(['hackernews'])
    })

    it('toggleCategory는 카테고리를 토글한다', () => {
      const { toggleCategory } = useTrendStore.getState()

      toggleCategory('ai-ml')
      expect(useTrendStore.getState().selectedCategories).toContain('ai-ml')

      toggleCategory('frontend')
      expect(useTrendStore.getState().selectedCategories).toEqual(['ai-ml', 'frontend'])

      toggleCategory('ai-ml')
      expect(useTrendStore.getState().selectedCategories).toEqual(['frontend'])
    })

    it('setSearchQuery는 검색어를 설정한다', () => {
      const { setSearchQuery } = useTrendStore.getState()

      setSearchQuery('react')
      expect(useTrendStore.getState().searchQuery).toBe('react')

      setSearchQuery('')
      expect(useTrendStore.getState().searchQuery).toBe('')
    })

    it('setTimeRange는 시간 범위를 설정한다', () => {
      const { setTimeRange } = useTrendStore.getState()

      expect(useTrendStore.getState().timeRange).toBe('24h') // 기본값

      setTimeRange('1h')
      expect(useTrendStore.getState().timeRange).toBe('1h')

      setTimeRange('7d')
      expect(useTrendStore.getState().timeRange).toBe('7d')
    })
  })

  describe('UI 상태 액션', () => {
    it('setLoading은 로딩 상태를 설정한다', () => {
      const { setLoading } = useTrendStore.getState()

      setLoading(true)
      expect(useTrendStore.getState().isLoading).toBe(true)

      setLoading(false)
      expect(useTrendStore.getState().isLoading).toBe(false)
    })

    it('setError는 에러 메시지를 설정/해제한다', () => {
      const { setError } = useTrendStore.getState()

      setError('API 호출 실패')
      expect(useTrendStore.getState().error).toBe('API 호출 실패')

      setError(null)
      expect(useTrendStore.getState().error).toBeNull()
    })
  })

  describe('불변성', () => {
    it('toggleSource는 원본 배열을 변경하지 않는다', () => {
      const { toggleSource } = useTrendStore.getState()
      const originalSources = useTrendStore.getState().selectedSources

      toggleSource('github')

      const newSources = useTrendStore.getState().selectedSources
      expect(newSources).not.toBe(originalSources) // 새 배열 참조
      expect(originalSources).toEqual([]) // 원본 불변
    })

    it('setItems는 원본 배열을 변경하지 않는다', () => {
      const items = [mockTrendItem]
      const { setItems } = useTrendStore.getState()

      setItems(items)

      // 외부에서 원본 수정해도 스토어에 영향 없음을 확인
      expect(useTrendStore.getState().items).toHaveLength(1)
    })
  })
})
