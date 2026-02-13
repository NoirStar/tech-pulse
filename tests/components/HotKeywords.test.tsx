import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HotKeywords } from '@/components/dashboard/HotKeywords'

describe('HotKeywords', () => {
  it('급상승 키워드 타이틀을 렌더링한다', () => {
    render(<HotKeywords />)
    expect(screen.getByText('급상승 키워드')).toBeInTheDocument()
  })

  it('키워드 목록을 렌더링한다', () => {
    render(<HotKeywords />)
    // 목데이터의 첫 번째 키워드가 보여야 함
    expect(screen.getByText('DeepSeek R2')).toBeInTheDocument()
    expect(screen.getByText('React 20')).toBeInTheDocument()
    expect(screen.getByText('Bun 2.0')).toBeInTheDocument()
  })

  it('각 키워드에 velocity(%)가 표시된다', () => {
    render(<HotKeywords />)
    expect(screen.getByText('340%')).toBeInTheDocument()
    expect(screen.getByText('210%')).toBeInTheDocument()
  })

  it('각 키워드에 카테고리 뱃지가 표시된다', () => {
    render(<HotKeywords />)
    const aiBadges = screen.getAllByText('AI / ML')
    expect(aiBadges.length).toBeGreaterThanOrEqual(1)
  })

  it('8개의 키워드 항목이 모두 렌더링된다', () => {
    render(<HotKeywords />)
    // 순위 1~8이 모두 보여야 함
    for (let i = 1; i <= 8; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument()
    }
  })
})
