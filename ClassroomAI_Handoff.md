# Luminary — Agent Handoff Document
**Hack for Humanity 2026 · Santa Clara University**
**Build window: Feb 28 11am → Mar 1 9am (22 hours)**

---

## 1. Project Summary

Luminary is an AI-powered virtual classroom. An SVG teacher avatar walks a stage, speaks lessons via ElevenLabs, writes on a chalkboard, plays Manim animations, and responds to student voice questions — all in the browser, with WebSpatial/Apple Vision Pro as a bonus layer.

**One-line pitch:** A private AI teacher, for any subject, for any student, anywhere in the world.

---

## 2. Repository Structure

The project lives in a single parent directory (name may have changed). Inside it:

```
<project-root>/
├── frontend/          ← Next.js 16 + React 19 + TypeScript + Tailwind + WebSpatial
└── backend/           ← Python Flask (single file: app.py)
```

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | Next.js 16, React 19, TypeScript, Tailwind CSS 4, App Router |
| Spatial layer | `@webspatial/react-sdk` + `@webspatial/core-sdk` v1.2.0 |
| Icons | `lucide-react` |
| LLM | Google Gemini 2.0 Flash (`gemini-2.0-flash-exp`) via `google-genai` SDK |
| Voice synthesis | ElevenLabs Turbo v2.5 (`eleven_turbo_v2_5`) |
| Animations | External Manim service (separate codebase, TypeScript/Express) |
| Speech input | Web Speech API (browser-native, no key needed) |
| Backend | Python Flask + flask-cors + python-dotenv + google-genai + requests |

---

## 4. Frontend — Complete File Reference

### 4.1 `frontend/package.json`
```json
{
  "name": "luminary",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@webspatial/core-sdk": "^1.2.0",
    "@webspatial/react-sdk": "^1.2.0",
    "lucide-react": "^0.575.0",
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "babel-plugin-react-compiler": "1.0.0",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

### 4.2 `frontend/.env.local`
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

### 4.3 `frontend/types/lesson.ts`
```typescript
export type Subject =
  | 'Physics' | 'Mathematics' | 'Biology' | 'Chemistry'
  | 'History' | 'Economics' | 'Computer Science' | 'Philosophy'

export type AvatarPosition = 'left' | 'center' | 'right' | 'board'
export type BoardAction = 'write' | 'animate' | 'clear'
export type StudentInputType = 'question' | 'confusion' | 'acknowledgment'

export interface LessonSegment {
  id: number
  spokenText: string
  boardAction: BoardAction
  boardText?: string
  manimScript?: string        // plain-English description sent to Manim API
  avatarPosition: AvatarPosition
}

export interface Lesson {
  subject: Subject
  topic: string
  segments: LessonSegment[]
}

export interface RenderedSegment extends LessonSegment {
  audioUrl?: string
  videoUrl?: string
  audioBlob?: Blob
  videoBlob?: Blob
}

export type LessonStatus =
  | 'idle' | 'generating' | 'pre-rendering' | 'ready'
  | 'playing' | 'paused' | 'complete' | 'error'

export interface TeacherResponse {
  spokenText: string
  boardUpdate?: string
  inputType: StudentInputType
}

export interface PreRenderProgress {
  total: number
  completed: number
  currentStep: string
}
```

### 4.4 `frontend/lib/api.ts`
```typescript
import type { Lesson, Subject, TeacherResponse } from '@/types/lesson'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:5000'

export async function generateLesson(subject: Subject, topic: string): Promise<Lesson> {
  const res = await fetch(`${BACKEND_URL}/generate-lesson`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, topic }),
  })
  if (!res.ok) throw new Error(`Lesson generation failed: ${res.status}`)
  return res.json()
}

export async function renderManim(script: string): Promise<Blob> {
  const res = await fetch(`${BACKEND_URL}/render-manim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script }),
  })
  if (!res.ok) throw new Error(`Manim render failed: ${res.status}`)
  return res.blob()
}

export async function synthesizeVoice(text: string): Promise<Blob> {
  const res = await fetch(`${BACKEND_URL}/synthesize-voice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error(`Voice synthesis failed: ${res.status}`)
  return res.blob()
}

export async function respondToStudent(
  transcript: string,
  currentSegmentId: number,
  subject: Subject,
  topic: string
): Promise<TeacherResponse> {
  const res = await fetch(`${BACKEND_URL}/student-response`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, currentSegmentId, subject, topic }),
  })
  if (!res.ok) throw new Error(`Student response failed: ${res.status}`)
  return res.json()
}

