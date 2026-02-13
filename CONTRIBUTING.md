# CONTRIBUTING.md — TechPulse 개발 가이드

> 이 문서는 TechPulse 프로젝트의 **개발 원칙**, **Phase별 상세 사양**, **코드 규칙**을 정리합니다.  
> 코드를 작성하기 전에 반드시 읽고, 각 Phase 시작 시 해당 섹션을 다시 확인하세요.

---

## 🏛️ 핵심 아키텍처 원칙

### 1. Phase 간 의존성 제로 (Zero Cross-Phase Dependency)

```
❌ BAD:  Phase 4(대시보드)가 Phase 1(수집기)의 구체 구현에 의존
✅ GOOD: Phase 4는 타입 인터페이스(types/)만 의존, 목데이터로 독립 동작
```

모든 Phase는 **독립적으로 개발·테스트·배포** 가능해야 합니다.

| Phase | 의존 대상 | 절대 의존하면 안 되는 것 |
|-------|----------|----------------------|
| Phase 1 (수집기) | `types/` 인터페이스만 | 프론트엔드 컴포넌트 |
| Phase 2 (확장 수집기) | `types/` + Phase 1의 공통 인터페이스 | Phase 3 분석 엔진 |
| Phase 3 (분석 엔진) | `types/` + 수집 결과 DB 스키마 | UI 컴포넌트 |
| Phase 4 (대시보드) | `types/` + API 응답 인터페이스 | 수집기 내부 구현 |
| Phase 5 (사용자) | `types/` + Supabase Auth | 다른 Phase의 내부 로직 |
| Phase 6 (고도화) | 기존 인터페이스 확장 | 기존 코드 수정 (확장만) |

**핵심 교차점은 오직 `types/` 디렉토리와 API 계약(Contract)뿐입니다.**

### 2. 인터페이스 먼저, 구현은 나중에 (Interface-First)

```typescript
// ✅ GOOD — 인터페이스를 먼저 확정
interface Collector {
  readonly source: Source
  collect(): Promise<TrendItem[]>
}

// 각 수집기는 이 계약만 지키면 됨
class HackerNewsCollector implements Collector { ... }
class GitHubTrendingCollector implements Collector { ... }
```

```typescript
// ❌ BAD — 구체 타입에 의존
function Dashboard({ hackerNewsData }: { hackerNewsData: HNStory[] }) { ... }

// ✅ GOOD — 공통 인터페이스에만 의존
function Dashboard({ items }: { items: TrendItem[] }) { ... }
```

### 3. 레이어 분리 (Clean Layer Separation)

```
┌─────────────────────────────────────────────┐
│  UI Layer (components/, pages/)             │  ← 표현만, 비즈니스 로직 없음
├─────────────────────────────────────────────┤
│  State Layer (stores/)                      │  ← 상태 관리, UI↔서비스 연결
├─────────────────────────────────────────────┤
│  Service Layer (services/, hooks/)          │  ← 비즈니스 로직, API 호출
├─────────────────────────────────────────────┤
│  Data Layer (api/, collectors/)             │  ← 외부 데이터 수집/저장
├─────────────────────────────────────────────┤
│  Type Layer (types/)                        │  ← 모든 레이어의 공통 계약
└─────────────────────────────────────────────┘

규칙:
- 위 레이어는 아래 레이어를 호출할 수 있다
- 아래 레이어는 위 레이어를 절대 import하지 않는다
- 같은 레이어끼리는 직접 호출하지 않는다 (Store를 통해)
- Type Layer는 어디서든 import 가능하다
```

---

## ✨ 코드 품질 원칙

### 우아한 코드란

```
"완벽함이란 더 이상 추가할 것이 없을 때가 아니라, 
 더 이상 제거할 것이 없을 때 달성된다." — 앙투안 드 생텍쥐페리
```

