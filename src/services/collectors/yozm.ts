import * as cheerio from 'cheerio'
import type { Collector, RawCollectedItem, NormalizedItem, FetchFn } from './types'
import { extractKeywords, categorize } from '@/services/keywordExtractor'

/**
 * 요즘IT 수집기
 * 공식 API 없음 → HTML 크롤링.
 * https://yozm.wishket.com/magazine/list/develop/
 */

const YOZM_URL = 'https://yozm.wishket.com/magazine/list/develop/'

export class YozmCollector implements Collector {
  readonly source = 'yozm' as const
  readonly tier = 3
  private readonly fetchFn: FetchFn

  constructor(fetchFn: FetchFn = globalThis.fetch.bind(globalThis)) {
    this.fetchFn = fetchFn
  }

  async collect(): Promise<RawCollectedItem[]> {
    const res = await this.fetchFn(YOZM_URL, {
      headers: { 'User-Agent': 'TechPulse/1.0', 'Accept-Language': 'ko' },
    })
    if (!res.ok) throw new Error(`Yozm fetch failed: ${res.status}`)

    const html = await res.text()
    return this.parseHTML(html)
  }

  parseHTML(html: string): RawCollectedItem[] {
    const $ = cheerio.load(html)
    const items: RawCollectedItem[] = []

    // 요즘IT 아티클 카드
    $('.content-item, .item-card').each((_, el) => {
      const $el = $(el)
      const $link = $el.find('a[href*="/magazine/"]').first()
      const title = $el.find('.item-title, .title, h3').text().trim()
      const href = $link.attr('href') ?? ''
      const desc = $el.find('.item-description, .desc, p').text().trim()
      const author = $el.find('.author, .writer').text().trim()

      if (title && href) {
        const url = href.startsWith('http') ? href : `https://yozm.wishket.com${href}`
        items.push({
          title,
          url,
          description: desc.slice(0, 300),
          author,
          metadata: { platform: 'yozm' },
        })
      }
    })

    return items
  }

  normalize(raw: RawCollectedItem[]): NormalizedItem[] {
    const now = new Date().toISOString()
    return raw.map((item) => {
      const text = [item.title, item.description].filter(Boolean).join(' ')
      const keywords = extractKeywords(text)
      return {
        source: this.source,
        title: item.title,
        url: item.url,
        score: item.score ?? 0,
        description: item.description ?? '',
        author: item.author ?? '',
        keywords,
        category: categorize(keywords),
        collectedAt: now,
        metadata: item.metadata ?? {},
      }
    })
  }
}
