/**
 * Single source of truth for every piece of content in the site.
 * Sourced from Shreya Dantani's resume — keep this file in sync with the CV.
 */

export type Stage =
  | 'gate'
  | 'tokenize'
  | 'embed'
  | 'retrieve'
  | 'agents'
  | 'evaluate'
  | 'deploy'
  | 'generate'

export const STAGES: Stage[] = [
  'gate',
  'tokenize',
  'embed',
  'retrieve',
  'agents',
  'evaluate',
  'deploy',
  'generate',
]

/** Short labels for the progress rail / nav. */
export const STAGE_LABELS: Record<Stage, string> = {
  gate: 'Prompt',
  tokenize: 'Tokenize',
  embed: 'Embed',
  retrieve: 'Retrieve',
  agents: 'Agents',
  evaluate: 'Evaluate',
  deploy: 'Deploy',
  generate: 'Generate',
}

export const identity = {
  name: 'Shreya Dantani',
  firstName: 'Shreya',
  title: 'Senior Full Stack Engineer',
  specialisms: [
    'AI / LLM Integration',
    'RAG Pipelines',
    'Multi-Agent Systems',
    'Generative AI',
    'MERN',
    'Next.js',
  ],
  location: 'Ahmedabad, Gujarat, India',
  email: 'dantanishreya@gmail.com',
  phone: '+91 78610 58989',
  linkedin: 'https://linkedin.com/in/shreya-dantani',
  github: 'https://github.com/shre111',
  yearsExperience: '5+',
  summary:
    'AI-focused Senior Full Stack Engineer with 5+ years of experience building production-grade web applications and end-to-end AI-powered systems. Deep hands-on expertise in LLM integration (OpenAI GPT-4o, Gemini, Claude API), fine-tuning GPT models, LangChain orchestration, multi-agent workflows (AGiXT), RAG pipelines and generative AI tools.',
  summaryLong:
    'Built an end-to-end algorithmic trading research platform with XGBoost ML models, an RL exit agent and real-time market data pipelines on TimescaleDB. Led major AI product initiatives as the sole architect — including AI-driven page generation engines and no-code agent builders — at international SaaS companies across Germany, the UK, the US and Sweden. Equally strong across the full web stack: React/Next.js, Node.js/NestJS, TypeScript, PostgreSQL and AWS.',
}

/** Headline numbers, surfaced as "retrieved facts" during the RAG stage. */
export const metrics = [
  { value: '5+', label: 'Years building for production' },
  { value: '4', label: 'Countries shipped into' },
  { value: '7 to 1', label: 'Repos consolidated to a monorepo' },
  { value: '259k', label: 'RL training episodes' },
]

export type Role = {
  id: string
  company: string
  role: string
  period: string
  start: number
  end: number | null
  location: string
  meta: string
  url?: string
  bullets: string[]
  tags: string[]
}

export const experience: Role[] = [
  {
    id: 'funnelcockpit',
    company: 'FunnelCockpit GmbH',
    role: 'Senior Software Developer',
    period: '2025 — Present',
    start: 2025,
    end: null,
    location: 'Germany (Remote)',
    meta: 'Product-based SaaS · Marketing funnel builder platform',
    url: 'https://funnelcockpit.com',
    bullets: [
      'Architected and built an AI-powered Page Generation Engine from scratch — a conversational chatbot that generates complete, fully-styled funnel pages from natural language prompts, integrating both OpenAI GPT-4o and Google Gemini with intelligent model routing.',
      'Developed and fine-tuned a custom GPT model using the OpenAI fine-tuning API on domain-specific funnel data, improving page generation quality, tone and structural accuracy.',
      'Designed and implemented a No-Code AI Agent Builder letting users create, configure and train their own AI apps and agents inside funnel pages, with custom knowledge bases and agent workflows.',
      'Built AI-powered reporting modules with the OpenAI API and LangChain, and implemented RAG pipelines using ChromaDB for context-aware insights over client-specific funnel data.',
      'Led the full monorepo migration, consolidating 7 separate Meteor.js repositories into a single structured monorepo — improving developer experience, CI/CD and code sharing.',
      'Delivered production improvements across Stripe payment and subscription systems and backend APIs, collaborating with cross-functional German and international teams through structured code reviews.',
    ],
    tags: ['GPT-4o', 'Gemini', 'Fine-Tuning', 'LangChain', 'ChromaDB', 'NestJS', 'Turborepo'],
  },
  {
    id: 'compatible',
    company: 'Compatible Solutions',
    role: 'Full Stack Developer',
    period: '2021 — 2024',
    start: 2021,
    end: 2024,
    location: 'Ahmedabad, India',
    meta: 'Agency · International client delivery',
    bullets: [
      'Led end-to-end development of 4+ international client projects as the primary full-stack contributor.',
      'Architected RESTful APIs using Node.js/Express integrating third-party services including Stripe, the Gmail API and AWS S3.',
      'Built performant, accessible frontends with React, Next.js and Tailwind CSS for UK, US and Sweden-based clients.',
      'Adopted NestJS, Prisma ORM, TypeScript and Socket.IO progressively across projects to meet evolving technical requirements.',
      'Mentored junior developers, conducted code reviews and enforced best practices in performance and security.',
    ],
    tags: ['React', 'Next.js', 'Node.js', 'NestJS', 'Prisma', 'Socket.IO', 'AWS'],
  },
  {
    id: 'freelance',
    company: 'Self-employed',
    role: 'Freelance Web Developer',
    period: '2020 — 2021',
    start: 2020,
    end: 2021,
    location: 'Remote',
    meta: 'Independent client work',
    bullets: [
      'Delivered 2 end-to-end client web projects covering frontend development, REST API integration and payment gateway setup.',
    ],
    tags: ['JavaScript', 'REST', 'Payments'],
  },
]

