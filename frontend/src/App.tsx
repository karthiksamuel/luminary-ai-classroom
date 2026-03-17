import { useState, useCallback, useMemo } from 'react'
import { useConversation } from '@elevenlabs/react'
import { renderManim, createObjectUrl, summarizeText } from '@/lib/api'
import GreetingView from '@/components/GreetingView'
import ClassroomView from '@/components/ClassroomView'

const SPACE_KEYWORDS = [
  'space', 'solar', 'solar system', 'planet', 'planets',
  'earth', 'mars', 'sun', 'moon', 'mercury', 'venus', 'jupiter',
  'saturn', 'uranus', 'neptune', 'pluto', 'orbit', 'galaxy',
  'astronomy', 'asteroid', 'comet',
] as const

function isSpaceRelatedQuery(input: string) {
  const text = input.toLowerCase()
  return SPACE_KEYWORDS.some((keyword) => text.includes(keyword))
}

export interface LessonInfo {
  topic: string
  subject: string
}

export interface CompletedTopic {
  id: string
  title: string
  summary?: string
  keyPoints?: string[]
  videoUrl: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  text: string
}

type AppView = 'greeting' | 'classroom'

export default function App() {
  const [view, setView] = useState<AppView>('greeting')
  const [lessonInfo, setLessonInfo] = useState<LessonInfo | null>(null)
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [completedTopics, setCompletedTopics] = useState<CompletedTopic[]>([])
  const [startError, setStartError] = useState<string | null>(null)
  const [textMode, setTextMode] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isSpaceMode, setIsSpaceMode] = useState(false)

  // Tool: agent calls this when user tells it what they want to learn
  const handleStartLesson = useCallback(
    async ({ topic, subject }: { topic: string; subject: string }) => {
      setLessonInfo({ topic, subject })
      setIsSpaceMode(isSpaceRelatedQuery(`${topic} ${subject}`))
      setView('classroom')
      return `Opened classroom for ${topic}. You're now teaching ${subject}.`
    },
    [],
  )

  // Tool: agent calls this to show a Manim animation for a concept
  const handleRenderAnimation = useCallback(
    async ({ description }: { description: string }) => {
      setIsSpaceMode(isSpaceRelatedQuery(description))
      setIsRendering(true)
      try {
        const blob = await renderManim(description)
        const url = createObjectUrl(blob)
        setCurrentVideoUrl(url)
        const id = String(Date.now())
        const title = description.length > 55 ? description.slice(0, 55) + '…' : description

        // Add immediately for snappy UI, then backfill summary.
        setCompletedTopics((prev) => ([...prev, { id, title, videoUrl: url }]))

        summarizeText(description)
          .then((s) => {
            setCompletedTopics((prev) => prev.map((t) => (
              t.id === id ? { ...t, summary: s.summary, keyPoints: s.keyPoints } : t
            )))
          })
          .catch(() => {
            // keep title-only; summary is optional.
          })
        return 'The animation is now on the board.'
      } catch {
        return 'Animation failed. Continue explaining verbally.'
      } finally {
        setIsRendering(false)
      }
    },
    [],
  )

  const clientTools = useMemo(
    () => ({
      start_lesson: handleStartLesson,
      render_animation: handleRenderAnimation,
    }),
    [handleStartLesson, handleRenderAnimation],
  )

  const conversation = useConversation({
    clientTools,
    onMessage: ({ message, source }) => {
      if (source === 'user') {
        setIsSpaceMode(isSpaceRelatedQuery(message))
      }
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now() + Math.random()), role: source as 'user' | 'ai', text: message },
      ])
    },
  })

  const handleEnterDirectly = useCallback((topic: string, subject: string) => {
    setLessonInfo({ topic, subject })
    setIsSpaceMode(isSpaceRelatedQuery(`${topic} ${subject}`))
    setTextMode(true) // text-based entry — show chat panel immediately
    setView('classroom')
    // Kick off an intro animation immediately on manual entry
    handleRenderAnimation({ description: `Introduction to ${topic} in ${subject}` })
  }, [handleRenderAnimation])

  const handleSendMessage = useCallback(async (text: string) => {
    setIsSpaceMode(isSpaceRelatedQuery(text))
    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), role: 'user', text },
    ])
    const result = await handleRenderAnimation({ description: text })
    setMessages((prev) => [
      ...prev,
      { id: String(Date.now() + 1), role: 'ai', text: result ?? 'Done.' },
    ])
  }, [handleRenderAnimation])

  const startConversation = useCallback(async () => {
    setStartError(null)
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      setStartError('Microphone access denied. Please allow mic access and try again.')
      return
    }
    try {
      const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID
      if (!agentId) {
        setStartError('Voice tutor is not configured. Please set VITE_ELEVENLABS_AGENT_ID in the frontend .env file.')
        return
      }
      await conversation.startSession({
        agentId,
        connectionType: 'webrtc',
      })
    } catch (e) {
      setStartError(e instanceof Error ? e.message : 'Failed to connect to agent.')
    }
  }, [conversation])

  const endConversation = useCallback(async () => {
    await conversation.endSession()
  }, [conversation])

  if (view === 'greeting') {
    return (
      <GreetingView
        status={conversation.status}
        isSpeaking={conversation.isSpeaking}
        onStart={startConversation}
        onStop={endConversation}
        onEnterDirectly={handleEnterDirectly}
        error={startError}
      />
    )
  }

  return (
    <ClassroomView
      lessonInfo={lessonInfo!}
      isTalking={conversation.isSpeaking}
      currentVideoUrl={currentVideoUrl}
      isRendering={isRendering}
      completedTopics={completedTopics}
      onSelectTopic={setCurrentVideoUrl}
      conversationStatus={conversation.status}
      isSpaceMode={isSpaceMode}
      textMode={textMode}
      onToggleTextMode={() => setTextMode((v) => !v)}
      messages={messages}
      onSendMessage={handleSendMessage}
    />
  )
}
