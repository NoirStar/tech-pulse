import { describe, it, expect, vi } from 'vitest'
import { NaverCollector } from '@/services/collectors/naver'
import type { FetchFn } from '@/services/collectors/types'

const MOCK_NAVER_RESPONSE = {
  items: [
    {
      title: '<b>AI</b> 스타트업 투자 트렌드 2025',
      link: 'https://news.naver.com/article/001',
      originallink: 'https://original.com/001',
      description: '<b>인공지능</b> 스타트업에 대한 투자가 급증하고 있다.',
      pubDate: 'Sun, 01 Jun 2025 12:00:00 +0900',
    },
    {
      title: '클라우드 <b>네이티브</b> &amp; Kubernetes 도입 현황',
      link: 'https://news.naver.com/article/002',
      description: '국내 기업들의 <b>클라우드</b> 전환 현황을 분석한다.',
      pubDate: 'Sun, 01 Jun 2025 11:00:00 +0900',
    },
  ],
}

function createMockFetch(responseByQuery: Record<string, unknown>): FetchFn {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    const decodedUrl = decodeURIComponent(url)
    for (const [query, response] of Object.entries(responseByQuery)) {
      if (decodedUrl.includes(query)) {
        return new Response(JSON.stringify(response), { status: 200 })
      }
    }
    return new Response('', { status: 404 })
  }) as unknown as FetchFn
}

describe('NaverCollector', () => {
  it('source가 naver이며 tier 3이다', () => {
    const mockFetch = vi.fn() as unknown as FetchFn
    const collector = new NaverCollector('id', 'secret', mockFetch)
    expect(collector.source).toBe('naver')
    expect(collector.tier).toBe(3)
  })

  it('인증 정보 없으면 에러를 던진다', async () => {
    const mockFetch = vi.fn() as unknown as FetchFn
    const collector = new NaverCollector('', '', mockFetch)
    await expect(collector.collect()).rejects.toThrow('NAVER_CLIENT_ID/SECRET is not configured')
  })

  it('네이버 검색 API로 IT 뉴스를 수집한다', async () => {
    const mockFetch = createMockFetch({ 'IT': MOCK_NAVER_RESPONSE })
    const collector = new NaverCollector('my-id', 'my-secret', mockFetch)
    const items = await collector.collect()

    expect(items.length).toBeGreaterThanOrEqual(2)
  })

  it('HTML 태그를 제거한다', async () => {
    const mockFetch = createMockFetch({ 'IT': MOCK_NAVER_RESPONSE })
    const collector = new NaverCollector('id', 'secret', mockFetch)
    const items = await collector.collect()

    const aiItem = items.find((i) => i.title.includes('AI'))
    expect(aiItem).toBeDefined()
    expect(aiItem!.title).not.toContain('<b>')
    expect(aiItem!.title).toBe('AI 스타트업 투자 트렌드 2025')
  })

  it('HTML 엔티티를 디코딩한다', async () => {
    const mockFetch = createMockFetch({ 'IT': MOCK_NAVER_RESPONSE })
    const collector = new NaverCollector('id', 'secret', mockFetch)
    const items = await collector.collect()

    const k8sItem = items.find((i) => i.title.includes('Kubernetes'))
    expect(k8sItem).toBeDefined()
    expect(k8sItem!.title).toContain('&')
    expect(k8sItem!.title).not.toContain('&amp;')
  })

  it('X-Naver-Client-Id 헤더를 전송한다', async () => {
    const mockFetch = createMockFetch({ 'IT': MOCK_NAVER_RESPONSE })
    const collector = new NaverCollector('test-id', 'test-secret', mockFetch)
    await collector.collect()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Naver-Client-Id': 'test-id',
          'X-Naver-Client-Secret': 'test-secret',
        }),
      }),
    )
  })

  it('중복 URL을 제거한다', async () => {
    const dupResponse = {
      items: [
        { title: 'AI 뉴스', link: 'https://news.naver.com/dup', description: 'desc', pubDate: '' },
      ],
    }
    // All queries contain Korean chars that will be decoded and match the key
    const mockFetch = createMockFetch({
      '트렌드': dupResponse,
      '도구': dupResponse,
      '기술': dupResponse,
      '스타트업': dupResponse,
    })
    const collector = new NaverCollector('id', 'secret', mockFetch)
    const items = await collector.collect()

    const dupUrls = items.filter((i) => i.url === 'https://news.naver.com/dup')
    expect(dupUrls).toHaveLength(1)
  })

  it('normalize()가 키워드와 카테고리를 추출한다', async () => {
    const mockFetch = createMockFetch({ 'IT': MOCK_NAVER_RESPONSE })
    const collector = new NaverCollector('id', 'secret', mockFetch)
    const raw = await collector.collect()
    const normalized = collector.normalize(raw)

    expect(normalized.length).toBeGreaterThan(0)
    expect(normalized[0].source).toBe('naver')
  })
})
