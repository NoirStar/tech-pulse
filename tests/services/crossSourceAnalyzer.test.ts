import { describe, it, expect } from 'vitest'
import {
  detectCrossSourceSpreads,
  analyzeSourceCorrelations,
  getKeywordSourceMap,
  getViralTrends,
} from '@/services/crossSourceAnalyzer'
import type { KeywordFrequency } from '@/services/keywordAnalyzer'
import type { TrendScore } from '@/services/trendScorer'
import type { Category, Source } from '@/types'

/** 테스트용 KeywordFrequency 팩토리 */
function freq(overrides: Partial<KeywordFrequency> = {}): KeywordFrequency {
  return {
    keyword: 'react',
    category: 'frontend' as Category,
    totalMentions: 15,
    totalScore: 100,
    sourceBreakdown: { hackernews: 5, reddit: 5, github: 3, devto: 2 } as Partial<Record<Source, number>>,
    hourlyBuckets: new Map(),
    firstSeen: '2025-06-01T14:00:00Z',
    lastSeen: '2025-06-01T15:30:00Z',
    ...overrides,
  }
}

describe('crossSourceAnalyzer', () => {
  describe('detectCrossSourceSpreads', () => {
    it('3개 이상 소스에서 등장하는 키워드를 감지한다', () => {
      const frequencies = [
        freq({ keyword: 'react', sourceBreakdown: { hackernews: 5, reddit: 3, github: 2, devto: 5 } }),
        freq({ keyword: 'vue', sourceBreakdown: { hackernews: 2, reddit: 1 } }),
        freq({ keyword: 'ai', sourceBreakdown: { hackernews: 10, reddit: 8, github: 6 } }),
      ]

      const spreads = detectCrossSourceSpreads(frequencies, 3)

      expect(spreads).toHaveLength(2) // react(4소스), ai(3소스) — vue(2소스)는 제외
      expect(spreads.every((s) => s.sourceCount >= 3)).toBe(true)
    })

    it('spreadScore = sourceCount × avgMentions', () => {
      const frequencies = [
        freq({
          keyword: 'test',
          totalMentions: 12,
          sourceBreakdown: { hackernews: 4, reddit: 4, github: 4 },
        }),
      ]

      const spreads = detectCrossSourceSpreads(frequencies, 3)
      expect(spreads[0].spreadScore).toBe(12) // 3 * (12/3) = 12
    })

    it('spreadScore 기준 내림차순 정렬한다', () => {
      const frequencies = [
        freq({ keyword: 'low', totalMentions: 3, sourceBreakdown: { hackernews: 1, reddit: 1, github: 1 } }),
        freq({ keyword: 'high', totalMentions: 30, sourceBreakdown: { hackernews: 10, reddit: 10, github: 10 } }),
      ]

      const spreads = detectCrossSourceSpreads(frequencies, 3)
      expect(spreads[0].keyword).toBe('high')
    })

    it('spreadLevel을 분류한다', () => {
      const frequencies = [
        freq({
          keyword: 'viral',
          totalMentions: 30,
          sourceBreakdown: {
            hackernews: 5, reddit: 5, github: 5, devto: 5, medium: 5, stackoverflow: 5,
          },
        }),
        freq({
          keyword: 'emerging',
          totalMentions: 6,
          sourceBreakdown: { hackernews: 2, reddit: 2, github: 2 },
        }),
      ]

      const spreads = detectCrossSourceSpreads(frequencies, 3)
      const viral = spreads.find((s) => s.keyword === 'viral')
      const emerging = spreads.find((s) => s.keyword === 'emerging')

      expect(viral?.spreadLevel).toBe('viral')
      expect(emerging?.spreadLevel).toBe('emerging')
    })

    it('minSources 미만이면 제외한다', () => {
      const frequencies = [
        freq({ keyword: 'niche', sourceBreakdown: { hackernews: 10 } }),
      ]
      expect(detectCrossSourceSpreads(frequencies, 3)).toHaveLength(0)
    })
  })

  describe('analyzeSourceCorrelations', () => {
    it('소스 간 공통 키워드 유사도를 계산한다', () => {
      const frequencies = [
        freq({ keyword: 'react', sourceBreakdown: { hackernews: 5, reddit: 3 } }),
        freq({ keyword: 'vue', sourceBreakdown: { hackernews: 2, reddit: 4 } }),
        freq({ keyword: 'angular', sourceBreakdown: { hackernews: 1 } }), // reddit에 없음
      ]

      const correlations = analyzeSourceCorrelations(frequencies)
      const hnReddit = correlations.find(
        (c) =>
          (c.sourceA === 'hackernews' && c.sourceB === 'reddit') ||
          (c.sourceA === 'reddit' && c.sourceB === 'hackernews'),
      )

      expect(hnReddit).toBeDefined()
      expect(hnReddit!.sharedKeywords).toBe(2) // react, vue
      // Jaccard: 2 / 3 = 0.667
      expect(hnReddit!.similarity).toBeCloseTo(0.667, 2)
    })

    it('유사도 기준 내림차순 정렬한다', () => {
      const frequencies = [
        freq({ keyword: 'react', sourceBreakdown: { hackernews: 5, reddit: 3, github: 2 } }),
        freq({ keyword: 'vue', sourceBreakdown: { hackernews: 2, reddit: 4 } }),
      ]

      const correlations = analyzeSourceCorrelations(frequencies)
      for (let i = 1; i < correlations.length; i++) {
        expect(correlations[i - 1].similarity).toBeGreaterThanOrEqual(correlations[i].similarity)
      }
    })
  })

  describe('getKeywordSourceMap', () => {
    it('키워드의 소스별 분포를 반환한다', () => {
      const frequencies = [
        freq({ keyword: 'react', totalMentions: 10, sourceBreakdown: { hackernews: 6, reddit: 4 } }),
      ]

      const map = getKeywordSourceMap(frequencies, 'react')
      expect(map).toHaveLength(2)
      expect(map![0].source).toBe('hackernews')
      expect(map![0].percentage).toBe(60)
      expect(map![1].percentage).toBe(40)
    })

    it('존재하지 않는 키워드에 null을 반환한다', () => {
      expect(getKeywordSourceMap([], 'nonexistent')).toBeNull()
    })
  })

  describe('getViralTrends', () => {
    it('확산 + 고점수 키워드를 결합한다', () => {
      const frequencies = [
        freq({ keyword: 'react', totalMentions: 30, sourceBreakdown: { hackernews: 10, reddit: 10, github: 10 } }),
        freq({ keyword: 'vue', totalMentions: 9, sourceBreakdown: { hackernews: 3, reddit: 3, github: 3 } }),
      ]
      const spreads = detectCrossSourceSpreads(frequencies, 3)
      const scores: TrendScore[] = [
        { keyword: 'react', category: 'frontend', score: 100, mentionScore: 40, sourceQualityScore: 30, crossSourceScore: 30, sourceCount: 3, velocity: 50, isSpreading: true },
        { keyword: 'vue', category: 'frontend', score: 30, mentionScore: 15, sourceQualityScore: 10, crossSourceScore: 5, sourceCount: 3, velocity: 20, isSpreading: true },
      ]

      const viral = getViralTrends(spreads, scores, 5)

      expect(viral.length).toBeGreaterThan(0)
      expect(viral[0].trendScore).toBeGreaterThan(0)
      // react가 spreadScore × trendScore가 더 높으므로 1위
      expect(viral[0].keyword).toBe('react')
    })

    it('limit을 적용한다', () => {
      const frequencies = [
        freq({ keyword: 'a', sourceBreakdown: { hackernews: 5, reddit: 5, github: 5 } }),
        freq({ keyword: 'b', sourceBreakdown: { hackernews: 3, reddit: 3, github: 3 } }),
        freq({ keyword: 'c', sourceBreakdown: { hackernews: 2, reddit: 2, github: 2 } }),
      ]
      const spreads = detectCrossSourceSpreads(frequencies, 3)
      const scores: TrendScore[] = ['a', 'b', 'c'].map((kw) => ({
        keyword: kw, category: 'frontend' as Category, score: 50, mentionScore: 20,
        sourceQualityScore: 15, crossSourceScore: 15, sourceCount: 3, velocity: 50, isSpreading: true,
      }))

      const viral = getViralTrends(spreads, scores, 2)
      expect(viral).toHaveLength(2)
    })
  })
})
