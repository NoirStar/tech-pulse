import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, ArrowUpRight } from 'lucide-react'

// 임시 목데이터 — 추후 API 연동
const mockHotKeywords = [
  { keyword: 'DeepSeek R2', velocity: 340, category: 'AI / ML', rank: 1 },
  { keyword: 'React 20', velocity: 210, category: 'Frontend', rank: 2 },
  { keyword: 'Bun 2.0', velocity: 185, category: 'Backend', rank: 3 },
  { keyword: 'Claude MCP', velocity: 160, category: 'AI / ML', rank: 4 },
  { keyword: 'Tailwind v4', velocity: 130, category: 'Frontend', rank: 5 },
  { keyword: 'Deno 3', velocity: 115, category: 'Backend', rank: 6 },
  { keyword: 'Cursor Agent', velocity: 98, category: 'Tools', rank: 7 },
  { keyword: 'Supabase Edge', velocity: 85, category: 'Cloud', rank: 8 },
]

export function HotKeywords() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-orange-500" />
          급상승 키워드
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {mockHotKeywords.map((item) => (
          <div
            key={item.keyword}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground w-5">
                {item.rank}
              </span>
              <div>
                <div className="font-medium text-sm">{item.keyword}</div>
                <Badge variant="secondary" className="text-xs mt-0.5">
                  {item.category}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
              <ArrowUpRight className="h-3 w-3" />
              {item.velocity}%
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
