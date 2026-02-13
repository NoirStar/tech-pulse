import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from '@/components/layout/Header'

describe('Header', () => {
  it('TechPulse 로고를 렌더링한다', () => {
    render(<Header />)
    expect(screen.getByText('TechPulse')).toBeInTheDocument()
  })

  it('검색 입력 필드가 존재한다', () => {
    render(<Header />)
    expect(screen.getByPlaceholderText('키워드 검색...')).toBeInTheDocument()
  })

  it('다크모드 토글 버튼이 존재한다', () => {
    render(<Header />)
    // 버튼이 최소 2개 (다크모드 + 설정)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  it('다크모드 토글 시 html에 dark 클래스가 추가된다', () => {
    render(<Header />)
    const buttons = screen.getAllByRole('button')
    const darkToggle = buttons[0] // 첫 번째 버튼이 다크모드 토글

    fireEvent.click(darkToggle)
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    fireEvent.click(darkToggle)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
