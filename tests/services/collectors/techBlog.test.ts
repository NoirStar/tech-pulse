import { describe, it, expect, vi } from 'vitest'
import { TechBlogCollector } from '@/services/collectors/techBlog'
import type { FetchFn } from '@/services/collectors/types'

const MOCK_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>카카오 기술 블로그</title>
  <item>
    <title><![CDATA[Spring Boot 3.0 마이그레이션 후기]]></title>
    <link>https://tech.kakao.com/2025/06/01/spring-boot-3/</link>
    <dc:creator><![CDATA[김개발]]></dc:creator>
    <description><![CDATA[Spring Boot 3.0으로 마이그레이션하면서 겪은 이슈와 해결 방법을 공유합니다.]]></description>
    <category>Spring</category>
    <category>Java</category>
  </item>
  <item>
    <title><![CDATA[대규모 트래픽 처리를 위한 Kafka 활용기]]></title>
    <link>https://tech.kakao.com/2025/05/28/kafka-traffic/</link>
    <dc:creator><![CDATA[박서버]]></dc:creator>
    <description><![CDATA[Kafka를 활용한 대규모 이벤트 처리 아키텍처를 소개합니다.]]></description>
    <category>Kafka</category>
    <category>Backend</category>
  </item>
</channel>
</rss>`

const MOCK_ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Naver D2</title>
  <entry>
    <title>React Server Components 깊이 이해하기</title>
    <link href="https://d2.naver.com/helloworld/123" />
    <summary>RSC의 동작 원리와 실전 적용 사례를 알아봅니다.</summary>
    <author><name>이프론트</name></author>
    <category term="React" />
  </entry>
</feed>`

function createMockFetch(rssByUrl: Record<string, string>): FetchFn {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    for (const [pattern, xml] of Object.entries(rssByUrl)) {
      if (url.includes(pattern)) {
        return new Response(xml, { status: 200 })
      }
    }
    return new Response('', { status: 404 })
  }) as unknown as FetchFn
}

describe('TechBlogCollector', () => {
  const testBlogs = [
    { id: 'kakao', name: '카카오 기술 블로그', rssUrl: 'https://tech.kakao.com/feed/' },
    { id: 'naver-d2', name: 'Naver D2', rssUrl: 'https://d2.naver.com/d2.atom' },
  ]

  it('source가 지정된 ID이며 tier 3이다', () => {
    const collector = new TechBlogCollector('kakao-tech', testBlogs, createMockFetch({}))
    expect(collector.source).toBe('kakao-tech')
    expect(collector.tier).toBe(3)
  })

  it('RSS에서 아티클을 파싱한다', () => {
    const collector = new TechBlogCollector('kakao-tech', testBlogs, createMockFetch({}))
    const items = collector.parseRSS(MOCK_RSS, testBlogs[0])

    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      title: 'Spring Boot 3.0 마이그레이션 후기',
      url: 'https://tech.kakao.com/2025/06/01/spring-boot-3/',
      author: '김개발',
    })
    expect(items[0].metadata).toMatchObject({
      blogId: 'kakao',
      blogName: '카카오 기술 블로그',
      categories: expect.arrayContaining(['Spring', 'Java']),
    })
  })

  it('Atom 피드도 파싱한다', () => {
    const collector = new TechBlogCollector('kakao-tech', testBlogs, createMockFetch({}))
    const items = collector.parseRSS(MOCK_ATOM, testBlogs[1])

    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('React Server Components 깊이 이해하기')
  })

  it('여러 블로그에서 수집하고 중복 URL을 제거한다', async () => {
    const mockFetch = createMockFetch({
      'tech.kakao.com': MOCK_RSS,
      'd2.naver.com': MOCK_ATOM,
    })
    const collector = new TechBlogCollector('kakao-tech', testBlogs, mockFetch)
    const items = await collector.collect()

    expect(items).toHaveLength(3)
    const urls = items.map((i) => i.url)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('개별 블로그 실패 시 무시한다', async () => {
    const failFetch = vi.fn(async () => new Response('', { status: 500 })) as unknown as FetchFn
    const collector = new TechBlogCollector('kakao-tech', testBlogs, failFetch)
    const items = await collector.collect()

    expect(items).toEqual([])
  })

  it('CDATA 블록을 정상 처리한다', () => {
    const collector = new TechBlogCollector('kakao-tech', testBlogs, createMockFetch({}))
    const items = collector.parseRSS(MOCK_RSS, testBlogs[0])

    expect(items[0].title).not.toContain('CDATA')
    expect(items[0].author).not.toContain('CDATA')
  })

  it('normalize()가 키워드와 카테고리를 추출한다', async () => {
    const mockFetch = createMockFetch({
      'tech.kakao.com': MOCK_RSS,
      'd2.naver.com': MOCK_ATOM,
    })
    const collector = new TechBlogCollector('kakao-tech', testBlogs, mockFetch)
    const raw = await collector.collect()
    const normalized = collector.normalize(raw)

    expect(normalized).toHaveLength(3)
    expect(normalized[0].source).toBe('kakao-tech')

    // Spring item → backend category
    const springItem = normalized.find((n) => n.title.includes('Spring'))
    expect(springItem?.keywords).toContain('spring')
  })
})
