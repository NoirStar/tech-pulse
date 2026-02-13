import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CATEGORY_META } from '@/data/categories'
import type { Category } from '@/types'
import { Filter } from 'lucide-react'
import { useTrendStore } from '@/stores/trendStore'

const categories = Object.entries(CATEGORY_META) as [Category, (typeof CATEGORY_META)[Category]][]

export function CategoryFilter() {
  const { selectedCategories, toggleCategory } = useTrendStore()

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Filter className="h-4 w-4 text-purple-500" />
          카테고리 필터
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {categories.map(([key, meta]) => {
          const isSelected =
            selectedCategories.length === 0 || selectedCategories.includes(key)
          return (
            <button
              key={key}
              onClick={() => toggleCategory(key)}
              className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm transition-all ${
                isSelected
                  ? 'bg-muted/60 font-medium'
                  : 'opacity-40 hover:opacity-70'
              }`}
            >
              <span>{meta.emoji}</span>
              <span className="flex-1 text-left">{meta.name}</span>
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: meta.color }}
              />
            </button>
          )
        })}
      </CardContent>
    </Card>
  )
}
