import { describe, it, expect, vi } from 'vitest'
import { StackOverflowCollector } from '@/services/collectors/stackoverflow'
import type { FetchFn } from '@/services/collectors/types'

const MOCK_SO_RESPONSE = {
  items: [
    {
      question_id: 77001,
      title: 'How to use async/await with TypeScript generics?',
      link: 'https://stackoverflow.com/questions/77001/async-await-typescript',
      score: 42,
      answer_count: 5,
      view_count: 12000,
      tags: ['typescript', 'async-await', 'generics'],
      owner: { display_name: 'TSGuru' },
      creation_date: 1700000000,
    },
    {
      question_id: 77002,
      title: 'Docker container &amp; Kubernetes networking explained',
      link: 'https://stackoverflow.com/questions/77002/docker-k8s-networking',
      score: 88,
      answer_count: 12,
      view_count: 35000,
      tags: ['docker', 'kubernetes', 'networking'],
      owner: { display_name: 'K8sPro' },
      creation_date: 1700001000,
    },
  ],
  has_more: false,
}

function createMockFetch(response: unknown): FetchFn {
  return vi.fn(async () =>
    new Response(JSON.stringify(response), { status: 200 }),
  ) as unknown as FetchFn
}

describe('StackOverflowCollector', () => {
  it('source가 stackoverflow이며 tier 2이다', () => {
    const collector = new StackOverflowCollector('', createMockFetch({}))
    expect(collector.source).toBe('stackoverflow')
    expect(collector.tier).toBe(2)
  })

  it('인기 질문을 수집한다', async () => {
    const collector = new StackOverflowCollector('', createMockFetch(MOCK_SO_RESPONSE))
    const items = await collector.collect()

    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      title: 'How to use async/await with TypeScript generics?',
      url: 'https://stackoverflow.com/questions/77001/async-await-typescript',
      score: 42,
      author: 'TSGuru',
    })
    expect(items[0].metadata).toMatchObject({
      questionId: 77001,
      tags: ['typescript', 'async-await', 'generics'],
      answerCount: 5,
      viewCount: 12000,
    })
  })

  it('HTML 엔티티를 디코딩한다', async () => {
    const collector = new StackOverflowCollector('', createMockFetch(MOCK_SO_RESPONSE))
    const items = await collector.collect()

    // &amp; → &
    expect(items[1].title).toBe('Docker container & Kubernetes networking explained')
  })

  it('API 키가 있으면 파라미터에 포함한다', async () => {
    const mockFetch = createMockFetch(MOCK_SO_RESPONSE)
    const collector = new StackOverflowCollector('my-api-key', mockFetch)
    await collector.collect()

    const calledUrl = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(calledUrl).toContain('key=my-api-key')
  })

  it('API 실패 시 에러를 던진다', async () => {
    const failFetch = vi.fn(async () => new Response('Error', { status: 502 })) as unknown as FetchFn
    const collector = new StackOverflowCollector('', failFetch)
    await expect(collector.collect()).rejects.toThrow('Stack Overflow API failed: 502')
  })

  it('normalize()가 태그를 키워드에 포함한다', async () => {
    const collector = new StackOverflowCollector('', createMockFetch(MOCK_SO_RESPONSE))
    const raw = await collector.collect()
    const normalized = collector.normalize(raw)

    expect(normalized).toHaveLength(2)
    expect(normalized[0].source).toBe('stackoverflow')
    expect(normalized[0].keywords).toContain('typescript')
  })
})
