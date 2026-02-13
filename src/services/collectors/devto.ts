import type { Collector, RawCollectedItem, NormalizedItem, FetchFn } from './types'
import { extractKeywords, categorize } from '@/services/keywordExtractor'

/**
 * Dev.to 수집기
 * Forem REST API (무료, 인증 불필요) 사용.
 * 인기 아티클을 수집한다.
 */

const DEVTO_API = 'https://dev.to/api/articles'

interface DevtoArticle {
  id: number
  title: string
  url: string
  description: string
  positive_reactions_count: number
  comments_count: number
  published_at: string
  tag_list: string[]
  user: { name: string; username: string }
  cover_image?: string
}

export class DevtoCollector implements Collector {
  readonly source = 'devto' as const
  readonly tier = 2
  private readonly fetchFn: FetchFn

  constructor(fetchFn: FetchFn = globalThis.fetch.bind(globalThis)) {
    this.fetchFn = fetchFn
  }

  async collect(): Promise<RawCollectedItem[]> {
    const res = await this.fetchFn(`${DEVTO_API}?per_page=30&top=1`, {
      headers: { 'User-Agent': 'TechPulse/1.0' },
    })
    if (!res.ok) throw new Error(`Dev.to API failed: ${res.status}`)

    const articles: DevtoArticle[] = await res.json()

    return articles.map((a) => ({
      title: a.title,
      url: a.url,
      score: a.positive_reactions_count,
      description: a.description,
      author: a.user?.name ?? a.user?.username ?? '',
      metadata: {
        devtoId: a.id,
        tags: a.tag_list,
        commentCount: a.comments_count,
        publishedAt: a.published_at,
        coverImage: a.cover_image,
      },
    }))
  }

  normalize(raw: RawCollectedItem[]): NormalizedItem[] {
    const now = new Date().toISOString()
    return raw.map((item) => {
      const tags = (item.metadata?.tags as string[]) ?? []
      const text = [item.title, item.description, ...tags].filter(Boolean).join(' ')
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
