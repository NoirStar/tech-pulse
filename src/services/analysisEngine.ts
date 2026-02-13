import type { KeywordTrend, HotKeyword } from '@/types'
import type { NormalizedItem } from './collectors'
import {
  aggregateKeywords,
  topKeywords,
  type KeywordFrequency,
} from './keywordAnalyzer'
import {
  calculateTrendScores,
  rankByScore,
  toKeywordTrend,
  toHotKeywords,
  type TrendScore,
} from './trendScorer'
import {
  detectSurges,
  buildPrevMentionMap,
  type SurgeAlert,
  type SurgeConfig,
} from './surgeDetector'
import {
  detectCrossSourceSpreads,
  analyzeSourceCorrelations,
  getViralTrends,
  type CrossSourceSpread,
  type SourceCorrelation,
} from './crossSourceAnalyzer'

// ─── 분석 결과 ───────────────────────────────────────

export interface AnalysisResult {
  /** 키워드별 빈도 집계 (전체) */
  frequencies: KeywordFrequency[]
  /** 상위 키워드 빈도 (limit 적용) */
  topFrequencies: KeywordFrequency[]
  /** 트렌드 점수 순위 */
  trendScores: TrendScore[]
  /** UI용 KeywordTrend (시계열 포함) */
  keywordTrends: KeywordTrend[]
  /** 급상승 키워드 */
  hotKeywords: HotKeyword[]
  /** 급상승 알림 */
  surgeAlerts: SurgeAlert[]
  /** 교차 소스 확산 키워드 */
  crossSourceSpreads: CrossSourceSpread[]
  /** 소스 간 상관 관계 */
  sourceCorrelations: SourceCorrelation[]
  /** 바이럴 트렌드 (확산 + 고점수) */
  viralTrends: (CrossSourceSpread & { trendScore: number })[]
  /** 분석 메타데이터 */
  meta: {
    totalItems: number
    uniqueKeywords: number
    analyzedAt: string
    durationMs: number
  }
}

export interface AnalysisOptions {
  /** 상위 키워드 수 (기본 50) */
  topKeywordsLimit?: number
  /** 급상승 키워드 수 (기본 20) */
  hotKeywordsLimit?: number
  /** 바이럴 트렌드 수 (기본 10) */
  viralLimit?: number
  /** 교차 소스 최소 소스 수 (기본 3) */
  minCrossSources?: number
  /** 급상승 감지 설정 */
  surgeConfig?: Partial<SurgeConfig>
}

// ─── 분석 파이프라인 ────────────────────────────────

/**
 * 수집된 NormalizedItem[]을 받아 전체 분석 파이프라인을 실행한다.
 *
 * 흐름: aggregate → score → surge detect → cross-source → 통합
 *
 * @param currentItems - 현재 구간 수집 아이템
 * @param prevItems - 이전 구간 수집 아이템 (velocity 계산용, 선택)
 * @param options - 분석 옵션
 */
export function runAnalysis(
  currentItems: NormalizedItem[],
  prevItems?: NormalizedItem[],
  options: AnalysisOptions = {},
): AnalysisResult {
  const start = Date.now()

  const {
    topKeywordsLimit = 50,
    hotKeywordsLimit = 20,
    viralLimit = 10,
    minCrossSources = 3,
    surgeConfig,
  } = options

  // 1) 키워드 빈도 집계
  const frequencies = aggregateKeywords(currentItems)
  const topFrequencies = topKeywords(frequencies, topKeywordsLimit)

  // 2) 이전 구간 빈도 (있으면)
  const prevFrequencies = prevItems ? aggregateKeywords(prevItems) : undefined

  // 3) 트렌드 점수 계산
  const trendScores = rankByScore(calculateTrendScores(frequencies, prevFrequencies))

  // 4) UI용 KeywordTrend 변환 (상위 키워드만)
  const scoreMap = new Map(trendScores.map((s) => [s.keyword, s]))
  const keywordTrends = topFrequencies.map((freq) => {
    const score = scoreMap.get(freq.keyword)
    return toKeywordTrend(freq, score ?? {
      keyword: freq.keyword,
      category: freq.category,
      score: 0,
      mentionScore: 0,
      sourceQualityScore: 0,
      crossSourceScore: 0,
      sourceCount: 0,
      velocity: 0,
      isSpreading: false,
    })
  })

  // 5) 급상승 키워드
  const hotKeywords = toHotKeywords(trendScores, frequencies, hotKeywordsLimit)

  // 6) 급상승 알림
  const prevMentionMap = prevFrequencies
    ? buildPrevMentionMap(prevFrequencies)
    : new Map<string, number>()
  const surgeAlerts = detectSurges(trendScores, prevMentionMap, {
    velocityThreshold: surgeConfig?.velocityThreshold ?? 50,
    minMentions: surgeConfig?.minMentions ?? 3,
    minSources: surgeConfig?.minSources ?? 2,
  })

  // 7) 교차 소스 분석
  const crossSourceSpreads = detectCrossSourceSpreads(frequencies, minCrossSources)
  const sourceCorrelations = analyzeSourceCorrelations(frequencies)
  const viralTrends = getViralTrends(crossSourceSpreads, trendScores, viralLimit)

  const durationMs = Date.now() - start

  return {
    frequencies,
    topFrequencies,
    trendScores,
    keywordTrends,
    hotKeywords,
    surgeAlerts,
    crossSourceSpreads,
    sourceCorrelations,
    viralTrends,
    meta: {
      totalItems: currentItems.length,
      uniqueKeywords: frequencies.length,
      analyzedAt: new Date().toISOString(),
      durationMs,
    },
  }
}
