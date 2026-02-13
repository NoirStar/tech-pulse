import type { Collector, RawCollectedItem, NormalizedItem, FetchFn } from './types'
import { extractKeywords, categorize } from '@/services/keywordExtractor'

/**
 * Reddit 수집기
 * Reddit JSON API (비인증, 무료) 사용 — URL 뒤에 .json만 붙이면 됨.
 * r/programming, r/webdev, r/machinelearning 등 기술 서브레딧 수집.
 */

const SUBREDDITS = [
  'programming',
  'webdev',
  'machinelearning',
  'devops',
  'javascript',
  'typescript',
  'reactjs',
  'rust',
  'golang',
  'python',
] as const

const POSTS_PER_SUB = 10

export class RedditCollector implements Collector {
  readonly source = 'reddit' as const
  readonly tier = 2
  private readonly fetchFn: FetchFn

  constructor(fetchFn: FetchFn = globalThis.fetch.bind(globalThis)) {
    this.fetchFn = fetchFn
  }

  async collect(): Promise<RawCollectedItem[]> {
    const allItems: RawCollectedItem[] = []
    const seenUrls = new Set<string>()

    for (const sub of SUBREDDITS) {
      try {
        const res = await this.fetchFn(
          `https://www.reddit.com/r/${sub}/hot.json?limit=${POSTS_PER_SUB}`,
          { headers: { 'User-Agent': 'TechPulse/1.0' } },
        )
        if (!res.ok) continue

        const data = await res.json()
        const posts = data?.data?.children ?? []

        for (const post of posts) {
          const d = post.data
          if (!d || d.stickied) continue
          const url = d.url ?? `https://reddit.com${d.permalink}`
          if (seenUrls.has(url)) continue
          seenUrls.add(url)

          allItems.push({
            title: d.title,
            url,
            score: d.score ?? 0,
            author: d.author ?? '',
            description: d.selftext?.slice(0, 300) ?? '',
            metadata: {
              subreddit: sub,
              commentCount: d.num_comments ?? 0,
              permalink: `https://reddit.com${d.permalink}`,
              upvoteRatio: d.upvote_ratio,
            },
          })
        }
      } catch {
        // 개별 서브레딧 실패는 무시
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
        author: item.author ?? '',
        keywords,
        category: categorize(keywords),
        collectedAt: now,
        metadata: item.metadata ?? {},
      }
    })
  }
}
