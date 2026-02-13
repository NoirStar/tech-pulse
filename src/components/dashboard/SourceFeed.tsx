import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExternalLink } from 'lucide-react'
import { SOURCES } from '@/data/sources'

// 임시 목데이터
const mockFeedItems = [
  {
    id: '1',
    source: 'github',
    title: 'openai/openClaw - Open source AI agent framework',
    url: '#',
    score: 2300,
    timeAgo: '2시간 전',
    category: 'AI / ML',
  },
  {
    id: '2',
    source: 'hackernews',
    title: 'n8n raises $40M for workflow automation',
    url: '#',
    score: 342,
    timeAgo: '3시간 전',
    category: 'Tools',
  },
  {
    id: '3',
    source: 'youtube',
    title: 'React 20 새 기능 완벽 정리 - 10분 요약',
    url: '#',
    score: 45000,
    timeAgo: '5시간 전',
    category: 'Frontend',
  },
  {
    id: '4',
    source: 'geeknews',
    title: 'DeepSeek R2 공개 - GPT-5 수준 성능',
    url: '#',
    score: 156,
    timeAgo: '1시간 전',
    category: 'AI / ML',
  },
  {
    id: '5',
    source: 'reddit',
    title: 'Bun 2.0 is here — 3x faster than Node.js',
    url: '#',
    score: 890,
    timeAgo: '4시간 전',
    category: 'Backend',
  },
  {
    id: '6',
    source: 'producthunt',
    title: 'AI Code Review Tool - Ship faster with AI',
    url: '#',
    score: 890,
    timeAgo: '6시간 전',
    category: 'Tools',
  },
]

const getSourceMeta = (sourceId: string) => {
  return SOURCES.find((s) => s.id === sourceId)
}

function FeedItemCard({ item }: { item: (typeof mockFeedItems)[0] }) {
  const source = getSourceMeta(item.source)

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
      <span className="text-lg mt-0.5">{source?.icon ?? '📌'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-muted-foreground">{source?.name}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{item.timeAgo}</span>
        </div>
        <h4 className="text-sm font-medium leading-snug truncate">{item.title}</h4>
        <div className="flex items-center gap-2 mt-1.5">
          <Badge variant="secondary" className="text-xs">
            {item.category}
          </Badge>
          <span className="text-xs text-muted-foreground">
            🔺 {item.score.toLocaleString()}
          </span>
        </div>
      </div>
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
    </div>
  )
}

export function SourceFeed() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">소스별 실시간 피드</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList className="mb-3">
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="github">🟢 GH</TabsTrigger>
            <TabsTrigger value="hackernews">🟠 HN</TabsTrigger>
            <TabsTrigger value="youtube">🔴 YT</TabsTrigger>
            <TabsTrigger value="korea">🇰🇷 한국</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {mockFeedItems.map((item) => (
                  <FeedItemCard key={item.id} item={item} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="github">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {mockFeedItems
                  .filter((i) => i.source === 'github')
                  .map((item) => (
                    <FeedItemCard key={item.id} item={item} />
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="hackernews">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {mockFeedItems
                  .filter((i) => i.source === 'hackernews')
                  .map((item) => (
                    <FeedItemCard key={item.id} item={item} />
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="youtube">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {mockFeedItems
                  .filter((i) => i.source === 'youtube')
                  .map((item) => (
                    <FeedItemCard key={item.id} item={item} />
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="korea">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {mockFeedItems
                  .filter((i) => ['geeknews', 'naver', 'kakao-tech', 'toss-tech', 'yozm', 'codenary'].includes(i.source))
                  .map((item) => (
                    <FeedItemCard key={item.id} item={item} />
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