export type Project = {
  id: string
  name: string
  kind: 'ai' | 'fullstack'
  /**
   * Whether this project also appears in the stage-04 agent-swarm grid.
   * Every project appears in the stage-05 evaluate switcher regardless.
   */
  track: 'agents' | 'shiplog'
  /** One-line framing of what the project actually is, for the ship log. */
  headline?: string
  tagline: string
  role: string
  url?: string
  repo?: string
  tech: string[]
  bullets: string[]
  stats?: { value: string; label: string }[]
}

export const projects: Project[] = [
  {
    id: 'ai-trader',
    headline:
      'A full research platform for NIFTY F&O intraday options — the data pipeline, two ML models, a reinforcement-learning exit agent and the trading terminal on top. All of it hers.',
    track: 'shiplog',
    name: 'AI Trader',
    kind: 'ai',
    tagline: 'NSE F&O algorithmic trading research platform',
    role: 'Full Stack — ML architecture, data pipeline, backend, dashboard',
    repo: 'https://github.com/shre111/Trader-Ai',
    tech: [
      'Python',
      'XGBoost',
      'Q-Learning (RL)',
      'scikit-learn',
      'pandas',
      'Flask',
      'TimescaleDB',
      'Next.js',
      'TrueData WebSocket',
    ],
    bullets: [
      'Built a complete end-to-end algorithmic trading research platform for NIFTY F&O intraday options — covering the full lifecycle from live tick ingestion through ML training, signal detection, risk management and paper trade execution.',
      'Designed a dual XGBoost architecture: a macro model trained on 80 technical indicators across 6+ months of 1-minute candles for directional prediction, and a micro model on 5 tick-level features for entry confirmation, with walk-forward validation to prevent overfitting.',
      'Engineered a Q-Learning RL exit agent trained on 259,000+ episodes across 108 premium trajectories with an 8-feature trade-relative state space, producing 88%+ profitability on RL-triggered early exits.',
      'Built a composite scoring engine combining ML directional probability, options flow score (PCR and OI change) and rule-based technical strength — with score-tiered lot sizing and dynamic ATR-scaled stop-loss and target ranges.',
      'Ingested live tick data via TrueData WebSocket into TimescaleDB hypertables with automatic re-subscription and REST backfill, and delivered a Next.js terminal dashboard with live positions, SSE streaming, a backtest runner, equity curve and P&L analytics.',
    ],
    stats: [
      { value: '71%', label: 'Win rate' },
      { value: '1.37', label: 'Risk / reward' },
      { value: '+53,715', label: 'Net P&L (INR), 18 days' },
      { value: '96%', label: 'Trailing-SL exit profitability' },
    ],
  },
  {
    id: 'research-engine',
    headline:
      'A multi-agent pipeline that goes and does the research itself — scraping sources, searching them semantically, reasoning across them, and writing the report at the end.',
    track: 'agents',
    name: 'Autonomous Research Engine',
    kind: 'ai',
    tagline: 'Multi-agent research & report generation',
    role: 'Full Stack — AI architecture, backend microservices, frontend',
    tech: [
      'Python',
      'LangChain',
      'AGiXT',
      'GPT-4o',
      'Claude API',
      'Pinecone',
      'FastAPI',
      'React',
      'PostgreSQL',
      'AWS S3',
    ],
    bullets: [
      'Designed a multi-agent pipeline in AGiXT with specialised roles — ingestion (PDF/URL scraping), research (semantic search over Pinecone), synthesis (cross-source reasoning) and report generation (structured markdown/PDF).',
      'Integrated OpenAI GPT-4o and the Claude API with dynamic model routing per task, plus a Pinecone RAG layer enabling sub-second semantic retrieval across thousands of documents.',
      'Exposed workflows via a FastAPI microservice with a React dashboard, handling async jobs through a Node.js queue (Bull/Redis), PostgreSQL and AWS S3.',
    ],
    stats: [{ value: 'sub-1s', label: 'Semantic retrieval' }],
  },
  {
    id: 'seed-vc',
    headline:
      'Clone a voice from a short sample, then drive a choreographed avatar with it. A full generative media pipeline: upload, inference, assembly, delivery.',
    track: 'agents',
    name: 'Seed-VC and Seed Dance',
    kind: 'ai',
    tagline: 'Voice cloning & generative video pipeline',
    role: 'Full Stack — generative pipeline, orchestration, frontend',
    tech: ['Python', 'Seed-VC', 'Seed Dance', 'Node.js', 'React', 'AWS S3', 'FFmpeg'],
    bullets: [
      'Integrated Seed-VC for real-time voice cloning from short audio samples, and used Seed Dance to produce choreographed avatar animations synced to custom audio.',
      'Built a Node.js orchestration layer managing the full media pipeline: upload, model inference, video assembly and delivery via AWS S3 pre-signed URLs.',
      'Implemented FFmpeg post-processing for format normalisation and quality optimisation.',
    ],
  },
  {
    id: 'xgboost-dashboard',
    headline:
      'A churn model that does not sit in a notebook — trained, tuned, served in real time behind a FastAPI microservice, and read off a live KPI dashboard.',
    track: 'agents',
    name: 'Predictive Analytics Dashboard',
    kind: 'ai',
    tagline: 'XGBoost churn prediction, served in real time',
    role: 'Full Stack — ML model, microservice API, dashboard',
    tech: ['Python', 'XGBoost', 'scikit-learn', 'FastAPI', 'React', 'PostgreSQL', 'Chart.js'],
    bullets: [
      'Trained and tuned an XGBoost classifier on real business data to predict customer churn with high accuracy.',
      'Built a FastAPI microservice serving model predictions in real time, with interactive Chart.js dashboards and KPI cards for stakeholder monitoring.',
    ],
  },
  {
    id: 'agixt-workflows',
    headline:
      'Agents that do the work rather than just talk about it: a researcher, a writer and a reviewer collaborating on real document generation and data extraction.',
    track: 'agents',
    name: 'Multi-Agent Workflow Automation',
    kind: 'ai',
    tagline: 'AGiXT + Claude API agent chains',
    role: 'Full Stack — AI orchestration, backend, frontend',
    tech: ['AGiXT', 'Claude API', 'LangChain', 'Node.js', 'React', 'PostgreSQL'],
    bullets: [
      'Designed multi-agent chains where specialised agents (researcher, writer, reviewer) collaborated on document generation and data extraction tasks.',
      'Used the Claude API as the reasoning backbone for structured output generation, summarisation and high-accuracy document drafting.',
    ],
  },
  {
    id: 'giftlips',
    headline:
      'A gift-card product where every card carries a real-time video message. Built with an international team of three, across timezones.',
    track: 'shiplog',
    name: 'Giftlips',
    kind: 'fullstack',
    tagline: 'Gift cards with real-time video messages',
    role: 'Full Stack — international team of 3',
    url: 'https://www.giftlips.com',
    tech: ['React', 'Node.js', 'MongoDB', 'Stripe', 'Socket.IO', 'Tailwind CSS', 'AWS S3'],
    bullets: [
      'Integrated Stripe for secure gift card transactions and built real-time video sharing via Socket.IO in an Agile, cross-timezone team.',
    ],
  },
  {
    id: 'funnelcockpit-product',
    headline:
      'The AI layer of a German funnel-builder SaaS — pages generated from natural language, a no-code agent builder, and RAG-powered reporting over each client’s own data.',
    track: 'shiplog',
    name: 'FunnelCockpit',
    kind: 'fullstack',
    tagline: 'AI page generation for a funnel-builder SaaS',
    role: 'Full Stack — AI architecture, backend, frontend',
    url: 'https://funnelcockpit.com',
    tech: [
      'Next.js',
      'NestJS',
      'GPT-4o',
      'Gemini',
      'GPT Fine-Tuning',
      'ChromaDB',
      'TypeScript',
      'PostgreSQL',
    ],
    bullets: [
      'Built an AI-powered Page Generation Engine generating fully-styled funnel pages from natural language prompts, with multi-model routing (GPT-4o + Gemini) and a fine-tuned custom GPT.',
      'Shipped a No-Code AI Agent Builder and RAG-powered reporting (ChromaDB) for context-aware insights over client-specific funnel data.',
    ],
  },
]

