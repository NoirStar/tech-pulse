import { describe, it, expect, vi } from 'vitest'
import { DevtoCollector } from '@/services/collectors/devto'
import type { FetchFn } from '@/services/collectors/types'

const MOCK_ARTICLES = [
  {
    id: 101,
    title: 'Building a REST API with Deno 2.0',
    url: 'https://dev.to/alice/building-rest-api-deno',
    description: 'A comprehensive guide to building REST APIs using Deno 2.0 runtime.',
    positive_reactions_count: 320,
    comments_count: 45,
    published_at: '2025-06-01T12:00:00Z',
    tag_list: ['deno', 'typescript', 'api', 'backend'],
    user: { name: 'Alice Dev', username: 'alice' },
    cover_image: 'https://dev.to/cover.png',
  },
  {
    id: 102,
    title: 'TensorFlow.js for Browser-Based ML',
    url: 'https://dev.to/bob/tensorflow-js-browser-ml',
    description: 'How to run machine learning models directly in the browser.',
    positive_reactions_count: 180,
    comments_count: 22,
    published_at: '2025-06-01T10:00:00Z',
    tag_list: ['javascript', 'machinelearning', 'tensorflow'],
    user: { name: 'Bob ML', username: 'bob' },
  },
]

function createMockFetch(articles: unknown[]): FetchFn {
  return vi.fn(async () =>
    new Response(JSON.stringify(articles), { status: 200 }),
  ) as unknown as FetchFn
}

describe('DevtoCollector', () => {
  it('source가 devto이며 tier 2이다', () => {
    const collector = new DevtoCollector(createMockFetch([]))
    expect(collector.source).toBe('devto')
    expect(collector.tier).toBe(2)
  })

  it('인기 아티클을 수집한다', async () => {
    const collector = new DevtoCollector(createMockFetch(MOCK_ARTICLES))
    const items = await collector.collect()

    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      title: 'Building a REST API with Deno 2.0',
      url: 'https://dev.to/alice/building-rest-api-deno',
      score: 320,
      author: 'Alice Dev',
    })
    expect(items[0].metadata).toMatchObject({
      devtoId: 101,
      tags: ['deno', 'typescript', 'api', 'backend'],
      commentCount: 45,
    })
  })

  it('API 실패 시 에러를 던진다', async () => {
    const failFetch = vi.fn(async () => new Response('Error', { status: 500 })) as unknown as FetchFn
    const collector = new DevtoCollector(failFetch)
    await expect(collector.collect()).rejects.toThrow('Dev.to API failed: 500')
  })

  it('normalize()가 태그를 키워드 추출에 포함한다', async () => {
    const collector = new DevtoCollector(createMockFetch(MOCK_ARTICLES))
    const raw = await collector.collect()
    const normalized = collector.normalize(raw)

    expect(normalized).toHaveLength(2)
    expect(normalized[0].source).toBe('devto')
    expect(normalized[0].keywords).toContain('deno')
    expect(normalized[0].keywords).toContain('typescript')
  })

  it('빈 응답에서 빈 배열을 반환한다', async () => {
    const collector = new DevtoCollector(createMockFetch([]))
    const items = await collector.collect()
    expect(items).toEqual([])
  })
})
