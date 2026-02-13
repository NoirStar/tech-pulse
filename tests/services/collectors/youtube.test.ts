import { describe, it, expect, vi } from 'vitest'
import { YouTubeCollector } from '@/services/collectors/youtube'
import type { FetchFn } from '@/services/collectors/types'

const MOCK_YOUTUBE_RESPONSE = {
  items: [
    {
      id: { videoId: 'abc123' },
      snippet: {
        title: 'React 19 New Features Explained',
        description: 'Learn about the latest features in React 19 including server components.',
        channelTitle: 'TechChannel',
        publishedAt: '2026-02-13T00:00:00Z',
        thumbnails: { medium: { url: 'https://img.youtube.com/vi/abc123/mqdefault.jpg' } },
      },
    },
    {
      id: { videoId: 'def456' },
      snippet: {
        title: 'Docker Tutorial for Beginners 2026',
        description: 'Complete Docker tutorial covering containers, images, and docker-compose.',
        channelTitle: 'DevOpsChannel',
        publishedAt: '2026-02-12T12:00:00Z',
        thumbnails: { medium: { url: 'https://img.youtube.com/vi/def456/mqdefault.jpg' } },
      },
    },
  ],
}

function createMockFetch(): FetchFn {
  return vi.fn(async () =>
    new Response(JSON.stringify(MOCK_YOUTUBE_RESPONSE), { status: 200 }),
  ) as unknown as FetchFn
}

describe('YouTubeCollector', () => {
  it('source가 youtube이다', () => {
    const collector = new YouTubeCollector('test-key', createMockFetch())
    expect(collector.source).toBe('youtube')
    expect(collector.tier).toBe(1)
  })

  it('API 키 없이 collect()하면 에러를 던진다', async () => {
    const collector = new YouTubeCollector('', createMockFetch())
    await expect(collector.collect()).rejects.toThrow('YOUTUBE_API_KEY is not configured')
  })

  it('YouTube API에서 비디오를 수집한다', async () => {
    const collector = new YouTubeCollector('test-key', createMockFetch())
    const items = await collector.collect()

    // 4개의 검색 쿼리 × 2개 결과 = 8개, 중복 제거 후
    // 모든 쿼리에 같은 응답이므로 중복 제거 되어 2개
    expect(items.length).toBeLessThanOrEqual(8)
    expect(items.length).toBeGreaterThanOrEqual(2)

    expect(items[0]).toMatchObject({
      title: 'React 19 New Features Explained',
      url: 'https://www.youtube.com/watch?v=abc123',
      author: 'TechChannel',
    })
  })

  it('metadata에 videoId, publishedAt, thumbnail이 포함된다', async () => {
    const collector = new YouTubeCollector('test-key', createMockFetch())
    const items = await collector.collect()

    expect(items[0].metadata).toMatchObject({
      videoId: 'abc123',
      publishedAt: '2026-02-13T00:00:00Z',
      thumbnail: expect.any(String),
    })
  })

  it('normalize()가 키워드와 카테고리를 추출한다', async () => {
    const collector = new YouTubeCollector('test-key', createMockFetch())
    const raw = await collector.collect()
    const normalized = collector.normalize(raw)

    expect(normalized.length).toBeGreaterThanOrEqual(2)
    expect(normalized[0].source).toBe('youtube')

    const reactItem = normalized.find((n) => n.title.includes('React'))
    expect(reactItem?.keywords).toContain('react')

    const dockerItem = normalized.find((n) => n.title.includes('Docker'))
    expect(dockerItem?.keywords).toContain('docker')
  })

  it('중복 URL은 제거된다', async () => {
    const collector = new YouTubeCollector('test-key', createMockFetch())
    const items = await collector.collect()

    const urls = items.map((i) => i.url)
    const uniqueUrls = new Set(urls)
    expect(urls.length).toBe(uniqueUrls.size)
  })
})