export type SkillGroup = { id: string; label: string; items: string[] }

export const skills: SkillGroup[] = [
  {
    id: 'llm',
    label: 'AI / LLM',
    items: [
      'OpenAI API (GPT-4o)',
      'GPT Fine-Tuning',
      'Google Gemini API',
      'Claude API',
      'LangChain',
      'AGiXT',
      'RAG Pipelines',
      'Prompt Engineering',
      'Pinecone',
      'ChromaDB',
    ],
  },
  {
    id: 'ml',
    label: 'AI / ML',
    items: [
      'XGBoost',
      'scikit-learn',
      'Q-Learning (RL)',
      'Seed-VC',
      'Seed Dance',
      'Python',
      'FastAPI',
      'TimescaleDB',
      'Walk-Forward Validation',
    ],
  },
  {
    id: 'frontend',
    label: 'Frontend',
    items: [
      'React.js',
      'Next.js',
      'TypeScript',
      'JavaScript (ES6+)',
      'Redux',
      'Tailwind CSS',
      'Daisy UI',
      'Material UI',
      'Ionic',
      'Recharts',
    ],
  },
  {
    id: 'backend',
    label: 'Backend',
    items: [
      'Node.js',
      'Express.js',
      'NestJS',
      'Flask',
      'REST APIs',
      'GraphQL',
      'Socket.IO',
      'Payload CMS',
      'SSE',
    ],
  },
  {
    id: 'data',
    label: 'Databases',
    items: [
      'MongoDB',
      'PostgreSQL',
      'TimescaleDB',
      'SQL',
      'Prisma ORM',
      'SQLAlchemy',
      'Pinecone',
      'ChromaDB',
    ],
  },
  {
    id: 'cloud',
    label: 'Cloud & DevOps',
    items: ['AWS (S3, EC2)', 'Git', 'GitHub', 'CI/CD', 'Monorepo', 'Turborepo', 'Docker'],
  },
  {
    id: 'integrations',
    label: 'Integrations',
    items: ['Stripe', 'Gmail API', 'Google Maps API', 'Twilio', 'FFmpeg', 'TrueData WebSocket API'],
  },
]

