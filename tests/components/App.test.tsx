import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from '@/App'

function renderApp() {
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  )
}

describe('App', () => {
  it('루트 경로에서 대시보드가 렌더링된다', () => {
    // App은 이미 BrowserRouter를 포함하므로 직접 렌더
    render(<App />)

    // Header의 TechPulse 로고 텍스트 확인
    expect(screen.getByText('TechPulse')).toBeInTheDocument()
  })
})
