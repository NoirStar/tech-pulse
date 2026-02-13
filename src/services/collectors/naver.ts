import type { Collector, RawCollectedItem, NormalizedItem, FetchFn } from './types'
import { extractKeywords, categorize } from '@/services/keywordExtractor'

/**
 * 네이버 수집기
 * 네이버 검색 API (Client ID/Secret 필요) + 네이버 뉴스 IT 섹션.
 * 한국 IT 뉴스와 블로그를 수집한다.
 */

const NAVER_API = 'https://openapi.naver.com/v1/search'
const SEARCH_QUERIES = ['IT 트렌드', '개발자 도구', '인공지능 기술', 'AI 스타트업']

export class NaverCollector implements Collector {
  readonly source = 'naver' as const
  readonly tier = 3
  private readonly fetchFn: FetchFn
  private readonly clientId: string
  private readonly clientSecret: string

  constructor(
    clientId?: string,
    clientSecret?: string,
    fetchFn: FetchFn = globalThis.fetch.bind(globalThis),
  ) {
    this.clientId =
      clientId ?? (typeof process !== 'undefined' ? process.env.NAVER_CLIENT_ID ?? '' : '')
    this.clientSecret =
      clientSecret ?? (typeof process !== 'undefined' ? process.env.NAVER_CLIENT_SECRET ?? '' : '')
    this.fetchFn = fetchFn
  }

  async collect(): Promise<RawCollectedItem[]> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('NAVER_CLIENT_ID/SECRET is not configured')
    }

    const allItems: RawCollectedItem[] = []
    const seenUrls = new Set<string>()

    for (const query of SEARCH_QUERIES) {
      try {
        const params = new URLSearchParams({
          query,
          display: '10',
          sort: 'date',
        })

        const res = await this.fetchFn(`${NAVER_API}/news.json?${params}`, {
          headers: {
            'X-Naver-Client-Id': this.clientId,
            'X-Naver-Client-Secret': this.clientSecret,
          },
        })
        if (!res.ok) continue

        const data = await res.json()
        for (const item of data?.items ?? []) {
          const url = item.link ?? item.originallink
          if (!url || seenUrls.has(url)) continue
          seenUrls.add(url)

          allItems.push({
            title: stripHTML(item.title),
            url,
            description: stripHTML(item.description),
            metadata: { pubDate: item.pubDate, query },
          })
        }
      } catch {
        // 개별 쿼리 실패는 무시
      }
    }

    return allItems
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
        author: '',
        keywords,
        category: categorize(keywords),
        collectedAt: now,
        metadata: item.metadata ?? {},
      }
    })
  }
}

/** HTML 태그 및 엔티티 제거 */
function stripHTML(str: string): string {
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}