**1. 하나의 함수 = 하나의 일 (Single Responsibility)**
```typescript
// ❌ BAD — 수집도 하고, 분석도 하고, 저장도 한다
async function collectAndAnalyzeAndSave(source: Source) {
  const data = await fetch(...)
  const keywords = extractKeywords(data)
  await db.insert(keywords)
}

// ✅ GOOD — 각각 분리, 파이프라인으로 조합
const collect  = (source: Source): Promise<RawData[]> => ...
const analyze  = (raw: RawData[]): KeywordTrend[] => ...
const persist  = (trends: KeywordTrend[]): Promise<void> => ...

// 조합
const pipeline = pipe(collect, analyze, persist)
```

**2. 이름이 곧 문서 (Self-Documenting Names)**
```typescript
// ❌ BAD
const d = items.filter(i => i.s > 100)
const res = d.map(x => ({ ...x, v: calcV(x) }))

// ✅ GOOD
const popularItems = items.filter(item => item.score > POPULARITY_THRESHOLD)
const withVelocity = popularItems.map(item => ({
  ...item,
  velocity: calculateVelocity(item),
}))
```

**3. 불변성 (Immutability by Default)**
```typescript
// ❌ BAD — 원본 배열을 변경
items.push(newItem)
items.sort((a, b) => b.score - a.score)

// ✅ GOOD — 항상 새 배열/객체 반환
const updated = [...items, newItem]
const sorted = [...items].sort((a, b) => b.score - a.score)
```

**4. 일찍 반환, 네스팅 최소화 (Early Return, Flat Code)**
```typescript
// ❌ BAD — 들여쓰기 지옥
function processItem(item: TrendItem) {
  if (item) {
    if (item.score > 0) {
      if (item.keywords.length > 0) {
        return analyze(item)
      }
    }
  }
  return null
}

// ✅ GOOD — 가드 클로즈(Guard Clause)
function processItem(item: TrendItem | null) {
  if (!item) return null
  if (item.score <= 0) return null
  if (item.keywords.length === 0) return null
  
  return analyze(item)
}
```

**5. 타입이 런타임 체크를 대체 (Type > Runtime Check)**
```typescript
// ❌ BAD — 런타임에서 타입 확인
function getScore(item: any) {
  if (typeof item.score !== 'number') throw new Error('invalid')
  return item.score
}

// ✅ GOOD — 컴파일 타임에 보장
function getScore(item: TrendItem): number {
  return item.score
}
```

**6. 매직 넘버 제거 (No Magic Numbers)**
```typescript
// ❌ BAD
if (velocity > 200) { /* ... */ }
const items = data.slice(0, 50)

// ✅ GOOD
const VELOCITY_SURGE_THRESHOLD = 200
const MAX_FEED_ITEMS = 50

if (velocity > VELOCITY_SURGE_THRESHOLD) { /* ... */ }
const items = data.slice(0, MAX_FEED_ITEMS)
```

### 성능 원칙

**1. 게으른 로딩 (Lazy Everything)**
```typescript
// 페이지 코드 스플리팅
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Settings = lazy(() => import('@/pages/Settings'))

// 무거운 라이브러리는 동적 import
const loadD3 = () => import('d3')
```

**2. 메모이제이션은 측정 후 (Measure First)**
```typescript
// ❌ BAD — 무조건 memo
const Item = React.memo(({ data }) => <div>{data.title}</div>)

// ✅ GOOD — 리렌더가 실제 병목일 때만
// 프로파일링 → 병목 확인 → memo/useMemo 적용
```

**3. API 호출 최소화**
```typescript
// ❌ BAD — 컴포넌트마다 개별 fetch
function HotKeywords() { const data = useFetch('/api/hot') }
function TrendChart() { const data = useFetch('/api/trends') }
function SourceFeed() { const data = useFetch('/api/feed') }

// ✅ GOOD — 대시보드 레벨에서 한번, 하위에 전달
function Dashboard() {
  const { hot, trends, feed } = useDashboardData() // 단일 API or 병렬 batch
  return (
    <>
      <HotKeywords data={hot} />
      <TrendChart data={trends} />
      <SourceFeed data={feed} />
    </>
  )
}
```

---