export function createObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob)
}

export function revokeObjectUrl(url: string): void {
  URL.revokeObjectURL(url)
}
```

### 4.5 `frontend/hooks/useLesson.ts`
```typescript
'use client'

import { useState, useCallback, useRef } from 'react'
import type { Subject, Lesson, RenderedSegment, LessonStatus, PreRenderProgress } from '@/types/lesson'
import { generateLesson, renderManim, synthesizeVoice, createObjectUrl } from '@/lib/api'

export function useLesson() {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [renderedSegments, setRenderedSegments] = useState<RenderedSegment[]>([])
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [status, setStatus] = useState<LessonStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<PreRenderProgress>({ total: 0, completed: 0, currentStep: '' })
  const objectUrlsRef = useRef<string[]>([])

  const cleanup = useCallback(() => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    objectUrlsRef.current = []
  }, [])

  const startLesson = useCallback(async (subject: Subject, topic: string) => {
    cleanup()
    setStatus('generating')
    setError(null)
    setCurrentSegmentIndex(0)
    setRenderedSegments([])

    let generatedLesson: Lesson
    try {
      generatedLesson = await generateLesson(subject, topic)
      setLesson(generatedLesson)
    } catch (err) {
      setError('Failed to generate lesson. Please try again.')
      setStatus('error')
      return
    }

    setStatus('pre-rendering')
    const total = generatedLesson.segments.length * 2
    setProgress({ total, completed: 0, currentStep: 'Preparing lesson...' })

    const rendered: RenderedSegment[] = []

    for (let i = 0; i < generatedLesson.segments.length; i++) {
      const segment = generatedLesson.segments[i]
      const renderedSegment: RenderedSegment = { ...segment }

      setProgress((p) => ({ ...p, currentStep: `Synthesizing voice for segment ${i + 1}…` }))
      try {
        const audioBlob = await synthesizeVoice(segment.spokenText)
        const audioUrl = createObjectUrl(audioBlob)
        objectUrlsRef.current.push(audioUrl)
        renderedSegment.audioBlob = audioBlob
        renderedSegment.audioUrl = audioUrl
      } catch { /* silent fallback */ }
      setProgress((p) => ({ ...p, completed: p.completed + 1 }))

      if (segment.manimScript) {
        setProgress((p) => ({ ...p, currentStep: `Rendering animation for segment ${i + 1}…` }))
        try {
          const videoBlob = await renderManim(segment.manimScript)
          const videoUrl = createObjectUrl(videoBlob)
          objectUrlsRef.current.push(videoUrl)
          renderedSegment.videoBlob = videoBlob
          renderedSegment.videoUrl = videoUrl
        } catch { /* fallback: show chalk text */ }
      }
      setProgress((p) => ({ ...p, completed: p.completed + 1 }))
      rendered.push(renderedSegment)
      setRenderedSegments([...rendered])
    }

    setStatus('ready')
  }, [cleanup])

  const play = useCallback(() => setStatus('playing'), [])
  const pause = useCallback(() => setStatus('paused'), [])
  const nextSegment = useCallback(() => {
    setCurrentSegmentIndex((i) => {
      if (lesson && i >= lesson.segments.length - 1) {
        setStatus('complete')
        return i
      }
      return i + 1
    })
  }, [lesson])

  return {
    lesson, renderedSegments,
    currentSegment: renderedSegments[currentSegmentIndex] ?? null,
    currentSegmentIndex, status, error, progress,
    startLesson, play, pause, nextSegment, setCurrentSegmentIndex,
  }
}
```

### 4.6 `frontend/hooks/useAudioPlayer.ts`
```typescript
'use client'

import { useState, useCallback, useRef } from 'react'

interface UseAudioPlayerOptions {
  onEnd?: () => void
  onPlay?: () => void
}

