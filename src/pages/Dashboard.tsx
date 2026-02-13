import { Layout } from '@/components/layout/Layout'
import { StatsBar } from '@/components/dashboard/StatsBar'
import { HotKeywords } from '@/components/dashboard/HotKeywords'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { SourceFeed } from '@/components/dashboard/SourceFeed'
import { CategoryFilter } from '@/components/dashboard/CategoryFilter'

export function Dashboard() {
  return (
    <Layout>
      {/* Stats */}
      <StatsBar />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        {/* Left Sidebar — 급상승 키워드 + 카테고리 */}
        <div className="lg:col-span-3 space-y-4">
          <HotKeywords />
          <CategoryFilter />
        </div>

        {/* Center — 차트 + 피드 */}
        <div className="lg:col-span-9 space-y-4">
          <TrendChart />
          <SourceFeed />
        </div>
      </div>
    </Layout>
  )
}
