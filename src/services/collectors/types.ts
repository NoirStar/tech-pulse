import type { Source, Category } from '@/types'

/** 수집기가 반환하는 가공 전 원본 아이템 */
export interface RawCollectedItem {
  title: string
  url: string
  score?: number
  description?: string
  author?: string
  metadata?: Record<string, unknown>
}

/** 정규화된 수집 아이템 (DB 저장 직전 형태) */
export interface NormalizedItem {
  source: Source
  title: string
  url: string
  score: number
  description: string
  author: string
  keywords: string[]
  category: Category
  collectedAt: string // ISO 8601
  metadata: Record<string, unknown>
}

/** 모든 수집기가 구현해야 하는 인터페이스 */
export interface Collector {
  readonly source: Source
  readonly tier: number

  /** 외부 소스에서 원본 데이터 수집 */
  collect(): Promise<RawCollectedItem[]>

  /** RawCollectedItem → NormalizedItem 변환 */
  normalize(raw: RawCollectedItem[]): NormalizedItem[]
}

/** 수집 실행 결과 (로깅/모니터링용) */
export interface CollectionResult {
  source: Source
  status: 'success' | 'error' | 'partial'
  itemsCount: number
  durationMs: number
  error?: string
}

/** fetch 함수 시그니처 (테스트에서 목 주입용) */
export type FetchFn = typeof globalThis.fetch
