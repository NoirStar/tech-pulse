import type { Collector, RawCollectedItem, NormalizedItem, FetchFn } from './types'
import { extractKeywords, categorize } from '@/services/keywordExtractor'

/**
 * Product Hunt 수집기
 * Product Hunt GraphQL API (Bearer token 필요) 사용.
 * 오늘의 인기 포스트를 수집한다.
 */

const PH_API = 'https://api.producthunt.com/v2/api/graphql'

const POSTS_QUERY = `
  query {
    posts(order: RANKING, first: 20) {
      edges {
        node {
          id
          name
          tagline
          url
          votesCount
          website
          topics { edges { node { name } } }
          makers { name }
        }
      }
    }
  }
`

interface PHNode {
  id: string
  name: string
  tagline: string
  url: string
  votesCount: number
  website: string
  topics: { edges: { node: { name: string } }[] }
  makers: { name: string }[]
}

export class ProductHuntCollector implements Collector {
  readonly source = 'producthunt' as const
  readonly tier = 2
  private readonly fetchFn: FetchFn
  private readonly token: string

  constructor(token?: string, fetchFn: FetchFn = globalThis.fetch.bind(globalThis)) {
    this.token = token ?? (typeof process !== 'undefined' ? process.env.PH_TOKEN ?? '' : '')
    this.fetchFn = fetchFn
  }

  async collect(): Promise<RawCollectedItem[]> {
    if (!this.token) throw new Error('PH_TOKEN is not configured')

    const res = await this.fetchFn(PH_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ query: POSTS_QUERY }),
    })
    if (!res.ok) throw new Error(`Product Hunt API failed: ${res.status}`)

    const data = await res.json()
    const edges = data?.data?.posts?.edges ?? []

    return edges.map((edge: { node: PHNode }) => {
      const n = edge.node
      const topics = n.topics?.edges?.map((e) => e.node.name) ?? []
      return {
        title: n.name,
        url: n.website || n.url,
        score: n.votesCount,
        description: n.tagline,
        author: n.makers?.[0]?.name ?? '',
        metadata: { phId: n.id, phUrl: n.url, topics },
      }
    })
  }

  normalize(raw: RawCollectedItem[]): NormalizedItem[] {
    const now = new Date().toISOString()
    return raw.map((item) => {
      const text = [item.title, item.description, ...((item.metadata?.topics as string[]) ?? [])]
        .filter(Boolean)
        .join(' ')
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