## 📐 파일/네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase, 단일 export | `HotKeywords.tsx` |
| 훅 | camelCase, `use` prefix | `useTrends.ts` |
| 스토어 | camelCase, `Store` suffix | `trendStore.ts` |
| 타입 | PascalCase, interface 우선 | `TrendItem`, `Source` |
| 상수 | UPPER_SNAKE_CASE | `MAX_FEED_ITEMS` |
| 수집기 | camelCase, 소스 이름 | `hackerNews.ts` |
| 테스트 | 원본과 동일 + `.test.ts(x)` | `trendStore.test.ts` |

### 폴더 규칙
```
✅ 기능별 그룹핑:  components/dashboard/TrendChart.tsx
❌ 타입별 그룹핑:  components/charts/TrendChart.tsx
```

### Import 순서
```typescript
// 1. React / 외부 라이브러리
import { useState } from 'react'
import { LineChart } from 'recharts'

// 2. 내부 컴포넌트
import { Card } from '@/components/ui/card'

// 3. 스토어 / 훅
import { useTrendStore } from '@/stores/trendStore'

// 4. 타입 (type-only import)
import type { TrendItem } from '@/types'

// 5. 상수 / 유틸
import { SOURCES } from '@/data/sources'
```

---

## 🔧 Git 규칙

### 브랜치 전략
```
main                          ← 배포 가능한 상태
├── feat/phase-1-collectors   ← Phase 1 작업
├── feat/phase-2-expandsources
├── feat/phase-3-analyzer
├── feat/phase-4-dashboard
└── fix/hn-collector-timeout  ← 단발 버그픽스
```

### 커밋 메시지
```
feat: Phase 1 - Hacker News 수집기 구현
fix: GitHub Trending 크롤러 셀렉터 수정
refactor: 수집기 공통 인터페이스 추출
docs: Phase 2 상세 사양 추가
test: HN 수집기 단위 테스트 추가
chore: ESLint 규칙 업데이트
```

### PR 규칙
- Phase 단위 또는 기능 단위로 PR
- 자기 리뷰 체크리스트:
  - [ ] 타입 에러 없음 (`npx tsc --noEmit`)
  - [ ] 빌드 성공 (`npm run build`)
  - [ ] 새 기능에 대한 테스트 있음
  - [ ] 다른 Phase 코드를 직접 수정하지 않았음
  - [ ] 매직 넘버 없음

---

## 📋 Phase별 상세 사양

### Phase 0: 프로젝트 세팅 ✅

**목표**: 개발 가능한 환경 구축  
**산출물**: 빌드 가능한 빈 프로젝트 + 기본 대시보드 레이아웃 (목데이터)

완료 항목:
- [x] GitHub 레포 생성
- [x] React + Vite + TypeScript 프로젝트
- [x] Tailwind CSS v4 + shadcn/ui
- [x] ESLint + Prettier
- [x] Zustand, React Router, Recharts, D3, Lucide Icons
- [x] 프로젝트 구조 (components, stores, types, services, data)
- [x] 30개 소스 메타 데이터 정의 (`data/sources.ts`)
- [x] 10개 카테고리 키워드 매핑 (`data/categories.ts`)
- [x] 기본 대시보드 UI (목데이터)

---

### Phase 1: Tier 1 핵심 수집기

**목표**: 가장 중요한 5개 소스에서 데이터를 수집하고 DB에 저장하는 파이프라인 구축  
**브랜치**: `feat/phase-1-collectors`  
**의존**: `types/` 인터페이스만  
**산출물**: 5개 수집기 + 키워드 추출기 + DB 스키마 + Cron 스케줄

#### 구현 순서 (의존성 순)

