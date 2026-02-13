import type { Collector, RawCollectedItem, NormalizedItem, FetchFn } from './types'
import { extractKeywords, categorize } from '@/services/keywordExtractor'

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'
const MAX_RESULTS = 25
const SEARCH_QUERIES = ['programming', 'software development', 'tech news', 'AI coding']

interface YouTubeSearchItem {
  id: { videoId: string }
  snippet: {
    title: string
    description: string
    channelTitle: string
    publishedAt: string
    thumbnails: { medium?: { url: string } }
  }
}

interface YouTubeSearchResponse {
  items: YouTubeSearchItem[]
}

export class YouTubeCollector implements Collector {
  readonly source = 'youtube' as const
  readonly tier = 1
  private readonly fetchFn: FetchFn
  private readonly apiKey: string

  constructor(apiKey?: string, fetchFn: FetchFn = globalThis.fetch.bind(globalThis)) {
    this.apiKey = apiKey ?? (typeof process !== 'undefined' ? process.env.YOUTUBE_API_KEY ?? '' : '')
    this.fetchFn = fetchFn
  }

  async collect(): Promise<RawCollectedItem[]> {
    if (!this.apiKey) {
      throw new Error('YOUTUBE_API_KEY is not configured')
    }

    const allItems: RawCollectedItem[] = []
    const seenUrls = new Set<string>()

    // 여러 검색 쿼리로 다양한 결과 수집
    for (const query of SEARCH_QUERIES) {
      const params = new URLSearchParams({
        part: 'snippet',
        q: query,
        type: 'video',
        order: 'viewCount',
        maxResults: String(MAX_RESULTS),
        relevanceLanguage: 'en',
        publishedAfter: getOneDayAgo(),
        key: this.apiKey,
      })

      const res = await this.fetchFn(`${YOUTUBE_API_BASE}/search?${params}`)
      if (!res.ok) {
        // 쿼타 초과 등 에러 시 다음 쿼리로 넘어감
        console.warn(`YouTube search failed for "${query}": ${res.status}`)
        continue
      }

      const data: YouTubeSearchResponse = await res.json()

      for (const item of data.items ?? []) {
        const url = `https://www.youtube.com/watch?v=${item.id.videoId}`
        if (seenUrls.has(url)) continue
        seenUrls.add(url)

        allItems.push({
          title: item.snippet.title,
          url,
          description: item.snippet.description,
          author: item.snippet.channelTitle,
          metadata: {
            videoId: item.id.videoId,
            publishedAt: item.snippet.publishedAt,
            thumbnail: item.snippet.thumbnails?.medium?.url,
          },
        })
      }
    }

    return allItems
  }

  normalize(raw: RawCollectedItem[]): NormalizedItem[] {
    const now = new Date().toISOString()

    return raw.map((item) => {
      const text = [item.title, item.description].filter(Boolean).join(' ')
      const keywords = extractKeywords(text)
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

/** 24시간 전 ISO 문자열 (YouTube publishedAfter 파라미터용) */
function getOneDayAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString()
}
