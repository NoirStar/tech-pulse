import { describe, it, expect } from 'vitest'
import {
  createTier1Collectors,
  createTier2Collectors,
  createTier3Collectors,
  createAllCollectors,
  createCollector,
} from '@/services/collectors/index'

describe('Collector Registry', () => {
  it('Tier 1 수집기 5개를 생성한다', () => {
    const collectors = createTier1Collectors()
    expect(collectors).toHaveLength(5)
    const sources = collectors.map((c) => c.source)
    expect(sources).toContain('hackernews')
    expect(sources).toContain('github')
    expect(sources).toContain('youtube')
    expect(sources).toContain('google-trends')
    expect(sources).toContain('google-search')
    collectors.forEach((c) => expect(c.tier).toBe(1))
  })

  it('Tier 2 수집기 6개를 생성한다', () => {
    const collectors = createTier2Collectors()
    expect(collectors).toHaveLength(6)
    const sources = collectors.map((c) => c.source)
    expect(sources).toContain('reddit')
    expect(sources).toContain('producthunt')
    expect(sources).toContain('devto')
    expect(sources).toContain('medium')
    expect(sources).toContain('stackoverflow')
    expect(sources).toContain('x-twitter')
    collectors.forEach((c) => expect(c.tier).toBe(2))
  })

  it('Tier 3 수집기 5개를 생성한다', () => {
    const collectors = createTier3Collectors()
    expect(collectors).toHaveLength(5)
    const sources = collectors.map((c) => c.source)
    expect(sources).toContain('geeknews')
    expect(sources).toContain('naver')
    expect(sources).toContain('kakao-tech')
    expect(sources).toContain('yozm')
    expect(sources).toContain('codenary')
    collectors.forEach((c) => expect(c.tier).toBe(3))
  })

  it('createAllCollectors()가 전체 16개를 반환한다', () => {
    const all = createAllCollectors()
    expect(all).toHaveLength(16)
  })

  it('createCollector()가 유효한 소스에 대해 인스턴스를 반환한다', () => {
    const sources = [
      'hackernews', 'github', 'youtube', 'google-trends', 'google-search',
      'reddit', 'producthunt', 'devto', 'medium', 'stackoverflow', 'x-twitter',
      'geeknews', 'naver', 'kakao-tech', 'toss-tech', 'yozm', 'codenary',
    ] as const

    for (const source of sources) {
      const collector = createCollector(source)
      expect(collector, `${source} should return a collector`).not.toBeNull()
      expect(collector!.source).toBe(source)
    }
  })

  it('createCollector()가 미등록 소스에 대해 null을 반환한다', () => {
    expect(createCollector('npm')).toBeNull()
    expect(createCollector('pypi')).toBeNull()
    expect(createCollector('dockerhub')).toBeNull()
  })
})
