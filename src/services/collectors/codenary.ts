import * as cheerio from 'cheerio'
import type { Collector, RawCollectedItem, NormalizedItem, FetchFn } from './types'
import { extractKeywords, categorize } from '@/services/keywordExtractor'

/**
 * 코드너리 수집기
 * 공식 API 없음 → HTML 크롤링.
 * https://www.codenary.co.kr/techblog/list
 */

const CODENARY_URL = 'https://www.codenary.co.kr/techblog/list'

export class CodenaryCollector implements Collector {
  readonly source = 'codenary' as const
  readonly tier = 3
  private readonly fetchFn: FetchFn

  constructor(fetchFn: FetchFn = globalThis.fetch.bind(globalThis)) {
    this.fetchFn = fetchFn
  }

  async collect(): Promise<RawCollectedItem[]> {
    const res = await this.fetchFn(CODENARY_URL, {
      headers: { 'User-Agent': 'TechPulse/1.0', 'Accept-Language': 'ko' },
    })
    if (!res.ok) throw new Error(`Codenary fetch failed: ${res.status}`)

    const html = await res.text()
    return this.parseHTML(html)
  }

  parseHTML(html: string): RawCollectedItem[] {
    const $ = cheerio.load(html)
    const items: RawCollectedItem[] = []

    // 코드너리 기술 블로그 아이템
    $('.post-item, .blog-item, article').each((_, el) => {
      const $el = $(el)
      const $link = $el.find('a[href]').first()
      const title = $el.find('.title, h3, h2').text().trim()
      const href = $link.attr('href') ?? ''
      const company = $el.find('.company, .org-name').text().trim()
      const tags = $el
        .find('.tag, .badge')
        .map((__, t) => $(t).text().trim())
        .get()

      if (title && href) {
        const url = href.startsWith('http') ? href : `https://www.codenary.co.kr${href}`
        items.push({
          title,
          url,
          author: company,
          metadata: { platform: 'codenary', tags },
        })
      }
    })

    return items
  }

  normalize(raw: RawCollectedItem[]): NormalizedItem[] {
    const now = new Date().toISOString()
    return raw.map((item) => {
      const tags = (item.metadata?.tags as string[]) ?? []
      const text = [item.title, ...tags].filter(Boolean).join(' ')
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
