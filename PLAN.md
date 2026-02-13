# 🔥 TechPulse — IT 트렌드 실시간 수집 & 시각화 플랫폼

## 프로젝트 개요

IT/개발 분야의 최신 트렌드를 여러 소스에서 자동 수집하고, 단순 링크 나열이 아닌 **키워드 그래프**, **실시간 인기도**, **트렌드 분석** 등으로 시각화하여 한눈에 파악할 수 있는 대시보드형 플랫폼.

> "정보가 너무 빠르고 많아서 놓치는 게 두려운 개발자를 위한 레이더"

---

## 핵심 컨셉

- **원글 링크 나열 ❌** → **키워드 트렌드 그래프 ✅**
- 여러 소스의 데이터를 수집 → 키워드/토픽 추출 → 시각화
- 실시간 인기도, 급상승 키워드, 카테고리별 히트맵

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | React 18+ / Vite / TypeScript |
| **스타일링** | Tailwind CSS + shadcn/ui |
| **상태관리** | Zustand |
| **차트/시각화** | Recharts / D3.js (워드클라우드, 트렌드 그래프) |
| **백엔드 API** | Vercel Serverless Functions (또는 별도 Node.js 서버) |
| **데이터 수집** | Node.js 크롤러 / RSS 파싱 / 공식 API |
| **데이터 저장** | Supabase (PostgreSQL) 또는 Firebase |
| **스케줄링** | Vercel Cron / GitHub Actions (주기적 수집) |
| **배포** | Vercel |

---

## 데이터 소스 & 수집 전략 (종합)

> **원칙**: API가 있으면 API, 없으면 RSS, 그것도 없으면 크롤링. 가능한 전부 수집한다.
> **수집 주기**: 1시간 (Vercel Cron / GitHub Actions)

---

### 🟢 Tier 1 — 핵심 소스 (MVP, 최우선 구현)

