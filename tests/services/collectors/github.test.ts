import { describe, it, expect, vi } from 'vitest'
import { GitHubTrendingCollector } from '@/services/collectors/github'
import type { FetchFn } from '@/services/collectors/types'

// GitHub Trending 페이지 HTML 목데이터 (최소 구조)
const MOCK_HTML = `
<html>
<body>
<article class="Box-row">
  <h2><a href="/facebook/react">facebook / react</a></h2>
  <p class="col-9">A declarative, efficient, and flexible JavaScript library for building user interfaces.</p>
  <span itemprop="programmingLanguage">JavaScript</span>
  <a href="/facebook/react/stargazers">228,000</a>
  <a href="/facebook/react/forks">46,500</a>
  <span class="d-inline-block float-sm-right">1,200 stars today</span>
</article>
<article class="Box-row">
  <h2><a href="/denoland/deno">denoland / deno</a></h2>
  <p class="col-9">A modern runtime for JavaScript and TypeScript.</p>
  <span itemprop="programmingLanguage">Rust</span>
  <a href="/denoland/deno/stargazers">98,000</a>
  <a href="/denoland/deno/forks">5,400</a>
  <span class="d-inline-block float-sm-right">340 stars today</span>
</article>
<article class="Box-row">
  <h2><a href="/langchain-ai/langchain">langchain-ai / langchain</a></h2>
  <p class="col-9">Build context-aware reasoning applications with LangChain.</p>
  <span itemprop="programmingLanguage">Python</span>
  <a href="/langchain-ai/langchain/stargazers">95,000</a>
  <a href="/langchain-ai/langchain/forks">15,200</a>
  <span class="d-inline-block float-sm-right">580 stars today</span>
</article>
</body>
</html>
`

function createMockFetch(html: string): FetchFn {
  return vi.fn(async () => new Response(html, { status: 200 })) as unknown as FetchFn
}

describe('GitHubTrendingCollector', () => {
  it('source가 github이다', () => {
    const collector = new GitHubTrendingCollector(createMockFetch(''))
    expect(collector.source).toBe('github')
    expect(collector.tier).toBe(1)
  })

  it('HTML에서 트렌딩 레포를 파싱한다', () => {
    const collector = new GitHubTrendingCollector(createMockFetch(MOCK_HTML))
    const repos = collector.parseHTML(MOCK_HTML)

    expect(repos).toHaveLength(3)
    expect(repos[0]).toMatchObject({
      name: 'facebook/react',
      url: 'https://github.com/facebook/react',
      description: expect.stringContaining('JavaScript library'),
      language: 'JavaScript',
      stars: 228000,
      todayStars: 1200,
    })
  })

  it('collect()가 RawCollectedItem[]을 반환한다', async () => {
    const collector = new GitHubTrendingCollector(createMockFetch(MOCK_HTML))
    const items = await collector.collect()

    expect(items).toHaveLength(3)
    expect(items[0].title).toBe('facebook/react')
    expect(items[0].url).toBe('https://github.com/facebook/react')
    expect(items[0].score).toBe(228000)
    expect(items[0].metadata).toMatchObject({
      language: 'JavaScript',
      todayStars: 1200,
    })
  })

  it('빈 HTML에서 빈 배열을 반환한다', () => {
    const collector = new GitHubTrendingCollector(createMockFetch(''))
    expect(collector.parseHTML('<html><body></body></html>')).toEqual([])
  })

  it('fetch 실패 시 에러를 던진다', async () => {
    const failFetch = vi.fn(async () => new Response('Error', { status: 403 })) as unknown as FetchFn
    const collector = new GitHubTrendingCollector(failFetch)

    await expect(collector.collect()).rejects.toThrow('GitHub Trending fetch failed: 403')
  })

  it('normalize()가 키워드와 카테고리를 추출한다', async () => {
    const collector = new GitHubTrendingCollector(createMockFetch(MOCK_HTML))
    const raw = await collector.collect()
    const normalized = collector.normalize(raw)

    expect(normalized).toHaveLength(3)

    // react → frontend
    expect(normalized[0].keywords).toContain('react')
    expect(normalized[0].keywords).toContain('javascript')
    expect(normalized[0].category).toBe('frontend')

    // langchain → ai-ml
    const langchain = normalized.find((n) => n.title.includes('langchain'))
    expect(langchain?.keywords).toContain('langchain')
    expect(langchain?.category).toBe('ai-ml')
  })
})
