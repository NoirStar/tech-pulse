# 🔥 TechPulse

> IT 트렌드 실시간 수집 & 시각화 플랫폼

30개 이상의 소스에서 IT/개발 트렌드를 자동 수집하고, 키워드 그래프·워드클라우드·급상승 감지로 시각화하는 대시보드.  
단순 링크 나열이 아닌, **"지금 개발자 세계에서 무엇이 뜨고 있는가"**를 한눈에 파악합니다.

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss" />
  <img src="https://img.shields.io/badge/Zustand-5-433E38" />
  <img src="https://img.shields.io/badge/Recharts-3-22B5BF" />
</p>

---

## 핵심 기능

| 기능 | 설명 |
|------|------|
| 🔥 **급상승 키워드** | 30개 소스에서 갑자기 뜨는 기술/도구를 실시간 감지 |
| 📈 **트렌드 그래프** | 키워드별 시간대 언급량을 시계열 차트로 시각화 |
| ☁️ **워드 클라우드** | 현재 가장 핫한 키워드를 크기로 직관적 파악 |
| 🏷️ **자동 카테고리** | AI/ML, Frontend, Backend 등 10개 카테고리 자동 분류 |
| 📡 **소스별 피드** | GitHub, YouTube, HN, Reddit, GeekNews 등 탭별 실시간 피드 |
| 🔔 **개인화 알림** | 관심 키워드 등록 → 급상승 시 알림 |
| 🔖 **북마크** | 관심 트렌드 저장 & 태그 분류 |
| 📬 **뉴스레터** | 일간/주간 트렌드 요약 자동 발송 |

## 데이터 소스 (30개)

| Tier | 소스 |
|------|------|
| 🟢 **Tier 1** | GitHub Trending · YouTube · Google Trends · Google 실시간 · Hacker News |
| 🟡 **Tier 2** | X(Twitter) · Reddit · Product Hunt · Dev.to · Facebook · Medium · Stack Overflow |
| 🔵 **Tier 3** | 네이버 IT뉴스 · GeekNews · 카카오 블로그 · 토스 블로그 · 요즘IT · 코드너리 |
| 🟣 **Tier 4** | npm · PyPI · Docker Hub · GitHub Stars |
| ⚪ **Tier 5** | TechCrunch · The Verge · Ars Technica · Lobsters · 외 |

## 기술 스택

```
Frontend:   React 19 · TypeScript · Vite 7
Styling:    Tailwind CSS 4 · shadcn/ui · Lucide Icons
State:      Zustand
Charts:     Recharts · D3.js
Backend:    Vercel Serverless Functions
Database:   Supabase (PostgreSQL)
Schedule:   Vercel Cron
Deploy:     Vercel
```

---

## 시작하기

```bash
# 클론
git clone https://github.com/NoirStar/tech-pulse.git
cd tech-pulse

# 의존성 설치
npm install

# 개발 서버
npm run dev

# 빌드
npm run build
```

## 프로젝트 구조

```
src/
├── components/
│   ├── dashboard/     # 대시보드 위젯 (TrendChart, HotKeywords, SourceFeed, ...)
│   ├── layout/        # Header, Layout
│   └── ui/            # shadcn/ui 컴포넌트
├── data/              # 소스 정의, 카테고리 키워드 매핑
├── hooks/             # 커스텀 훅
├── lib/               # 유틸리티
├── pages/             # 페이지 컴포넌트
├── services/          # 수집기, 분석 엔진
│   └── collectors/    # 소스별 수집기
├── stores/            # Zustand 스토어
└── types/             # TypeScript 타입 정의
```

## 개발 로드맵

> 각 Phase는 독립적으로 동작합니다. 자세한 내용은 [CONTRIBUTING.md](./CONTRIBUTING.md)를 참고하세요.

| Phase | 내용 | 상태 |
|-------|------|------|
| **0** | 프로젝트 세팅 & 기본 구조 | ✅ 완료 |
| **1** | Tier 1 핵심 수집기 (GH, YT, Google, HN) | 🔲 예정 |
| **2** | Tier 2+3 확장 수집기 (X, Reddit, 한국 소스) | 🔲 예정 |
| **3** | 키워드 분석 엔진 (추출, 점수, 급상승 감지) | 🔲 예정 |
| **4** | 프론트엔드 대시보드 완성 | 🔲 예정 |
| **5** | 사용자 기능 (인증, 알림, 북마크) | 🔲 예정 |
| **6** | 고도화 (AI 요약, 뉴스레터, PWA) | 🔲 예정 |

## 문서

- [PLAN.md](./PLAN.md) — 프로젝트 전체 계획, 데이터 소스, 기능 명세
- [CONTRIBUTING.md](./CONTRIBUTING.md) — 개발 가이드, Phase별 상세 사양, 코드 원칙

## 라이선스

MIT
