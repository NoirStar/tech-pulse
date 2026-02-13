import * as cheerio from 'cheerio'
import type { Collector, RawCollectedItem, NormalizedItem, FetchFn } from './types'
import { extractKeywords, categorize } from '@/services/keywordExtractor'

/**
 * GeekNews (news.hada.io) 수집기
 * 공식 API 없음 → HTML 크롤링.
 * 한국 개발자 커뮤니티의 IT 뉴스 큐레이션.
 */

const GEEKNEWS_URL = 'https://news.hada.io'

export class GeekNewsCollector implements Collector {
  readonly source = 'geeknews' as const
  readonly tier = 3
  private readonly fetchFn: FetchFn

  constructor(fetchFn: FetchFn = globalThis.fetch.bind(globalThis)) {
    this.fetchFn = fetchFn
  }

  async collect(): Promise<RawCollectedItem[]> {
    const res = await this.fetchFn(GEEKNEWS_URL, {
      headers: { 'User-Agent': 'TechPulse/1.0', 'Accept-Language': 'ko' },
    })
    if (!res.ok) throw new Error(`GeekNews fetch failed: ${res.status}`)

    const html = await res.text()
    return this.parseHTML(html)
  }

  parseHTML(html: string): RawCollectedItem[] {
    const $ = cheerio.load(html)
    const items: RawCollectedItem[] = []

    // GeekNews 아이템 구조: .topic_row
    $('.topic_row').each((_, el) => {
      const $el = $(el)
      const $link = $el.find('.topictitle a').first()
      const title = $link.text().trim()
      const url = $link.attr('href') ?? ''
      const pointsText = $el.find('.topicinfo .points').text().trim()
      const points = parseInt(pointsText, 10) || 0

      if (title && url) {
        const fullUrl = url.startsWith('http') ? url : `${GEEKNEWS_URL}${url}`
        items.push({
          title,
          url: fullUrl,
          score: points,
          metadata: { originalUrl: url },
        })
      }
    })

    return items
  }

  normalize(raw: RawCollectedItem[]): NormalizedItem[] {
    const now = new Date().toISOString()
    return raw.map((item) => {
      const keywords = extractKeywords(item.title)
      return {
        source: this.source,
        title: item.title,
        url: item.url,
        score: item.score ?? 0,
        description: item.description ?? '',
        author: '',
        keywords,
        category: categorize(keywords),
        collectedAt: now,
        metadata: item.metadata ?? {},
      }
    })
  }
}
