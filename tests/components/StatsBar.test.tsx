import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsBar } from '@/components/dashboard/StatsBar'

describe('StatsBar', () => {
  it('4개의 통계 카드를 렌더링한다', () => {
    render(<StatsBar />)
    expect(screen.getByText('수집 아이템')).toBeInTheDocument()
    expect(screen.getByText('활성 소스')).toBeInTheDocument()
    expect(screen.getByText('급상승 키워드')).toBeInTheDocument()
    expect(screen.getByText('최근 업데이트')).toBeInTheDocument()
  })

  it('통계 값이 표시된다', () => {
    render(<StatsBar />)
    expect(screen.getByText('2,847')).toBeInTheDocument()
    expect(screen.getByText('24/30')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })
})
