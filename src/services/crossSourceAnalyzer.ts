import type { Source, Category } from '@/types'
import type { KeywordFrequency } from './keywordAnalyzer'
import type { TrendScore } from './trendScorer'

// ─── 교차 분석 결과 ──────────────────────────────────

/** 소스 간 키워드 확산 정보 */
export interface CrossSourceSpread {
  keyword: string
  category: Category
  /** 등장한 소스 목록 + 각 소스의 멘션 수 */
  sources: { source: Source; mentions: number }[]
  /** 총 소스 수 */
  sourceCount: number
  /** 확산 점수: sourceCount × 평균 멘션 */
  spreadScore: number
  /** 확산 수준 */
  spreadLevel: 'emerging' | 'growing' | 'viral'
}

/** 소스 간 상관 관계 */
export interface SourceCorrelation {
  sourceA: Source
  sourceB: Source
  /** 공통 키워드 수 */
  sharedKeywords: number
  /** 공통 키워드 비율 (Jaccard similarity) */
  similarity: number
}

// ─── 교차 분석 엔진 ─────────────────────────────────

/**
 * 여러 소스에서 동시 급상승하는 키워드를 감지.
 * "3개 이상 소스에서 등장 = 확산 중"
 *
 * @param frequencies - aggregateKeywords()의 결과
 * @param minSources - 최소 소스 수 (기본 3)
 */
export function detectCrossSourceSpreads(
  frequencies: KeywordFrequency[],
  minSources = 3,
): CrossSourceSpread[] {
  const results: CrossSourceSpread[] = []

  for (const freq of frequencies) {
    const sourcePairs = Object.entries(freq.sourceBreakdown) as [Source, number][]
    if (sourcePairs.length < minSources) continue

    const sources = sourcePairs.map(([source, mentions]) => ({ source, mentions }))
    const avgMentions = freq.totalMentions / sourcePairs.length
    const spreadScore = Math.round(sourcePairs.length * avgMentions * 100) / 100

    results.push({
      keyword: freq.keyword,
      category: freq.category,
      sources,
      sourceCount: sourcePairs.length,
      spreadScore,
      spreadLevel: classifySpreadLevel(sourcePairs.length, avgMentions),
    })
  }

  return results.sort((a, b) => b.spreadScore - a.spreadScore)
}

/**
 * 소스 간 상관 관계 분석.
 * 두 소스가 공통으로 언급하는 키워드가 많을수록 유사도가 높다.
 */
export function analyzeSourceCorrelations(
  frequencies: KeywordFrequency[],
): SourceCorrelation[] {
  // 소스 → 키워드 Set
  const sourceKeywords = new Map<Source, Set<string>>()

  for (const freq of frequencies) {
    for (const src of Object.keys(freq.sourceBreakdown) as Source[]) {
      if (!sourceKeywords.has(src)) sourceKeywords.set(src, new Set())
      sourceKeywords.get(src)!.add(freq.keyword)
    }
  }

  const sources = [...sourceKeywords.keys()]
  const correlations: SourceCorrelation[] = []

  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const setA = sourceKeywords.get(sources[i])!
      const setB = sourceKeywords.get(sources[j])!

      const shared = [...setA].filter((kw) => setB.has(kw)).length
      const union = new Set([...setA, ...setB]).size
      const similarity = union > 0 ? Math.round((shared / union) * 1000) / 1000 : 0

      if (shared > 0) {
        correlations.push({
          sourceA: sources[i],
          sourceB: sources[j],
          sharedKeywords: shared,
          similarity,
        })
      }
    }
  }

  return correlations.sort((a, b) => b.similarity - a.similarity)
}

/**
 * 특정 키워드가 어떤 소스 조합에서 등장했는지 분석.
 */
export function getKeywordSourceMap(
  frequencies: KeywordFrequency[],
  keyword: string,
): { source: Source; mentions: number; percentage: number }[] | null {
  const freq = frequencies.find((f) => f.keyword === keyword)
  if (!freq) return null

  const entries = Object.entries(freq.sourceBreakdown) as [Source, number][]
  const total = freq.totalMentions

  return entries
    .map(([source, mentions]) => ({
      source,
      mentions,
      percentage: Math.round((mentions / total) * 100),
    }))
    .sort((a, b) => b.mentions - a.mentions)
}

/**
 * 트렌드 점수가 높으면서 확산 중인 키워드 (종합 분석용).
 */
export function getViralTrends(
  spreads: CrossSourceSpread[],
  scores: TrendScore[],
  limit = 10,
): (CrossSourceSpread & { trendScore: number })[] {
  const scoreMap = new Map(scores.map((s) => [s.keyword, s.score]))

  return spreads
    .map((spread) => ({
      ...spread,
      trendScore: scoreMap.get(spread.keyword) ?? 0,
    }))
    .sort((a, b) => b.trendScore * b.spreadScore - a.trendScore * a.spreadScore)
    .slice(0, limit)
}

// ─── 유틸 ────────────────────────────────────────────

function classifySpreadLevel(
  sourceCount: number,
  avgMentions: number,
): 'emerging' | 'growing' | 'viral' {
  if (sourceCount >= 6 && avgMentions >= 3) return 'viral'
  if (sourceCount >= 4 || avgMentions >= 5) return 'growing'
  return 'emerging'
}
