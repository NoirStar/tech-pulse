import type { Collector } from './types'
import type { Source } from '@/types'
import { HackerNewsCollector } from './hackerNews'
import { GitHubTrendingCollector } from './github'
import { YouTubeCollector } from './youtube'
import { GoogleTrendsCollector } from './googleTrends'
import { GoogleSearchCollector } from './googleSearch'
import { RedditCollector } from './reddit'
import { ProductHuntCollector } from './producthunt'
import { DevtoCollector } from './devto'
import { MediumCollector } from './medium'
import { StackOverflowCollector } from './stackoverflow'
import { XTwitterCollector } from './xTwitter'
import { GeekNewsCollector } from './geeknews'
import { NaverCollector } from './naver'
import { TechBlogCollector } from './techBlog'
import { YozmCollector } from './yozm'
import { CodenaryCollector } from './codenary'

export type { Collector, RawCollectedItem, NormalizedItem, CollectionResult, FetchFn } from './types'

/**
 * Tier 1 수집기 (MVP 핵심)
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

/**
 * Tier 2 수집기 (글로벌 확장)
 */
export function createTier2Collectors(): Collector[] {
  return [
    new RedditCollector(),
    new ProductHuntCollector(),
    new DevtoCollector(),
    new MediumCollector(),
    new StackOverflowCollector(),
    new XTwitterCollector(),
  ]
}

/**
 * Tier 3 수집기 (한국 소스)
 */
export function createTier3Collectors(): Collector[] {
  return [
    new GeekNewsCollector(),
    new NaverCollector(),
    new TechBlogCollector('kakao-tech'),
    new YozmCollector(),
    new CodenaryCollector(),
  ]
}

/**
 * 전체 수집기 (Tier 1 + 2 + 3)
 */
export function createAllCollectors(): Collector[] {
  return [...createTier1Collectors(), ...createTier2Collectors(), ...createTier3Collectors()]
}

/** 특정 소스의 수집기 인스턴스를 생성 */
export function createCollector(source: Source): Collector | null {
  const map: Partial<Record<Source, () => Collector>> = {
    hackernews: () => new HackerNewsCollector(),
    github: () => new GitHubTrendingCollector(),
    youtube: () => new YouTubeCollector(),
    'google-trends': () => new GoogleTrendsCollector(),
    'google-search': () => new GoogleSearchCollector(),
    reddit: () => new RedditCollector(),
    producthunt: () => new ProductHuntCollector(),
    devto: () => new DevtoCollector(),
    medium: () => new MediumCollector(),
    stackoverflow: () => new StackOverflowCollector(),
    'x-twitter': () => new XTwitterCollector(),
    geeknews: () => new GeekNewsCollector(),
    naver: () => new NaverCollector(),
    'kakao-tech': () => new TechBlogCollector('kakao-tech'),
    'toss-tech': () => new TechBlogCollector('toss-tech'),
    yozm: () => new YozmCollector(),
    codenary: () => new CodenaryCollector(),
  }

  const factory = map[source]
  return factory ? factory() : null
}

// 개별 수집기 re-export
export { HackerNewsCollector } from './hackerNews'
export { GitHubTrendingCollector } from './github'
export { YouTubeCollector } from './youtube'
export { GoogleTrendsCollector } from './googleTrends'
export { GoogleSearchCollector } from './googleSearch'
export { RedditCollector } from './reddit'
export { ProductHuntCollector } from './producthunt'
export { DevtoCollector } from './devto'
export { MediumCollector } from './medium'
export { StackOverflowCollector } from './stackoverflow'
export { XTwitterCollector } from './xTwitter'
export { GeekNewsCollector } from './geeknews'
export { NaverCollector } from './naver'
export { TechBlogCollector } from './techBlog'
export { YozmCollector } from './yozm'
export { CodenaryCollector } from './codenary'
