import { describe, it, expect, vi } from 'vitest'
import { GoogleSearchCollector } from '@/services/collectors/googleSearch'
import type { FetchFn } from '@/services/collectors/types'

// 기술 관련 + 비관련 아이템을 섞은 RSS 응답
const MOCK_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>OpenAI Launch</title>
      <link>https://google.com/trends/openai</link>
      <ht:approx_traffic>1M+</ht:approx_traffic>
      <ht:news_item_title>OpenAI launches new AI model</ht:news_item_title>
    </item>
    <item>
      <title>NBA Playoffs</title>
      <link>https://google.com/trends/nba</link>
      <ht:approx_traffic>2M+</ht:approx_traffic>
      <description>NBA playoff brackets revealed</description>
    </item>
    <item>
      <title>Google Cloud Update</title>
      <link>https://google.com/trends/gcp</link>
      <ht:approx_traffic>300K+</ht:approx_traffic>
      <description>New Google Cloud features announced</description>
    </item>
  </channel>
</rss>`

function createMockFetch(): FetchFn {
  return vi.fn(async () => new Response(MOCK_RSS, { status: 200 })) as unknown as FetchFn
}

describe('GoogleSearchCollector', () => {
  it('source가 google-search이다', () => {
    const collector = new GoogleSearchCollector(createMockFetch())
    expect(collector.source).toBe('google-search')
    expect(collector.tier).toBe(1)
  })

  it('RSS에서 IT 관련 아이템만 필터링한다', async () => {
    const collector = new GoogleSearchCollector(createMockFetch())
    const items = await collector.collect()

    // "NBA Playoffs"는 IT 관련이 아니므로 필터링됨
    const titles = items.map((i) => i.title)
    expect(titles).toContain('OpenAI Launch')
    expect(titles).toContain('Google Cloud Update')
    expect(titles).not.toContain('NBA Playoffs')
  })

  it('트래픽 점수를 파싱한다', async () => {
    const collector = new GoogleSearchCollector(createMockFetch())
    const items = await collector.collect()

    const openai = items.find((i) => i.title === 'OpenAI Launch')
    expect(openai?.score).toBe(1000000) // 1M+

    const gcp = items.find((i) => i.title === 'Google Cloud Update')
    expect(gcp?.score).toBe(300000) // 300K+
  })

  it('ht:news_item_title을 description으로 사용한다', async () => {
    const collector = new GoogleSearchCollector(createMockFetch())
    const items = await collector.collect()

    const openai = items.find((i) => i.title === 'OpenAI Launch')
    expect(openai?.description).toBe('OpenAI launches new AI model')
  })

  it('US + KR 양쪽에서 수집한다 (중복 제거)', async () => {
    const fetchFn = createMockFetch()
    const collector = new GoogleSearchCollector(fetchFn)
    await collector.collect()

    // 2개 geo × fetch 호출 = 2번
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('fetch 실패 시에도 빈 배열을 반환한다 (크래시 안 함)', async () => {
    const failFetch = vi.fn(async () => new Response('Error', { status: 500 })) as unknown as FetchFn
    const collector = new GoogleSearchCollector(failFetch)
    const items = await collector.collect()

    expect(items).toEqual([])
  })

  it('normalize()가 키워드와 카테고리를 추출한다', async () => {
    const collector = new GoogleSearchCollector(createMockFetch())
    const raw = await collector.collect()
    const normalized = collector.normalize(raw)

    expect(normalized.length).toBeGreaterThanOrEqual(1)
    expect(normalized[0].source).toBe('google-search')

    const openai = normalized.find((n) => n.title.includes('OpenAI'))
    expect(openai?.keywords).toContain('openai')
  })
})
