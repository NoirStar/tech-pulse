import type { Source, Category } from './source'

// 수집된 원본 아이템
export interface TrendItem {
  id: string
  source: Source
  title: string
  url: string
  score: number // 소스별 인기 점수 (스타, 포인트, 투표 등)
  keywords: string[] // 추출된 키워드
  category: Category // 자동 분류된 카테고리
  collectedAt: string // ISO 8601
  description?: string
  imageUrl?: string
  author?: string
  metadata: Record<string, unknown> // 소스별 추가 정보
}

// 키워드 트렌드 집계
export interface KeywordTrend {
  keyword: string
  category: Category
  hourlyMentions: { hour: string; count: number }[]
  dailyMentions: { date: string; count: number }[]
  sources: { source: Source; count: number }[]
  velocity: number // 급상승 정도 (최근 변화율)
  totalMentions: number
  firstSeen: string
  lastSeen: string
}

// 급상승 키워드
export interface HotKeyword {
  keyword: string
  category: Category
  velocity: number // 변화율 (%)
  mentions: number
  sources: Source[]
  rank: number
}

// 소스별 피드 아이템 (UI용)
export interface FeedItem {
  id: string
  source: Source
  title: string
  url: string
  score: number
  timeAgo: string
  category: Category
  thumbnail?: string
}

// 대시보드 요약
export interface DashboardSummary {
  totalItems: number
  activeSources: number
  hotKeywordsCount: number
  lastUpdated: string
}