```
1. Supabase 스키마 설계 & 클라이언트 설정
   └→ 테이블: trend_items, keyword_trends, collection_logs
   
2. 공통 수집기 인터페이스 (Collector)
   └→ collect() → normalize() → extractKeywords() → save()
   
3. 개별 수집기 (병렬 작업 가능 — 서로 독립)
   ├─ hackerNews.ts    (Firebase API, 가장 쉬움 → 첫 번째)
   ├─ github.ts        (Cheerio 크롤링)
   ├─ youtube.ts       (YouTube Data API v3)
   ├─ googleTrends.ts  (google-trends-api 패키지)
   └─ googleSearch.ts  (크롤링)
   
4. 키워드 추출 엔진 (analyzer.ts)
   └→ 제목/설명에서 기술 키워드 추출 + 카테고리 분류
   
5. Vercel Cron 설정 (1h 주기)
   └→ api/cron/collect-all.ts
```

#### 공통 수집기 인터페이스

```typescript
interface Collector {
  readonly source: Source
  readonly tier: number
  
  // 원본 데이터 수집
  collect(): Promise<RawCollectedItem[]>
  
  // TrendItem으로 정규화
  normalize(raw: RawCollectedItem[]): TrendItem[]
}

interface RawCollectedItem {
  title: string
  url: string
  score?: number
  description?: string
  metadata?: Record<string, unknown>
}

// 수집기는 이 팩토리에 등록
const collectors: Map<Source, Collector> = new Map()
```

#### Supabase 테이블 스키마

```sql
-- 수집된 원본 아이템
CREATE TABLE trend_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  score INTEGER DEFAULT 0,
  keywords TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'other',
  description TEXT,
  author TEXT,
  metadata JSONB DEFAULT '{}',
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 키워드 시계열 집계
CREATE TABLE keyword_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  category TEXT NOT NULL,
  source TEXT NOT NULL,
  mention_count INTEGER DEFAULT 1,
  snapshot_hour TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(keyword, source, snapshot_hour)
);

-- 수집 로그 (모니터링)
CREATE TABLE collection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success' | 'error' | 'partial'
  items_count INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_trend_items_source ON trend_items(source);
CREATE INDEX idx_trend_items_collected ON trend_items(collected_at DESC);
CREATE INDEX idx_trend_items_category ON trend_items(category);
CREATE INDEX idx_keyword_snapshots_keyword ON keyword_snapshots(keyword);
CREATE INDEX idx_keyword_snapshots_hour ON keyword_snapshots(snapshot_hour DESC);
```

#### 각 수집기 핵심 로직

| 수집기 | 방법 | 핵심 포인트 |
|--------|------|------------|
| **Hacker News** | `fetch('https://hacker-news.firebaseio.com/v0/topstories.json')` → 상위 30개 ID → 개별 fetch | 병렬 fetch, Promise.allSettled |
| **GitHub** | Cheerio로 `github.com/trending` 파싱 | `.Box-row` 셀렉터, 언어/스타 추출 |
| **YouTube** | `youtube.googleapis.com/youtube/v3/search?q=programming&type=video&order=viewCount` | 쿼타 관리 (10K/일), 카테고리 필터 |
| **Google Trends** | `google-trends-api` 패키지의 `dailyTrends()` + `interestOverTime()` | 기술 키워드만 필터링 |
| **Google Search** | 크롤링 또는 SerpAPI | IT 관련 트렌딩 검색어 추출 |

#### 테스트 전략

```typescript
// 각 수집기는 목 응답으로 독립 테스트
describe('HackerNewsCollector', () => {
  it('should collect top stories', async () => {
    // mock fetch
    const collector = new HackerNewsCollector()
    const items = await collector.collect()
    expect(items.length).toBeGreaterThan(0)
    expect(items[0]).toMatchObject({ title: expect.any(String), url: expect.any(String) })
  })

  it('should normalize to TrendItem format', () => {
    const raw = [{ title: 'Test', url: 'https://...', score: 100 }]
    const normalized = collector.normalize(raw)
    expect(normalized[0].source).toBe('hackernews')
    expect(normalized[0].keywords).toBeDefined()
  })
})
```

---

### Phase 2: Tier 2+3 확장 수집기

