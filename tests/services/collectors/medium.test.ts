import { describe, it, expect, vi } from 'vitest'
import { MediumCollector } from '@/services/collectors/medium'
import type { FetchFn } from '@/services/collectors/types'

const MOCK_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>programming – Medium</title>
  <item>
    <title><![CDATA[Why Rust is the future of systems programming]]></title>
    <link>https://medium.com/@alice/rust-future?source=rss-tag-programming</link>
    <dc:creator><![CDATA[Alice Engineer]]></dc:creator>
    <category>Rust</category>
    <category>Systems Programming</category>
  </item>
  <item>
    <title><![CDATA[Docker Compose v3 deep dive]]></title>
    <link>https://medium.com/@bob/docker-compose-v3?utm_source=rss</link>
    <dc:creator><![CDATA[Bob DevOps]]></dc:creator>
    <category>Docker</category>
    <category>DevOps</category>
  </item>
</channel>
</rss>`

const MOCK_RSS_AI = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>artificial-intelligence – Medium</title>
  <item>
    <title><![CDATA[GPT-5 architecture explained]]></title>
    <link>https://medium.com/@carol/gpt5-arch</link>
    <dc:creator><![CDATA[Carol AI]]></dc:creator>
    <category>AI</category>
  </item>
</channel>
</rss>`

function createMockFetch(rssByTag: Record<string, string>): FetchFn {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    for (const [tag, xml] of Object.entries(rssByTag)) {
      if (url.includes(`/tag/${tag}`)) {
        return new Response(xml, { status: 200 })
      }
    }
    return new Response('', { status: 404 })
  }) as unknown as FetchFn
}

describe('MediumCollector', () => {
  it('source가 medium이며 tier 2이다', () => {
    const collector = new MediumCollector(createMockFetch({}))
    expect(collector.source).toBe('medium')
    expect(collector.tier).toBe(2)
  })

  it('RSS에서 아티클을 파싱한다', () => {
    const collector = new MediumCollector(createMockFetch({}))
    const items = collector.parseRSS(MOCK_RSS, 'programming')

    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      title: 'Why Rust is the future of systems programming',
      author: 'Alice Engineer',
    })
    // UTM 파라미터 제거 확인
    expect(items[0].url).toBe('https://medium.com/@alice/rust-future')
  })

  it('여러 태그에서 수집하고 중복 URL을 제거한다', async () => {
    const collector = new MediumCollector(
      createMockFetch({ programming: MOCK_RSS, 'artificial-intelligence': MOCK_RSS_AI }),
    )
    const items = await collector.collect()

    expect(items.length).toBeGreaterThanOrEqual(3)
    const urls = items.map((i) => i.url)
    expect(new Set(urls).size).toBe(urls.length) // 중복 없음
  })

  it('개별 태그 실패 시 무시한다', async () => {
    const failFetch = vi.fn(async () => new Response('', { status: 500 })) as unknown as FetchFn
    const collector = new MediumCollector(failFetch)
    const items = await collector.collect()

    expect(items).toEqual([])
  })

  it('CDATA 블록을 정상 처리한다', () => {
    const collector = new MediumCollector(createMockFetch({}))
    const items = collector.parseRSS(MOCK_RSS, 'test')

    expect(items[0].title).not.toContain('CDATA')
    expect(items[0].author).not.toContain('CDATA')
  })

  it('normalize()가 카테고리를 키워드 추출에 포함한다', async () => {
    const collector = new MediumCollector(
      createMockFetch({ programming: MOCK_RSS }),
    )
    const raw = await collector.collect()
    const normalized = collector.normalize(raw)

    expect(normalized.length).toBeGreaterThan(0)
    expect(normalized[0].source).toBe('medium')
    expect(normalized[0].keywords).toContain('rust')
  })
})