export function useAudioPlayer({ onEnd, onPlay }: UseAudioPlayerOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const play = useCallback((url: string) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    const audio = new Audio(url)
    audioRef.current = audio
    audio.onplay = () => { setIsPlaying(true); onPlay?.() }
    audio.onended = () => { setIsPlaying(false); audioRef.current = null; onEnd?.() }
    audio.onerror = () => { setIsPlaying(false); audioRef.current = null; setTimeout(() => onEnd?.(), 2500) }
    audio.play().catch(() => { setIsPlaying(false); audioRef.current = null; setTimeout(() => onEnd?.(), 2500) })
  }, [onEnd, onPlay])

  const stop = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    setIsPlaying(false)
  }, [])

  return { isPlaying, play, stop }
}
```

### 4.7 `frontend/hooks/useVoiceInput.ts`
```typescript
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

type SpeechRecognitionCtor = new () => {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  onresult: ((event: {
    resultIndex: number
    results: { isFinal: boolean; 0: { transcript: string } }[]
  }) => void) | null
  start(): void
  stop(): void
}

type AnyWindow = Window & {
  SpeechRecognition?: SpeechRecognitionCtor
  webkitSpeechRecognition?: SpeechRecognitionCtor
}

function getSpeechRecognition(): SpeechRecognitionCtor | undefined {
  const w = window as AnyWindow
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void
  onStart?: () => void
  onStop?: () => void
}

export function useVoiceInput({ onTranscript, onStart, onStop }: UseVoiceInputOptions) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null)
  const finalTranscriptRef = useRef('')

  useEffect(() => { setIsSupported(!!getSpeechRecognition()) }, [])

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) return
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    finalTranscriptRef.current = ''
    recognition.onstart = () => { setIsListening(true); setTranscript(''); onStart?.() }
    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) finalTranscriptRef.current += r[0].transcript
        else interim += r[0].transcript
      }
      setTranscript(finalTranscriptRef.current + interim)
    }
    recognition.onend = () => {
      setIsListening(false)
      if (finalTranscriptRef.current.trim()) onTranscript(finalTranscriptRef.current.trim())
      onStop?.()
    }
    recognition.onerror = () => { setIsListening(false); onStop?.() }
    recognitionRef.current = recognition
    recognition.start()
  }, [onTranscript, onStart, onStop])

  const stopListening = useCallback(() => { recognitionRef.current?.stop() }, [])

  return { isListening, transcript, isSupported, startListening, stopListening }
}
```

### 4.8 `frontend/app/page.tsx`
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TopicSelector from '@/components/TopicSelector'
import type { Subject } from '@/types/lesson'

export default function HomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleStart = (subject: Subject, topic: string) => {
    setIsLoading(true)
    const params = new URLSearchParams({ subject, topic })
    router.push(`/classroom?${params.toString()}`)
  }

  return <TopicSelector onStart={handleStart} isLoading={isLoading} />
}
```

