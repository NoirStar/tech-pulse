import { describe, it, expect } from 'vitest'
import { extractKeywords, categorize } from '@/services/keywordExtractor'

describe('extractKeywords', () => {
  it('빈 문자열에서 빈 배열을 반환한다', () => {
    expect(extractKeywords('')).toEqual([])
  })

  it('기술 키워드가 없는 문자열에서 빈 배열을 반환한다', () => {
    expect(extractKeywords('hello world good morning')).toEqual([])
  })

  it('단일 기술 키워드를 추출한다', () => {
    const keywords = extractKeywords('Building a React application')
    expect(keywords).toContain('react')
  })

  it('복수 기술 키워드를 추출한다', () => {
    const keywords = extractKeywords('Deploy React app with Docker on Kubernetes')
    expect(keywords).toContain('react')
    expect(keywords).toContain('docker')
    expect(keywords).toContain('kubernetes')
  })

  it('복합 키워드(n-gram)를 추출한다', () => {
    const keywords = extractKeywords('New advances in machine learning and deep learning')
    expect(keywords).toContain('machine learning')
    expect(keywords).toContain('deep learning')
  })

  it('대소문자를 구분하지 않는다', () => {
    const keywords = extractKeywords('REACT and TypeScript are great')
    expect(keywords).toContain('react')
    expect(keywords).toContain('typescript')
  })

  it('불용어는 포함하지 않는다', () => {
    const keywords = extractKeywords('The new React framework is very fast')
    expect(keywords).not.toContain('the')
    expect(keywords).not.toContain('new')
    expect(keywords).not.toContain('is')
    expect(keywords).not.toContain('very')
  })

  it('프레임워크/도구 이름을 정확히 추출한다', () => {
    const keywords = extractKeywords('Building an API with FastAPI and Python')
    expect(keywords).toContain('fastapi')
    expect(keywords).toContain('python')
    expect(keywords).toContain('api')
  })

  it('한국어 관련 키워드도 처리한다 (categories.ts에 있는 경우)', () => {
    const keywords = extractKeywords('Next.js와 Tailwind CSS를 사용한 프로젝트')
    expect(keywords).toContain('next.js')
    expect(keywords).toContain('tailwind')
  })
})

describe('categorize', () => {
  it('빈 키워드 배열이면 other를 반환한다', () => {
    expect(categorize([])).toBe('other')
  })

  it('AI 관련 키워드를 ai-ml로 분류한다', () => {
    expect(categorize(['llm', 'gpt', 'transformer'])).toBe('ai-ml')
  })

  it('Frontend 관련 키워드를 frontend로 분류한다', () => {
    expect(categorize(['react', 'vite', 'tailwind'])).toBe('frontend')
  })

  it('Backend 관련 키워드를 backend로 분류한다', () => {
    expect(categorize(['node', 'express', 'graphql'])).toBe('backend')
  })

  it('DevOps 관련 키워드를 devops로 분류한다', () => {
    expect(categorize(['docker', 'kubernetes', 'terraform'])).toBe('devops')
  })

  it('혼합 키워드에서 가장 많은 매칭 카테고리를 반환한다', () => {
    // react(frontend) + docker(devops) + node(backend) + vite(frontend) + tailwind(frontend)
    expect(categorize(['react', 'docker', 'node', 'vite', 'tailwind'])).toBe('frontend')
  })

  it('매칭되지 않는 키워드는 other를 반환한다', () => {
    expect(categorize(['unknownlib', 'randompackage'])).toBe('other')
  })
})
