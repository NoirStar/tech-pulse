import { describe, it, expect, vi } from 'vitest'
import { XTwitterCollector } from '@/services/collectors/xTwitter'
import type { FetchFn } from '@/services/collectors/types'

const MOCK_X_RESPONSE = {
  data: [
    {
      id: 'tweet-1',
      text: 'Just released a new open source React framework for building AI applications #webdev #AI #opensource',
      author_id: 'user-1',
      public_metrics: { like_count: 150, retweet_count: 45, reply_count: 12 },
      created_at: '2025-06-01T12:00:00.000Z',
    },
    {
      id: 'tweet-2',
      text: 'Machine learning pipelines with Python just got 10x faster with our new library',
      author_id: 'user-2',
      public_metrics: { like_count: 300, retweet_count: 100, reply_count: 30 },
      created_at: '2025-06-01T11:00:00.000Z',
    },
  ],
  includes: {
    users: [
      { id: 'user-1', username: 'reactdev', name: 'React Developer' },
      { id: 'user-2', username: 'mleng', name: 'ML Engineer' },
    ],
  },
}

function createMockFetch(response: unknown): FetchFn {
  return vi.fn(async () =>
    new Response(JSON.stringify(response), { status: 200 }),
  ) as unknown as FetchFn
}

describe('XTwitterCollector', () => {
  it('source가 x-twitter이며 tier 2이다', () => {
    const collector = new XTwitterCollector('test-token', createMockFetch({}))
    expect(collector.source).toBe('x-twitter')
    expect(collector.tier).toBe(2)
  })

  it('Bearer Token 없으면 에러를 던진다', async () => {
    const collector = new XTwitterCollector('', createMockFetch({}))
    await expect(collector.collect()).rejects.toThrow('X_BEARER_TOKEN is not configured')
  })

  it('기술 트윗을 수집한다', async () => {
    const collector = new XTwitterCollector('test-token', createMockFetch(MOCK_X_RESPONSE))
    const items = await collector.collect()

    expect(items).toHaveLength(2)
    expect(items[0].title).toContain('React framework')
    expect(items[0].url).toBe('https://x.com/reactdev/status/tweet-1')
    expect(items[0].author).toBe('React Developer')
  })

  it('score를 likes + retweets * 2로 계산한다', async () => {
    const collector = new XTwitterCollector('test-token', createMockFetch(MOCK_X_RESPONSE))
    const items = await collector.collect()

    // tweet-1: 150 + 45*2 = 240
    expect(items[0].score).toBe(240)
    // tweet-2: 300 + 100*2 = 500
    expect(items[1].score).toBe(500)
  })

  it('metadata에 tweetId, likes, retweets이 포함된다', async () => {
    const collector = new XTwitterCollector('test-token', createMockFetch(MOCK_X_RESPONSE))
    const items = await collector.collect()

    expect(items[0].metadata).toMatchObject({
      tweetId: 'tweet-1',
      likes: 150,
      retweets: 45,
      replies: 12,
    })
  })

  it('Authorization Bearer 헤더를 전송한다', async () => {
    const mockFetch = createMockFetch(MOCK_X_RESPONSE)
    const collector = new XTwitterCollector('my-bearer', mockFetch)
    await collector.collect()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-bearer',
        }),
      }),
    )
  })

  it('API 실패 시 에러를 던진다', async () => {
    const failFetch = vi.fn(async () => new Response('Error', { status: 429 })) as unknown as FetchFn
    const collector = new XTwitterCollector('token', failFetch)
    await expect(collector.collect()).rejects.toThrow('X API failed: 429')
  })

  it('normalize()가 키워드와 카테고리를 추출한다', async () => {
    const collector = new XTwitterCollector('test-token', createMockFetch(MOCK_X_RESPONSE))
    const raw = await collector.collect()
    const normalized = collector.normalize(raw)

    expect(normalized).toHaveLength(2)
    expect(normalized[0].source).toBe('x-twitter')
    expect(normalized[0].keywords.length).toBeGreaterThan(0)
  })
})
