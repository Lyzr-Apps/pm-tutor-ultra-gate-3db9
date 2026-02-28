'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { uploadAndTrainDocument, getDocuments, deleteDocuments } from '@/lib/ragKnowledgeBase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { RiDashboardLine, RiBookOpenLine, RiSearchLine, RiBarChartLine, RiSendPlaneFill, RiUploadLine, RiCheckLine, RiStarLine, RiArrowRightLine, RiMenuLine, RiCloseLine, RiLightbulbLine, RiTrophyLine, RiFireLine, RiQuestionLine, RiBookmarkLine, RiFileTextLine, RiDeleteBinLine, RiPencilRulerLine, RiTeamLine, RiSettings3Line } from 'react-icons/ri'

// ===================== CONSTANTS =====================

const TUTOR_AGENT_ID = '699a8dc8e6195f9129d6b906'
const KB_AGENT_ID = '699a8dc9c2eec05acd279dc7'
const RAG_ID = '699a8da43dc9e9e5282826a2'

const PM_MODULES = [
  { id: 'product-design', name: 'Product Design', icon: 'design', description: 'User-centric design thinking, user journeys, pain point analysis, and solution generation' },
  { id: 'product-strategy', name: 'Product Strategy', icon: 'strategy', description: 'Market analysis, competitive positioning, business models, and growth strategy' },
  { id: 'analytical-metrics', name: 'Analytical / Metrics', icon: 'metrics', description: 'Metric definition, data diagnosis, A/B testing, and experiment design' },
  { id: 'behavioral-leadership', name: 'Behavioral / Leadership', icon: 'leadership', description: 'Stakeholder management, conflict resolution, STAR stories, and influence' },
  { id: 'technical-execution', name: 'Technical / Execution', icon: 'technical', description: 'PRD writing, roadmapping, prioritization frameworks, and launch planning' },
]

const SUGGESTED_QUESTIONS = [
  'What is the RICE framework?',
  'Explain the Product Design interview framework',
  'How to calculate TAM/SAM/SOM?',
  'What is the Kano Model?',
  'How to use the STAR+ method for behavioral questions?',
  'Explain the AARRR Pirate Metrics framework',
  'What are Porter\'s Five Forces?',
  'How to approach a Favorite Product question?',
  'Build vs Buy vs Partner - how to decide?',
  'What is the HEART framework by Google?',
]

function generateSessionId() {
  return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
}

// ===================== TYPES =====================

type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Advanced'
type ScreenType = 'dashboard' | 'learning' | 'knowledge' | 'progress'

interface ExerciseRecord {
  score: string
  feedback: string
  date: string
  topic: string
  exerciseNumber: string
}

interface ModuleProgress {
  exercises: ExerciseRecord[]
  lastActivity: string
}

interface TutorMessage {
  role: 'user' | 'assistant'
  content: string
  score?: string
  feedback_summary?: string
  exercise_topic?: string
  exercise_number?: string
  difficulty_level?: string
}

interface KBMessage {
  role: 'user' | 'assistant'
  content: string
  framework_name?: string
  key_points?: string
  interview_tip?: string
  related_topics?: string
}

interface KBDoc {
  fileName: string
  fileType?: string
  status?: string
  uploadedAt?: string
}

// ===================== SAMPLE DATA =====================

const SAMPLE_PROGRESS: Record<string, ModuleProgress> = {
  'product-design': {
    exercises: [
      { score: '8', feedback: 'Strong user journey mapping and pain point identification', date: '2026-02-20', topic: 'Product Design', exerciseNumber: '1' },
      { score: '7', feedback: 'Good solution generation but missed edge cases', date: '2026-02-21', topic: 'Product Design', exerciseNumber: '2' },
      { score: '9', feedback: 'Excellent favorite product answer with clear metrics', date: '2026-02-22', topic: 'Product Design', exerciseNumber: '3' },
    ],
    lastActivity: '2026-02-22',
  },
  'product-strategy': {
    exercises: [
      { score: '7', feedback: 'Good market sizing but weak competitive analysis', date: '2026-02-19', topic: 'Product Strategy', exerciseNumber: '1' },
      { score: '8', feedback: 'Strong strategic pillars and GTM thinking', date: '2026-02-20', topic: 'Product Strategy', exerciseNumber: '2' },
    ],
    lastActivity: '2026-02-20',
  },
  'analytical-metrics': {
    exercises: [
      { score: '6', feedback: 'Metric diagnosis lacked segmentation depth', date: '2026-02-18', topic: 'Analytical / Metrics', exerciseNumber: '1' },
      { score: '8', feedback: 'Solid A/B test design with proper controls', date: '2026-02-19', topic: 'Analytical / Metrics', exerciseNumber: '2' },
    ],
    lastActivity: '2026-02-19',
  },
  'behavioral-leadership': {
    exercises: [
      { score: '7', feedback: 'Good STAR structure but needs more quantified results', date: '2026-02-17', topic: 'Behavioral / Leadership', exerciseNumber: '1' },
    ],
    lastActivity: '2026-02-17',
  },
  'technical-execution': {
    exercises: [],
    lastActivity: '',
  },
}

