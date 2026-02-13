import { describe, it, expect, vi } from 'vitest'
import { GeekNewsCollector } from '@/services/collectors/geeknews'
import type { FetchFn } from '@/services/collectors/types'

const MOCK_HTML = `
<html>
<body>
<div class="topic_row">
  <span class="topictitle"><a href="https://example.com/rust-wasm">Rust, WebAssembly로 빠른 웹앱 만들기</a></span>
  <span class="topicinfo"><span class="points">42</span></span>
</div>
<div class="topic_row">
  <span class="topictitle"><a href="/topic/123">GPT-5 API 출시 소식</a></span>
  <span class="topicinfo"><span class="points">128</span></span>
</div>
<div class="topic_row">
  <span class="topictitle"><a href="https://blog.docker.com/new-features">Docker 26 새 기능 정리</a></span>
  <span class="topicinfo"><span class="points">35</span></span>
</div>
</body>
</html>
`

function createMockFetch(html: string): FetchFn {
  return vi.fn(async () => new Response(html, { status: 200 })) as unknown as FetchFn
}

describe('GeekNewsCollector', () => {
  it('source가 geeknews이며 tier 3이다', () => {
    const collector = new GeekNewsCollector(createMockFetch(''))
    expect(collector.source).toBe('geeknews')
    expect(collector.tier).toBe(3)
  })

  it('HTML에서 뉴스 아이템을 파싱한다', () => {
    const collector = new GeekNewsCollector(createMockFetch(''))
    const items = collector.parseHTML(MOCK_HTML)

    expect(items).toHaveLength(3)
    expect(items[0]).toMatchObject({
      title: 'Rust, WebAssembly로 빠른 웹앱 만들기',
      url: 'https://example.com/rust-wasm',
      score: 42,
    })
  })

  it('상대 URL을 절대 URL로 변환한다', () => {
    const collector = new GeekNewsCollector(createMockFetch(''))
    const items = collector.parseHTML(MOCK_HTML)

    expect(items[1].url).toBe('https://news.hada.io/topic/123')
  })

  it('score(points)를 정수로 파싱한다', () => {
    const collector = new GeekNewsCollector(createMockFetch(''))
    const items = collector.parseHTML(MOCK_HTML)

    expect(items[1].score).toBe(128)
    expect(items[2].score).toBe(35)
  })

  it('collect()가 fetch 후 파싱 결과를 반환한다', async () => {
    const collector = new GeekNewsCollector(createMockFetch(MOCK_HTML))
    const items = await collector.collect()

    expect(items).toHaveLength(3)
  })

  it('fetch 실패 시 에러를 던진다', async () => {
    const failFetch = vi.fn(async () => new Response('Error', { status: 503 })) as unknown as FetchFn
    const collector = new GeekNewsCollector(failFetch)
    await expect(collector.collect()).rejects.toThrow('GeekNews fetch failed: 503')
  })

  it('빈 HTML에서 빈 배열을 반환한다', () => {
    const collector = new GeekNewsCollector(createMockFetch(''))
    expect(collector.parseHTML('<html><body></body></html>')).toEqual([])
  })

  it('normalize()가 키워드와 카테고리를 추출한다', async () => {
    const collector = new GeekNewsCollector(createMockFetch(MOCK_HTML))
    const raw = await collector.collect()
    const normalized = collector.normalize(raw)

    expect(normalized).toHaveLength(3)
    expect(normalized[0].source).toBe('geeknews')

    // Docker → devops (영문 키워드 추출 가능)
    const dockerItem = normalized.find((n) => n.title.includes('Docker'))
    expect(dockerItem?.keywords).toContain('docker')

    // Rust + WebAssembly 제목에서 영문 키워드 추출
    const rustItem = normalized.find((n) => n.title.includes('Rust'))
    expect(rustItem?.keywords).toContain('rust')
  })
})
