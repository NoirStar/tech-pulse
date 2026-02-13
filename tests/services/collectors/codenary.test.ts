import { describe, it, expect, vi } from 'vitest'
import { CodenaryCollector } from '@/services/collectors/codenary'
import type { FetchFn } from '@/services/collectors/types'

const MOCK_HTML = `
<html>
<body>
<article>
  <a href="https://techblog.example.com/react-19-deep-dive">
    <h3 class="title">React 19 심층 분석: 서버 컴포넌트의 진화</h3>
  </a>
  <span class="company">카카오</span>
  <span class="tag">React</span>
  <span class="tag">Frontend</span>
</article>
<div class="post-item">
  <a href="/posts/456">
    <h2>대규모 시스템에서의 Redis 활용 전략</h2>
  </a>
  <span class="org-name">토스</span>
  <span class="badge">Redis</span>
  <span class="badge">Database</span>
</div>
<div class="blog-item">
  <a href="https://engineering.example.com/ml-pipeline">
    <h3 class="title">ML 파이프라인 자동화와 MLOps</h3>
  </a>
  <span class="company">우아한형제들</span>
  <span class="tag">MLOps</span>
</div>
</body>
</html>
`

function createMockFetch(html: string): FetchFn {
  return vi.fn(async () => new Response(html, { status: 200 })) as unknown as FetchFn
}

describe('CodenaryCollector', () => {
  it('source가 codenary이며 tier 3이다', () => {
    const collector = new CodenaryCollector(createMockFetch(''))
    expect(collector.source).toBe('codenary')
    expect(collector.tier).toBe(3)
  })

  it('HTML에서 기술 블로그 아이템을 파싱한다', () => {
    const collector = new CodenaryCollector(createMockFetch(''))
    const items = collector.parseHTML(MOCK_HTML)

    expect(items).toHaveLength(3)
    expect(items[0]).toMatchObject({
      title: 'React 19 심층 분석: 서버 컴포넌트의 진화',
      url: 'https://techblog.example.com/react-19-deep-dive',
      author: '카카오',
    })
    expect(items[0].metadata).toMatchObject({
      platform: 'codenary',
      tags: ['React', 'Frontend'],
    })
  })

  it('상대 URL을 절대 URL로 변환한다', () => {
    const collector = new CodenaryCollector(createMockFetch(''))
    const items = collector.parseHTML(MOCK_HTML)

    expect(items[1].url).toBe('https://www.codenary.co.kr/posts/456')
  })

  it('이미 절대 URL인 경우 그대로 사용한다', () => {
    const collector = new CodenaryCollector(createMockFetch(''))
    const items = collector.parseHTML(MOCK_HTML)

    expect(items[0].url).toBe('https://techblog.example.com/react-19-deep-dive')
    expect(items[2].url).toBe('https://engineering.example.com/ml-pipeline')
  })

  it('collect()가 fetch 후 파싱 결과를 반환한다', async () => {
    const collector = new CodenaryCollector(createMockFetch(MOCK_HTML))
    const items = await collector.collect()

    expect(items).toHaveLength(3)
  })

  it('fetch 실패 시 에러를 던진다', async () => {
    const failFetch = vi.fn(async () => new Response('Error', { status: 503 })) as unknown as FetchFn
    const collector = new CodenaryCollector(failFetch)
    await expect(collector.collect()).rejects.toThrow('Codenary fetch failed: 503')
  })

  it('빈 HTML에서 빈 배열을 반환한다', () => {
    const collector = new CodenaryCollector(createMockFetch(''))
    expect(collector.parseHTML('<html><body></body></html>')).toEqual([])
  })

  it('normalize()가 태그를 키워드 추출에 포함한다', async () => {
    const collector = new CodenaryCollector(createMockFetch(MOCK_HTML))
    const raw = await collector.collect()
    const normalized = collector.normalize(raw)

    expect(normalized).toHaveLength(3)
    expect(normalized[0].source).toBe('codenary')
    expect(normalized[0].keywords).toContain('react')

    // Redis item → database category
    const redisItem = normalized.find((n) => n.title.includes('Redis'))
    expect(redisItem?.keywords).toContain('redis')
  })
})