**목표**: 나머지 소스 수집기 추가. Phase 1의 공통 인터페이스를 그대로 구현  
**브랜치**: `feat/phase-2-expand-sources`  
**의존**: Phase 1의 `Collector` 인터페이스 & Supabase 스키마 (코드 아닌 계약!)  
**핵심**: 새 수집기 추가 = 파일 하나 생성 + collectors Map에 등록. 기존 코드 수정 없음

#### 구현 목록

```
Tier 2 (글로벌):
├─ x-twitter.ts       (X API v2 Basic, $100/mo)
├─ reddit.ts          (JSON API, 무료)  
├─ producthunt.ts     (GraphQL API)
├─ devto.ts           (Forem REST API)
├─ facebook.ts        (크롤링, 가장 까다로움 → 후순위)
├─ medium.ts          (RSS 파싱)
└─ stackoverflow.ts   (SO API v2.3)

Tier 3 (한국):
├─ naver.ts           (네이버 검색 API + IT뉴스 크롤링)
├─ geeknews.ts        (news.hada.io 크롤링)
├─ kakaoTech.ts       (RSS)
├─ tossTech.ts        (RSS)
├─ yozm.ts            (크롤링)
└─ codenary.ts        (크롤링)
```

#### 확장 원칙 (Open/Closed)

```typescript
// 새 수집기 추가 시 기존 코드를 절대 수정하지 않음
// 수집기 등록만 추가

// collectors/index.ts
import { hackerNews } from './hackerNews'
import { github } from './github'
import { reddit } from './reddit'  // ← 이 줄만 추가

export const collectors = [hackerNews, github, reddit]
```

---

### Phase 3: 키워드 분석 엔진

**목표**: 수집된 데이터에서 의미 있는 트렌드 인사이트를 추출  
**브랜치**: `feat/phase-3-analyzer`  
**의존**: `types/` + Supabase에 저장된 데이터 (DB 스키마)  
**산출물**: 트렌드 점수, 급상승 감지, 교차 소스 분석

#### 핵심 알고리즘

**1. 키워드 추출** — 제목/설명에서 기술 키워드 토크나이즈

```typescript
function extractKeywords(text: string): string[] {
  // 1. 소문자 정규화
  // 2. 불용어(stopwords) 제거
  // 3. 기술 키워드 사전 매칭 (categories.ts의 키워드 풀)
  // 4. n-gram으로 복합어 처리 ("machine learning", "react native")
  // 5. 빈도 기반 필터링
}
```

**2. 트렌드 점수 (Velocity)** — "얼마나 빨리 뜨고 있는가"

```typescript
function calculateVelocity(keyword: string, snapshots: KeywordSnapshot[]): number {
  // 최근 6시간 언급량 vs 이전 24시간 평균 대비 증가율
  // velocity = (recent - baseline) / baseline * 100
  // velocity > 200% → "급상승"
  // velocity > 500% → "폭발"
}
```

**3. 교차 소스 분석** — "여러 곳에서 동시에 뜬다 = 진짜 트렌드"

```typescript
function detectCrossPlatformTrend(keyword: string): CrossPlatformSignal {
  // 3개 이상 서로 다른 소스에서 동시 급상승 → "확산 중"
  // GitHub + HN + Twitter 동시 → 신뢰도 높음
  // 한국 소스에만 → "국내 트렌드"
}
```

**4. 자동 카테고리 분류** — 룰 기반 (확장 가능)

```typescript
function categorize(keywords: string[]): Category {
  // data/categories.ts의 키워드 매핑으로 점수 계산
  // 가장 높은 점수의 카테고리 반환
  // 동점이면 더 구체적인 카테고리 우선
}
```

---

### Phase 4: 프론트엔드 대시보드 완성

**목표**: 목데이터를 실제 API 데이터로 교체, 워드클라우드 추가, 반응형 완성  
**브랜치**: `feat/phase-4-dashboard`  
**의존**: `types/` + API 응답 인터페이스 (Phase 1-3의 구현 X, API 계약만)  
**핵심**: 실제 API 연동 전까지 Mock Service Worker(MSW) 또는 목 데이터로 동작

#### 구현 항목