### 4.9 `frontend/app/classroom/page.tsx`
```tsx
'use client'

import { useEffect, useCallback, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useLesson } from '@/hooks/useLesson'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'
import { respondToStudent, synthesizeVoice, createObjectUrl } from '@/lib/api'
import ClassroomStage from '@/components/ClassroomStage'
import Sidebar from '@/components/Sidebar'
import SpatialClassroom from '@/components/spatial/SpatialClassroom'
import type { Subject } from '@/types/lesson'

function ClassroomContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const subject = (searchParams.get('subject') ?? 'Physics') as Subject
  const topic = searchParams.get('topic') ?? 'How black holes form'

  const {
    lesson, currentSegment, currentSegmentIndex, status, error, progress,
    startLesson, play, nextSegment,
  } = useLesson()

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isResponding, setIsResponding] = useState(false)

  const onAudioEnd = useCallback(() => {
    setIsSpeaking(false)
    setTimeout(() => nextSegment(), 800)
  }, [nextSegment])

  const { play: playAudio, stop: stopAudio } = useAudioPlayer({
    onPlay: () => setIsSpeaking(true),
    onEnd: onAudioEnd,
  })

  useEffect(() => { startLesson(subject, topic) }, [subject, topic])
  useEffect(() => { if (status === 'ready') play() }, [status, play])

  useEffect(() => {
    if (status === 'playing' && currentSegment?.audioUrl) {
      playAudio(currentSegment.audioUrl)
    } else if (status === 'playing' && !currentSegment?.audioUrl) {
      const t = setTimeout(() => nextSegment(), 2500)
      return () => clearTimeout(t)
    }
  }, [currentSegment, status])

  const handleStudentInput = useCallback(async (transcript: string) => {
    if (!lesson || isResponding) return
    setIsResponding(true)
    stopAudio()
    setIsSpeaking(false)
    try {
      const response = await respondToStudent(transcript, currentSegmentIndex, lesson.subject, lesson.topic)
      const audioBlob = await synthesizeVoice(response.spokenText)
      playAudio(createObjectUrl(audioBlob))
      setTimeout(() => { setIsResponding(false); play() }, 1500)
    } catch {
      setIsResponding(false)
      play()
    }
  }, [lesson, isResponding, currentSegmentIndex, stopAudio, playAudio, play])

  if (error) {
    return (
      <div className="min-h-screen bg-[#1a0a2e] flex items-center justify-center text-white text-center px-4">
        <div>
          <p className="text-xl mb-4">{error}</p>
          <button onClick={() => router.push('/')} className="bg-white text-[#1a0a2e] px-6 py-3 rounded-xl font-bold">Back</button>
        </div>
      </div>
    )
  }

  const sidebar = (
    <Sidebar
      lesson={lesson} status={status} progress={progress}
      currentSegmentIndex={currentSegmentIndex}
      onStudentInput={handleStudentInput} onStopAudio={stopAudio}
    />
  )

  return (
    <div className="min-h-screen bg-[#0d0d1a] p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4 px-2">
        <button onClick={() => router.push('/')} className="text-white/50 hover:text-white text-sm">← Back</button>
        <div className="text-center">
          <h1 className="text-white font-bold">luminary</h1>
          {lesson && <p className="text-white/50 text-xs">{lesson.subject} · {lesson.topic}</p>}
        </div>
        <div className="w-12" />
      </div>
      <div className="flex-1">
        <SpatialClassroom sidebarContent={sidebar}>
          <ClassroomStage currentSegment={currentSegment} status={status} isSpeaking={isSpeaking} onSegmentEnd={nextSegment} />
        </SpatialClassroom>
      </div>
    </div>
  )
}

export default function ClassroomPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1a0a2e] flex items-center justify-center"><div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" /></div>}>
      <ClassroomContent />
    </Suspense>
  )
}
```

### 4.10 `frontend/components/TopicSelector.tsx`
```tsx
'use client'

import { useState } from 'react'
import type { Subject } from '@/types/lesson'

const SUBJECTS: Subject[] = ['Physics','Mathematics','Biology','Chemistry','History','Economics','Computer Science','Philosophy']

const EXAMPLE_TOPICS: Record<Subject, string> = {
  Physics: 'How black holes form',
  Mathematics: 'The Pythagorean theorem',
  Biology: 'How DNA replication works',
  Chemistry: 'Covalent vs ionic bonds',
  History: 'Causes of World War I',
  Economics: 'Supply and demand curves',
  'Computer Science': 'How sorting algorithms work',
  Philosophy: "Plato's allegory of the cave",
}

interface TopicSelectorProps {
  onStart: (subject: Subject, topic: string) => void
  isLoading: boolean
}

export default function TopicSelector({ onStart, isLoading }: TopicSelectorProps) {
  const [selectedSubject, setSelectedSubject] = useState<Subject>('Physics')
  const [topic, setTopic] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onStart(selectedSubject, topic.trim() || EXAMPLE_TOPICS[selectedSubject])
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1a0a2e] via-[#16213e] to-[#0f3460] px-4">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">luminary</h1>
        <p className="text-white/60 text-lg max-w-md">A private AI teacher, for any subject, for any student, anywhere in the world.</p>
      </div>
      <form onSubmit={handleSubmit} className="w-full max-w-lg bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 shadow-2xl">
        <div className="mb-6">
          <label className="block text-white/70 text-sm font-semibold uppercase tracking-wider mb-3">Subject</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SUBJECTS.map((s) => (
              <button key={s} type="button" onClick={() => setSelectedSubject(s)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedSubject === s ? 'bg-white text-[#1a0a2e] shadow-lg scale-105' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-8">
          <label className="block text-white/70 text-sm font-semibold uppercase tracking-wider mb-3">Topic</label>
          <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
            placeholder={EXAMPLE_TOPICS[selectedSubject]}
            className="w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/60 transition-all" />
        </div>
        <button type="submit" disabled={isLoading}
          className="w-full bg-white text-[#1a0a2e] font-bold text-lg py-4 rounded-xl hover:bg-white/90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg">
          {isLoading ? 'Preparing Lesson…' : 'Start Lesson →'}
        </button>
      </form>
      <p className="mt-8 text-white/30 text-sm">Powered by Gemini · ElevenLabs · Manim · WebSpatial</p>
    </div>
  )
}
```

