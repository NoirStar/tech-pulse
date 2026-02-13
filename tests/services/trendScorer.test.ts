import { describe, it, expect } from 'vitest'
import {
  calculateTrendScores,
  rankByScore,
  toKeywordTrend,
  toHotKeywords,
} from '@/services/trendScorer'
import type { KeywordFrequency } from '@/services/keywordAnalyzer'
import type { Category, Source } from '@/types'

/** 테스트용 KeywordFrequency 팩토리 */
function freq(overrides: Partial<KeywordFrequency> = {}): KeywordFrequency {
  return {
    keyword: 'react',
    category: 'frontend' as Category,
    totalMentions: 10,
    totalScore: 100,
    sourceBreakdown: { hackernews: 5, reddit: 3, github: 2 } as Partial<Record<Source, number>>,
    hourlyBuckets: new Map([['2025-06-01T14', 6], ['2025-06-01T15', 4]]),
    firstSeen: '2025-06-01T14:00:00Z',
    lastSeen: '2025-06-01T15:30:00Z',
    ...overrides,
  }
}

describe('trendScorer', () => {
  describe('calculateTrendScores', () => {
    it('멘션 + 소스 가중치 + 교차 보너스로 점수를 계산한다', () => {
      const frequencies = [freq()]
      const scores = calculateTrendScores(frequencies)

      expect(scores).toHaveLength(1)
      const s = scores[0]
      expect(s.keyword).toBe('react')
      expect(s.mentionScore).toBeGreaterThan(0)
      expect(s.sourceQualityScore).toBeGreaterThan(0)
      expect(s.crossSourceScore).toBeGreaterThan(0) // 3 소스 → 보너스 있음
      expect(s.sourceCount).toBe(3)
      expect(s.score).toBe(s.mentionScore + s.sourceQualityScore + s.crossSourceScore)
    })

    it('교차 소스가 많을수록 보너스가 높다', () => {
      const singleSource = freq({
        keyword: 'single',
        sourceBreakdown: { hackernews: 10 },
      })
      const multiSource = freq({
        keyword: 'multi',
        sourceBreakdown: { hackernews: 3, reddit: 3, github: 2, devto: 2 },
      })

      const [single, multi] = calculateTrendScores([singleSource, multiSource])
      expect(multi.crossSourceScore).toBeGreaterThan(single.crossSourceScore)
    })

    it('이전 구간 대비 velocity를 계산한다', () => {
      const current = [freq({ totalMentions: 20 })]
      const prev = [freq({ totalMentions: 10 })]

      const scores = calculateTrendScores(current, prev)
      expect(scores[0].velocity).toBe(100) // (20-10)/10 * 100 = 100%
    })

    it('이전 데이터 없으면 velocity 100% (신규)', () => {
      const current = [freq({ totalMentions: 5 })]
      const scores = calculateTrendScores(current)
      expect(scores[0].velocity).toBe(100)
    })

    it('isSpreading은 3개 이상 소스에서 true', () => {
      const twoSources = freq({
        keyword: 'two',
        sourceBreakdown: { hackernews: 5, reddit: 5 },
      })
      const threeSources = freq({
        keyword: 'three',
        sourceBreakdown: { hackernews: 3, reddit: 3, github: 4 },
      })

      const scores = calculateTrendScores([twoSources, threeSources])
      const two = scores.find((s) => s.keyword === 'two')!
      const three = scores.find((s) => s.keyword === 'three')!

      expect(two.isSpreading).toBe(false)
      expect(three.isSpreading).toBe(true)
    })
  })

  describe('rankByScore', () => {
    it('점수 내림차순으로 정렬한다', () => {
      const frequencies = [
        freq({ keyword: 'low', totalMentions: 1, sourceBreakdown: { hackernews: 1 } }),
        freq({ keyword: 'high', totalMentions: 50, sourceBreakdown: { hackernews: 20, reddit: 15, github: 15 } }),
        freq({ keyword: 'mid', totalMentions: 10, sourceBreakdown: { hackernews: 5, reddit: 5 } }),
      ]

      const ranked = rankByScore(calculateTrendScores(frequencies))
      expect(ranked[0].keyword).toBe('high')
      expect(ranked[ranked.length - 1].keyword).toBe('low')
    })
  })

  describe('toKeywordTrend', () => {
    it('KeywordTrend 형식으로 변환한다', () => {
      const f = freq()
      const score = calculateTrendScores([f])[0]
      const trend = toKeywordTrend(f, score)

      expect(trend.keyword).toBe('react')
      expect(trend.category).toBe('frontend')
      expect(trend.totalMentions).toBe(10)
      expect(trend.hourlyMentions).toHaveLength(2)
      expect(trend.hourlyMentions[0]).toMatchObject({ hour: '2025-06-01T14', count: 6 })
      expect(trend.sources).toHaveLength(3)
      expect(trend.velocity).toBe(score.velocity)
    })

    it('dailyMentions를 시간별에서 집계한다', () => {
      const multiDay = freq({
        hourlyBuckets: new Map([
          ['2025-06-01T14', 5],
          ['2025-06-01T15', 3],
          ['2025-06-02T10', 2],
        ]),
      })
      const score = calculateTrendScores([multiDay])[0]
      const trend = toKeywordTrend(multiDay, score)

      expect(trend.dailyMentions).toHaveLength(2)
      expect(trend.dailyMentions[0]).toMatchObject({ date: '2025-06-01', count: 8 })
      expect(trend.dailyMentions[1]).toMatchObject({ date: '2025-06-02', count: 2 })
    })
  })

  describe('toHotKeywords', () => {
    it('상위 N개 HotKeyword를 생성한다', () => {
      const frequencies = [
        freq({ keyword: 'react', totalMentions: 50 }),
        freq({ keyword: 'vue', totalMentions: 30 }),
        freq({ keyword: 'svelte', totalMentions: 10 }),
      ]

      const scores = calculateTrendScores(frequencies)
      const hot = toHotKeywords(scores, frequencies, 2)

      expect(hot).toHaveLength(2)
      expect(hot[0].rank).toBe(1)
      expect(hot[1].rank).toBe(2)
      expect(hot[0].keyword).toBeDefined()
      expect(hot[0].sources.length).toBeGreaterThan(0)
    })
  })
})
