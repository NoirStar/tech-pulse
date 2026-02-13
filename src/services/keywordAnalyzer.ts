import type { Category, Source } from '@/types'
import type { NormalizedItem } from './collectors'

// ─── 키워드 집계 스냅샷 ───────────────────────────────

/** 특정 시점의 키워드 등장 기록 */
export interface KeywordMention {
  keyword: string
  source: Source
  score: number
  timestamp: string // ISO 8601
}

/** 키워드 빈도 집계 결과 */
export interface KeywordFrequency {
  keyword: string
  category: Category
  totalMentions: number
  totalScore: number
  /** 소스별 등장 횟수 */
  sourceBreakdown: Partial<Record<Source, number>>
  /** 시간대별 등장 횟수 (1h 버킷) */
  hourlyBuckets: Map<string, number>
  /** 최초 / 최근 등장 시각 */
  firstSeen: string
  lastSeen: string
}

// ─── 빈도 분석기 ───────────────────────────────────

/**
 * NormalizedItem[] → 키워드별 빈도 집계.
 * 모든 아이템의 keywords를 펼쳐서 소스별·시간대별로 그룹화한다.
 */
export function aggregateKeywords(items: NormalizedItem[]): KeywordFrequency[] {
  const map = new Map<string, KeywordFrequency>()

  for (const item of items) {
    const ts = item.collectedAt
    const hourKey = toHourBucket(ts)

    for (const kw of item.keywords) {
      let entry = map.get(kw)
      if (!entry) {
        entry = {
          keyword: kw,
          category: item.category,
          totalMentions: 0,
          totalScore: 0,
          sourceBreakdown: {},
          hourlyBuckets: new Map(),
          firstSeen: ts,
          lastSeen: ts,
        }
        map.set(kw, entry)
      }

      entry.totalMentions += 1
      entry.totalScore += item.score ?? 0
      entry.sourceBreakdown[item.source] = (entry.sourceBreakdown[item.source] ?? 0) + 1
      entry.hourlyBuckets.set(hourKey, (entry.hourlyBuckets.get(hourKey) ?? 0) + 1)

      if (ts < entry.firstSeen) entry.firstSeen = ts
      if (ts > entry.lastSeen) entry.lastSeen = ts
    }
  }

  return [...map.values()]
}

/**
 * 키워드 빈도를 totalMentions 기준 내림차순 정렬 후 상위 N개 반환.
 */
export function topKeywords(frequencies: KeywordFrequency[], limit = 50): KeywordFrequency[] {
  return frequencies
    .slice()
    .sort((a, b) => b.totalMentions - a.totalMentions || b.totalScore - a.totalScore)
    .slice(0, limit)
}

/**
 * 카테고리 필터링.
 */
export function filterByCategory(
  frequencies: KeywordFrequency[],
  category: Category,
): KeywordFrequency[] {
  return frequencies.filter((f) => f.category === category)
}

/**
 * 소스 필터링: 특정 소스에서 등장한 키워드만.
 */
export function filterBySource(
  frequencies: KeywordFrequency[],
  source: Source,
): KeywordFrequency[] {
  return frequencies.filter((f) => (f.sourceBreakdown[source] ?? 0) > 0)
}

// ─── 유틸 ────────────────────────────────────────────

/** ISO 타임스탬프 → 시간 버킷 키 ("2025-06-01T14") */
export function toHourBucket(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 13) // "YYYY-MM-DDTHH"
}