### 4.11 `frontend/components/TeacherAvatar.tsx`
SVG avatar with 4 position states (`left`, `center`, `right`, `board`), mouth animation during speech (160ms interval, random ry 0.5–3.5), arm raises when at board, flips horizontally when moving left. Speaking wave animated via SVG `<animate>` tags.

Key props: `position: AvatarPosition`, `isSpeaking: boolean`

Position → CSS `left` mapping:
- left → 10%, center → 42%, right → 68%, board → 62%

### 4.12 `frontend/components/Chalkboard.tsx`
Two modes:
1. **Text mode** (`boardAction: 'write'`): chalk text appears letter-by-letter (40ms per char). Accumulates bullet points across segments.
2. **Video mode** (`boardAction: 'animate'`): `<video>` element autoplays the Manim MP4 from `videoUrl`.

Styled with dark green gradient background, wood-frame border (`#6B3F1F`).

### 4.13 `frontend/components/ClassroomStage.tsx`
Composes `TeacherAvatar` + `Chalkboard` on a dark atmospheric stage (deep purple/blue gradient). Shows a spinner overlay during `generating`/`pre-rendering` states. Shows a completion message overlay when `status === 'complete'`.

### 4.14 `frontend/components/Sidebar.tsx`
Shows:
- Status chip + pre-render progress bar
- Lesson segment list with current segment highlighted
- Push-to-talk mic button (primary demo control for noisy rooms)
- Live transcript log of student questions

Uses `useVoiceInput` internally. Calls `onStopAudio()` when mic activates to cut the teacher off.

### 4.15 `frontend/components/spatial/SpatialClassroom.tsx`
WebSpatial wrapper. Detects spatial context via `'XRSystem' in window`. On Vision Pro: applies `data-spatial-panel="main"` and `data-spatial-panel="sidebar"` to separate panels into floating visionOS windows. On flat browser: standard flex layout.

Lazy-imports `@webspatial/core-sdk` and instantiates `new SpatialSession()` only in spatial context.

---

## 5. Backend — Complete File Reference

### 5.1 `backend/requirements.txt`
```
flask>=3.0.0
flask-cors>=4.0.0
python-dotenv>=1.0.0
google-genai>=1.0.0
requests>=2.31.0
```

### 5.2 `backend/.env.example` (copy to `.env`)
```
GEMINI_API_KEY=your_gemini_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL   # Bella — warm female teacher
MANIM_API_URL=http://localhost:3001          # URL of the external Manim service
PORT=5000
```

### 5.3 `backend/app.py` — Full source

