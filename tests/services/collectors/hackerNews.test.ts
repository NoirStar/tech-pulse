import { describe, it, expect, vi } from 'vitest'
import { HackerNewsCollector } from '@/services/collectors/hackerNews'
import type { FetchFn } from '@/services/collectors/types'

/** HN Firebase API 목 응답 생성 */
function createMockFetch(stories: Record<string, unknown>[]): FetchFn {
  const storyIds = stories.map((_, i) => i + 1)

  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()

    if (url.includes('topstories.json')) {
      return new Response(JSON.stringify(storyIds), { status: 200 })
    }

    // 개별 스토리 요청
    const idMatch = url.match(/item\/(\d+)\.json/)
    if (idMatch) {
      const idx = parseInt(idMatch[1], 10) - 1
      if (stories[idx]) {
        return new Response(JSON.stringify(stories[idx]), { status: 200 })
      }
    }

    return new Response('Not found', { status: 404 })
  }) as unknown as FetchFn
}

const MOCK_STORIES = [
  {
    id: 1,
    title: 'Show HN: A new React framework for building fast apps',
    url: 'https://example.com/react-framework',
    score: 250,
    by: 'testuser',
    time: 1700000000,
    descendants: 42,
    type: 'story',
  },
  {
    id: 2,
    title: 'DeepSeek R2 Released: Open Source LLM beats GPT-4',
    url: 'https://example.com/deepseek-r2',
    score: 500,
    by: 'aidev',
    time: 1700001000,
    descendants: 120,
    type: 'story',
  },
  {
    id: 3,
    title: 'Ask HN: Best practices for Docker in production?',
    score: 80,
    by: 'devops_guy',
    time: 1700002000,
    descendants: 30,
    type: 'story',
    // url 없음 → HN 내부 링크 사용
  },
]

describe('HackerNewsCollector', () => {
  it('source가 hackernews이다', () => {
    const collector = new HackerNewsCollector(createMockFetch([]))
    expect(collector.source).toBe('hackernews')
    expect(collector.tier).toBe(1)
  })

  it('top stories를 수집한다', async () => {
    const mockFetch = createMockFetch(MOCK_STORIES)
    const collector = new HackerNewsCollector(mockFetch)

    const items = await collector.collect()

    expect(items).toHaveLength(3)
    expect(items[0].title).toBe('Show HN: A new React framework for building fast apps')
    expect(items[0].url).toBe('https://example.com/react-framework')
    expect(items[0].score).toBe(250)
    expect(items[0].author).toBe('testuser')
  })

  it('url이 없는 스토리는 HN 내부 링크를 사용한다', async () => {
    const mockFetch = createMockFetch(MOCK_STORIES)
    const collector = new HackerNewsCollector(mockFetch)

    const items = await collector.collect()
    const askHN = items.find((i) => i.title.includes('Ask HN'))

    expect(askHN?.url).toMatch(/^https:\/\/news\.ycombinator\.com\/item\?id=/)
  })

  it('metadata에 hnId, commentCount이 포함된다', async () => {
    const mockFetch = createMockFetch(MOCK_STORIES)
    const collector = new HackerNewsCollector(mockFetch)

    const items = await collector.collect()

    expect(items[0].metadata).toMatchObject({
      hnId: 1,
      commentCount: 42,
    })
  })

  it('API 호출 실패 시 에러를 던진다', async () => {
    const failFetch = vi.fn(async () => new Response('Fail', { status: 500 })) as unknown as FetchFn
    const collector = new HackerNewsCollector(failFetch)

    await expect(collector.collect()).rejects.toThrow('HN topstories failed: 500')
  })

  it('normalize()가 NormalizedItem 형태로 변환한다', async () => {
    const mockFetch = createMockFetch(MOCK_STORIES)
    const collector = new HackerNewsCollector(mockFetch)

    const raw = await collector.collect()
    const normalized = collector.normalize(raw)

    expect(normalized).toHaveLength(3)
    expect(normalized[0]).toMatchObject({
      source: 'hackernews',
      title: expect.any(String),
      url: expect.any(String),
      score: expect.any(Number),
      keywords: expect.any(Array),
      category: expect.any(String),
      collectedAt: expect.any(String),
    })
  })

  it('normalize()에서 키워드가 추출된다', async () => {
    const mockFetch = createMockFetch(MOCK_STORIES)
    const collector = new HackerNewsCollector(mockFetch)

    const raw = await collector.collect()
    const normalized = collector.normalize(raw)

    // "React framework" → react 키워드
    const reactItem = normalized.find((n) => n.title.includes('React'))
    expect(reactItem?.keywords).toContain('react')

    // "DeepSeek R2 ... LLM ... GPT-4" → AI 키워드
    const aiItem = normalized.find((n) => n.title.includes('DeepSeek'))
    expect(aiItem?.keywords).toContain('llm')
  })

  it('normalize()에서 카테고리가 분류된다', async () => {
    const mockFetch = createMockFetch(MOCK_STORIES)
    const collector = new HackerNewsCollector(mockFetch)

    const raw = await collector.collect()
    const normalized = collector.normalize(raw)

    const reactItem = normalized.find((n) => n.title.includes('React'))
    expect(reactItem?.category).toBe('frontend')

    const dockerItem = normalized.find((n) => n.title.includes('Docker'))
    expect(dockerItem?.category).toBe('devops')
  })
})
