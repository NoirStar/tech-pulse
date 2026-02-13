import { Card, CardContent } from '@/components/ui/card'
import { Activity, Database, TrendingUp, Clock } from 'lucide-react'

const stats = [
  { label: '수집 아이템', value: '2,847', icon: Database, color: 'text-blue-500' },
  { label: '활성 소스', value: '24/30', icon: Activity, color: 'text-green-500' },
  { label: '급상승 키워드', value: '12', icon: TrendingUp, color: 'text-orange-500' },
  { label: '최근 업데이트', value: '32분 전', icon: Clock, color: 'text-purple-500' },
]

export function StatsBar() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
