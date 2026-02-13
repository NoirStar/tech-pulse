import type { Collector, RawCollectedItem, NormalizedItem, FetchFn } from './types'
import { extractKeywords, categorize } from '@/services/keywordExtractor'

/**
 * X (Twitter) 수집기
 * X API v2 Basic ($100/mo) — GET /2/tweets/search/recent
 * Bearer Token 인증.
 * IT/기술 관련 인기 트윗을 수집한다.
 */

const X_API = 'https://api.twitter.com/2/tweets/search/recent'
const TECH_QUERY =
  '(programming OR developer OR #webdev OR #AI OR #MachineLearning OR #opensource) lang:en -is:retweet has:media'

export class XTwitterCollector implements Collector {
  readonly source = 'x-twitter' as const
  readonly tier = 2
  private readonly fetchFn: FetchFn
  private readonly bearerToken: string

  constructor(bearerToken?: string, fetchFn: FetchFn = globalThis.fetch.bind(globalThis)) {
    this.bearerToken =
      bearerToken ?? (typeof process !== 'undefined' ? process.env.X_BEARER_TOKEN ?? '' : '')
    this.fetchFn = fetchFn
  }

  async collect(): Promise<RawCollectedItem[]> {
    if (!this.bearerToken) throw new Error('X_BEARER_TOKEN is not configured')

    const params = new URLSearchParams({
      query: TECH_QUERY,
      max_results: '25',
      'tweet.fields': 'public_metrics,author_id,created_at,entities',
      expansions: 'author_id',
      'user.fields': 'username,name',
    })

    const res = await this.fetchFn(`${X_API}?${params}`, {
      headers: { Authorization: `Bearer ${this.bearerToken}` },
    })
    if (!res.ok) throw new Error(`X API failed: ${res.status}`)

    const data = await res.json()
    const tweets = data?.data ?? []
    const users = new Map(
      (data?.includes?.users ?? []).map((u: { id: string; username: string; name: string }) => [
        u.id,
        u,
      ]),
    )

    return tweets.map(
      (t: {
        id: string
        text: string
        author_id: string
        public_metrics?: { like_count: number; retweet_count: number; reply_count: number }
        created_at?: string
      }) => {
        const user = users.get(t.author_id) as
          | { username: string; name: string }
          | undefined
        const metrics = t.public_metrics
        return {
          title: t.text.slice(0, 200),
          url: `https://x.com/${user?.username ?? 'i'}/status/${t.id}`,
          score: (metrics?.like_count ?? 0) + (metrics?.retweet_count ?? 0) * 2,
          author: user?.name ?? user?.username ?? '',
          description: t.text,
          metadata: {
            tweetId: t.id,
            likes: metrics?.like_count,
            retweets: metrics?.retweet_count,
            replies: metrics?.reply_count,
            createdAt: t.created_at,
          },
        }
      },
    )
  }

  normalize(raw: RawCollectedItem[]): NormalizedItem[] {
    const now = new Date().toISOString()
    return raw.map((item) => {
      const keywords = extractKeywords(item.description ?? item.title)
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
