import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Activity } from 'lucide-react'

// 임시 목데이터 — 24시간 키워드 트렌드
const mockTrendData = [
  { hour: '00:00', DeepSeek: 12, React: 8, Bun: 5, Claude: 3 },
  { hour: '02:00', DeepSeek: 15, React: 7, Bun: 6, Claude: 4 },
  { hour: '04:00', DeepSeek: 10, React: 9, Bun: 4, Claude: 5 },
  { hour: '06:00', DeepSeek: 18, React: 12, Bun: 8, Claude: 6 },
  { hour: '08:00', DeepSeek: 35, React: 15, Bun: 10, Claude: 9 },
  { hour: '10:00', DeepSeek: 52, React: 20, Bun: 18, Claude: 14 },
  { hour: '12:00', DeepSeek: 68, React: 25, Bun: 22, Claude: 18 },
  { hour: '14:00', DeepSeek: 85, React: 30, Bun: 28, Claude: 22 },
  { hour: '16:00', DeepSeek: 95, React: 28, Bun: 35, Claude: 25 },
  { hour: '18:00', DeepSeek: 88, React: 32, Bun: 30, Claude: 28 },
  { hour: '20:00', DeepSeek: 72, React: 26, Bun: 24, Claude: 20 },
  { hour: '22:00', DeepSeek: 60, React: 22, Bun: 20, Claude: 16 },
]

const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B']

export function TrendChart() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-blue-500" />
          키워드 트렌드 (24h)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockTrendData}>
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid hsl(var(--border))',
                backgroundColor: 'hsl(var(--background))',
              }}
            />
            <Legend />
            {['DeepSeek', 'React', 'Bun', 'Claude'].map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[i]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
