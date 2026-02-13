import { describe, it, expect, vi } from 'vitest'
import { runPipeline } from '@/services/pipeline'
import type { Collector, RawCollectedItem, NormalizedItem } from '@/services/collectors'

/** 성공하는 목 수집기 */
function createMockCollector(
  source: string,
  items: NormalizedItem[],
): Collector {
  return {
    source: source as any,
    tier: 1,
    collect: vi.fn(async () =>
      items.map((i) => ({
        title: i.title,
        url: i.url,
        score: i.score,
        description: i.description,
      })) as RawCollectedItem[],
    ),
    normalize: vi.fn(() => items),
  }
}

/** 실패하는 목 수집기 */
function createFailingCollector(source: string): Collector {
  return {
    source: source as any,
    tier: 1,
    collect: vi.fn(async () => {
      throw new Error(`${source} failed`)
    }),
    normalize: vi.fn(() => []),
  }
}

const MOCK_ITEMS: NormalizedItem[] = [
  {
    source: 'hackernews',
    title: 'Test Item 1',
    url: 'https://example.com/1',
    score: 100,
    description: 'Test',
    author: 'user1',
    keywords: ['react'],
    category: 'frontend',
    collectedAt: new Date().toISOString(),
    metadata: {},
  },
  {
    source: 'hackernews',
    title: 'Test Item 2',
    url: 'https://example.com/2',
    score: 200,
    description: 'Test 2',
    author: 'user2',
    keywords: ['docker'],
    category: 'devops',
    collectedAt: new Date().toISOString(),
    metadata: {},
  },
]

describe('runPipeline', () => {
  it('단일 수집기의 결과를 반환한다', async () => {
    const collector = createMockCollector('hackernews', MOCK_ITEMS)
    const { items, results } = await runPipeline([collector])

    expect(items).toHaveLength(2)
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      source: 'hackernews',
      status: 'success',
      itemsCount: 2,
    })
  })

  it('여러 수집기를 병렬 실행한다', async () => {
    const collector1 = createMockCollector('hackernews', [MOCK_ITEMS[0]])
    const collector2 = createMockCollector('github', [MOCK_ITEMS[1]])

    const { items, results } = await runPipeline([collector1, collector2])

    expect(items).toHaveLength(2)
    expect(results).toHaveLength(2)
    expect(results.every((r) => r.status === 'success')).toBe(true)
  })

  it('하나의 수집기가 실패해도 나머지는 실행된다', async () => {
    const success = createMockCollector('hackernews', MOCK_ITEMS)
    const failure = createFailingCollector('github')

    const { items, results } = await runPipeline([success, failure])

    expect(items).toHaveLength(2) // 성공한 것만
    expect(results).toHaveLength(2)

    const failResult = results.find((r) => r.source === ('github' as any))
    expect(failResult?.status).toBe('error')
    expect(failResult?.error).toBe('github failed')
  })

  it('URL 기준으로 중복을 제거한다', async () => {
    const dupeItems: NormalizedItem[] = [
      { ...MOCK_ITEMS[0], source: 'hackernews' as any },
      { ...MOCK_ITEMS[0], source: 'github' as any }, // 같은 URL
    ]
    const collector1 = createMockCollector('hackernews', [dupeItems[0]])
    const collector2 = createMockCollector('github', [dupeItems[1]])

    const { items } = await runPipeline([collector1, collector2])

    // URL이 같으므로 1개만 남아야 함
    expect(items).toHaveLength(1)
  })

  it('빈 수집기 배열이면 빈 결과를 반환한다', async () => {
    const { items, results } = await runPipeline([])
    expect(items).toEqual([])
    expect(results).toEqual([])
  })

  it('결과에 durationMs가 포함된다', async () => {
    const collector = createMockCollector('hackernews', MOCK_ITEMS)
    const { results } = await runPipeline([collector])

    expect(results[0].durationMs).toBeGreaterThanOrEqual(0)
  })
})
