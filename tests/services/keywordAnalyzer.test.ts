import { describe, it, expect } from 'vitest'
import {
  aggregateKeywords,
  topKeywords,
  filterByCategory,
  filterBySource,
  toHourBucket,
} from '@/services/keywordAnalyzer'
import type { NormalizedItem } from '@/services/collectors/types'

/** 테스트용 NormalizedItem 팩토리 */
function item(overrides: Partial<NormalizedItem> = {}): NormalizedItem {
  return {
    source: 'hackernews',
    title: 'Test',
    url: 'https://example.com/1',
    score: 10,
    description: '',
    author: '',
    keywords: ['react'],
    category: 'frontend',
    collectedAt: '2025-06-01T14:30:00Z',
    metadata: {},
    ...overrides,
  }
}

describe('keywordAnalyzer', () => {
  describe('toHourBucket', () => {
    it('ISO 타임스탬프를 시간 버킷으로 변환한다', () => {
      expect(toHourBucket('2025-06-01T14:30:00Z')).toBe('2025-06-01T14')
      expect(toHourBucket('2025-12-31T23:59:59Z')).toBe('2025-12-31T23')
    })
  })

  describe('aggregateKeywords', () => {
    it('키워드별 빈도를 집계한다', () => {
      const items = [
        item({ keywords: ['react', 'typescript'] }),
        item({ keywords: ['react', 'vue'], source: 'reddit' }),
        item({ keywords: ['typescript', 'node'] }),
      ]

      const result = aggregateKeywords(items)
      const reactFreq = result.find((f) => f.keyword === 'react')

      expect(reactFreq).toBeDefined()
      expect(reactFreq!.totalMentions).toBe(2)
      expect(reactFreq!.sourceBreakdown.hackernews).toBe(1)
      expect(reactFreq!.sourceBreakdown.reddit).toBe(1)
    })

    it('시간대별 버킷을 생성한다', () => {
      const items = [
        item({ keywords: ['react'], collectedAt: '2025-06-01T14:00:00Z' }),
        item({ keywords: ['react'], collectedAt: '2025-06-01T14:30:00Z' }),
        item({ keywords: ['react'], collectedAt: '2025-06-01T15:00:00Z' }),
      ]

      const result = aggregateKeywords(items)
      const reactFreq = result.find((f) => f.keyword === 'react')!

      expect(reactFreq.hourlyBuckets.get('2025-06-01T14')).toBe(2)
      expect(reactFreq.hourlyBuckets.get('2025-06-01T15')).toBe(1)
    })

    it('firstSeen/lastSeen을 추적한다', () => {
      const items = [
        item({ keywords: ['ai'], collectedAt: '2025-06-01T10:00:00Z' }),
        item({ keywords: ['ai'], collectedAt: '2025-06-01T14:00:00Z' }),
        item({ keywords: ['ai'], collectedAt: '2025-06-01T08:00:00Z' }),
      ]

      const result = aggregateKeywords(items)
      const aiFreq = result.find((f) => f.keyword === 'ai')!

      expect(aiFreq.firstSeen).toBe('2025-06-01T08:00:00Z')
      expect(aiFreq.lastSeen).toBe('2025-06-01T14:00:00Z')
    })

    it('totalScore를 합산한다', () => {
      const items = [
        item({ keywords: ['docker'], score: 100 }),
        item({ keywords: ['docker'], score: 50, source: 'github' }),
      ]

      const result = aggregateKeywords(items)
      const dockerFreq = result.find((f) => f.keyword === 'docker')!

      expect(dockerFreq.totalScore).toBe(150)
    })

    it('빈 입력에서 빈 배열을 반환한다', () => {
      expect(aggregateKeywords([])).toEqual([])
    })
  })

  describe('topKeywords', () => {
    it('totalMentions 기준 상위 N개를 반환한다', () => {
      const items = [
        item({ keywords: ['react'] }),
        item({ keywords: ['react'] }),
        item({ keywords: ['react'] }),
        item({ keywords: ['vue'] }),
        item({ keywords: ['angular'] }),
        item({ keywords: ['angular'] }),
      ]

      const freq = aggregateKeywords(items)
      const top2 = topKeywords(freq, 2)

      expect(top2).toHaveLength(2)
      expect(top2[0].keyword).toBe('react')
      expect(top2[1].keyword).toBe('angular')
    })
  })

  describe('filterByCategory', () => {
    it('특정 카테고리만 필터링한다', () => {
      const items = [
        item({ keywords: ['react'], category: 'frontend' }),
        item({ keywords: ['docker'], category: 'devops' }),
        item({ keywords: ['vue'], category: 'frontend' }),
      ]

      const freq = aggregateKeywords(items)
      const frontendOnly = filterByCategory(freq, 'frontend')

      expect(frontendOnly.every((f) => f.category === 'frontend')).toBe(true)
    })
  })

  describe('filterBySource', () => {
    it('특정 소스에서 등장한 키워드만 필터링한다', () => {
      const items = [
        item({ keywords: ['react'], source: 'hackernews' }),
        item({ keywords: ['vue'], source: 'reddit' }),
      ]

      const freq = aggregateKeywords(items)
      const hnOnly = filterBySource(freq, 'hackernews')

      expect(hnOnly).toHaveLength(1)
      expect(hnOnly[0].keyword).toBe('react')
    })
  })
})
