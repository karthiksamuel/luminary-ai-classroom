import { useState, useCallback, useMemo } from 'react'
import { useConversation } from '@elevenlabs/react'
import { renderManim, createObjectUrl } from '@/lib/api'
import GreetingView from '@/components/GreetingView'
import ClassroomView from '@/components/ClassroomView'

export interface LessonInfo {
  topic: string
  subject: string
}

export interface CompletedTopic {
  id: string
  title: string
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
  const [textMode, setTextMode] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])

  // Tool: agent calls this when user tells it what they want to learn
  const handleStartLesson = useCallback(
    async ({ topic, subject }: { topic: string; subject: string }) => {
      setLessonInfo({ topic, subject })
      setView('classroom')
      return `Opened classroom for ${topic}. You're now teaching ${subject}.`
    },
    [],
  )

  // Tool: agent calls this to show a Manim animation for a concept
  const handleRenderAnimation = useCallback(
    async ({ description }: { description: string }) => {
      setIsRendering(true)
      try {
        const blob = await renderManim(description)
        const url = createObjectUrl(blob)
        setCurrentVideoUrl(url)
        setCompletedTopics((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            title: description.length > 55 ? description.slice(0, 55) + '…' : description,
            videoUrl: url,
          },
        ])
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
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now() + Math.random()), role: source as 'user' | 'ai', text: message },
      ])
    },
  })

  const handleEnterDirectly = useCallback((topic: string, subject: string) => {
    setLessonInfo({ topic, subject })
    setView('classroom')
  }, [])

  const handleSendMessage = useCallback(
    (text: string) => { conversation.sendUserMessage(text) },
    [conversation],
  )

  const startConversation = useCallback(async () => {
    setStartError(null)
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      setStartError('Microphone access denied. Please allow mic access and try again.')
      return
    }
    try {
      await conversation.startSession({
        agentId: import.meta.env.VITE_ELEVENLABS_AGENT_ID,
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
      textMode={textMode}
      onToggleTextMode={() => setTextMode((v) => !v)}
      messages={messages}
      onSendMessage={handleSendMessage}
    />
  )
}
