// 데이터 수집 소스 타입
export type Source =
  | 'github'
  | 'youtube'
  | 'google-trends'
  | 'google-search'
  | 'hackernews'
  | 'x-twitter'
  | 'reddit'
  | 'producthunt'
  | 'devto'
  | 'facebook'
  | 'medium'
  | 'stackoverflow'
  | 'naver'
  | 'geeknews'
  | 'kakao-tech'
  | 'toss-tech'
  | 'yozm'
  | 'codenary'
  | 'npm'
  | 'pypi'
  | 'dockerhub'
  | 'techcrunch'
  | 'theverge'
  | 'arstechnica'
  | 'infoq'
  | 'thenewstack'
  | 'lobsters'
  | 'slashdot'
  | 'dzone'

// 카테고리
export type Category =
  | 'ai-ml'
  | 'frontend'
  | 'backend'
  | 'devops'
  | 'mobile'
  | 'database'
  | 'tools'
  | 'security'
  | 'cloud'
  | 'other'

// 소스 메타 정보
export interface SourceMeta {
  id: Source
  name: string
  icon: string
  color: string
  tier: 1 | 2 | 3 | 4 | 5
  collectMethod: 'api' | 'rss' | 'scraping'
  baseUrl: string
}
