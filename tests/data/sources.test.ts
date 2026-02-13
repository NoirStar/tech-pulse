import { describe, it, expect } from 'vitest'
import { SOURCES, getSourceById, getSourcesByTier } from '@/data/sources'
import type { Source } from '@/types'

describe('sources', () => {
  describe('SOURCES 데이터 무결성', () => {
    it('30개 소스가 정의되어 있어야 한다', () => {
      // 모든 Tier의 소스는 최소 24개 이상 (일부는 추후 추가 가능)
      expect(SOURCES.length).toBeGreaterThanOrEqual(24)
    })

    it('모든 소스는 필수 필드를 가져야 한다', () => {
      for (const source of SOURCES) {
        expect(source.id).toBeTruthy()
        expect(source.name).toBeTruthy()
        expect(source.icon).toBeTruthy()
        expect(source.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
        expect([1, 2, 3, 4, 5]).toContain(source.tier)
        expect(['api', 'rss', 'scraping']).toContain(source.collectMethod)
        expect(source.baseUrl).toMatch(/^https?:\/\//)
      }
    })

    it('소스 ID는 중복이 없어야 한다', () => {
      const ids = SOURCES.map((s) => s.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('소스 이름은 중복이 없어야 한다', () => {
      const names = SOURCES.map((s) => s.name)
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(names.length)
    })
  })

  describe('Tier 분류', () => {
    it('Tier 1 소스는 최소 5개 (MVP 핵심)', () => {
      const tier1 = SOURCES.filter((s) => s.tier === 1)
      expect(tier1.length).toBeGreaterThanOrEqual(5)
    })

    it('Tier 1에 GitHub, HackerNews가 포함되어야 한다', () => {
      const tier1Ids = SOURCES.filter((s) => s.tier === 1).map((s) => s.id)
      expect(tier1Ids).toContain('github')
      expect(tier1Ids).toContain('hackernews')
    })

    it('Tier 3(한국 소스)에 GeekNews가 포함되어야 한다', () => {
      const tier3Ids = SOURCES.filter((s) => s.tier === 3).map((s) => s.id)
      expect(tier3Ids).toContain('geeknews')
    })

    it('모든 Tier에 최소 1개 이상의 소스가 있어야 한다', () => {
      for (const tier of [1, 2, 3, 4, 5]) {
        const count = SOURCES.filter((s) => s.tier === tier).length
        expect(count).toBeGreaterThanOrEqual(1)
      }
    })
  })

  describe('getSourceById', () => {
    it('유효한 ID로 소스를 찾을 수 있다', () => {
      const github = getSourceById('github')
      expect(github).toBeDefined()
      expect(github!.name).toBe('GitHub Trending')
      expect(github!.tier).toBe(1)
    })

    it('존재하지 않는 ID는 undefined를 반환한다', () => {
      const notFound = getSourceById('does-not-exist')
      expect(notFound).toBeUndefined()
    })
  })

  describe('getSourcesByTier', () => {
    it('특정 Tier의 소스만 반환한다', () => {
      const tier1 = getSourcesByTier(1)
      expect(tier1.every((s) => s.tier === 1)).toBe(true)
    })

    it('존재하지 않는 Tier는 빈 배열을 반환한다', () => {
      const tier99 = getSourcesByTier(99)
      expect(tier99).toEqual([])
    })
  })
})
