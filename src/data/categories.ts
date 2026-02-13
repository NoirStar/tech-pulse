import type { Category } from '@/types'

// 카테고리별 키워드 매핑 (자동 분류용)
export const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  'ai-ml': [
    'ai', 'ml', 'machine learning', 'deep learning', 'llm', 'gpt', 'chatgpt',
    'openai', 'anthropic', 'claude', 'gemini', 'deepseek', 'diffusion',
    'transformer', 'neural', 'nlp', 'computer vision', 'rag', 'fine-tuning',
    'embedding', 'langchain', 'huggingface', 'stable diffusion', 'midjourney',
    'copilot', 'agent', 'mcp', 'model context protocol',
  ],
  frontend: [
    'react', 'vue', 'svelte', 'angular', 'next.js', 'nuxt', 'astro',
    'tailwind', 'css', 'html', 'javascript', 'typescript', 'vite', 'webpack',
    'remix', 'solid', 'qwik', 'htmx', 'webcomponent', 'pwa', 'shadcn',
    'radix', 'framer', 'animation', 'responsive', 'a11y', 'accessibility',
  ],
  backend: [
    'node', 'express', 'nestjs', 'fastify', 'django', 'flask', 'fastapi',
    'spring', 'go', 'golang', 'rust', 'python', 'java', 'ruby', 'rails',
    'graphql', 'rest', 'api', 'grpc', 'websocket', 'microservice', 'serverless',
    'lambda', 'deno', 'bun', 'elixir', 'phoenix',
  ],
  devops: [
    'docker', 'kubernetes', 'k8s', 'ci/cd', 'github actions', 'terraform',
    'ansible', 'jenkins', 'aws', 'azure', 'gcp', 'cloud', 'linux', 'nginx',
    'helm', 'argocd', 'gitops', 'monitoring', 'prometheus', 'grafana',
    'observability', 'sre', 'infrastructure',
  ],
  mobile: [
    'flutter', 'react native', 'swift', 'swiftui', 'kotlin', 'android',
    'ios', 'expo', 'capacitor', 'ionic', 'maui', 'compose', 'jetpack',
  ],
  database: [
    'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'supabase',
    'firebase', 'prisma', 'drizzle', 'sqlite', 'dynamodb', 'cassandra',
    'neo4j', 'elasticsearch', 'vector database', 'pinecone', 'weaviate',
  ],
  tools: [
    'vscode', 'neovim', 'vim', 'git', 'cli', 'terminal', 'ide', 'cursor',
    'windsurf', 'zed', 'warp', 'fig', 'homebrew', 'package manager',
    'prettier', 'eslint', 'biome', 'turbo', 'monorepo', 'nx',
  ],
  security: [
    'security', 'vulnerability', 'cve', 'authentication', 'oauth', 'jwt',
    'encryption', 'ssl', 'tls', 'hacking', 'pentest', 'xss', 'csrf',
    'zero-day', 'ransomware', 'firewall', 'passkey', 'webauthn',
  ],
  cloud: [
    'aws', 'azure', 'gcp', 'vercel', 'netlify', 'cloudflare', 'edge',
    'cdn', 'saas', 'paas', 'iaas', 'serverless', 'lambda', 'cloud function',
  ],
  other: [],
}

export const CATEGORY_META: Record<Category, { name: string; emoji: string; color: string }> = {
  'ai-ml': { name: 'AI / ML', emoji: '🤖', color: '#8B5CF6' },
  frontend: { name: 'Frontend', emoji: '🎨', color: '#3B82F6' },
  backend: { name: 'Backend', emoji: '⚙️', color: '#10B981' },
  devops: { name: 'DevOps', emoji: '🔧', color: '#F59E0B' },
  mobile: { name: 'Mobile', emoji: '📱', color: '#EC4899' },
  database: { name: 'Database', emoji: '🗄️', color: '#6366F1' },
  tools: { name: 'Tools', emoji: '🛠️', color: '#8B5CF6' },
  security: { name: 'Security', emoji: '🔒', color: '#EF4444' },
  cloud: { name: 'Cloud', emoji: '☁️', color: '#06B6D4' },
  other: { name: 'Other', emoji: '📌', color: '#6B7280' },
}