```python
import os
import json
import hashlib
import requests
from pathlib import Path
from io import BytesIO

from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

app = Flask(__name__)
CORS(app)

GEMINI_API_KEY      = os.getenv("GEMINI_API_KEY", "")
ELEVENLABS_API_KEY  = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")
MANIM_API_URL       = os.getenv("MANIM_API_URL", "http://localhost:3001")

CACHE_DIR = Path(__file__).parent / "cache"
(CACHE_DIR / "audio").mkdir(parents=True, exist_ok=True)
(CACHE_DIR / "video").mkdir(parents=True, exist_ok=True)

client = genai.Client(api_key=GEMINI_API_KEY)
GEMINI_MODEL = "gemini-2.0-flash-exp"


def md5(text):
    return hashlib.md5(text.encode()).hexdigest()

def cache_path(subdir, key, ext):
    return CACHE_DIR / subdir / f"{key}{ext}"


# ── Lesson generation ──────────────────────────────────────────────────────

LESSON_SYSTEM = """
You are luminary — a world-class teacher. Generate a structured 5-segment lesson.
Return ONLY a valid JSON object — no markdown, no code fences, no explanation.

Schema:
{
  "subject": "<subject>",
  "topic": "<topic>",
  "segments": [
    {
      "id": 1,
      "spokenText": "2-3 warm, natural teacher sentences for this segment.",
      "boardAction": "write" | "animate" | "clear",
      "boardText": "Short chalk heading ≤10 words. Omit when boardAction is animate.",
      "manimScript": "Vivid 1-2 sentence plain-English description of what to animate visually. Only present when boardAction is animate.",
      "avatarPosition": "left" | "center" | "right" | "board"
    }
  ]
}

Rules:
- Exactly 5 segments.
- At least 2 segments must use boardAction "animate" with a manimScript.
- Segment 1 and 5 must have avatarPosition "center".
- When avatarPosition is "board", boardAction must be "animate" or "write".
- spokenText must be conversational and warm — never bullet points.
- manimScript should describe visual motion: shapes, labels, colors, transitions.
"""


@app.route("/generate-lesson", methods=["POST"])
def generate_lesson():
    data    = request.get_json(force=True)
    subject = str(data.get("subject", "")).strip()
    topic   = str(data.get("topic", "")).strip()
    if not subject or not topic:
        return jsonify({"error": "subject and topic are required"}), 400

    key        = md5(f"{subject}::{topic}")
    cache_file = cache_path("audio", f"lesson_{key}", ".json")
    if cache_file.exists():
        return jsonify(json.loads(cache_file.read_text()))

    lesson = (
        _gemini_lesson(subject, topic, strict=False)
        or _gemini_lesson(subject, topic, strict=True)
        or _fallback_lesson(subject, topic)
    )
    cache_file.write_text(json.dumps(lesson))
    return jsonify(lesson)


def _gemini_lesson(subject, topic, strict=False):
    system = LESSON_SYSTEM
    if strict:
        system += "\nIMPORTANT: Output ONLY the JSON object. No other text whatsoever."
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=f"Generate a lesson. subject='{subject}', topic='{topic}'",
            config=types.GenerateContentConfig(
                system_instruction=system,
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )
        raw = response.text.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        lesson = json.loads(raw)
        assert isinstance(lesson.get("segments"), list) and len(lesson["segments"]) == 5
        return lesson
    except Exception as e:
        print(f"[Gemini lesson] {e}")
        return None


def _fallback_lesson(subject, topic):
    return {
        "subject": subject, "topic": topic,
        "segments": [
            {"id":1,"spokenText":f"Welcome! Today we're exploring {topic} in {subject}. It's one of the most fascinating areas in this field.","boardAction":"write","boardText":topic,"avatarPosition":"center"},
            {"id":2,"spokenText":f"Let's start with the foundational concepts of {topic}.","boardAction":"animate","manimScript":f"Animate the title '{topic}' appearing in large text, then have key concept labels fade in around it.","avatarPosition":"board"},
            {"id":3,"spokenText":"Now let's look at how this works step by step.","boardAction":"write","boardText":"Step-by-step mechanism","avatarPosition":"right"},
            {"id":4,"spokenText":f"Here is a visualization that captures the essence of {topic}. Notice how the components interact.","boardAction":"animate","manimScript":f"Show an animated diagram of {topic} in {subject} with arrows showing relationships between labeled components.","avatarPosition":"board"},
            {"id":5,"spokenText":f"Excellent work today. You now have a solid grasp of {topic}. Remember the key insight: how all the pieces fit together beautifully.","boardAction":"write","boardText":"Lesson complete ✓","avatarPosition":"center"},
        ],
    }


# ── Manim rendering ────────────────────────────────────────────────────────

@app.route("/render-manim", methods=["POST"])
def render_manim():
    data     = request.get_json(force=True)
    context  = str(data.get("script", "")).strip()   # frontend field is 'script'
    duration = int(data.get("duration", 12))
    if not context:
        return jsonify({"error": "script is required"}), 400

    key        = md5(f"{context}::{duration}")
    cache_file = cache_path("video", key, ".mp4")
    if cache_file.exists():
        return send_file(str(cache_file), mimetype="video/mp4")

    try:
        r = requests.post(f"{MANIM_API_URL}/generate",
                          json={"context": context, "duration": duration}, timeout=120)
        r.raise_for_status()
        result = r.json()
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    if not result.get("success") or not result.get("videoUrl"):
        return jsonify({"error": "Render failed", "detail": result}), 500

    try:
        video_bytes = requests.get(result["videoUrl"], timeout=60).content
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    cache_file.write_bytes(video_bytes)
    return send_file(BytesIO(video_bytes), mimetype="video/mp4")


# ── Voice synthesis ────────────────────────────────────────────────────────

@app.route("/synthesize-voice", methods=["POST"])
def synthesize_voice():
    data = request.get_json(force=True)
    text = str(data.get("text", "")).strip()
    if not text:
        return jsonify({"error": "text is required"}), 400

    key        = md5(text)
    cache_file = cache_path("audio", key, ".mp3")
    if cache_file.exists():
        return send_file(str(cache_file), mimetype="audio/mpeg")

    try:
        resp = requests.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}",
            headers={"xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json", "Accept": "audio/mpeg"},
            json={"text": text, "model_id": "eleven_turbo_v2_5",
                  "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "style": 0.3, "use_speaker_boost": True}},
            timeout=30,
        )
        resp.raise_for_status()
        audio = resp.content
    except Exception as e:
        print(f"[ElevenLabs] {e}")
        return Response(b"", status=200, mimetype="audio/mpeg")  # silent fallback

    cache_file.write_bytes(audio)
    return send_file(BytesIO(audio), mimetype="audio/mpeg")


# ── Student response ───────────────────────────────────────────────────────

RESPONSE_SYSTEM = """
You are a warm, encouraging AI teacher mid-lesson. A student has just spoken.
Classify their input and respond. Return ONLY valid JSON:
{
  "inputType": "question" | "confusion" | "acknowledgment",
  "spokenText": "Your 2-3 sentence response. Warm, clear, encouraging.",
  "boardUpdate": "Optional short chalk note ≤8 words. Omit key if not helpful."
}
"""


@app.route("/student-response", methods=["POST"])
def student_response():
    data            = request.get_json(force=True)
    transcript      = str(data.get("transcript", "")).strip()
    subject         = str(data.get("subject", ""))
    topic           = str(data.get("topic", ""))
    current_segment = data.get("currentSegmentId", 0)
    if not transcript:
        return jsonify({"error": "transcript is required"}), 400

    prompt = f"Subject: {subject}\nTopic: {topic}\nSegment: {current_segment}\nStudent said: \"{transcript}\""
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL, contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=RESPONSE_SYSTEM,
                response_mime_type="application/json",
                temperature=0.8,
            ),
        )
        raw = response.text.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        return jsonify(json.loads(raw))
    except Exception as e:
        print(f"[student-response] {e}")
        return jsonify({"inputType": "question", "spokenText": f"Great question! Let me address that in the context of {topic}. Let's continue exploring this together."})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "luminary"})


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"🎓 luminary backend → http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
```

