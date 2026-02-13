import { describe, it, expect } from 'vitest'
import { CATEGORY_KEYWORDS, CATEGORY_META } from '@/data/categories'
import type { Category } from '@/types'

describe('categories', () => {
  const allCategories: Category[] = [
    'ai-ml', 'frontend', 'backend', 'devops', 'mobile',
    'database', 'tools', 'security', 'cloud', 'other',
  ]

  describe('CATEGORY_KEYWORDS 무결성', () => {
    it('모든 카테고리에 키워드 배열이 정의되어 있어야 한다', () => {
      for (const category of allCategories) {
        expect(CATEGORY_KEYWORDS[category]).toBeDefined()
        expect(Array.isArray(CATEGORY_KEYWORDS[category])).toBe(true)
      }
    })

    it('other를 제외한 카테고리는 최소 5개 이상의 키워드를 가져야 한다', () => {
      for (const category of allCategories) {
        if (category === 'other') continue
        expect(CATEGORY_KEYWORDS[category].length).toBeGreaterThanOrEqual(5)
      }
    })

    it('모든 키워드는 소문자여야 한다', () => {
      for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const kw of keywords) {
          expect(kw).toBe(kw.toLowerCase())
        }
      }
    })

    it('같은 카테고리 내 중복 키워드가 없어야 한다', () => {
      for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        const unique = new Set(keywords)
        expect(unique.size).toBe(keywords.length)
      }
    })

    it('ai-ml 카테고리에 핵심 AI 키워드가 포함되어야 한다', () => {
      const aiKeywords = CATEGORY_KEYWORDS['ai-ml']
      expect(aiKeywords).toContain('ai')
      expect(aiKeywords).toContain('llm')
      expect(aiKeywords).toContain('openai')
    })

    it('frontend 카테고리에 React, Vue가 포함되어야 한다', () => {
      const feKeywords = CATEGORY_KEYWORDS['frontend']
      expect(feKeywords).toContain('react')
      expect(feKeywords).toContain('vue')
    })
  })

  describe('CATEGORY_META 무결성', () => {
    it('모든 카테고리에 메타 정보가 정의되어 있어야 한다', () => {
      for (const category of allCategories) {
        const meta = CATEGORY_META[category]
        expect(meta).toBeDefined()
        expect(meta.name).toBeTruthy()
        expect(meta.emoji).toBeTruthy()
        expect(meta.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      }
    })

    it('카테고리 이름은 중복이 없어야 한다', () => {
      const names = Object.values(CATEGORY_META).map((m) => m.name)
      const unique = new Set(names)
      expect(unique.size).toBe(names.length)
    })
  })
})
