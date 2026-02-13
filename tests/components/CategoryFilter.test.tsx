import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CategoryFilter } from '@/components/dashboard/CategoryFilter'
import { useTrendStore } from '@/stores/trendStore'

const resetStore = () => useTrendStore.setState(useTrendStore.getInitialState())

describe('CategoryFilter', () => {
  beforeEach(() => {
    resetStore()
  })

  it('카테고리 필터 타이틀을 렌더링한다', () => {
    render(<CategoryFilter />)
    expect(screen.getByText('카테고리 필터')).toBeInTheDocument()
  })

  it('모든 카테고리가 렌더링된다', () => {
    render(<CategoryFilter />)
    expect(screen.getByText('AI / ML')).toBeInTheDocument()
    expect(screen.getByText('Frontend')).toBeInTheDocument()
    expect(screen.getByText('Backend')).toBeInTheDocument()
    expect(screen.getByText('DevOps')).toBeInTheDocument()
    expect(screen.getByText('Mobile')).toBeInTheDocument()
    expect(screen.getByText('Database')).toBeInTheDocument()
    expect(screen.getByText('Tools')).toBeInTheDocument()
    expect(screen.getByText('Security')).toBeInTheDocument()
    expect(screen.getByText('Cloud')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
  })

  it('카테고리 클릭 시 스토어의 selectedCategories가 업데이트된다', () => {
    render(<CategoryFilter />)

    const aiButton = screen.getByText('AI / ML')
    fireEvent.click(aiButton)

    expect(useTrendStore.getState().selectedCategories).toContain('ai-ml')
  })

  it('같은 카테고리를 두 번 클릭하면 선택 해제된다', () => {
    render(<CategoryFilter />)

    const feButton = screen.getByText('Frontend')
    fireEvent.click(feButton) // 선택
    expect(useTrendStore.getState().selectedCategories).toContain('frontend')

    fireEvent.click(feButton) // 해제
    expect(useTrendStore.getState().selectedCategories).not.toContain('frontend')
  })
})
