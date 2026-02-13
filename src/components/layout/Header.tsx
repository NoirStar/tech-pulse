import { Flame } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Settings, Moon, Sun } from 'lucide-react'
import { useState } from 'react'

export function Header() {
  const [isDark, setIsDark] = useState(false)

  const toggleDark = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center gap-4 px-4 mx-auto max-w-7xl">
        {/* Logo */}
        <div className="flex items-center gap-2 font-bold text-lg">
          <Flame className="h-6 w-6 text-orange-500" />
          <span>TechPulse</span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="키워드 검색..." className="pl-9 h-9" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggleDark}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