/** Where her work has shipped — drives the globe stage. lat/lon in degrees. */
export const geography = [
  { id: 'de', label: 'Germany', note: 'FunnelCockpit GmbH', lat: 51.16, lon: 10.45, home: false },
  { id: 'uk', label: 'United Kingdom', note: 'Client delivery', lat: 54.0, lon: -2.0, home: false },
  { id: 'us', label: 'United States', note: 'Client delivery', lat: 39.0, lon: -98.0, home: false },
  { id: 'se', label: 'Sweden', note: 'Client delivery', lat: 60.13, lon: 18.64, home: false },
  { id: 'in', label: 'India', note: 'Ahmedabad — home base', lat: 23.03, lon: 72.58, home: true },
]

export const education = {
  degree: 'Bachelor of Computer Applications (BCA)',
  school: 'JG University, Ahmedabad',
  period: '2018 — 2021',
}

export const certifications = [
  'Python Programming Language — Certified',
  'Prompt Engineering & LLM Integration — self-directed (OpenAI, Anthropic, LangChain docs)',
  'Generative AI — hands-on with Seed-VC, Seed Dance, AGiXT, GPT fine-tuning',
  'Currently exploring — AWS Cloud Practitioner, advanced RAG & vector DB architectures',
]

export const softSkills = [
  'Leadership',
  'Client Communication',
  'Cross-cultural Collaboration',
  'Perseverance',
  'Continuous Learning',
  'Adaptability',
]

export const interests = [
  'Drawing & digital art',
  'Exploring emerging AI tech & libraries',
  'Travelling',
]
