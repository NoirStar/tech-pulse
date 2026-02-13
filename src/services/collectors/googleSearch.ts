import type { Collector, RawCollectedItem, NormalizedItem, FetchFn } from './types'
import { extractKeywords, categorize } from '@/services/keywordExtractor'

/**
 * Google 실시간 검색 트렌드 수집기
 *
 * Google Trending Searches RSS를 활용하여
 * IT/기술 관련 실시간 급상승 검색어를 수집한다.
 * geo 파라미터로 US + KR 양쪽을 수집한다.
 */

const TRENDING_RSS_BASE = 'https://trends.google.com/trending/rss'
const GEO_TARGETS = ['US', 'KR'] as const

// IT/기술 관련 필터 키워드 (이 중 하나라도 포함되면 수집)
const TECH_SIGNALS = new Set([
  'ai', 'app', 'api', 'code', 'data', 'dev', 'cloud', 'tech', 'software',
  'google', 'apple', 'microsoft', 'meta', 'amazon', 'nvidia', 'openai',
  'samsung', 'intel', 'amd', 'tesla', 'startup', 'crypto', 'bitcoin',
  'android', 'iphone', 'ios', 'web', 'server', 'hack', 'cyber', 'robot',
  'chip', 'gpu', 'cpu', 'update', 'launch', 'release', 'open source',
  '인공지능', 'IT', '개발', '프로그래밍', '테크', '서비스',
  '스타트업', '앱', '플랫폼', '클라우드', '보안',
])

export class GoogleSearchCollector implements Collector {
  readonly source = 'google-search' as const
  readonly tier = 1
  private readonly fetchFn: FetchFn

  constructor(fetchFn: FetchFn = globalThis.fetch.bind(globalThis)) {
    this.fetchFn = fetchFn
  }

  async collect(): Promise<RawCollectedItem[]> {
    const allItems: RawCollectedItem[] = []
    const seenTitles = new Set<string>()

    for (const geo of GEO_TARGETS) {
      try {
        const rssUrl = `${TRENDING_RSS_BASE}?geo=${geo}`
        const res = await this.fetchFn(rssUrl, {
          headers: { 'User-Agent': 'TechPulse/1.0' },
        })
        if (!res.ok) continue

        const xml = await res.text()
        const items = this.parseRSS(xml, geo)

        for (const item of items) {
          const key = item.title.toLowerCase()
          if (seenTitles.has(key)) continue
          seenTitles.add(key)
          allItems.push(item)
        }
      } catch (err) {
        console.warn(`Google Search trends (${geo}) failed:`, err)
      }
    }

    // IT/기술 관련만 필터링
    return allItems.filter((item) => this.isTechRelated(item.title + ' ' + (item.description ?? '')))
  }

  /** RSS XML에서 트렌딩 검색어 추출 */
  parseRSS(xml: string, geo: string): RawCollectedItem[] {
    const items: RawCollectedItem[] = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match

    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1]
      const title = extractTag(block, 'title')
      const link = extractTag(block, 'link')
      const traffic = extractTag(block, 'ht:approx_traffic') || '0'
      const newsItem = extractTag(block, 'ht:news_item_title')

      if (title) {
        items.push({
          title,
          url: link || `https://www.google.com/search?q=${encodeURIComponent(title)}`,
          score: parseTraffic(traffic),
          description: newsItem || extractTag(block, 'description') || '',
          metadata: { geo, formattedTraffic: traffic },
        })
      }
    }

    return items
  }

  /** IT/기술 관련 여부 판별 */
  private isTechRelated(text: string): boolean {
    const lower = text.toLowerCase()
    for (const signal of TECH_SIGNALS) {
      if (lower.includes(signal.toLowerCase())) return true
    }
    return false
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

function parseTraffic(traffic: string): number {
  const cleaned = traffic.replace(/[^0-9kKmM.]/g, '')
  const num = parseFloat(cleaned) || 0
  if (/[mM]/.test(traffic)) return num * 1_000_000
  if (/[kK]/.test(traffic)) return num * 1_000
  return num
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`, 's')
  return re.exec(xml)?.[1]?.trim() ?? ''
}
