import type { Collector, RawCollectedItem, NormalizedItem, FetchFn } from './types'
import { extractKeywords, categorize } from '@/services/keywordExtractor'

/**
 * Google Trends 수집기
 *
 * Google Trends는 공식 REST API가 없으므로,
 * 내부 비공식 엔드포인트를 사용한다.
 * - Daily Trends: 일간 인기 검색어
 * - Realtime Trends: 실시간 인기 주제
 *
 * 불안정한 비공식 API이므로 에러 핸들링을 철저히 한다.
 */

const DAILY_TRENDS_URL =
  'https://trends.google.com/trends/api/dailytrends?hl=en-US&tz=-540&geo=US&ns=15'
const REALTIME_TRENDS_URL =
  'https://trends.google.com/trending/rss?geo=US'

// Google Trends API는 응답 앞에 ")]}'" 를 붙임 (XSS 방어)
const JUNK_PREFIX = /^\)]\}',?\n?/

interface DailyTrendStory {
  title: { query: string }
  formattedTraffic: string
  articles: { title: string; url: string; snippet: string }[]
}

export class GoogleTrendsCollector implements Collector {
  readonly source = 'google-trends' as const
  readonly tier = 1
  private readonly fetchFn: FetchFn

  constructor(fetchFn: FetchFn = globalThis.fetch.bind(globalThis)) {
    this.fetchFn = fetchFn
  }

  async collect(): Promise<RawCollectedItem[]> {
    const items: RawCollectedItem[] = []

    // Daily Trends 시도
    try {
      const dailyItems = await this.collectDailyTrends()
      items.push(...dailyItems)
    } catch (err) {
      console.warn('Google Daily Trends failed:', err)
    }

    // Realtime Trends (RSS) 시도
    try {
      const realtimeItems = await this.collectRealtimeTrends()
      items.push(...realtimeItems)
    } catch (err) {
      console.warn('Google Realtime Trends failed:', err)
    }

    return items
  }

  private async collectDailyTrends(): Promise<RawCollectedItem[]> {
    const res = await this.fetchFn(DAILY_TRENDS_URL, {
      headers: { 'User-Agent': 'TechPulse/1.0' },
    })
    if (!res.ok) throw new Error(`Daily trends: ${res.status}`)

    const text = await res.text()
    const cleaned = text.replace(JUNK_PREFIX, '')
    const data = JSON.parse(cleaned)

    const days = data?.default?.trendingSearchesDays ?? []
    const items: RawCollectedItem[] = []

    for (const day of days) {
      for (const story of day.trendingSearches as DailyTrendStory[]) {
        const query = story.title?.query ?? ''
        const traffic = story.formattedTraffic ?? '0'
        const article = story.articles?.[0]

        items.push({
          title: query,
          url: article?.url ?? `https://trends.google.com/trending?q=${encodeURIComponent(query)}`,
          score: parseTraffic(traffic),
          description: article?.snippet ?? '',
          metadata: {
            formattedTraffic: traffic,
            articleTitle: article?.title,
          },
        })
      }
    }

    return items
  }

  private async collectRealtimeTrends(): Promise<RawCollectedItem[]> {
    const res = await this.fetchFn(REALTIME_TRENDS_URL, {
      headers: { 'User-Agent': 'TechPulse/1.0' },
    })
    if (!res.ok) throw new Error(`Realtime trends RSS: ${res.status}`)

    const xml = await res.text()
    return this.parseRSS(xml)
  }

  /** 간이 RSS/XML 파서 (외부 의존성 없이) */
  parseRSS(xml: string): RawCollectedItem[] {
    const items: RawCollectedItem[] = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match

    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1]
      const title = extractTag(block, 'title')
      const link = extractTag(block, 'link')
      const traffic = extractTag(block, 'ht:approx_traffic') || '0'

      if (title && link) {
        items.push({
          title,
          url: link,
          score: parseTraffic(traffic),
          description: extractTag(block, 'description') ?? '',
          metadata: { formattedTraffic: traffic },
        })
      }
    }

    return items
  }

  normalize(raw: RawCollectedItem[]): NormalizedItem[] {
    const now = new Date().toISOString()

    return raw.map((item) => {
      const text = [item.title, item.description].filter(Boolean).join(' ')
      const keywords = extractKeywords(text)
      const category = categorize(keywords)

      return {
        source: this.source,
        title: item.title,
        url: item.url,
        score: item.score ?? 0,
        description: item.description ?? '',
        author: '',
        keywords,
        category,
        collectedAt: now,
        metadata: item.metadata ?? {},
      }
    })
  }
}

/** "200K+" 같은 트래픽 문자열을 숫자로 변환 */
function parseTraffic(traffic: string): number {
  const cleaned = traffic.replace(/[^0-9kKmM.]/g, '')
  const num = parseFloat(cleaned) || 0

  if (/[mM]/.test(traffic)) return num * 1_000_000
  if (/[kK]/.test(traffic)) return num * 1_000
  return num
}

/** XML에서 태그 값 추출 */
function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`, 's')
  return re.exec(xml)?.[1]?.trim() ?? ''
}