---

## 6. External Manim Service (NOT in this repo)

A separate TypeScript/Express service the user already built. Flask calls it.

**Endpoint:** `POST {MANIM_API_URL}/generate`

**Request:**
```json
{ "context": "Plain English description of what to animate", "duration": 12 }
```

**Response:**
```json
{ "success": true, "videoUrl": "https://storage.bucket/animation.mp4", "code": "...", "usedFallback": false, "duration": 12 }
```

- Uses Claude Opus 4.6 to generate Manim Python from `context`
- Renders with Manim, uploads MP4 to cloud storage
- Returns the storage URL
- Flask downloads the video and caches it locally, then proxies as blob to frontend

**Note from user:** May need to be containerized on a PyTorch AMB Cloud image later — don't refactor for that yet.

---

## 7. Data Flow (End to End)

```
User picks subject + topic
  → GET /classroom?subject=Physics&topic=How+black+holes+form
  → useLesson.startLesson() called

Frontend POST /generate-lesson
  → Flask calls Gemini → gets 5-segment JSON
  → Returns lesson to frontend

For each segment (in parallel loop):
  Frontend POST /synthesize-voice (spokenText)
    → Flask calls ElevenLabs → MP3 → cached → returned as blob
    → Frontend creates objectURL

  If segment has manimScript:
    Frontend POST /render-manim (manimScript)
      → Flask calls MANIM_API_URL/generate (context = manimScript)
      → External service generates MP4, returns videoUrl
      → Flask downloads MP4 from storage, caches, proxies blob
      → Frontend creates objectURL

All assets ready → status = 'ready' → auto-play begins

Playback loop:
  playAudio(segment.audioUrl)
  → teacher mouth animates
  → chalkboard updates (text or video)
  → avatar transitions to position
  → onAudioEnd fires → nextSegment() after 800ms

Student speaks (push-to-talk):
  → stopAudio() immediately
  → POST /student-response → Gemini classifies + responds
  → synthesizeVoice(response.spokenText) → playAudio
  → 1500ms pause → resume lesson from current segment
```

