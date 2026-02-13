import { describe, it, expect, vi } from 'vitest'
import { RedditCollector } from '@/services/collectors/reddit'
import type { FetchFn } from '@/services/collectors/types'

/** Reddit JSON API 목 응답 생성 */
function createMockFetch(
  postsBySubreddit: Record<string, Record<string, unknown>[]> = {},
): FetchFn {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    const subMatch = url.match(/\/r\/([^/]+)\/hot\.json/)
    if (subMatch) {
      const sub = subMatch[1]
      const posts = postsBySubreddit[sub] ?? []
      return new Response(
        JSON.stringify({
          data: {
            children: posts.map((p) => ({ data: p })),
          },
        }),
        { status: 200 },
      )
    }
    return new Response('Not found', { status: 404 })
  }) as unknown as FetchFn
}

const MOCK_POSTS: Record<string, Record<string, unknown>[]> = {
  programming: [
    {
      title: 'Rust 2025 roadmap announced',
      url: 'https://blog.rust-lang.org/roadmap-2025',
      score: 1200,
      author: 'rustdev',
      selftext: 'The Rust team has announced their 2025 roadmap with async improvements.',
      num_comments: 340,
      permalink: '/r/programming/comments/abc/rust_2025_roadmap/',
      upvote_ratio: 0.95,
      stickied: false,
    },
    {
      title: 'Stickied: Weekly discussion thread',
      stickied: true,
      score: 10,
      author: 'mod',
      permalink: '/r/programming/comments/sticky/',
    },
  ],
  javascript: [
    {
      title: 'React 20 is here: What developers need to know',
      url: 'https://react.dev/blog/react-20',
      score: 850,
      author: 'jsdev',
      selftext: 'React 20 features a new compiler and faster rendering.',
      num_comments: 210,
      permalink: '/r/javascript/comments/def/react_20/',
      upvote_ratio: 0.88,
      stickied: false,
    },
  ],
}

describe('RedditCollector', () => {
  it('source가 reddit이며 tier 2이다', () => {
    const collector = new RedditCollector(createMockFetch())
    expect(collector.source).toBe('reddit')
    expect(collector.tier).toBe(2)
  })

  it('서브레딧에서 hot 포스트를 수집한다', async () => {
    const mockFetch = createMockFetch(MOCK_POSTS)
    const collector = new RedditCollector(mockFetch)
    const items = await collector.collect()

    // stickied 제외 → 2개
    expect(items.length).toBeGreaterThanOrEqual(2)

    const rust = items.find((i) => i.title.includes('Rust'))
    expect(rust).toBeDefined()
    expect(rust!.url).toBe('https://blog.rust-lang.org/roadmap-2025')
    expect(rust!.score).toBe(1200)
    expect(rust!.metadata).toMatchObject({
      subreddit: 'programming',
      commentCount: 340,
    })
  })

  it('stickied 포스트를 필터링한다', async () => {
    const mockFetch = createMockFetch(MOCK_POSTS)
    const collector = new RedditCollector(mockFetch)
    const items = await collector.collect()

    const stickyPosts = items.filter((i) => i.title.includes('Stickied'))
    expect(stickyPosts).toHaveLength(0)
  })

  it('중복 URL을 제거한다', async () => {
    const duplicated: Record<string, Record<string, unknown>[]> = {
      programming: [
        { title: 'Same post', url: 'https://example.com/dup', score: 10, stickied: false, permalink: '/r/p/1/' },
      ],
      javascript: [
        { title: 'Same post again', url: 'https://example.com/dup', score: 20, stickied: false, permalink: '/r/j/2/' },
      ],
    }
    const collector = new RedditCollector(createMockFetch(duplicated))
    const items = await collector.collect()

    const dupUrls = items.filter((i) => i.url === 'https://example.com/dup')
    expect(dupUrls).toHaveLength(1)
  })

  it('개별 서브레딧 실패 시 무시한다', async () => {
    const failFetch = vi.fn(async () => new Response('Error', { status: 429 })) as unknown as FetchFn
    const collector = new RedditCollector(failFetch)
    const items = await collector.collect()

    expect(items).toEqual([])
  })

  it('normalize()가 키워드와 카테고리를 추출한다', async () => {
    const collector = new RedditCollector(createMockFetch(MOCK_POSTS))
    const raw = await collector.collect()
    const normalized = collector.normalize(raw)

    expect(normalized.length).toBeGreaterThanOrEqual(2)
    expect(normalized[0].source).toBe('reddit')
    expect(normalized[0].keywords.length).toBeGreaterThan(0)
    expect(normalized[0].collectedAt).toBeTruthy()
  })
})
