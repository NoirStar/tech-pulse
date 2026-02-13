import type { Collector } from './types'
import type { Source } from '@/types'
import { HackerNewsCollector } from './hackerNews'
import { GitHubTrendingCollector } from './github'
import { YouTubeCollector } from './youtube'
import { GoogleTrendsCollector } from './googleTrends'
import { GoogleSearchCollector } from './googleSearch'

export type { Collector, RawCollectedItem, NormalizedItem, CollectionResult, FetchFn } from './types'

/**
 * Tier 1 수집기 레지스트리.
 * 새 수집기 추가 시 이 배열에 인스턴스만 추가하면 된다.
 * (Open/Closed Principle — 기존 코드 수정 없음)
 */
export function createTier1Collectors(): Collector[] {
  return [
    new HackerNewsCollector(),
    new GitHubTrendingCollector(),
    new YouTubeCollector(),
    new GoogleTrendsCollector(),
    new GoogleSearchCollector(),
  ]
}

/** 특정 소스의 수집기 인스턴스를 생성 */
export function createCollector(source: Source): Collector | null {
  switch (source) {
    case 'hackernews':
      return new HackerNewsCollector()
    case 'github':
      return new GitHubTrendingCollector()
    case 'youtube':
      return new YouTubeCollector()
    case 'google-trends':
      return new GoogleTrendsCollector()
    case 'google-search':
      return new GoogleSearchCollector()
    default:
      return null
  }
}

// 개별 수집기 클래스도 re-export
export { HackerNewsCollector } from './hackerNews'
export { GitHubTrendingCollector } from './github'
export { YouTubeCollector } from './youtube'
export { GoogleTrendsCollector } from './googleTrends'
export { GoogleSearchCollector } from './googleSearch'
