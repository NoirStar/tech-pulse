import type { Category } from '@/types'
import { CATEGORY_KEYWORDS } from '@/data/categories'

// 불용어 (의미 없는 단어 필터링)
const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  'because', 'but', 'and', 'or', 'if', 'while', 'about', 'up',
  'its', 'it', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
  'we', 'they', 'my', 'your', 'his', 'her', 'our', 'their', 'what', 'which',
  'who', 'whom', 'new', 'now', 'get', 'got', 'make', 'made', 'like',
  'also', 'one', 'two', 'first', 'last', 'use', 'using', 'used',
  'show', 'work', 'way', 'even', 'back', 'any', 'still', 'well',
  'much', 'many', 'say', 'said', 'know', 'see', 'look', 'take',
  'come', 'think', 'thing', 'time', 'year', 'day', 'good', 'give',
  'want', 'part', 'great', 'help', 'try', 'start', 'world', 'long',
])

// n-gram 사전: 복합 기술 키워드 (2~3단어)
const COMPOUND_KEYWORDS: ReadonlySet<string> = new Set([
  'machine learning', 'deep learning', 'react native', 'next.js', 'vue.js',
  'computer vision', 'model context protocol', 'stable diffusion',
  'fine-tuning', 'fine tuning', 'github actions', 'github copilot',
  'visual studio code', 'vs code', 'ci/cd', 'zero-day', 'zero day',
  'open source', 'google cloud', 'vector database', 'large language model',
  'natural language', 'web assembly', 'web component',
])

// 모든 카테고리 키워드를 하나의 Set으로 평탄화 (빠른 lookup)
const ALL_TECH_KEYWORDS: ReadonlySet<string> = new Set(
  Object.values(CATEGORY_KEYWORDS).flat(),
)

/**
 * 텍스트에서 기술 키워드를 추출한다.
 * 1. 소문자 정규화
 * 2. 복합어(n-gram) 매칭
 * 3. 단일 단어 토크나이즈 → 불용어 제거 → 기술 키워드 매칭
 */
export function extractKeywords(text: string): string[] {
  if (!text) return []

  const lower = text.toLowerCase()
  const found = new Set<string>()

  // 1) 복합어 매칭 (2~3단어짜리 키워드)
  for (const compound of COMPOUND_KEYWORDS) {
    if (lower.includes(compound)) {
      found.add(compound)
    }
  }

  // 2) 기술 키워드 사전 매칭 (단어 경계 인식)
  for (const keyword of ALL_TECH_KEYWORDS) {
    // 이미 복합어로 매칭된 경우 스킵
    if (found.has(keyword)) continue
    // 단어 경계를 고려한 매칭 (정규식)
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(?:^|[\\s,;:!?()/\\-"])${escaped}(?:[\\s,;:!?()/\\-"]|$)`, 'i')
    if (re.test(lower)) {
      found.add(keyword)
    }
  }

  // 3) 사전에 없는 경우 토크나이즈로 보완 (CamelCase, 알파벳+숫자 등)
  const tokens = lower
    .replace(/[^a-z0-9가-힣\s.\-/#+]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t))

  for (const token of tokens) {
    if (ALL_TECH_KEYWORDS.has(token) && !found.has(token)) {
      found.add(token)
    }
  }

  return [...found]
}

/**
 * 키워드 배열 → 가장 적합한 카테고리 분류.
 * 각 카테고리별로 매칭 키워드 수를 세고, 최다 매칭 카테고리 반환.
 */
export function categorize(keywords: string[]): Category {
  if (keywords.length === 0) return 'other'

  const scores: Partial<Record<Category, number>> = {}

  for (const keyword of keywords) {
    for (const [cat, pool] of Object.entries(CATEGORY_KEYWORDS) as [Category, string[]][]) {
      if (pool.includes(keyword)) {
        scores[cat] = (scores[cat] ?? 0) + 1
      }
    }
  }

  // 최고 점수 카테고리 반환 (동점이면 먼저 매칭된 것 = 더 구체적)
  let bestCat: Category = 'other'
  let bestScore = 0

  for (const [cat, score] of Object.entries(scores) as [Category, number][]) {
    if (score > bestScore) {
      bestScore = score
      bestCat = cat
    }
  }

  return bestCat
}
