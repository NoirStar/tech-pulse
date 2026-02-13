import type { Category, Source, KeywordTrend, HotKeyword } from '@/types'
import type { KeywordFrequency } from './keywordAnalyzer'

// ─── 트렌드 점수 가중치 ────────────────────────────

/** 소스 Tier별 가중치 (Tier 1이 높은 점수) */
const SOURCE_WEIGHT: Partial<Record<Source, number>> = {
  hackernews: 3,
  github: 3,
  youtube: 2.5,
  'google-trends': 3,
  'google-search': 2,
  reddit: 2,
  producthunt: 2,
  devto: 1.5,
  medium: 1.5,
  stackoverflow: 2,
  'x-twitter': 2,
  geeknews: 1.5,
  naver: 1.5,
  'kakao-tech': 1,
  'toss-tech': 1,
  yozm: 1,
  codenary: 1,
}

/** 교차 소스 보너스: 여러 소스에서 동시 등장할수록 점수 상승 */
const CROSS_SOURCE_BONUS = [0, 0, 1.2, 1.5, 2.0, 2.5, 3.0] // index = sourceCount

function getCrossSourceMultiplier(sourceCount: number): number {
  if (sourceCount >= CROSS_SOURCE_BONUS.length) return 3.5
  return CROSS_SOURCE_BONUS[sourceCount] || 1
}

// ─── 트렌드 점수 계산 ────────────────────────────────

export interface TrendScore {
  keyword: string
  category: Category
  /** 최종 트렌드 점수 (높을수록 화제) */
  score: number
  /** 언급 빈도 기반 점수 */
  mentionScore: number
  /** 소스 품질 가중 점수 */
  sourceQualityScore: number
  /** 교차 소스 보너스 점수 */
  crossSourceScore: number
  /** 등장 소스 수 */
  sourceCount: number
  /** 속도 (velocity): 최근 기간 대비 증가율 */
  velocity: number
  /** 확산 여부 (3개 이상 소스에서 동시 등장) */
  isSpreading: boolean
}

/**
 * KeywordFrequency[] → TrendScore[].
 * 멘션 + 소스 품질 가중치 + 교차 소스 보너스를 합산한다.
 *
 * @param frequencies - aggregateKeywords()의 결과
 * @param prevFrequencies - 이전 구간의 빈도 (velocity 계산용, 선택)
 */
export function calculateTrendScores(
  frequencies: KeywordFrequency[],
  prevFrequencies?: KeywordFrequency[],
): TrendScore[] {
  const prevMap = new Map<string, number>()
  if (prevFrequencies) {
    for (const f of prevFrequencies) {
      prevMap.set(f.keyword, f.totalMentions)
    }
  }

  return frequencies.map((freq) => {
    // 1) 멘션 점수: log 스케일 (대형 키워드 과대평가 방지)
    const mentionScore = Math.log2(freq.totalMentions + 1) * 10

    // 2) 소스 품질 가중치: 각 소스 가중치 × 해당 소스 멘션 합
    let sourceQualityScore = 0
    let sourceCount = 0
    for (const [src, count] of Object.entries(freq.sourceBreakdown) as [Source, number][]) {
      const weight = SOURCE_WEIGHT[src] ?? 1
      sourceQualityScore += count * weight
      sourceCount++
    }

    // 3) 교차 소스 보너스
    const crossMultiplier = getCrossSourceMultiplier(sourceCount)
    const crossSourceScore = sourceQualityScore * (crossMultiplier - 1)

    // 4) 속도(velocity): (현재 - 이전) / 이전 × 100
    const prevMentions = prevMap.get(freq.keyword) ?? 0
    const velocity =
      prevMentions > 0
        ? ((freq.totalMentions - prevMentions) / prevMentions) * 100
        : freq.totalMentions > 0
          ? 100 // 새로 등장 = 100% 증가
          : 0

    const score = mentionScore + sourceQualityScore + crossSourceScore

    return {
      keyword: freq.keyword,
      category: freq.category,
      score: Math.round(score * 100) / 100,
      mentionScore: Math.round(mentionScore * 100) / 100,
      sourceQualityScore: Math.round(sourceQualityScore * 100) / 100,
      crossSourceScore: Math.round(crossSourceScore * 100) / 100,
      sourceCount,
      velocity: Math.round(velocity * 100) / 100,
      isSpreading: sourceCount >= 3,
    }
  })
}

/**
 * TrendScore[] → 내림차순 정렬.
 */
export function rankByScore(scores: TrendScore[]): TrendScore[] {
  return scores.slice().sort((a, b) => b.score - a.score)
}

// ─── KeywordTrend / HotKeyword 변환 ──────────────────

/**
 * KeywordFrequency + TrendScore → KeywordTrend (UI용).
 */
export function toKeywordTrend(freq: KeywordFrequency, trendScore: TrendScore): KeywordTrend {
  const hourlyMentions = [...freq.hourlyBuckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, count]) => ({ hour, count }))

  const sources = (Object.entries(freq.sourceBreakdown) as [Source, number][]).map(
    ([source, count]) => ({ source, count }),
  )

  return {
    keyword: freq.keyword,
    category: freq.category,
    hourlyMentions,
    dailyMentions: aggregateDailyFromHourly(hourlyMentions),
    sources,
    velocity: trendScore.velocity,
    totalMentions: freq.totalMentions,
    firstSeen: freq.firstSeen,
    lastSeen: freq.lastSeen,
  }
}

/**
 * TrendScore[] → HotKeyword[] (상위 N개, 급상승 기준).
 */
export function toHotKeywords(
  scores: TrendScore[],
  frequencies: KeywordFrequency[],
  limit = 20,
): HotKeyword[] {
  const freqMap = new Map(frequencies.map((f) => [f.keyword, f]))

  return rankByScore(scores)
    .slice(0, limit)
    .map((s, idx) => {
      const freq = freqMap.get(s.keyword)
      return {
        keyword: s.keyword,
        category: s.category,
        velocity: s.velocity,
        mentions: freq?.totalMentions ?? 0,
        sources: Object.keys(freq?.sourceBreakdown ?? {}) as Source[],
        rank: idx + 1,
      }
    })
}

// ─── 유틸 ────────────────────────────────────────────

function aggregateDailyFromHourly(
  hourly: { hour: string; count: number }[],
): { date: string; count: number }[] {
  const daily = new Map<string, number>()
  for (const { hour, count } of hourly) {
    const date = hour.slice(0, 10) // "YYYY-MM-DD"
    daily.set(date, (daily.get(date) ?? 0) + count)
  }
  return [...daily.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}
