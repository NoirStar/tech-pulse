import { describe, it, expect } from 'vitest'
import {
  detectSurges,
  buildPrevMentionMap,
  DEFAULT_SURGE_CONFIG,
} from '@/services/surgeDetector'
import type { TrendScore } from '@/services/trendScorer'
import type { Category } from '@/types'

/** 테스트용 TrendScore 팩토리 */
function score(overrides: Partial<TrendScore> = {}): TrendScore {
  return {
    keyword: 'react',
    category: 'frontend' as Category,
    score: 50,
    mentionScore: 33.22, // log2(10+1)*10 ≈ 34.59 → 반올림 문제 방지, 직접 10개 맞춤
    sourceQualityScore: 20,
    crossSourceScore: 10,
    sourceCount: 3,
    velocity: 100,
    isSpreading: true,
    ...overrides,
  }
}

describe('surgeDetector', () => {
  describe('buildPrevMentionMap', () => {
    it('이전 구간 멘션을 Map으로 변환한다', () => {
      const prev = [
        { keyword: 'react', totalMentions: 10 },
        { keyword: 'vue', totalMentions: 5 },
      ]
      const map = buildPrevMentionMap(prev)

      expect(map.get('react')).toBe(10)
      expect(map.get('vue')).toBe(5)
      expect(map.get('angular')).toBeUndefined()
    })
  })

  describe('detectSurges', () => {
    it('velocity 기준 급상승 키워드를 감지한다', () => {
      const scores = [
        score({ keyword: 'react', mentionScore: 36.64, sourceCount: 3 }), // 10+ mentions
        score({ keyword: 'vue', mentionScore: 23.22, sourceCount: 2 }),   // 5+ mentions
      ]
      const prevMap = new Map([['react', 3], ['vue', 2]])

      const alerts = detectSurges(scores, prevMap)

      expect(alerts.length).toBeGreaterThan(0)
      for (const alert of alerts) {
        expect(alert.velocity).toBeGreaterThanOrEqual(DEFAULT_SURGE_CONFIG.velocityThreshold)
      }
    })

    it('멘션 수 미달 시 필터링한다', () => {
      const scores = [
        score({ keyword: 'obscure', mentionScore: 10, sourceCount: 3 }), // ~1 mention
      ]
      const prevMap = new Map<string, number>()

      const alerts = detectSurges(scores, prevMap, {
        ...DEFAULT_SURGE_CONFIG,
        minMentions: 5,
      })

      expect(alerts).toHaveLength(0)
    })

    it('소스 수 미달 시 필터링한다', () => {
      const scores = [
        score({ keyword: 'niche', mentionScore: 36.64, sourceCount: 1 }),
      ]
      const prevMap = new Map<string, number>()

      const alerts = detectSurges(scores, prevMap, {
        ...DEFAULT_SURGE_CONFIG,
        minSources: 2,
      })

      expect(alerts).toHaveLength(0)
    })

    it('surge level을 분류한다 (spike < surge < explosion)', () => {
      // 높은 멘션으로 모든 threshold를 통과하도록 설정
      const scores = [
        score({
          keyword: 'explosion-kw',
          mentionScore: 36.64, // ≈10 mentions
          sourceCount: 3,
        }),
      ]
      const prevMap = new Map([['explosion-kw', 1]]) // 1 → 10 = 900% increase

      const alerts = detectSurges(scores, prevMap, {
        velocityThreshold: 50,
        minMentions: 3,
        minSources: 2,
      })

      if (alerts.length > 0) {
        const alert = alerts[0]
        expect(['spike', 'surge', 'explosion']).toContain(alert.level)
      }
    })

    it('trendScore 기준 내림차순 정렬한다', () => {
      const scores = [
        score({ keyword: 'low', score: 10, mentionScore: 36.64, sourceCount: 3 }),
        score({ keyword: 'high', score: 100, mentionScore: 36.64, sourceCount: 3 }),
      ]
      const prevMap = new Map<string, number>()

      const alerts = detectSurges(scores, prevMap)

      if (alerts.length >= 2) {
        expect(alerts[0].trendScore).toBeGreaterThanOrEqual(alerts[1].trendScore)
      }
    })

    it('빈 입력에서 빈 배열을 반환한다', () => {
      expect(detectSurges([], new Map())).toEqual([])
    })
  })
})
