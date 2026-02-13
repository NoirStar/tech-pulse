import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createCollector } from '../src/services/collectors'
import type { Source } from '../src/types/source'

const TIER1_SOURCES: Source[] = ['hackernews', 'github', 'youtube', 'google-trends', 'google-search']

/**
 * POST /api/collect/[source]
 * 특정 소스의 수집기를 수동 트리거한다.
 *
 * GET /api/collect/[source]
 * 해당 소스에서 최근 수집된 데이터를 조회한다 (TODO: DB 연동 후).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { source } = req.query
  const sourceId = (Array.isArray(source) ? source[0] : source) as Source

  if (!sourceId || !TIER1_SOURCES.includes(sourceId)) {
    return res.status(400).json({
      error: `Invalid source. Available: ${TIER1_SOURCES.join(', ')}`,
    })
  }

  if (req.method === 'POST') {
    return handleCollect(sourceId, res)
  }

  // GET: 소스 정보 반환 (DB 연동 전까지)
  return res.status(200).json({
    source: sourceId,
    status: 'ready',
    message: `Collector for "${sourceId}" is available. POST to trigger collection.`,
  })
}

async function handleCollect(sourceId: Source, res: VercelResponse) {
  const start = Date.now()
  const collector = createCollector(sourceId)

  if (!collector) {
    return res.status(404).json({ error: `No collector for source: ${sourceId}` })
  }

  try {
    const raw = await collector.collect()
    const normalized = collector.normalize(raw)
    const durationMs = Date.now() - start

    // TODO: Supabase에 저장 (Phase 1 DB 연동 시)

    return res.status(200).json({
      source: sourceId,
      status: 'success',
      itemsCount: normalized.length,
      durationMs,
      items: normalized.slice(0, 10), // 미리보기로 상위 10개만
    })
  } catch (err) {
    const durationMs = Date.now() - start
    return res.status(500).json({
      source: sourceId,
      status: 'error',
      durationMs,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
