import { describe, it, expect, vi } from 'vitest'
import { YozmCollector } from '@/services/collectors/yozm'
import type { FetchFn } from '@/services/collectors/types'

const MOCK_HTML = `
<html>
<body>
<div class="content-item">
  <a href="/magazine/detail/234">
    <h3 class="item-title">TypeScript 5.5 새 기능 완전 정복</h3>
  </a>
  <p class="item-description">TypeScript 5.5에 추가된 주요 기능들을 살펴봅니다.</p>
  <span class="author">프론트엔드 개발자</span>
</div>
<div class="content-item">
  <a href="/magazine/detail/235">
    <h3 class="item-title">GraphQL vs REST API, 무엇을 선택할까?</h3>
  </a>
  <p class="item-description">두 API 아키텍처의 장단점을 비교 분석합니다.</p>
  <span class="author">백엔드 엔지니어</span>
</div>
<div class="item-card">
  <a href="https://yozm.wishket.com/magazine/detail/236">
    <h3 class="title">쿠버네티스 모니터링 Best Practice</h3>
  </a>
  <p class="desc">프로덕션 환경에서의 K8s 모니터링 전략.</p>
  <span class="writer">DevOps 팀</span>
</div>
</body>
</html>
`

function createMockFetch(html: string): FetchFn {
  return vi.fn(async () => new Response(html, { status: 200 })) as unknown as FetchFn
}

describe('YozmCollector', () => {
  it('source가 yozm이며 tier 3이다', () => {
    const collector = new YozmCollector(createMockFetch(''))
    expect(collector.source).toBe('yozm')
    expect(collector.tier).toBe(3)
  })

  it('HTML에서 아티클 카드를 파싱한다', () => {
    const collector = new YozmCollector(createMockFetch(''))
    const items = collector.parseHTML(MOCK_HTML)

    expect(items).toHaveLength(3)
    expect(items[0]).toMatchObject({
      title: 'TypeScript 5.5 새 기능 완전 정복',
      description: expect.stringContaining('TypeScript 5.5'),
    })
  })

  it('상대 URL을 절대 URL로 변환한다', () => {
    const collector = new YozmCollector(createMockFetch(''))
    const items = collector.parseHTML(MOCK_HTML)

    expect(items[0].url).toBe('https://yozm.wishket.com/magazine/detail/234')
    expect(items[1].url).toBe('https://yozm.wishket.com/magazine/detail/235')
  })

  it('이미 절대 URL인 경우 그대로 사용한다', () => {
    const collector = new YozmCollector(createMockFetch(''))
    const items = collector.parseHTML(MOCK_HTML)

    expect(items[2].url).toBe('https://yozm.wishket.com/magazine/detail/236')
  })

  it('collect()가 fetch 후 파싱 결과를 반환한다', async () => {
    const collector = new YozmCollector(createMockFetch(MOCK_HTML))
    const items = await collector.collect()

    expect(items).toHaveLength(3)
  })

  it('fetch 실패 시 에러를 던진다', async () => {
    const failFetch = vi.fn(async () => new Response('Error', { status: 503 })) as unknown as FetchFn
    const collector = new YozmCollector(failFetch)
    await expect(collector.collect()).rejects.toThrow('Yozm fetch failed: 503')
  })

  it('빈 HTML에서 빈 배열을 반환한다', () => {
    const collector = new YozmCollector(createMockFetch(''))
    expect(collector.parseHTML('<html><body></body></html>')).toEqual([])
  })

  it('normalize()가 키워드와 카테고리를 추출한다', async () => {
    const collector = new YozmCollector(createMockFetch(MOCK_HTML))
    const raw = await collector.collect()
    const normalized = collector.normalize(raw)

    expect(normalized).toHaveLength(3)
    expect(normalized[0].source).toBe('yozm')
    expect(normalized[0].keywords).toContain('typescript')

    // GraphQL item
    const graphqlItem = normalized.find((n) => n.title.includes('GraphQL'))
    expect(graphqlItem?.keywords).toContain('graphql')
  })
})
