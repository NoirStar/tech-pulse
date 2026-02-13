import type { Collector, RawCollectedItem, NormalizedItem, FetchFn } from './types'
import { extractKeywords, categorize } from '@/services/keywordExtractor'

/**
 * Stack Overflow 수집기
 * Stack Exchange API v2.3 (무료, 일 300회 제한 / 키 있으면 10K)
 * 인기 질문과 답변을 수집한다.
 */

const SO_API = 'https://api.stackexchange.com/2.3'

interface SOQuestion {
  question_id: number
  title: string
  link: string
  score: number
  answer_count: number
  view_count: number
  tags: string[]
  owner: { display_name: string }
  creation_date: number
}

export class StackOverflowCollector implements Collector {
  readonly source = 'stackoverflow' as const
  readonly tier = 2
  private readonly fetchFn: FetchFn
  private readonly apiKey: string

  constructor(apiKey?: string, fetchFn: FetchFn = globalThis.fetch.bind(globalThis)) {
    this.apiKey = apiKey ?? (typeof process !== 'undefined' ? process.env.SO_API_KEY ?? '' : '')
    this.fetchFn = fetchFn
  }

  async collect(): Promise<RawCollectedItem[]> {
    const params = new URLSearchParams({
      order: 'desc',
      sort: 'hot',
      site: 'stackoverflow',
      pagesize: '30',
      filter: 'default',
    })
    if (this.apiKey) params.set('key', this.apiKey)

    const res = await this.fetchFn(`${SO_API}/questions?${params}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`Stack Overflow API failed: ${res.status}`)

    const data = await res.json()
    const questions: SOQuestion[] = data?.items ?? []

    return questions.map((q) => ({
      title: decodeEntities(q.title),
      url: q.link,
      score: q.score,
      author: q.owner?.display_name ?? '',
      description: '',
      metadata: {
        questionId: q.question_id,
        tags: q.tags,
        answerCount: q.answer_count,
        viewCount: q.view_count,
        createdAt: q.creation_date,
      },
    }))
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

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}