```
1. API 클라이언트 (lib/api.ts)
   └→ fetch wrapper, 에러 핸들링, 캐싱
   
2. 커스텀 훅 (hooks/)
   ├─ useDashboardData.ts  — 대시보드 전체 데이터 병렬 fetch
   ├─ useHotKeywords.ts    — 급상승 키워드
   ├─ useTrendChart.ts     — 시계열 차트 데이터
   └─ useSourceFeed.ts     — 소스별 피드
   
3. 워드 클라우드 (D3.js)
   └→ components/dashboard/WordCloud.tsx
   
4. 키워드 상세 페이지
   └→ pages/KeywordDetail.tsx (소스 분포, 시간대 그래프)
   
5. 반응형 디자인
   └→ 모바일: 사이드바 → 바텀시트, 차트 스크롤
```

#### 컴포넌트 설계 원칙

```typescript
// 모든 대시보드 위젯은 이 패턴
interface WidgetProps<T> {
  data: T            // 표시할 데이터
  isLoading: boolean  // 로딩 상태 → Skeleton
  error?: string      // 에러 → 에러 카드
}

// Skeleton 자동 처리
function Widget<T>({ data, isLoading, error, children }: WidgetProps<T>) {
  if (isLoading) return <WidgetSkeleton />
  if (error) return <WidgetError message={error} />
  return children(data)
}
```

---

### Phase 5: 사용자 기능

**목표**: 인증, 개인화, 알림, 북마크  
**브랜치**: `feat/phase-5-user`  
**의존**: Supabase Auth, 기존 API에 사용자 스코프 추가  
**핵심**: 비로그인 사용자도 기본 대시보드 이용 가능 (graceful degradation)

#### 기능 목록

```
1. 인증 (Supabase Auth)
   ├─ GitHub OAuth 로그인
   ├─ Google OAuth 로그인
   └─ 비로그인 → 기본 대시보드만 (읽기 전용)

2. 관심 키워드 & 알림
   ├─ 키워드 등록 (최대 20개)
   ├─ 급상승 시 웹 푸시 알림
   └─ 이메일 다이제스트 (일간/주간 선택)

3. 북마크
   ├─ 트렌드 아이템 저장
   ├─ 태그로 분류
   └─ 나중에 보기 목록

4. 개인 대시보드
   └─ 관심 카테고리/소스 기반 커스텀 뷰
```

---

### Phase 6: 고도화

**목표**: AI 요약, 뉴스레터, PWA, 추가 소스  
**브랜치**: `feat/phase-6-*` (기능별 분리)  
**핵심**: 기존 코드를 수정하지 않고 확장만

```
1. AI 트렌드 요약 (OpenAI API)
   └→ 일간 트렌드를 자연어로 요약
   
2. 이메일 뉴스레터
   └→ Resend 또는 SendGrid로 주간 발송
   
3. Tier 4~5 추가 수집기
   └→ collectors/ 에 파일 추가만 (기존 코드 무수정)
   
4. 다크 모드 (이미 Tailwind dark: 지원)
   └→ 토글 + localStorage 저장
   
5. PWA
   └→ Service Worker + Web Push API
```

---

## 🚀 빠른 체크리스트

코드 작성 전:
- [ ] 해당 Phase의 상세 사양을 읽었는가?
- [ ] `types/`에 필요한 인터페이스가 정의되어 있는가?
- [ ] 다른 Phase의 내부 구현에 의존하지 않는가?

코드 작성 중:
- [ ] 함수당 하나의 역할만 하는가?
- [ ] 변수/함수 이름만 읽어도 의미가 파악되는가?
- [ ] 매직 넘버 없이 상수로 분리했는가?
- [ ] 불변성을 지키고 있는가?
- [ ] Early return으로 들여쓰기를 최소화했는가?

코드 작성 후:
- [ ] `npx tsc --noEmit` 통과
- [ ] `npm run build` 성공
- [ ] 테스트 작성 & 통과
- [ ] 같은 Phase 내에서만 파일을 변경했는가?