const SAMPLE_TUTOR_MESSAGES: TutorMessage[] = [
  { role: 'user', content: 'Start a new exercise for me. Topic: Product Design. Difficulty: Intermediate. Exercise number: 1.' },
  {
    role: 'assistant',
    content: '## Exercise 1: Design a Travel App for Budget Backpackers\n\nYou are a PM at a travel tech startup. Your CEO wants to build a mobile app specifically targeting budget-conscious backpackers aged 18-28 who travel internationally.\n\n**Your task — follow the Product Design Framework:**\n\n1. **Define 2-3 user segments** within the budget backpacker category. For each, describe their goals, pain points, and current alternatives.\n2. **Select one segment** and explain why you chose them.\n3. **Map the user journey** for your chosen segment (Awareness through Retention).\n4. **Identify the top 3 pain points** ranked by severity and frequency.\n5. **Propose 2 solution ideas** for the highest-priority pain point, and explain which you would prioritize and why.\n6. **Define your success metrics** — North Star, 2 secondary metrics, and 1 counter metric.\n\nTake your time and be specific. I will evaluate your response on completeness, user empathy, strategic thinking, and framework application.',
    exercise_topic: 'Product Design',
    exercise_number: '1',
    difficulty_level: 'Intermediate',
  },
]

const SAMPLE_KB_MESSAGES: KBMessage[] = [
  { role: 'user', content: 'What is the RICE framework?' },
  {
    role: 'assistant',
    content: 'The **RICE framework** is a prioritization model used by product managers to score and rank product ideas, features, or initiatives. RICE stands for:\n\n- **Reach**: How many users will this impact in a given time period?\n- **Impact**: How much will this impact each user? (Scored 0.25 to 3)\n- **Confidence**: How confident are you in your estimates? (Percentage)\n- **Effort**: How many person-months will this take?\n\nThe RICE score is calculated as:\n**RICE Score = (Reach x Impact x Confidence) / Effort**\n\nHigher scores indicate features that should be prioritized first.',
    framework_name: 'RICE Framework',
    key_points: 'Reach measures user impact,Impact scored 0.25 to 3,Confidence as percentage,Effort in person-months,Higher score = higher priority',
    interview_tip: 'When discussing prioritization in interviews, mention RICE alongside other frameworks like ICE and WSJF to show breadth of knowledge.',
    related_topics: 'ICE Scoring,MoSCoW Method,Kano Model,Weighted Scoring,Opportunity Scoring',
  },
]

// ===================== HELPERS =====================

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

function getModuleIcon(iconType: string) {
  switch (iconType) {
    case 'design': return <RiPencilRulerLine className="w-5 h-5" />
    case 'strategy': return <RiLightbulbLine className="w-5 h-5" />
    case 'metrics': return <RiBarChartLine className="w-5 h-5" />
    case 'leadership': return <RiTeamLine className="w-5 h-5" />
    case 'technical': return <RiSettings3Line className="w-5 h-5" />
    default: return <RiBookOpenLine className="w-5 h-5" />
  }
}

function getModuleProgress(moduleId: string, progress: Record<string, ModuleProgress>): number {
  const mod = progress[moduleId]
  if (!mod || !Array.isArray(mod.exercises) || mod.exercises.length === 0) return 0
  return Math.min(mod.exercises.length * 20, 100)
}

