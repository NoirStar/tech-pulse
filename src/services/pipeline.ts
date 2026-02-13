import type { Collector, NormalizedItem, CollectionResult } from './collectors'

/**
 * 수집 파이프라인: collect → normalize → (save)
 *
 * 각 수집기를 독립 실행하고 결과를 집계한다.
 * 하나의 수집기가 실패해도 나머지는 계속 실행된다.
 */
export async function runPipeline(collectors: Collector[]): Promise<{
  items: NormalizedItem[]
  results: CollectionResult[]
}> {
  const allItems: NormalizedItem[] = []
  const results: CollectionResult[] = []

  // 모든 수집기를 병렬로 실행
  const settled = await Promise.allSettled(
    collectors.map(async (collector) => {
      const start = Date.now()
      try {
        const raw = await collector.collect()
        const normalized = collector.normalize(raw)
        const durationMs = Date.now() - start

        return {
          source: collector.source,
          items: normalized,
          result: {
            source: collector.source,
            status: 'success' as const,
            itemsCount: normalized.length,
            durationMs,
          },
        }
      } catch (err) {
        const durationMs = Date.now() - start
        return {
          source: collector.source,
          items: [] as NormalizedItem[],
          result: {
            source: collector.source,
            status: 'error' as const,
            itemsCount: 0,
            durationMs,
            error: err instanceof Error ? err.message : String(err),
          },
        }
      }
    }),
  )

  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      allItems.push(...outcome.value.items)
      results.push(outcome.value.result)
    }
  }

  // URL 기준 중복 제거 (먼저 수집된 것 우선)
  const deduped = deduplicateByUrl(allItems)

  return { items: deduped, results }
}

/** URL 기준 중복 제거 */
function deduplicateByUrl(items: NormalizedItem[]): NormalizedItem[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.url.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