---

## 8. API Keys Needed

| Key | Where to get | Env var |
|---|---|---|
| Gemini | Google AI Studio | `GEMINI_API_KEY` |
| ElevenLabs | elevenlabs.io | `ELEVENLABS_API_KEY` |
| Manim service URL | User's other project | `MANIM_API_URL` |

---

## 9. How to Run

**Backend:**
```bash
cd backend
cp .env.example .env   # fill in GEMINI_API_KEY, ELEVENLABS_API_KEY, MANIM_API_URL
pip3 install -r requirements.txt
python3 app.py
# → running on http://localhost:5000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# → running on http://localhost:3000
```

Open `http://localhost:3000`, pick a subject and topic, click Start Lesson.

---

## 10. What Still Needs Building

These are the remaining items from the PRD:

### High priority (demo-critical)
- [ ] **Pre-render entire lesson before demo** — currently pre-renders automatically, but should add a "Pre-cache demo lesson" CLI script that hits all endpoints for a known topic so everything is instant
- [ ] **Classroom stage height** — the `ClassroomStage` needs explicit height (`h-[70vh]` or similar) so it doesn't collapse to 0
- [ ] **Test the full loop** — run backend + frontend together and trace one lesson from topic input to completion
- [ ] **ElevenLabs voice selection** — confirm `EXAVITQu4vr4xnSDxMaL` (Bella) sounds like a teacher. Alternative: `21m00Tcm4TlvDq8ikWAM` (Rachel)
- [ ] **Lesson JSON cache location bug** — lesson JSON is cached in `cache/audio/` — should be `cache/` root or a separate `cache/lessons/` folder for clarity

### Medium priority
- [ ] **WebSpatial panel sizing** — add `enable-xr` meta tag to `app/layout.tsx` for Vision Pro
- [ ] **Error boundary** — wrap classroom page in an error boundary for demo safety
- [ ] **Board text accumulation** — `Chalkboard.tsx` currently accumulates all bullet points; decide if each segment should clear or append
- [ ] **Segment timing** — if Manim video is long, audio ends before video finishes; need to wait for both

### Nice to have
- [ ] **Backup demo video** — pre-record a screen recording as the ultimate fallback
- [ ] **Devpost write-up** — required for hackathon submission
- [ ] **PyTorch/AMD Cloud containerization** of the Manim service (user mentioned, defer for now)

---

## 11. Known TypeScript Issues Fixed

- Web Speech API has no TS types in standard lib → used custom `SpeechRecognitionCtor` interface with `InstanceType<>` for refs
- `@webspatial/core-sdk` exports `SpatialSession` class, not `createSpatialSession` function
- `google-generativeai` package is deprecated → use `google-genai` with `genai.Client(api_key=...)`

---

## 12. Prize Track Notes

**ElevenLabs Prize:** The teacher voice is the emotional core. Mention ElevenLabs by name in the demo. Frame it as: "This voice is what makes a student feel taught."

**WebSpatial Prize:** Vision Pro spatial moment should be last in the demo for maximum impact. The `SpatialClassroom` component already adds `data-spatial-panel` attributes. Ensure WebSpatial App Shell is installed on the Vision Pro device before judging.

---

*Generated by Claude Code — luminary handoff document for Hack for Humanity 2026*
