import * as cheerio from 'cheerio'
import type { Collector, RawCollectedItem, NormalizedItem, FetchFn } from './types'
import { extractKeywords, categorize } from '@/services/keywordExtractor'

const GITHUB_TRENDING_URL = 'https://github.com/trending'

interface TrendingRepo {
  name: string // owner/repo
  url: string
  description: string
  language: string
  stars: number
  todayStars: number
  forks: number
}

export class GitHubTrendingCollector implements Collector {
  readonly source = 'github' as const
  readonly tier = 1
  private readonly fetchFn: FetchFn

  constructor(fetchFn: FetchFn = globalThis.fetch.bind(globalThis)) {
    this.fetchFn = fetchFn
  }

  async collect(): Promise<RawCollectedItem[]> {
    const res = await this.fetchFn(GITHUB_TRENDING_URL, {
      headers: {
        'User-Agent': 'TechPulse/1.0 (trend-aggregator)',
        Accept: 'text/html',
      },
    })
    if (!res.ok) throw new Error(`GitHub Trending fetch failed: ${res.status}`)

    const html = await res.text()
    const repos = this.parseHTML(html)

    return repos.map((repo) => ({
      title: repo.name,
      url: repo.url,
      score: repo.stars,
      description: repo.description,
      metadata: {
        language: repo.language,
        todayStars: repo.todayStars,
        forks: repo.forks,
      },
    }))
  }

  /** GitHub Trending 페이지 HTML을 파싱하여 레포 목록 추출 */
  parseHTML(html: string): TrendingRepo[] {
    const $ = cheerio.load(html)
    const repos: TrendingRepo[] = []

    $('article.Box-row').each((_, el) => {
      const $el = $(el)

      // 레포 이름: h2 > a 의 href
      const repoPath = $el.find('h2 a').attr('href')?.trim() ?? ''
      const name = repoPath.replace(/^\//, '') // "/owner/repo" → "owner/repo"
      const url = repoPath ? `https://github.com${repoPath}` : ''

      // 설명
      const description = $el.find('p.col-9').text().trim()

      // 언어
      const language = $el.find('[itemprop="programmingLanguage"]').text().trim()

      // 전체 스타 수
      const starsText = $el.find('a[href$="/stargazers"]').text().trim().replace(/,/g, '')
      const stars = parseInt(starsText, 10) || 0

      // 오늘 스타 수
      const todayText = $el.find('.float-sm-right, .d-inline-block.float-sm-right').text().trim()
      const todayMatch = todayText.match(/([\d,]+)\s+stars?\s+today/i)
      const todayStars = todayMatch ? parseInt(todayMatch[1].replace(/,/g, ''), 10) : 0

      // 포크 수
      const forksText = $el.find('a[href$="/forks"]').text().trim().replace(/,/g, '')
      const forks = parseInt(forksText, 10) || 0

      if (name && url) {
        repos.push({ name, url, description, language, stars, todayStars, forks })
      }
    })

    return repos
  }

  normalize(raw: RawCollectedItem[]): NormalizedItem[] {
    const now = new Date().toISOString()

    return raw.map((item) => {
      const text = [item.title, item.description, (item.metadata?.language as string) ?? '']
        .filter(Boolean)
        .join(' ')
      const keywords = extractKeywords(text)
      const category = categorize(keywords)

      return {
        source: this.source,
        title: item.title,
        url: item.url,
        score: item.score ?? 0,
        description: item.description ?? '',
        author: item.title.split('/')[0] ?? '',
        keywords,
        category,
        collectedAt: now,
        metadata: item.metadata ?? {},
      }
    })
  }
}
