import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createTier1Collectors } from '../../src/services/collectors'
import { runPipeline } from '../../src/services/pipeline'

/**
 * GET /api/cron/collect-all
 *
 * Vercel Cron에 의해 1시간마다 호출된다.
 * Tier 1 전체 수집기를 병렬 실행하고 결과를 DB에 저장한다.
 *
 * vercel.json에서 스케줄 설정:
 * { "crons": [{ "path": "/api/cron/collect-all", "schedule": "0 * * * *" }] }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Cron 보안: Vercel Cron은 Authorization 헤더로 CRON_SECRET을 전송
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET

  // CRON_SECRET이 설정된 경우에만 검증 (개발환경에선 스킵)
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const start = Date.now()

  try {
    const collectors = createTier1Collectors()
    const { items, results } = await runPipeline(collectors)
    const durationMs = Date.now() - start

    // TODO: Supabase batch insert (Phase 1 DB 연동 시)

    const summary = {
      timestamp: new Date().toISOString(),
      totalItems: items.length,
      durationMs,
      collectors: results.map((r) => ({
        source: r.source,
        status: r.status,
        items: r.itemsCount,
        duration: r.durationMs,
        error: r.error,
      })),
    }

    console.log('[collect-all] Pipeline completed:', JSON.stringify(summary))

    return res.status(200).json(summary)
  } catch (err) {
    const durationMs = Date.now() - start
    console.error('[collect-all] Pipeline failed:', err)

    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 'error',
      durationMs,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
