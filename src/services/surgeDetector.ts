import type { TrendScore } from './trendScorer'

// ─── 급상승 감지 설정 ─────────────────────────────────

export interface SurgeConfig {
  /** velocity 임계값 (%): 이 이상이면 급상승으로 판정 */
  velocityThreshold: number
  /** 최소 멘션 수: 너무 적은 멘션은 노이즈이므로 무시 */
  minMentions: number
  /** 최소 소스 수: 단일 소스 급상승은 낮은 신뢰도 */
  minSources: number
}

export const DEFAULT_SURGE_CONFIG: SurgeConfig = {
  velocityThreshold: 50, // 50% 이상 증가
  minMentions: 3,
  minSources: 2,
}

// ─── 급상승 알림 ──────────────────────────────────────

export type SurgeLevel = 'spike' | 'surge' | 'explosion'

export interface SurgeAlert {
  keyword: string
  level: SurgeLevel
  velocity: number
  /** 현재 구간 멘션 수 */
  currentMentions: number
  /** 이전 구간 멘션 수 */
  previousMentions: number
  /** 등장 소스 수 */
  sourceCount: number
  /** 여러 소스에서 동시 확산 중인지 */
  isSpreading: boolean
  /** 트렌드 점수 */
  trendScore: number
  detectedAt: string
}

// ─── 급상승 감지 알고리즘 ─────────────────────────────

/**
 * 현재·이전 TrendScore를 비교하여 급상승 키워드를 감지한다.
 *
 * 전략:
 * 1. velocity ≥ threshold → 급상승 후보
 * 2. 최소 멘션 필터 → 노이즈 제거
 * 3. 최소 소스 필터 → 단일 소스 급등 제거
 * 4. level 분류: spike (50%+) / surge (200%+) / explosion (500%+)
 *
 * @param currentScores - 현재 구간 TrendScore[]
 * @param prevMentionMap - 이전 구간 키워드별 멘션 수
 * @param config - 급상승 임계값 설정
 */
export function detectSurges(
  currentScores: TrendScore[],
  prevMentionMap: Map<string, number>,
  config: SurgeConfig = DEFAULT_SURGE_CONFIG,
): SurgeAlert[] {
  const now = new Date().toISOString()
  const alerts: SurgeAlert[] = []

  for (const score of currentScores) {
    const prev = prevMentionMap.get(score.keyword) ?? 0
    const current = Math.round(
      score.mentionScore > 0 ? Math.pow(2, score.mentionScore / 10) - 1 : 0,
    )

    // velocity 재계산 (원본 멘션 사용)
    const velocity = prev > 0 ? ((current - prev) / prev) * 100 : current > 0 ? 100 : 0

    if (velocity < config.velocityThreshold) continue
    if (current < config.minMentions) continue
    if (score.sourceCount < config.minSources) continue

    alerts.push({
      keyword: score.keyword,
      level: classifySurgeLevel(velocity),
      velocity: Math.round(velocity * 100) / 100,
      currentMentions: current,
      previousMentions: prev,
      sourceCount: score.sourceCount,
      isSpreading: score.isSpreading,
      trendScore: score.score,
      detectedAt: now,
    })
  }

  // 트렌드 점수 기준 내림차순 정렬
  return alerts.sort((a, b) => b.trendScore - a.trendScore)
}

/**
 * 이전 구간 키워드 빈도를 Map으로 변환 (detectSurges 입력용).
 */
export function buildPrevMentionMap(
  prevItems: { keyword: string; totalMentions: number }[],
): Map<string, number> {
  const map = new Map<string, number>()
  for (const item of prevItems) {
    map.set(item.keyword, item.totalMentions)
  }
  return map
}

/** velocity → 급상승 수준 분류 */
function classifySurgeLevel(velocity: number): SurgeLevel {
  if (velocity >= 500) return 'explosion'
  if (velocity >= 200) return 'surge'
  return 'spike'
}
