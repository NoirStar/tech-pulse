import { describe, it, expect } from 'vitest'
import { runAnalysis } from '@/services/analysisEngine'
import type { NormalizedItem } from '@/services/collectors/types'
import type { Source, Category } from '@/types'

/** 테스트용 NormalizedItem 팩토리 */
function item(overrides: Partial<NormalizedItem> = {}): NormalizedItem {
  return {
    source: 'hackernews' as Source,
    title: 'Test',
    url: 'https://example.com/1',
    score: 10,
    description: '',
    author: '',
    keywords: ['react'],
    category: 'frontend' as Category,
    collectedAt: '2025-06-01T14:00:00Z',
    metadata: {},
    ...overrides,
  }
}

/** 다양한 소스/키워드를 가진 현실적인 데이터셋 */
function createTestDataset(): NormalizedItem[] {
  const now = '2025-06-01T14:00:00Z'
  return [
    // react: 4 소스, 높은 점수 → 확산 중
    item({ keywords: ['react', 'typescript'], source: 'hackernews', score: 200, collectedAt: now }),
    item({ keywords: ['react', 'next.js'], source: 'reddit', score: 150, collectedAt: now }),
    item({ keywords: ['react'], source: 'github', score: 300, collectedAt: now }),
    item({ keywords: ['react', 'vite'], source: 'devto', score: 80, collectedAt: now }),

    // ai: 3 소스 → 확산 경계
    item({ keywords: ['ai', 'llm', 'gpt'], source: 'hackernews', score: 500, category: 'ai-ml', collectedAt: now }),
    item({ keywords: ['ai', 'machine learning'], source: 'reddit', score: 300, category: 'ai-ml', collectedAt: now }),
    item({ keywords: ['ai'], source: 'youtube', score: 250, category: 'ai-ml', collectedAt: now }),

    // docker: 2 소스 → 확산 미만
    item({ keywords: ['docker', 'kubernetes'], source: 'stackoverflow', score: 50, category: 'devops', collectedAt: now }),
    item({ keywords: ['docker'], source: 'hackernews', score: 30, category: 'devops', collectedAt: now }),

    // niche: 1 소스
    item({ keywords: ['elixir'], source: 'hackernews', score: 10, category: 'backend', collectedAt: now }),
  ]
}

describe('analysisEngine — runAnalysis', () => {
  it('현재 아이템에서 전체 분석 결과를 반환한다', () => {
    const items = createTestDataset()
    const result = runAnalysis(items)

    // 메타데이터
    expect(result.meta.totalItems).toBe(10)
    expect(result.meta.uniqueKeywords).toBeGreaterThan(0)
    expect(result.meta.durationMs).toBeGreaterThanOrEqual(0)
    expect(result.meta.analyzedAt).toBeTruthy()

    // 빈도 집계
    expect(result.frequencies.length).toBeGreaterThan(0)
    expect(result.topFrequencies.length).toBeGreaterThan(0)

    // 트렌드 점수
    expect(result.trendScores.length).toBeGreaterThan(0)
    // 내림차순 정렬 확인
    for (let i = 1; i < result.trendScores.length; i++) {
      expect(result.trendScores[i - 1].score).toBeGreaterThanOrEqual(result.trendScores[i].score)
    }

    // KeywordTrend (UI용)
    expect(result.keywordTrends.length).toBeGreaterThan(0)
    expect(result.keywordTrends[0].hourlyMentions.length).toBeGreaterThan(0)

    // HotKeyword
    expect(result.hotKeywords.length).toBeGreaterThan(0)
    expect(result.hotKeywords[0].rank).toBe(1)
  })

  it('교차 소스 확산을 감지한다', () => {
    const items = createTestDataset()
    const result = runAnalysis(items, undefined, { minCrossSources: 3 })

    // react(4소스) & ai(3소스) → crossSourceSpreads에 포함
    expect(result.crossSourceSpreads.length).toBeGreaterThanOrEqual(2)

    const reactSpread = result.crossSourceSpreads.find((s) => s.keyword === 'react')
    expect(reactSpread).toBeDefined()
    expect(reactSpread!.sourceCount).toBe(4)
  })

  it('소스 간 상관 관계를 분석한다', () => {
    const items = createTestDataset()
    const result = runAnalysis(items)

    expect(result.sourceCorrelations.length).toBeGreaterThan(0)
    // hackernews & reddit 모두 react, ai를 공유
    const hnReddit = result.sourceCorrelations.find(
      (c) =>
        (c.sourceA === 'hackernews' && c.sourceB === 'reddit') ||
        (c.sourceA === 'reddit' && c.sourceB === 'hackernews'),
    )
    expect(hnReddit).toBeDefined()
    expect(hnReddit!.sharedKeywords).toBeGreaterThanOrEqual(2)
  })

  it('바이럴 트렌드를 추출한다', () => {
    const items = createTestDataset()
    const result = runAnalysis(items, undefined, { viralLimit: 5 })

    // react(4소스) & ai(3소스)가 바이럴 후보
    expect(result.viralTrends.length).toBeGreaterThan(0)
    expect(result.viralTrends[0].trendScore).toBeGreaterThan(0)
  })

  it('이전 구간과 비교하여 velocity를 계산한다', () => {
    const current = createTestDataset()
    const prev = [
      item({ keywords: ['react'], source: 'hackernews', score: 50, collectedAt: '2025-05-31T14:00:00Z' }),
      item({ keywords: ['ai'], source: 'hackernews', score: 30, category: 'ai-ml', collectedAt: '2025-05-31T14:00:00Z' }),
    ]

    const result = runAnalysis(current, prev)

    // react: 현재 4멘션, 이전 1멘션 → velocity = 300%
    const reactScore = result.trendScores.find((s) => s.keyword === 'react')
    expect(reactScore).toBeDefined()
    expect(reactScore!.velocity).toBeGreaterThan(0)
  })

  it('빈 입력에서 빈 결과를 반환한다', () => {
    const result = runAnalysis([])

    expect(result.frequencies).toEqual([])
    expect(result.trendScores).toEqual([])
    expect(result.hotKeywords).toEqual([])
    expect(result.crossSourceSpreads).toEqual([])
    expect(result.meta.totalItems).toBe(0)
  })

  it('옵션을 통해 limit을 조정할 수 있다', () => {
    const items = createTestDataset()
    const result = runAnalysis(items, undefined, {
      topKeywordsLimit: 3,
      hotKeywordsLimit: 2,
      viralLimit: 1,
    })

    expect(result.topFrequencies.length).toBeLessThanOrEqual(3)
    expect(result.hotKeywords.length).toBeLessThanOrEqual(2)
    expect(result.viralTrends.length).toBeLessThanOrEqual(1)
  })
})
