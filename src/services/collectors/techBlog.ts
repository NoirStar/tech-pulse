import type { Collector, RawCollectedItem, NormalizedItem, FetchFn } from './types'
import { extractKeywords, categorize } from '@/services/keywordExtractor'

/**
 * 기술 블로그 RSS 수집기
 * 카카오 테크, 토스 테크 등 한국 빅테크 기술 블로그의 RSS를 수집한다.
 * 하나의 수집기에서 여러 RSS 피드를 처리한다.
 */

interface BlogFeed {
  id: string
  name: string
  rssUrl: string
}

const TECH_BLOGS: BlogFeed[] = [
  { id: 'kakao', name: '카카오 기술 블로그', rssUrl: 'https://tech.kakao.com/feed/' },
  { id: 'toss', name: '토스 기술 블로그', rssUrl: 'https://toss.tech/rss.xml' },
  { id: 'woowa', name: '우아한형제들 기술 블로그', rssUrl: 'https://techblog.woowahan.com/feed/' },
  { id: 'line', name: 'LINE Engineering', rssUrl: 'https://engineering.linecorp.com/ko/feed/' },
  { id: 'naver-d2', name: 'Naver D2', rssUrl: 'https://d2.naver.com/d2.atom' },
]

export class TechBlogCollector implements Collector {
  readonly source: 'kakao-tech' | 'toss-tech'
  readonly tier = 3
  private readonly fetchFn: FetchFn
  private readonly blogs: BlogFeed[]

  /**
   * @param sourceId - 대표 source ID (kakao-tech or toss-tech)
   * @param blogs - 커스텀 블로그 목록 (테스트용)
   */
  constructor(
    sourceId: 'kakao-tech' | 'toss-tech' = 'kakao-tech',
    blogs?: BlogFeed[],
    fetchFn: FetchFn = globalThis.fetch.bind(globalThis),
  ) {
    this.source = sourceId
    this.blogs = blogs ?? TECH_BLOGS
    this.fetchFn = fetchFn
  }

  async collect(): Promise<RawCollectedItem[]> {
    const allItems: RawCollectedItem[] = []
    const seenUrls = new Set<string>()

    for (const blog of this.blogs) {
      try {
        const res = await this.fetchFn(blog.rssUrl, {
          headers: { 'User-Agent': 'TechPulse/1.0', Accept: 'application/rss+xml, text/xml, application/atom+xml' },
        })
        if (!res.ok) continue

        const xml = await res.text()
        const items = this.parseRSS(xml, blog)

        for (const item of items) {
          if (seenUrls.has(item.url)) continue
          seenUrls.add(item.url)
          allItems.push(item)
        }
      } catch {
        // 개별 블로그 실패는 무시
      }
    }

    return allItems
  }

  /** RSS/Atom XML을 파싱 */
  parseRSS(xml: string, blog: BlogFeed): RawCollectedItem[] {
    const items: RawCollectedItem[] = []

    // RSS <item> 또는 Atom <entry> 파싱
    const entryRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/g
    let match

    while ((match = entryRegex.exec(xml)) !== null) {
      const block = match[1]
      const title = extractTag(block, 'title')
      const link = extractLink(block)
      const description = extractTag(block, 'description') || extractTag(block, 'summary')
      const author = extractTag(block, 'dc:creator') || extractTag(block, 'author')
      const categories = extractAllValues(block, 'category')

      if (title && link) {
        items.push({
          title: decodeEntities(title),
          url: link,
          description: decodeEntities(description).slice(0, 300),
          author: decodeEntities(author) || blog.name,
          metadata: { blogId: blog.id, blogName: blog.name, categories },
        })
      }
    }

    return items
  }

  normalize(raw: RawCollectedItem[]): NormalizedItem[] {
    const now = new Date().toISOString()
    return raw.map((item) => {
      const cats = (item.metadata?.categories as string[]) ?? []
      const text = [item.title, item.description, ...cats].filter(Boolean).join(' ')
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

function extractLink(xml: string): string {
  // RSS: <link>url</link>
  const rssLink = extractTag(xml, 'link')
  if (rssLink) return rssLink
  // Atom: <link href="url" />
  const atomMatch = /<link[^>]+href=["']([^"']+)["']/.exec(xml)
  return atomMatch?.[1] ?? ''
}

function extractAllValues(xml: string, tag: string): string[] {
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
