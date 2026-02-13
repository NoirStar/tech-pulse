import { describe, it, expect, vi } from 'vitest'
import { ProductHuntCollector } from '@/services/collectors/producthunt'
import type { FetchFn } from '@/services/collectors/types'

const MOCK_PH_RESPONSE = {
  data: {
    posts: {
      edges: [
        {
          node: {
            id: 'p-1',
            name: 'AI Code Reviewer',
            tagline: 'Automated code review powered by GPT-5',
            url: 'https://producthunt.com/posts/ai-code-reviewer',
            votesCount: 450,
            website: 'https://aicodereviewer.io',
            topics: { edges: [{ node: { name: 'Artificial Intelligence' } }, { node: { name: 'Developer Tools' } }] },
            makers: [{ name: 'Jane Doe' }],
          },
        },
        {
          node: {
            id: 'p-2',
            name: 'DevOps Dashboard',
            tagline: 'Monitor all your deployments in one place',
            url: 'https://producthunt.com/posts/devops-dashboard',
            votesCount: 200,
            website: '',
            topics: { edges: [{ node: { name: 'DevOps' } }] },
            makers: [],
          },
        },
      ],
    },
  },
}

function createMockFetch(response: unknown): FetchFn {
  return vi.fn(async () =>
    new Response(JSON.stringify(response), { status: 200 }),
  ) as unknown as FetchFn
}

describe('ProductHuntCollector', () => {
  it('source가 producthunt이며 tier 2이다', () => {
    const collector = new ProductHuntCollector('test-token', createMockFetch({}))
    expect(collector.source).toBe('producthunt')
    expect(collector.tier).toBe(2)
  })

  it('PH_TOKEN 없으면 에러를 던진다', async () => {
    const collector = new ProductHuntCollector('', createMockFetch({}))
    await expect(collector.collect()).rejects.toThrow('PH_TOKEN is not configured')
  })

  it('GraphQL API로 인기 포스트를 수집한다', async () => {
    const mockFetch = createMockFetch(MOCK_PH_RESPONSE)
    const collector = new ProductHuntCollector('test-token', mockFetch)
    const items = await collector.collect()

    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      title: 'AI Code Reviewer',
      url: 'https://aicodereviewer.io', // website가 있으면 website 사용
      score: 450,
      author: 'Jane Doe',
      description: 'Automated code review powered by GPT-5',
    })
    expect(items[0].metadata).toMatchObject({
      phId: 'p-1',
      topics: ['Artificial Intelligence', 'Developer Tools'],
    })
  })

  it('website가 없으면 PH URL을 사용한다', async () => {
    const collector = new ProductHuntCollector('test-token', createMockFetch(MOCK_PH_RESPONSE))
    const items = await collector.collect()

    expect(items[1].url).toBe('https://producthunt.com/posts/devops-dashboard')
  })

  it('Authorization Bearer 헤더를 전송한다', async () => {
    const mockFetch = createMockFetch(MOCK_PH_RESPONSE)
    const collector = new ProductHuntCollector('my-secret-token', mockFetch)
    await collector.collect()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-secret-token',
        }),
      }),
    )
  })

  it('API 실패 시 에러를 던진다', async () => {
    const failFetch = vi.fn(async () => new Response('Error', { status: 401 })) as unknown as FetchFn
    const collector = new ProductHuntCollector('test-token', failFetch)
    await expect(collector.collect()).rejects.toThrow('Product Hunt API failed: 401')
  })

  it('normalize()가 키워드와 카테고리를 추출한다', async () => {
    const collector = new ProductHuntCollector('test-token', createMockFetch(MOCK_PH_RESPONSE))
    const raw = await collector.collect()
    const normalized = collector.normalize(raw)

    expect(normalized).toHaveLength(2)
    expect(normalized[0].source).toBe('producthunt')
    expect(normalized[0].keywords.length).toBeGreaterThan(0)
  })
})
