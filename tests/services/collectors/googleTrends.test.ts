import { describe, it, expect, vi } from 'vitest'
import { GoogleTrendsCollector } from '@/services/collectors/googleTrends'
import type { FetchFn } from '@/services/collectors/types'

// Google Daily Trends API 목 응답 (앞에 )]}' prefix 포함)
const MOCK_DAILY_RESPONSE =
  ")]}'\n" +
  JSON.stringify({
    default: {
      trendingSearchesDays: [
        {
          date: '20260213',
          trendingSearches: [
            {
              title: { query: 'OpenAI GPT-5' },
              formattedTraffic: '500K+',
              articles: [
                {
                  title: 'OpenAI announces GPT-5',
                  url: 'https://example.com/gpt5',
                  snippet: 'OpenAI has released GPT-5 with major improvements.',
                },
              ],
            },
            {
              title: { query: 'React 20' },
              formattedTraffic: '200K+',
              articles: [
                {
                  title: 'React 20 Released',
                  url: 'https://example.com/react20',
                  snippet: 'Facebook releases React 20 with new compiler.',
                },
              ],
            },
          ],
        },
      ],
    },
  })

// Google Trending RSS 목 응답
const MOCK_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Kubernetes 2.0</title>
      <link>https://trends.google.com/kubernetes</link>
      <ht:approx_traffic>100K+</ht:approx_traffic>
      <description>Kubernetes 2.0 released with new features</description>
    </item>
    <item>
      <title>Rust Programming</title>
      <link>https://trends.google.com/rust</link>
      <ht:approx_traffic>50K+</ht:approx_traffic>
      <description>Rust popularity continues to grow</description>
    </item>
  </channel>
</rss>`

function createMockFetch(): FetchFn {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()

    if (url.includes('dailytrends')) {
      return new Response(MOCK_DAILY_RESPONSE, { status: 200 })
    }
    if (url.includes('trending/rss')) {
      return new Response(MOCK_RSS, { status: 200 })
    }

    return new Response('Not found', { status: 404 })
  }) as unknown as FetchFn
}

describe('GoogleTrendsCollector', () => {
  it('source가 google-trends이다', () => {
    const collector = new GoogleTrendsCollector(createMockFetch())
    expect(collector.source).toBe('google-trends')
    expect(collector.tier).toBe(1)
  })

  it('Daily Trends + RSS에서 데이터를 수집한다', async () => {
    const collector = new GoogleTrendsCollector(createMockFetch())
    const items = await collector.collect()

    // Daily 2개 + RSS 2개 = 4개
    expect(items).toHaveLength(4)
  })

  it('Daily Trends에서 제목과 트래픽을 파싱한다', async () => {
    const collector = new GoogleTrendsCollector(createMockFetch())
    const items = await collector.collect()

    const gptItem = items.find((i) => i.title === 'OpenAI GPT-5')
    expect(gptItem).toBeDefined()
    expect(gptItem?.score).toBe(500000) // 500K+
    expect(gptItem?.url).toBe('https://example.com/gpt5')
  })

  it('RSS XML을 파싱한다', () => {
    const collector = new GoogleTrendsCollector(createMockFetch())
    const items = collector.parseRSS(MOCK_RSS)

    expect(items).toHaveLength(2)
    expect(items[0].title).toBe('Kubernetes 2.0')
    expect(items[0].score).toBe(100000) // 100K+
    expect(items[1].title).toBe('Rust Programming')
  })

  it('Daily Trends 실패 시에도 RSS는 수집된다', async () => {
    const partialFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('dailytrends')) {
        return new Response('Error', { status: 500 })
      }
      return new Response(MOCK_RSS, { status: 200 })
    }) as unknown as FetchFn

    const collector = new GoogleTrendsCollector(partialFetch)
    const items = await collector.collect()

    // Daily 실패, RSS 성공 → 2개
    expect(items).toHaveLength(2)
  })

  it('normalize()가 NormalizedItem으로 변환한다', async () => {
    const collector = new GoogleTrendsCollector(createMockFetch())
    const raw = await collector.collect()
    const normalized = collector.normalize(raw)

    expect(normalized.length).toBe(4)
    expect(normalized[0].source).toBe('google-trends')
    expect(normalized[0].collectedAt).toBeDefined()
  })
})