function getModuleAvgScore(moduleId: string, progress: Record<string, ModuleProgress>): number {
  const mod = progress[moduleId]
  if (!mod || !Array.isArray(mod.exercises) || mod.exercises.length === 0) return 0
  const scores = mod.exercises.map(e => parseFloat(e.score) || 0).filter(s => s > 0)
  if (scores.length === 0) return 0
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

function getTotalExercises(progress: Record<string, ModuleProgress>): number {
  let total = 0
  for (const key of Object.keys(progress)) {
    const mod = progress[key]
    if (mod && Array.isArray(mod.exercises)) {
      total += mod.exercises.length
    }
  }
  return total
}

function getOverallAvgScore(progress: Record<string, ModuleProgress>): number {
  const allScores: number[] = []
  for (const key of Object.keys(progress)) {
    const mod = progress[key]
    if (mod && Array.isArray(mod.exercises)) {
      mod.exercises.forEach(e => {
        const s = parseFloat(e.score)
        if (!isNaN(s) && s > 0) allScores.push(s)
      })
    }
  }
  if (allScores.length === 0) return 0
  return allScores.reduce((a, b) => a + b, 0) / allScores.length
}

function getModulesCompleted(progress: Record<string, ModuleProgress>): number {
  let count = 0
  for (const key of Object.keys(progress)) {
    if (getModuleProgress(key, progress) >= 100) count++
  }
  return count
}

function getOverallProgress(progress: Record<string, ModuleProgress>): number {
  const total = PM_MODULES.length
  if (total === 0) return 0
  const sum = PM_MODULES.reduce((acc, m) => acc + getModuleProgress(m.id, progress), 0)
  return Math.round(sum / total)
}

function getStrongestTopic(progress: Record<string, ModuleProgress>): string {
  let best = ''
  let bestScore = 0
  for (const m of PM_MODULES) {
    const avg = getModuleAvgScore(m.id, progress)
    if (avg > bestScore) {
      bestScore = avg
      best = m.name
    }
  }
  return best || 'N/A'
}

function getWeakestTopic(progress: Record<string, ModuleProgress>): string {
  let worst = ''
  let worstScore = Infinity
  for (const m of PM_MODULES) {
    const avg = getModuleAvgScore(m.id, progress)
    if (avg > 0 && avg < worstScore) {
      worstScore = avg
      worst = m.name
    }
  }
  return worst || 'N/A'
}

function getLowestProgressModule(progress: Record<string, ModuleProgress>): string | null {
  let lowest = Infinity
  let lowestId: string | null = null
  for (const m of PM_MODULES) {
    const p = getModuleProgress(m.id, progress)
    if (p < lowest) {
      lowest = p
      lowestId = m.id
    }
  }
  return lowestId
}

// ===================== ERROR BOUNDARY =====================

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-primary text-primary-foreground text-sm">
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ===================== CIRCULAR PROGRESS =====================

function CircularProgress({ value, size = 120, strokeWidth = 8 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(0 0% 18%)" strokeWidth={strokeWidth} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(0 70% 55%)" strokeWidth={strokeWidth} fill="none" strokeLinecap="square" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-serif">{value}%</span>
        <span className="text-xs text-muted-foreground">Overall</span>
      </div>
    </div>
  )
}

// ===================== SIDEBAR =====================

function Sidebar({
  activeScreen,
  setActiveScreen,
  experienceLevel,
  sidebarOpen,
  setSidebarOpen,
}: {
  activeScreen: ScreenType
  setActiveScreen: (s: ScreenType) => void
  experienceLevel: ExperienceLevel
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
}) {
  const navItems: { screen: ScreenType; label: string; icon: React.ReactNode }[] = [
    { screen: 'dashboard', label: 'Dashboard', icon: <RiDashboardLine className="w-5 h-5" /> },
    { screen: 'learning', label: 'Learning Modules', icon: <RiBookOpenLine className="w-5 h-5" /> },
    { screen: 'knowledge', label: 'Knowledge Base', icon: <RiSearchLine className="w-5 h-5" /> },
    { screen: 'progress', label: 'Progress', icon: <RiBarChartLine className="w-5 h-5" /> },
  ]

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`fixed top-0 left-0 z-50 h-full w-60 bg-card border-r border-border flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-serif font-bold tracking-tight">PM Tutor</h1>
            <button className="lg:hidden text-muted-foreground" onClick={() => setSidebarOpen(false)}>
              <RiCloseLine className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-3">
            <Badge variant="outline" className="text-xs border-accent text-accent-foreground bg-accent/10">{experienceLevel}</Badge>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.screen}
              onClick={() => { setActiveScreen(item.screen); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${activeScreen === item.screen ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500" />
              <span>PM Tutor Agent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500" />
              <span>PM Knowledge Agent</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

// ===================== DASHBOARD SCREEN =====================

function DashboardScreen({
  experienceLevel,
  setExperienceLevel,
  progress,
  setActiveScreen,
  setSelectedModule,
  showSampleData,
}: {
  experienceLevel: ExperienceLevel
  setExperienceLevel: (l: ExperienceLevel) => void
  progress: Record<string, ModuleProgress>
  setActiveScreen: (s: ScreenType) => void
  setSelectedModule: (m: string) => void
  showSampleData: boolean
}) {
  const data = showSampleData ? SAMPLE_PROGRESS : progress
  const levels: ExperienceLevel[] = ['Beginner', 'Intermediate', 'Advanced']
  const recommended = getLowestProgressModule(data)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-serif font-bold tracking-tight mb-1">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Track your PM learning journey</p>
      </div>

      {/* Experience Level Selector */}
      <Card className="border border-border bg-card">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground mb-3">Experience Level</p>
          <div className="flex border border-border">
            {levels.map((level) => (
              <button
                key={level}
                onClick={() => {
                  setExperienceLevel(level)
                  if (typeof window !== 'undefined') localStorage.setItem('pm-tutor-level', level)
                }}
                className={`flex-1 py-2 px-4 text-sm transition-colors ${experienceLevel === level ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}
              >
                {level}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-border bg-card flex items-center justify-center p-6">
          <CircularProgress value={getOverallProgress(data)} />
        </Card>
        <Card className="border border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <RiCheckLine className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Modules Done</span>
            </div>
            <p className="text-3xl font-serif font-bold">{getModulesCompleted(data)}</p>
            <p className="text-xs text-muted-foreground mt-1">of {PM_MODULES.length} modules</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <RiBookOpenLine className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Exercises Done</span>
            </div>
            <p className="text-3xl font-serif font-bold">{getTotalExercises(data)}</p>
            <p className="text-xs text-muted-foreground mt-1">completed</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <RiStarLine className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Avg Score</span>
            </div>
            <p className="text-3xl font-serif font-bold">{getOverallAvgScore(data).toFixed(1)}</p>
            <p className="text-xs text-muted-foreground mt-1">out of 10</p>
          </CardContent>
        </Card>
      </div>

      {/* Module Cards */}
      <div>
        <h3 className="text-lg font-serif font-bold mb-4">Interview Categories</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PM_MODULES.map((mod) => {
            const prog = getModuleProgress(mod.id, data)
            const modData = data[mod.id]
            const lastDate = modData?.lastActivity || ''
            const isRecommended = mod.id === recommended

            return (
              <Card key={mod.id} className={`border bg-card relative ${isRecommended ? 'border-accent' : 'border-border'}`}>
                {isRecommended && (
                  <div className="absolute top-0 right-0 bg-accent text-accent-foreground text-xs px-2 py-0.5">Recommended</div>
                )}
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 border border-border flex items-center justify-center text-muted-foreground">
                        {getModuleIcon(mod.icon)}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">{mod.name}</h4>
                        {lastDate && <p className="text-xs text-muted-foreground mt-0.5">{lastDate}</p>}
                      </div>
                    </div>
                  </div>
                  {'description' in mod && mod.description && (
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{mod.description}</p>
                  )}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{prog}%</span>
                    </div>
                    <Progress value={prog} className="h-1" />
                  </div>
                  <Button
                    variant={prog > 0 ? 'outline' : 'default'}
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      setSelectedModule(mod.id)
                      setActiveScreen('learning')
                    }}
                  >
                    {prog > 0 ? 'Continue' : 'Start'}
                    <RiArrowRightLine className="w-3 h-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ===================== LEARNING SCREEN =====================

function LearningScreen({
  selectedModule,
  setSelectedModule,
  experienceLevel,
  progress,
  setProgress,
  tutorMessages,
  setTutorMessages,
  tutorSessionId,
  showSampleData,
  activeAgentId,
  setActiveAgentId,
}: {
  selectedModule: string | null
  setSelectedModule: (m: string) => void
  experienceLevel: ExperienceLevel
  progress: Record<string, ModuleProgress>
  setProgress: React.Dispatch<React.SetStateAction<Record<string, ModuleProgress>>>
  tutorMessages: TutorMessage[]
  setTutorMessages: React.Dispatch<React.SetStateAction<TutorMessage[]>>
  tutorSessionId: string
  showSampleData: boolean
  activeAgentId: string | null
  setActiveAgentId: (id: string | null) => void
}) {
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  const displayMessages = showSampleData && tutorMessages.length === 0 ? SAMPLE_TUTOR_MESSAGES : tutorMessages

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages.length])

  const currentModule = PM_MODULES.find(m => m.id === selectedModule)
  const moduleData = progress[selectedModule || '']
  const exerciseCount = moduleData && Array.isArray(moduleData.exercises) ? moduleData.exercises.length : 0

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || loading) return
    setError('')
    setTutorMessages(prev => [...prev, { role: 'user', content: message }])
    setInputValue('')
    setLoading(true)
    setActiveAgentId(TUTOR_AGENT_ID)

    try {
      const result = await callAIAgent(message, TUTOR_AGENT_ID, { session_id: tutorSessionId })
      if (result.success) {
        const data = result?.response?.result || {}
        const responseText = data?.response || data?.text || result?.response?.message || 'No response received.'
        const score = data?.score || ''
        const feedbackSummary = data?.feedback_summary || ''
        const exerciseTopic = data?.exercise_topic || ''
        const exerciseNumber = data?.exercise_number || ''
        const difficultyLevel = data?.difficulty_level || ''

        setTutorMessages(prev => [...prev, {
          role: 'assistant',
          content: responseText,
          score,
          feedback_summary: feedbackSummary,
          exercise_topic: exerciseTopic,
          exercise_number: exerciseNumber,
          difficulty_level: difficultyLevel,
        }])

        if (score && selectedModule) {
          const newExercise: ExerciseRecord = {
            score,
            feedback: feedbackSummary,
            date: new Date().toISOString().split('T')[0],
            topic: exerciseTopic || currentModule?.name || '',
            exerciseNumber: exerciseNumber || String(exerciseCount + 1),
          }
          setProgress(prev => ({
            ...prev,
            [selectedModule]: {
              exercises: [...(prev[selectedModule]?.exercises || []), newExercise],
              lastActivity: new Date().toISOString().split('T')[0],
            },
          }))
        }
      } else {
        setError(result?.error || 'Failed to get response from tutor agent.')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
    }
  }, [loading, tutorSessionId, selectedModule, currentModule, exerciseCount, setTutorMessages, setProgress, setActiveAgentId])

  const startExercise = () => {
    const moduleName = currentModule?.name || 'Product Strategy'
    const nextNum = exerciseCount + 1
    const msg = `Start a new exercise for me. Topic: ${moduleName}. Difficulty: ${experienceLevel}. Exercise number: ${nextNum}.`
    sendMessage(msg)
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0">
      {/* Module outline sidebar */}
      <div className="w-64 border-r border-border bg-card flex-shrink-0 hidden md:flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Modules</h3>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {PM_MODULES.map((mod) => {
              const modProg = progress[mod.id]
              const exCount = modProg && Array.isArray(modProg.exercises) ? modProg.exercises.length : 0
              const isSelected = mod.id === selectedModule

              return (
                <button
                  key={mod.id}
                  onClick={() => {
                    setSelectedModule(mod.id)
                    setTutorMessages([])
                  }}
                  className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors mb-0.5 ${isSelected ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
                >
                  <div className="flex-shrink-0">{getModuleIcon(mod.icon)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs">{mod.name}</p>
                    <p className="text-xs text-muted-foreground">{exCount} exercises</p>
                  </div>
                  {exCount > 0 && <RiCheckLine className="w-3 h-3 text-green-500 flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Context header */}
        <div className="p-4 border-b border-border bg-card flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            {currentModule && (
              <>
                <div className="w-8 h-8 border border-border flex items-center justify-center text-muted-foreground">
                  {getModuleIcon(currentModule.icon)}
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{currentModule.name}</h3>
                  <p className="text-xs text-muted-foreground">{experienceLevel} -- Exercise {exerciseCount + 1}</p>
                </div>
              </>
            )}
            {!currentModule && <p className="text-sm text-muted-foreground">Select a module to begin</p>}
          </div>
          <div className="flex items-center gap-2">
            {activeAgentId === TUTOR_AGENT_ID && (
              <Badge variant="outline" className="text-xs animate-pulse border-accent text-accent-foreground">Agent Active</Badge>
            )}
            <Button variant="outline" size="sm" onClick={startExercise} disabled={!selectedModule || loading} className="text-xs">
              <RiBookOpenLine className="w-3 h-3 mr-1" />
              New Exercise
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {displayMessages.length === 0 && !loading && (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto border border-border flex items-center justify-center mb-4 text-muted-foreground">
                  <RiBookOpenLine className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-serif font-bold mb-2">Ready to Learn</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Select a module from the sidebar and click "New Exercise" to get started, or type a question below.
                </p>
                {selectedModule && (
                  <Button onClick={startExercise} className="text-sm">
                    Start First Exercise
                    <RiArrowRightLine className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            )}

            {displayMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-secondary text-foreground p-4' : 'bg-card border border-border p-4'}`}>
                  {msg.role === 'assistant' && msg.exercise_topic && (
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <Badge variant="outline" className="text-xs">{msg.exercise_topic}</Badge>
                      {msg.exercise_number && <Badge variant="outline" className="text-xs">Ex. {msg.exercise_number}</Badge>}
                      {msg.difficulty_level && <Badge variant="outline" className="text-xs">{msg.difficulty_level}</Badge>}
                      {msg.score && (
                        <Badge className={`text-xs ${parseFloat(msg.score) >= 7 ? 'bg-green-600/20 text-green-400 border-green-600/30' : parseFloat(msg.score) >= 5 ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30' : 'bg-red-600/20 text-red-400 border-red-600/30'}`}>
                          <RiStarLine className="w-3 h-3 mr-1" />
                          {msg.score}/10
                        </Badge>
                      )}
                    </div>
                  )}
                  {msg.role === 'assistant' && msg.feedback_summary && (
                    <div className="mb-3 p-3 border-l-2 border-accent bg-accent/5">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Feedback</p>
                      <p className="text-sm">{msg.feedback_summary}</p>
                    </div>
                  )}
                  <div className="text-sm leading-relaxed">{renderMarkdown(msg.content)}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-card border border-border p-4 max-w-[85%]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent animate-pulse" />
                    <div className="w-2 h-2 bg-accent animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-accent animate-pulse" style={{ animationDelay: '0.4s' }} />
                    <span className="text-xs text-muted-foreground ml-2">Tutor is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border bg-card">
          {error && <p className="text-xs text-destructive mb-2">{error}</p>}
          <div className="max-w-3xl mx-auto flex gap-2">
            <Input
              placeholder="Type your answer or ask a question..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputValue) } }}
              disabled={loading}
              className="flex-1 bg-secondary border-border"
            />
            <Button onClick={() => sendMessage(inputValue)} disabled={loading || !inputValue.trim()} size="icon" className="flex-shrink-0">
              <RiSendPlaneFill className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===================== KNOWLEDGE BASE SCREEN =====================

function KnowledgeBaseScreen({
  kbMessages,
  setKbMessages,
  kbSessionId,
  showSampleData,
  activeAgentId,
  setActiveAgentId,
}: {
  kbMessages: KBMessage[]
  setKbMessages: React.Dispatch<React.SetStateAction<KBMessage[]>>
  kbSessionId: string
  showSampleData: boolean
  activeAgentId: string | null
  setActiveAgentId: (id: string | null) => void
}) {
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [docs, setDocs] = useState<KBDoc[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const displayMessages = showSampleData && kbMessages.length === 0 ? SAMPLE_KB_MESSAGES : kbMessages

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages.length])

  const askQuestion = useCallback(async (question: string) => {
    if (!question.trim() || loading) return
    setError('')
    setKbMessages(prev => [...prev, { role: 'user', content: question }])
    setInputValue('')
    setLoading(true)
    setActiveAgentId(KB_AGENT_ID)

    try {
      const result = await callAIAgent(question, KB_AGENT_ID, { session_id: kbSessionId })
      if (result.success) {
        const data = result?.response?.result || {}
        const answer = data?.answer || data?.text || result?.response?.message || 'No response received.'
        const frameworkName = data?.framework_name || ''
        const keyPoints = data?.key_points || ''
        const interviewTip = data?.interview_tip || ''
        const relatedTopics = data?.related_topics || ''

        setKbMessages(prev => [...prev, {
          role: 'assistant',
          content: answer,
          framework_name: frameworkName,
          key_points: keyPoints,
          interview_tip: interviewTip,
          related_topics: relatedTopics,
        }])
      } else {
        setError(result?.error || 'Failed to get response from knowledge agent.')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
    }
  }, [loading, kbSessionId, setKbMessages, setActiveAgentId])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadStatus('Uploading and training...')
    try {
      const result = await uploadAndTrainDocument(RAG_ID, file)
      if (result.success) {
        setUploadStatus('Document uploaded and trained successfully.')
        loadDocs()
      } else {
        setUploadStatus(result?.error || 'Upload failed.')
      }
    } catch (err) {
      setUploadStatus('Upload error. Please try again.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const loadDocs = async () => {
    setDocsLoading(true)
    try {
      const result = await getDocuments(RAG_ID)
      if (result.success && Array.isArray(result.documents)) {
        setDocs(result.documents.map(d => ({ fileName: d.fileName, fileType: d.fileType, status: d.status, uploadedAt: d.uploadedAt })))
      }
    } catch (err) {
      // silently fail
    } finally {
      setDocsLoading(false)
    }
  }

  const handleDeleteDoc = async (fileName: string) => {
    try {
      await deleteDocuments(RAG_ID, [fileName])
      setDocs(prev => prev.filter(d => d.fileName !== fileName))
    } catch (err) {
      // silently fail
    }
  }

  useEffect(() => {
    if (uploadOpen) loadDocs()
  }, [uploadOpen])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold tracking-tight mb-1">Knowledge Base</h2>
        <p className="text-sm text-muted-foreground">Search PM concepts, frameworks, and interview prep materials</p>
      </div>

      {/* Topic filter chips */}
      <div className="flex flex-wrap gap-2">
        {PM_MODULES.map((mod) => (
          <button
            key={mod.id}
            onClick={() => {
              setSelectedTopic(selectedTopic === mod.id ? null : mod.id)
              askQuestion(`Tell me about ${mod.name} in product management.`)
            }}
            className={`px-3 py-1 text-xs border transition-colors ${selectedTopic === mod.id ? 'border-accent bg-accent/10 text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground'}`}
          >
            {mod.name}
          </button>
        ))}
      </div>

      {/* Suggested questions */}
      {displayMessages.length === 0 && (
        <Card className="border border-border bg-card">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <RiQuestionLine className="w-4 h-4" />
              Suggested Questions
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => askQuestion(q)}
                  className="px-3 py-1.5 text-xs border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active agent indicator */}
      {activeAgentId === KB_AGENT_ID && (
        <Badge variant="outline" className="text-xs animate-pulse border-accent text-accent-foreground">Knowledge Agent Active</Badge>
      )}

      {/* Chat messages */}
      <ScrollArea className="max-h-[50vh]">
        <div className="space-y-4">
          {displayMessages.map((msg, i) => (
            <div key={i}>
              {msg.role === 'user' && (
                <div className="flex justify-end mb-4">
                  <div className="bg-secondary text-foreground p-4 max-w-[80%]">
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              )}
              {msg.role === 'assistant' && (
                <Card className="border border-border bg-card">
                  <CardContent className="p-6 space-y-4">
                    {msg.framework_name && (
                      <div className="flex items-center gap-2">
                        <RiBookmarkLine className="w-4 h-4 text-accent" />
                        <h3 className="font-serif font-bold text-lg">{msg.framework_name}</h3>
                      </div>
                    )}
                    <div className="text-sm leading-relaxed">{renderMarkdown(msg.content)}</div>

                    {msg.key_points && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Key Points</p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.key_points.split(',').map((point, j) => (
                            <Badge key={j} variant="outline" className="text-xs">{point.trim()}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {msg.interview_tip && (
                      <div className="p-4 border-l-2 border-accent bg-accent/5">
                        <div className="flex items-center gap-2 mb-1">
                          <RiLightbulbLine className="w-4 h-4 text-accent" />
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Interview Tip</p>
                        </div>
                        <p className="text-sm">{msg.interview_tip}</p>
                      </div>
                    )}

                    {msg.related_topics && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Related Topics</p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.related_topics.split(',').map((topic, j) => (
                            <button
                              key={j}
                              onClick={() => askQuestion(`Explain ${topic.trim()} in product management.`)}
                              className="px-2 py-0.5 text-xs border border-border text-muted-foreground hover:text-foreground hover:border-accent transition-colors cursor-pointer"
                            >
                              {topic.trim()}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ))}

          {loading && (
            <Card className="border border-border bg-card">
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          )}
          <div ref={chatEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Input
          placeholder="Ask about any PM concept or framework..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askQuestion(inputValue) } }}
          disabled={loading}
          className="flex-1 bg-secondary border-border"
        />
        <Button onClick={() => askQuestion(inputValue)} disabled={loading || !inputValue.trim()} size="icon" className="flex-shrink-0">
          <RiSendPlaneFill className="w-4 h-4" />
        </Button>
      </div>

      {/* Knowledge Base Upload */}
      <Separator />
      <div>
        <button onClick={() => setUploadOpen(!uploadOpen)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <RiUploadLine className="w-4 h-4" />
          <span>Knowledge Base Documents</span>
          <span className="text-xs">{uploadOpen ? '(collapse)' : '(expand)'}</span>
        </button>

        {uploadOpen && (
          <Card className="mt-3 border border-border bg-card">
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-sm mb-3">Upload PM documents (PDF, DOCX, TXT) to enhance the knowledge base.</p>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 border border-border text-sm cursor-pointer hover:bg-secondary transition-colors">
                    <RiUploadLine className="w-4 h-4" />
                    Choose File
                    <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                  </label>
                  {uploading && <span className="text-xs text-muted-foreground animate-pulse">Processing...</span>}
                </div>
                {uploadStatus && (
                  <p className={`text-xs mt-2 ${uploadStatus.includes('success') ? 'text-green-400' : 'text-muted-foreground'}`}>{uploadStatus}</p>
                )}
              </div>

              <Separator />

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Uploaded Documents</p>
                {docsLoading && (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                )}
                {!docsLoading && docs.length === 0 && (
                  <p className="text-xs text-muted-foreground">No documents uploaded yet.</p>
                )}
                {!docsLoading && docs.length > 0 && (
                  <div className="space-y-1">
                    {docs.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-2 border border-border">
                        <div className="flex items-center gap-2">
                          <RiFileTextLine className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs">{doc.fileName}</span>
                          {doc.status && <Badge variant="outline" className="text-xs">{doc.status}</Badge>}
                        </div>
                        <button onClick={() => handleDeleteDoc(doc.fileName)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <RiDeleteBinLine className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// ===================== PROGRESS SCREEN =====================

function ProgressScreen({
  progress,
  showSampleData,
}: {
  progress: Record<string, ModuleProgress>
  showSampleData: boolean
}) {
  const data = showSampleData ? SAMPLE_PROGRESS : progress
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pm-tutor-streak')
      if (saved) {
        const parsed = JSON.parse(saved)
        const lastDate = parsed?.lastDate || ''
        const count = parsed?.count || 0
        const today = new Date().toISOString().split('T')[0]
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
        if (lastDate === today) {
          setStreak(count)
        } else if (lastDate === yesterday) {
          setStreak(count)
        } else {
          setStreak(showSampleData ? 5 : 0)
        }
      } else {
        setStreak(showSampleData ? 5 : 0)
      }
    }
  }, [showSampleData])

  const allExercises: (ExerciseRecord & { moduleId: string })[] = []
  for (const key of Object.keys(data)) {
    const mod = data[key]
    if (mod && Array.isArray(mod.exercises)) {
      mod.exercises.forEach(ex => allExercises.push({ ...ex, moduleId: key }))
    }
  }
  allExercises.sort((a, b) => b.date.localeCompare(a.date))

  const maxBarScore = 10

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-serif font-bold tracking-tight mb-1">Progress Tracker</h2>
        <p className="text-sm text-muted-foreground">Review your learning metrics and performance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border border-border bg-card">
          <CardContent className="p-4 text-center">
            <RiCheckLine className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
            <p className="text-2xl font-serif font-bold">{getTotalExercises(data)}</p>
            <p className="text-xs text-muted-foreground">Exercises</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card">
          <CardContent className="p-4 text-center">
            <RiStarLine className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
            <p className="text-2xl font-serif font-bold">{getOverallAvgScore(data).toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Avg Score</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card">
          <CardContent className="p-4 text-center">
            <RiTrophyLine className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-serif font-bold">{getStrongestTopic(data)}</p>
            <p className="text-xs text-muted-foreground">Strongest</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card">
          <CardContent className="p-4 text-center">
            <RiLightbulbLine className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-serif font-bold">{getWeakestTopic(data)}</p>
            <p className="text-xs text-muted-foreground">Needs Work</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card">
          <CardContent className="p-4 text-center">
            <RiFireLine className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
            <p className="text-2xl font-serif font-bold">{streak}</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </CardContent>
        </Card>
      </div>

      {/* Score History Bar Chart */}
      {allExercises.length > 0 && (
        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-serif">Score History</CardTitle>
            <CardDescription className="text-xs">Your recent exercise scores</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-end gap-2 h-32">
              {allExercises.slice(0, 15).reverse().map((ex, i) => {
                const score = parseFloat(ex.score) || 0
                const heightPct = (score / maxBarScore) * 100

                return (
                  <TooltipProvider key={i}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs text-muted-foreground">{score}</span>
                          <div className="w-full bg-secondary relative" style={{ height: '100px' }}>
                            <div className={`absolute bottom-0 w-full transition-all ${score >= 7 ? 'bg-green-600/60' : score >= 5 ? 'bg-yellow-600/60' : 'bg-red-600/60'}`} style={{ height: `${heightPct}%` }} />
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{ex.topic} - Ex. {ex.exerciseNumber}</p>
                        <p className="text-xs text-muted-foreground">{ex.date}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {allExercises.length === 0 && (
        <Card className="border border-border bg-card">
          <CardContent className="p-8 text-center">
            <RiBarChartLine className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Complete exercises to see your score history here.</p>
          </CardContent>
        </Card>
      )}

      {/* Module Breakdown */}
      <div>
        <h3 className="text-lg font-serif font-bold mb-4">Module Breakdown</h3>
        <Accordion type="multiple" className="space-y-1">
          {PM_MODULES.map((mod) => {
            const modData = data[mod.id]
            const exercises = modData && Array.isArray(modData.exercises) ? modData.exercises : []
            const avg = getModuleAvgScore(mod.id, data)

            return (
              <AccordionItem key={mod.id} value={mod.id} className="border border-border bg-card">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-3 flex-1 mr-4">
                    <div className="w-8 h-8 border border-border flex items-center justify-center text-muted-foreground flex-shrink-0">
                      {getModuleIcon(mod.icon)}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold">{mod.name}</p>
                      <p className="text-xs text-muted-foreground">{exercises.length} exercises -- Avg: {avg > 0 ? avg.toFixed(1) : 'N/A'}</p>
                    </div>
                    <div className="w-24 hidden sm:block">
                      <Progress value={getModuleProgress(mod.id, data)} className="h-1" />
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {exercises.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">No exercises completed yet.</p>
                  )}
                  {exercises.length > 0 && (
                    <div className="space-y-2">
                      {exercises.map((ex, j) => (
                        <div key={j} className="flex items-center justify-between p-3 border border-border">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xs">Ex. {ex.exerciseNumber || j + 1}</Badge>
                            <div>
                              <p className="text-xs">{ex.feedback || 'No feedback'}</p>
                              <p className="text-xs text-muted-foreground">{ex.date}</p>
                            </div>
                          </div>
                          <Badge className={`text-xs ${parseFloat(ex.score) >= 7 ? 'bg-green-600/20 text-green-400' : parseFloat(ex.score) >= 5 ? 'bg-yellow-600/20 text-yellow-400' : 'bg-red-600/20 text-red-400'}`}>
                            {ex.score}/10
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>
    </div>
  )
}

// ===================== MAIN PAGE =====================

export default function Page() {
  // State
  const [activeScreen, setActiveScreen] = useState<ScreenType>('dashboard')
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('Beginner')
  const [selectedModule, setSelectedModule] = useState<string | null>('product-strategy')
  const [progress, setProgress] = useState<Record<string, ModuleProgress>>({})
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([])
  const [kbMessages, setKbMessages] = useState<KBMessage[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showSampleData, setShowSampleData] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  const [tutorSessionId] = useState(() => generateSessionId())
  const [kbSessionId] = useState(() => generateSessionId())

  // Load from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('pm-tutor-progress')
        if (saved) setProgress(JSON.parse(saved))
      } catch (e) { /* ignore */ }
      try {
        const level = localStorage.getItem('pm-tutor-level')
        if (level === 'Beginner' || level === 'Intermediate' || level === 'Advanced') {
          setExperienceLevel(level)
        }
      } catch (e) { /* ignore */ }
    }
  }, [])

  // Save progress to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pm-tutor-progress', JSON.stringify(progress))
    }
  }, [progress])

  // Update streak on exercise completion
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const totalEx = getTotalExercises(progress)
      if (totalEx > 0) {
        const today = new Date().toISOString().split('T')[0]
        const saved = localStorage.getItem('pm-tutor-streak')
        let streakData = { lastDate: '', count: 0 }
        if (saved) {
          try { streakData = JSON.parse(saved) } catch (e) { /* ignore */ }
        }
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
        if (streakData.lastDate === today) {
          // same day, no change
        } else if (streakData.lastDate === yesterday) {
          streakData = { lastDate: today, count: streakData.count + 1 }
        } else {
          streakData = { lastDate: today, count: 1 }
        }
        localStorage.setItem('pm-tutor-streak', JSON.stringify(streakData))
      }
    }
  }, [progress])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground">
        {/* Mobile header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="text-foreground">
            <RiMenuLine className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-serif font-bold">PM Tutor</h1>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <span>Sample</span>
              <div
                onClick={() => setShowSampleData(!showSampleData)}
                className={`w-8 h-4 flex items-center px-0.5 cursor-pointer transition-colors ${showSampleData ? 'bg-accent justify-end' : 'bg-secondary justify-start'}`}
              >
                <div className="w-3 h-3 bg-foreground" />
              </div>
            </label>
          </div>
        </div>

        {/* Sidebar */}
        <Sidebar
          activeScreen={activeScreen}
          setActiveScreen={setActiveScreen}
          experienceLevel={experienceLevel}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        {/* Main content */}
        <main className="lg:ml-60 min-h-screen">
          {/* Top bar (desktop) */}
          <div className="hidden lg:flex items-center justify-between px-8 py-4 border-b border-border bg-card">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {activeScreen === 'dashboard' && 'Overview'}
                {activeScreen === 'learning' && 'Interactive Learning'}
                {activeScreen === 'knowledge' && 'Knowledge Search'}
                {activeScreen === 'progress' && 'Analytics'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {activeAgentId && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-accent animate-pulse" />
                  <span className="text-xs text-muted-foreground">
                    {activeAgentId === TUTOR_AGENT_ID ? 'PM Tutor' : 'Knowledge'} Agent
                  </span>
                </div>
              )}
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                <span>Sample Data</span>
                <div
                  onClick={() => setShowSampleData(!showSampleData)}
                  className={`w-9 h-5 flex items-center px-0.5 cursor-pointer transition-colors ${showSampleData ? 'bg-accent justify-end' : 'bg-secondary justify-start'}`}
                >
                  <div className="w-4 h-4 bg-foreground" />
                </div>
              </label>
            </div>
          </div>

          {/* Screen content */}
          <div className={`${activeScreen === 'learning' ? '' : 'p-6 lg:p-8'} pt-16 lg:pt-0`}>
            {activeScreen === 'dashboard' && (
              <DashboardScreen
                experienceLevel={experienceLevel}
                setExperienceLevel={setExperienceLevel}
                progress={progress}
                setActiveScreen={setActiveScreen}
                setSelectedModule={setSelectedModule}
                showSampleData={showSampleData}
              />
            )}
            {activeScreen === 'learning' && (
              <LearningScreen
                selectedModule={selectedModule}
                setSelectedModule={setSelectedModule}
                experienceLevel={experienceLevel}
                progress={progress}
                setProgress={setProgress}
                tutorMessages={tutorMessages}
                setTutorMessages={setTutorMessages}
                tutorSessionId={tutorSessionId}
                showSampleData={showSampleData}
                activeAgentId={activeAgentId}
                setActiveAgentId={setActiveAgentId}
              />
            )}
            {activeScreen === 'knowledge' && (
              <KnowledgeBaseScreen
                kbMessages={kbMessages}
                setKbMessages={setKbMessages}
                kbSessionId={kbSessionId}
                showSampleData={showSampleData}
                activeAgentId={activeAgentId}
                setActiveAgentId={setActiveAgentId}
              />
            )}
            {activeScreen === 'progress' && (
              <ProgressScreen
                progress={progress}
                showSampleData={showSampleData}
              />
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
