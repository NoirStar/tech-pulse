import type { Collector, RawCollectedItem, NormalizedItem, FetchFn } from './types'
import { extractKeywords, categorize } from '@/services/keywordExtractor'

const HN_API = 'https://hacker-news.firebaseio.com/v0'
const TOP_STORIES_LIMIT = 30
const FETCH_CONCURRENCY = 10 // 한 번에 최대 10개 병렬 fetch

interface HNStory {
  id: number
  title: string
  url?: string
  score: number
  by: string
  time: number
  descendants?: number
  type: string
}

export class HackerNewsCollector implements Collector {
  readonly source = 'hackernews' as const
  readonly tier = 1
  private readonly fetchFn: FetchFn

  constructor(fetchFn: FetchFn = globalThis.fetch.bind(globalThis)) {
    this.fetchFn = fetchFn
  }

  async collect(): Promise<RawCollectedItem[]> {
    // 1) Top Stories ID 목록
    const res = await this.fetchFn(`${HN_API}/topstories.json`)
    if (!res.ok) throw new Error(`HN topstories failed: ${res.status}`)

    const storyIds: number[] = await res.json()
    const topIds = storyIds.slice(0, TOP_STORIES_LIMIT)

    // 2) 병렬로 스토리 상세 fetch (FETCH_CONCURRENCY 제한)
    const stories: HNStory[] = []
    for (let i = 0; i < topIds.length; i += FETCH_CONCURRENCY) {
      const batch = topIds.slice(i, i + FETCH_CONCURRENCY)
      const results = await Promise.allSettled(
        batch.map((id) =>
          this.fetchFn(`${HN_API}/item/${id}.json`).then((r) => r.json() as Promise<HNStory>),
        ),
      )
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value?.title) {
          stories.push(result.value)
        }
      }
    }

    // 3) RawCollectedItem으로 변환
    return stories.map((story) => ({
      title: story.title,
      url: story.url ?? `https://news.ycombinator.com/item?id=${story.id}`,
      score: story.score,
      author: story.by,
      description: '',
      metadata: {
        hnId: story.id,
        commentCount: story.descendants ?? 0,
        timestamp: story.time,
      },
    }))
  }

  normalize(raw: RawCollectedItem[]): NormalizedItem[] {
    const now = new Date().toISOString()

    return raw.map((item) => {
      const keywords = extractKeywords(item.title + ' ' + (item.description ?? ''))
      const category = categorize(keywords)

      return {
        source: this.source,
        title: item.title,
        url: item.url,
        score: item.score ?? 0,
        description: item.description ?? '',
        author: item.author ?? '',
        keywords,
        category,
        collectedAt: now,
        metadata: item.metadata ?? {},
      }
    })
  }
}
