import type { Collector, RawCollectedItem, NormalizedItem, FetchFn } from './types'
import { extractKeywords, categorize } from '@/services/keywordExtractor'

/**
 * Medium 수집기
 * Medium RSS → JSON 변환 프록시 사용 (rss2json 또는 직접 RSS 파싱).
 * 기술 태그별 인기 글을 수집한다.
 */

const MEDIUM_TAGS = [
  'programming',
  'javascript',
  'python',
  'artificial-intelligence',
  'machine-learning',
  'web-development',
  'devops',
  'react',
  'software-engineering',
] as const

const RSS_BASE = 'https://medium.com/feed/tag'

export class MediumCollector implements Collector {
  readonly source = 'medium' as const
  readonly tier = 2
  private readonly fetchFn: FetchFn

  constructor(fetchFn: FetchFn = globalThis.fetch.bind(globalThis)) {
    this.fetchFn = fetchFn
  }

  async collect(): Promise<RawCollectedItem[]> {
    const allItems: RawCollectedItem[] = []
    const seenUrls = new Set<string>()

    for (const tag of MEDIUM_TAGS) {
      try {
        const res = await this.fetchFn(`${RSS_BASE}/${tag}`, {
          headers: { 'User-Agent': 'TechPulse/1.0', Accept: 'application/rss+xml, text/xml' },
        })
        if (!res.ok) continue

        const xml = await res.text()
        const items = this.parseRSS(xml, tag)

        for (const item of items) {
          if (seenUrls.has(item.url)) continue
          seenUrls.add(item.url)
          allItems.push(item)
        }
      } catch {
        // 개별 태그 실패는 무시
      }
    }

    return allItems
  }

  /** RSS XML 간이 파서 */
  parseRSS(xml: string, tag: string): RawCollectedItem[] {
    const items: RawCollectedItem[] = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match

    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1]
      const title = extractTag(block, 'title')
      const link = extractTag(block, 'link')
      const creator = extractTag(block, 'dc:creator')
      const categories = extractAllTags(block, 'category')

      if (title && link) {
        items.push({
          title: decodeEntities(title),
          url: link.split('?')[0], // UTM 파라미터 제거
          description: '',
          author: decodeEntities(creator),
          metadata: { tag, categories },
        })
      }
    }

    return items
  }

  normalize(raw: RawCollectedItem[]): NormalizedItem[] {
    const now = new Date().toISOString()
    return raw.map((item) => {
      const cats = (item.metadata?.categories as string[]) ?? []
      const text = [item.title, ...cats].filter(Boolean).join(' ')
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

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`, 's')
  return re.exec(xml)?.[1]?.trim() ?? ''
}

function extractAllTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`, 'gs')
  const results: string[] = []
  let m
  while ((m = re.exec(xml)) !== null) {
    results.push(decodeEntities(m[1].trim()))
  }
  return results
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}