| # | 소스 | 수집 방법 | 수집 데이터 | 주기 |
|---|------|-----------|------------|------|
| 1 | **GitHub Trending** | 크롤링 (`github.com/trending`) + [gh-trending-api](https://github.com/huchenme/github-trending-api) | 일간/주간 트렌딩 레포, 언어, 스타 수, 설명 | 1h |
| 2 | **YouTube** | [YouTube Data API v3](https://developers.google.com/youtube/v3) | IT/개발 채널 인기 영상, 검색 트렌드, 조회수 급상승 | 1h |
| 3 | **Google Trends** | [google-trends-api](https://www.npmjs.com/package/google-trends-api) + 크롤링 | 기술 키워드 검색량 트렌드, 실시간 인기 검색어 | 1h |
| 4 | **Google 실시간 검색** | 크롤링 (Google News, Google Search trending) | IT/기술 관련 실시간 급상승 검색어 | 1h |
| 5 | **Hacker News** | [공식 Firebase API](https://github.com/HackerNews/API) | Top/Best/Show/Ask HN 스토리, 점수, 댓글 | 1h |

### 🟡 Tier 2 — 주요 글로벌 소스

| # | 소스 | 수집 방법 | 수집 데이터 | 주기 |
|---|------|-----------|------------|------|
| 6 | **X (Twitter)** | X API v2 (Basic $100/mo) + 크롤링 (Nitter 대안) | 개발자 인플루언서 트윗, 해시태그 트렌드, 바이럴 트윗 | 1h |
| 7 | **Reddit** | [Reddit JSON API](https://www.reddit.com/r/programming.json) (무료) | r/programming, r/webdev, r/machinelearning 등 인기 글 | 1h |
| 8 | **Product Hunt** | [GraphQL API](https://api.producthunt.com/v2/docs) | 일간 인기 IT 신제품, 카테고리, 투표 수 | 1h |
| 9 | **Dev.to** | [Forem API](https://developers.forem.com/api) | 인기 기술 아티클, 태그별 트렌드, 리액션 | 1h |
| 10 | **Facebook** | 크롤링 (공개 그룹/페이지) + [Graph API](https://developers.facebook.com/docs/graph-api/) (제한적) | 개발자 그룹 인기 게시물, 공유 수 | 2h |
| 11 | **Medium** | RSS 피드 (`medium.com/feed/tag/programming`) | 기술 블로그 인기 아티클, 클랩 수 | 1h |
| 12 | **Stack Overflow** | [SO API v2.3](https://api.stackexchange.com/) | 급상승 태그, 인기 질문, 주간 핫 토픽 | 2h |

### 🔵 Tier 3 — 한국 IT 소스

| # | 소스 | 수집 방법 | 수집 데이터 | 주기 |
|---|------|-----------|------------|------|
| 13 | **네이버 실시간 검색/뉴스** | 크롤링 (네이버 IT 뉴스) + [네이버 검색 API](https://developers.naver.com/) | IT 뉴스 헤드라인, 실시간 검색어 (IT 필터) | 1h |
| 14 | **GeekNews** | 크롤링 (`news.hada.io`) / RSS | 한국 개발자 HN 스타일 커뮤니티, 인기 글 | 1h |
| 15 | **카카오 기술 블로그** | RSS (`tech.kakao.com/feed`) / 크롤링 | 카카오 엔지니어링 포스트, 기술 스택 동향 | 2h |
| 16 | **토스 기술 블로그** | RSS / 크롤링 (`toss.tech`) | 토스 엔지니어링, 프론트엔드/백엔드 기술 동향 | 2h |
| 17 | **요즘IT** | 크롤링 (`yozm.wishket.com`) | IT 트렌드 아티클, 커리어, 기술 분석 | 2h |
| 18 | **코드너리** | 크롤링 (`codenary.co.kr`) | 한국 IT 기업 기술 블로그 모음, 트렌드 | 2h |

### 🟣 Tier 4 — 패키지/에코시스템 트렌드

| # | 소스 | 수집 방법 | 수집 데이터 | 주기 |
|---|------|-----------|------------|------|
| 19 | **npm Registry** | [npm API](https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md) + 크롤링 | 주간 다운로드 급상승 패키지, 새 인기 패키지 | 6h |
| 20 | **PyPI** | [PyPI JSON API](https://pypi.org/pypi/{package}/json) + [BigQuery](https://packaging.python.org/en/latest/guides/analyzing-pypi-package-downloads/) | Python 패키지 다운로드 트렌드, 급상승 | 6h |
| 21 | **Docker Hub** | [Docker Hub API](https://docs.docker.com/docker-hub/api/) | 인기 이미지, 풀 수 급상승 | 6h |
| 22 | **GitHub Stars History** | GitHub API v4 (GraphQL) | 특정 레포 스타 증가 속도 추적 | 6h |

### ⚪ Tier 5 — IT 뉴스 & 미디어

| # | 소스 | 수집 방법 | 수집 데이터 | 주기 |
|---|------|-----------|------------|------|
| 23 | **TechCrunch** | RSS (`techcrunch.com/feed`) | IT 스타트업, AI, 펀딩 뉴스 | 2h |
| 24 | **The Verge** | RSS (`theverge.com/rss/index.xml`) | 기술 제품, 리뷰, 트렌드 | 2h |
| 25 | **Ars Technica** | RSS | 딥테크, 보안, 사이언스 뉴스 | 2h |
| 26 | **InfoQ** | RSS (`feed.infoq.com`) | 엔터프라이즈 기술 트렌드, 아키텍처 | 4h |
| 27 | **The New Stack** | RSS | 클라우드 네이티브, DevOps, 인프라 | 4h |
| 28 | **Lobsters** | [API/RSS](https://lobste.rs/rss) | 기술 토론 인기글 (HN 대안) | 2h |
| 29 | **Slashdot** | RSS | 오래된 IT 커뮤니티, geek 뉴스 | 4h |
| 30 | **DZone** | RSS / 크롤링 | 기술 아티클, 튜토리얼 트렌드 | 4h |

---

### 수집 방법 상세

```
수집 우선순위:
  1. 공식 API (가장 안정적, Rate Limit 관리 필요)
  2. RSS/Atom 피드 (무료, 안정적, 파싱 쉬움)
  3. JSON 엔드포인트 (비공식이지만 안정적인 경우)
  4. 웹 크롤링 (API 없을 때 최후 수단, 구조 변경 시 깨질 수 있음)
```

#### 크롤링 전략
```typescript
// Puppeteer/Playwright — 동적 렌더링 필요한 사이트
// (YouTube, Facebook, 네이버 등)
const dynamicSources = ['youtube', 'facebook', 'naver'];

// Cheerio — 정적 HTML 파싱 (빠르고 가벼움)
// (GitHub Trending, GeekNews, 요즘IT, 코드너리 등)
const staticSources = ['github-trending', 'geeknews', 'yozm', 'codenary'];

// RSS Parser — RSS/Atom 피드
// (Medium, TechCrunch, The Verge, 기술 블로그 등)
const rssSources = ['medium', 'techcrunch', 'theverge', 'kakao-tech', 'toss-tech'];
```

#### Rate Limit & 비용 관리
| 소스 | 무료 한도 | 월 비용 (예상) |
|------|-----------|---------------|
| YouTube Data API | 10,000 유닛/일 | $0 (충분) |
| X API v2 Basic | 10,000 읽기/월 | $100/mo |
| GitHub API | 5,000 req/h | $0 |
| Reddit API | 60 req/min | $0 |
| 네이버 API | 25,000 req/일 | $0 |
| 나머지 크롤링 | N/A | $0 (서버 비용만) |

#### 수집 파이프라인

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Cron 트리거  │────▶│  수집기 실행  │────▶│ 키워드 추출   │────▶│  DB 저장     │
│  (1h 주기)   │     │ (30개 소스)   │     │ + 카테고리    │     │ (Supabase)   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                            │                                         │
                     ┌──────┴──────┐                          ┌──────┴──────┐
                     │ API 호출    │                          │ 트렌드 집계  │
                     │ RSS 파싱    │                          │ 점수 계산    │
                     │ 크롤링      │                          │ 급상승 감지  │
                     └─────────────┘                          └─────────────┘
```

---

## 핵심 기능

### 1. 실시간 트렌드 대시보드 (메인 페이지)

```
┌─────────────────────────────────────────────────┐
│  🔥 TechPulse                    [검색] [설정]  │
├──────────────────┬──────────────────────────────┤
│                  │                              │
│  급상승 키워드    │   키워드 트렌드 그래프        │
│  ─────────────   │   (시간별 언급량 변화)        │
│  1. OpenClaw ↑   │        📈                    │
│  2. n8n      ↑   │                              │
│  3. DeepSeek ↑   │                              │
│                  │                              │
├──────────────────┼──────────────────────────────┤
│                  │                              │
│  카테고리 필터    │   워드 클라우드 / 히트맵      │
│  ☑ AI/ML        │                              │
│  ☑ Frontend     │      [OpenClaw]  [n8n]       │
│  ☑ Backend      │   [Rust]    [DeepSeek]       │
│  ☐ DevOps       │      [Bun]  [Astro]          │
│  ☐ Mobile       │                              │
│                  │                              │
├──────────────────┴──────────────────────────────┤
│                                                 │
│  소스별 실시간 피드 (탭: All / GH / HN / PH)    │
│  ┌─────────────────────────────────────────┐    │
│  │ 🟢 GitHub: "openai/openClaw" ⭐ 2.3k   │    │
│  │ 🟠 HN: "n8n raises $40M" 🔺 342pts    │    │
│  │ 🔵 PH: "AI Code Review Tool" 🔺 890    │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 2. 키워드 트렌드 분석

- **시간별 언급량 그래프**: 특정 키워드가 각 소스에서 얼마나 언급되는지 시계열 차트
- **워드 클라우드**: 현재 가장 핫한 키워드를 크기로 시각화
- **급상승 알림**: 갑자기 언급이 급증한 키워드 하이라이트
- **소스간 교차 분석**: 같은 키워드가 여러 소스에서 동시에 뜨면 "확산 중" 표시

### 3. 카테고리 분류 (자동)

키워드 기반 자동 분류:
- **AI/ML**: ChatGPT, LLM, DeepSeek, OpenAI, Anthropic...
- **Frontend**: React, Vue, Svelte, Astro, CSS...
- **Backend**: Node.js, Go, Rust, Python, API...
- **DevOps**: Docker, K8s, CI/CD, Terraform...
- **Mobile**: Flutter, React Native, Swift, Kotlin...
- **Database**: PostgreSQL, Redis, Supabase, MongoDB...
- **Tools**: IDE, Editor, CLI, Package Manager...

### 4. 개인화 & 알림

- **관심 키워드 등록**: 특정 키워드가 트렌딩에 올라오면 알림
- **이메일/웹 푸시 알림**: 일간/주간 다이제스트
- **개인 대시보드**: 관심 카테고리 기반 커스텀 뷰

### 5. 북마크 & 저장

- 관심 있는 트렌드/아이템 저장
- 태그로 분류
- 나중에 보기 목록

### 6. 요약 뉴스레터

- 일간/주간 트렌드 자동 요약 생성
- 이메일 구독 기능
- AI 기반 요약 (선택적)

---

## 프로젝트 구조 (예상)

```
tech-pulse/
├── public/
├── src/
│   ├── components/
│   │   ├── dashboard/          # 메인 대시보드
│   │   │   ├── TrendChart.tsx        # 키워드 트렌드 그래프
│   │   │   ├── WordCloud.tsx         # 워드 클라우드
│   │   │   ├── HotKeywords.tsx       # 급상승 키워드 사이드바
│   │   │   ├── SourceFeed.tsx        # 소스별 실시간 피드
│   │   │   └── CategoryFilter.tsx    # 카테고리 필터
│   │   ├── bookmark/            # 북마크/저장
│   │   ├── settings/            # 설정/알림
│   │   ├── layout/              # 공통 레이아웃
│   │   └── ui/                  # shadcn/ui 컴포넌트
│   ├── hooks/
│   │   ├── useTrends.ts         # 트렌드 데이터 fetch
│   │   ├── useKeywords.ts       # 키워드 분석
│   │   └── useBookmarks.ts      # 북마크 관리
│   ├── services/
│   │   ├── collectors/          # 데이터 수집 서비스
│   │   │   ├── github.ts
│   │   │   ├── hackerNews.ts
│   │   │   ├── productHunt.ts
│   │   │   ├── reddit.ts
│   │   │   ├── devto.ts
│   │   │   └── googleTrends.ts
│   │   ├── analyzer.ts          # 키워드 추출/분석
│   │   └── categorizer.ts       # 자동 카테고리 분류
│   ├── stores/
│   │   ├── trendStore.ts        # 트렌드 데이터 상태
│   │   ├── filterStore.ts       # 필터/카테고리 상태
│   │   └── userStore.ts         # 사용자 설정/북마크
│   ├── types/
│   │   ├── trend.ts
│   │   ├── source.ts
│   │   └── keyword.ts
│   └── lib/
│       ├── api.ts               # API 클라이언트
│       └── utils.ts
├── api/                          # Vercel Serverless Functions
│   ├── collect/                  # 데이터 수집 엔드포인트
│   │   ├── github.ts
│   │   ├── hackernews.ts
│   │   └── ...
│   ├── trends.ts                 # 트렌드 분석 API
│   └── cron/                     # 스케줄링된 수집 작업
│       └── collect-all.ts
├── package.json
├── vite.config.ts
└── PLAN.md
```

---

## 개발 로드맵

### Phase 0: 프로젝트 세팅 (Day 1) ✅
- [x] PLAN.md 작성
- [x] GitHub 레포지토리 생성
- [x] React + Vite + TypeScript 프로젝트 초기화
- [x] Tailwind CSS v4 + shadcn/ui 설정
- [x] ESLint + Prettier 설정
- [x] 프로젝트 구조 & 타입 정의 & 목데이터 대시보드
- [x] Vitest + RTL 테스트 설정 & Phase 0 테스트 48개 통과
- [ ] Supabase 프로젝트 생성 & DB 스키마 설계 (→ Phase 1에서)
- [ ] Vercel 배포 연동 (→ Phase 1에서)

### Phase 1: Tier 1 핵심 수집기 (Day 2-5) ✅
- [x] 공통 수집기 인터페이스 & 파이프라인 설계
- [x] GitHub Trending 크롤러 (Cheerio)
- [x] YouTube Data API v3 수집기
- [x] Google Trends + 실시간 검색 수집기
- [x] Hacker News API 수집기
- [x] 키워드 추출 엔진 (제목/설명에서 기술 키워드 추출)
- [ ] Supabase에 수집 데이터 저장 파이프라인
- [x] Vercel Cron 1시간 주기 수집 스케줄링
- [x] ✅ **테스트**: 각 수집기 단위 테스트 + 파이프라인 통합 테스트 통과 (55개)

### Phase 2: Tier 2+3 확장 수집기 (Day 6-9)
- [x] X (Twitter) API v2 수집기
- [x] Reddit JSON API 수집기
- [x] Product Hunt GraphQL 수집기
- [x] Dev.to / Medium RSS 수집기
- [ ] Facebook 공개 그룹 크롤러
- [x] Stack Overflow API 수집기
- [x] 네이버 IT 뉴스 크롤러 + 네이버 API
- [x] GeekNews 크롤러
- [x] 카카오/토스/우아한형제들/LINE/D2 기술 블로그 RSS 수집기
- [x] 요즘IT / 코드너리 크롤러
- [x] 수집기 레지스트리 확장 (createTier2/3Collectors, createAllCollectors)
- [x] ✅ **테스트**: 12개 수집기 단위 테스트 + 레지스트리 테스트 통과 (186개 총 테스트, 83개 신규)

### Phase 3: 키워드 분석 엔진 (Day 10-12)
- [ ] 수집 데이터 기반 키워드 빈도 분석
- [ ] 트렌드 점수 계산 (velocity, cross-source 가중치)
- [ ] 자동 카테고리 분류기 (룰 기반 + 확장 가능)
- [ ] 급상승 감지 알고리즘 (이전 구간 대비 증가율)
- [ ] 소스 간 교차 분석 (여러 소스에서 동시 급상승 = "확산 중")
- [ ] ✅ **테스트**: 키워드 추출 정확도 + 트렌드 점수 + 급상승 감지 테스트 통과

### Phase 4: 프론트엔드 대시보드 (Day 13-17)
- [ ] 레이아웃 & 네비게이션
- [ ] 키워드 트렌드 시계열 차트 (Recharts)
- [ ] 워드 클라우드 시각화 (D3.js)
- [ ] 급상승 키워드 사이드바 (소스별 아이콘)
- [ ] 소스별 실시간 피드 (30개 소스 탭/필터)
- [ ] 카테고리 필터
- [ ] 키워드 클릭 → 상세 분석 페이지 (소스별 분포, 시간대별 그래프)
- [ ] 반응형 디자인 (모바일)
- [ ] ✅ **테스트**: 페이지 렌더 + 차트 바인딩 + 필터/검색 인터랙션 테스트 통과

### Phase 5: 사용자 기능 (Day 18-21)
- [ ] 사용자 인증 (Supabase Auth)
- [ ] 관심 키워드 등록 & 알림 설정
- [ ] 북마크/저장 기능
- [ ] 개인 대시보드 커스터마이징
- [ ] ✅ **테스트**: 인증 플로우 + 북마크 CRUD + 알림 설정 테스트 통과

### Phase 6: 고도화 (Day 22+)
- [ ] Tier 4~5 추가 수집기 (npm, PyPI, Docker Hub, IT 뉴스)
- [ ] AI 기반 트렌드 요약 (OpenAI API)
- [ ] 이메일 뉴스레터 자동 발송
- [ ] 다크 모드
- [ ] PWA 지원 (모바일 푸시 알림)
- [ ] ✅ **테스트**: 추가 수집기 테스트 + (선택) E2E 시나리오 테스트

---

## 테스트 전략

> **원칙: 테스트 없는 코드는 머지하지 않는다.**

### 테스트 스택

| 도구 | 용도 |
|------|------|
| **Vitest** | 단위/통합 테스트 러너 |
| **React Testing Library** | 컴포넌트 렌더 + 인터랙션 테스트 |
| **jsdom** | 브라우저 환경 시뮬레이션 |
| **MSW (Mock Service Worker)** | API 응답 모킹 (수집기 테스트) |

### 테스트 원칙

1. **각 Phase 완료 조건에 테스트 통과 포함** — 테스트가 깨진 상태로 다음 Phase 진행 금지
2. **수집기(Collector)는 반드시 단위 테스트** — 외부 API 목(mock) 응답으로 독립 테스트, 실제 네트워크 호출 없이 검증
3. **스토어 액션은 상태 변화 테스트** — 각 액션 호출 전/후의 상태 스냅샷 비교
4. **컴포넌트는 사용자 관점 테스트** — 내부 구현이 아닌 렌더 결과와 인터랙션 검증
5. **커밋 전 `npm test` 통과 필수** — CI에서도 테스트 실패 시 머지 차단

### Phase별 테스트 범위

| Phase | 필수 테스트 항목 |
|-------|-----------------|
| 0 | 타입 정의 무결성, 데이터 소스 메타, Zustand 스토어, 공통 컴포넌트 렌더 |
| 1 | 각 Tier 1 수집기 (HN, GitHub, YouTube, Google) 단위 테스트, 파이프라인 통합 테스트 |
| 2 | Tier 2+3 수집기 단위 테스트, RSS 파서 테스트 |
| 3 | 키워드 추출 정확도, 트렌드 점수 계산, 급상승 감지 알고리즘 |
| 4 | 대시보드 페이지 렌더, 차트 데이터 바인딩, 필터/검색 인터랙션 |
| 5 | 인증 플로우, 북마크 CRUD, 알림 설정 |
| 6 | E2E 시나리오 (선택), 성능 벤치마크 |

### 커버리지 목표

- **수집기/서비스 로직**: 80% 이상
- **Zustand 스토어**: 90% 이상
- **UI 컴포넌트**: 핵심 인터랙션 100% (렌더 + 클릭/입력)
- **shadcn/ui 래퍼**: 제외 (`src/components/ui/**`)

---

## 데이터 모델 (핵심)

```typescript
// 수집된 원본 아이템
interface TrendItem {
  id: string;
  source: 'github' | 'hackernews' | 'producthunt' | 'reddit' | 'devto' | 'medium';
  title: string;
  url: string;
  score: number;          // 소스별 인기 점수 (스타, 포인트, 투표 등)
  keywords: string[];     // 추출된 키워드
  category: Category;     // 자동 분류된 카테고리
  collectedAt: Date;
  metadata: Record<string, any>;  // 소스별 추가 정보
}

// 키워드 트렌드 집계
interface KeywordTrend {
  keyword: string;
  category: Category;
  hourlyMentions: { hour: string; count: number }[];
  dailyMentions: { date: string; count: number }[];
  sources: { source: string; count: number }[];
  velocity: number;       // 급상승 정도 (최근 변화율)
  totalMentions: number;
  firstSeen: Date;
  lastSeen: Date;
}

// 카테고리
type Category = 
  | 'ai-ml' 
  | 'frontend' 
  | 'backend' 
  | 'devops' 
  | 'mobile' 
  | 'database' 
  | 'tools' 
  | 'security' 
  | 'other';
```

---

## 차별화 포인트

1. **단순 링크 모음이 아닌 분석 도구** — 키워드 빈도, 교차 소스 분석
2. **시각적 대시보드** — 그래프, 워드클라우드, 히트맵으로 직관적 파악
3. **급상승 감지** — 갑자기 뜨는 기술/도구를 남들보다 빨리 포착
4. **개인화** — 내 관심 분야만 필터링, 키워드 알림

---

## 참고 서비스

- [daily.dev](https://daily.dev/) — 개발자 뉴스 피드
- [Lobsters](https://lobste.rs/) — 기술 뉴스 커뮤니티
- [TechMeme](https://techmeme.com/) — IT 뉴스 집계
- [Star History](https://star-history.com/) — GitHub 스타 트렌드
- [npm trends](https://npmtrends.com/) — npm 패키지 비교
- [Google Trends](https://trends.google.com/) — 검색 트렌드
