// ClassroomView — 3-panel layout: teacher | board | topics
// Shown after the agent calls the start_lesson tool.
// Teacher panel: 3D avatar driven by isTalking (from ElevenLabs isSpeaking)
// Board panel: Manim videos triggered by agent's render_animation tool calls
// Topics panel: history of all rendered animations, clickable to replay

import { useState, useRef, useEffect } from 'react'
import { initScene } from '@webspatial/react-sdk'
import type { LessonInfo, CompletedTopic, ChatMessage } from '@/App'
import TeacherPanel from './TeacherPanel'
import BoardPanel from './BoardPanel'
import TopicsPanel from './TopicsPanel'

// true when running inside the WebSpatial / visionOS app shell
const IS_SPATIAL = import.meta.env.XR_ENV === 'avp'

interface Props {
  lessonInfo: LessonInfo
  isTalking: boolean
  currentVideoUrl: string | null
  isRendering: boolean
  completedTopics: CompletedTopic[]
  onSelectTopic: (url: string) => void
  conversationStatus: 'disconnected' | 'connecting' | 'connected'
  textMode: boolean
  onToggleTextMode: () => void
  messages: ChatMessage[]
  onSendMessage: (text: string) => void
}

export default function ClassroomView({
  lessonInfo,
  isTalking,
  currentVideoUrl,
  isRendering,
  completedTopics,
  onSelectTopic,
  conversationStatus,
  textMode,
  onToggleTextMode,
  messages,
  onSendMessage,
}: Props) {
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const teacherWinRef = useRef<WindowProxy | null>(null)
  const topicsWinRef = useRef<WindowProxy | null>(null)
  // stable ref so the channel listener always has the latest callback
  const onSelectTopicRef = useRef(onSelectTopic)
  useEffect(() => { onSelectTopicRef.current = onSelectTopic }, [onSelectTopic])

  // Open Teacher + Topics as separate spatial scenes on mount
  useEffect(() => {
    if (!IS_SPATIAL) return

    const channel = new BroadcastChannel('luminary-scene-sync')
    channelRef.current = channel

    channel.addEventListener('message', (e: MessageEvent) => {
      if (e.data?.type === 'select-topic') {
        onSelectTopicRef.current(e.data.videoUrl)
      }
    })

    const base = window.location.href.split('?')[0].split('#')[0]

    initScene('luminary-teacher', (cfg) => ({
      ...cfg,
      defaultSize: { width: 400, height: 640 },
    }))
    teacherWinRef.current = window.open(base + '?scene=teacher', 'luminary-teacher')

    initScene('luminary-topics', (cfg) => ({
      ...cfg,
      defaultSize: { width: 360, height: 560 },
    }))
    topicsWinRef.current = window.open(base + '?scene=topics', 'luminary-topics')

    return () => {
      teacherWinRef.current?.close()
      topicsWinRef.current?.close()
      channel.close()
      channelRef.current = null
    }
  }, []) // run once on mount

  // Keep Teacher scene in sync with talking state
  useEffect(() => {
    channelRef.current?.postMessage({ type: 'teacher-state', isTalking })
  }, [isTalking])

  // Keep Topics scene in sync with completed topics + active video
  useEffect(() => {
    channelRef.current?.postMessage({ type: 'topics-state', topics: completedTopics, currentVideoUrl })
  }, [completedTopics, currentVideoUrl])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = draft.trim()
    if (!text) return
    onSendMessage(text)
    setDraft('')
  }

  // Chat panel — reused in both spatial and non-spatial layouts
  const chatPanel = (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      borderRadius: '12px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      overflow: 'hidden',
    }}>
      <div style={{
        flex: 1, overflowY: 'auto', padding: '10px',
        display: 'flex', flexDirection: 'column', gap: '6px',
      }}>
        {messages.length === 0 && (
          <p style={{
            fontSize: '11px', color: 'rgba(255,255,255,0.2)',
            fontStyle: 'italic', textAlign: 'center', marginTop: '16px',
          }}>
            Type a message below
          </p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '88%', padding: '6px 9px',
            borderRadius: msg.role === 'user' ? '9px 9px 2px 9px' : '9px 9px 9px 2px',
            background: msg.role === 'user' ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${msg.role === 'user' ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.07)'}`,
            fontSize: '11px', lineHeight: 1.45,
            color: 'rgba(255,255,255,0.82)',
          }}>
            {msg.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{
        padding: '6px', borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', gap: '5px',
      }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Message…"
          disabled={conversationStatus !== 'connected'}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '6px', padding: '6px 9px',
            color: 'white', fontSize: '11px', outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || conversationStatus !== 'connected'}
          style={{
            padding: '6px 10px', borderRadius: '6px', border: 'none',
            background: 'rgba(124,58,237,0.55)', color: 'white', fontSize: '12px',
            cursor: draft.trim() && conversationStatus === 'connected' ? 'pointer' : 'default',
            opacity: draft.trim() && conversationStatus === 'connected' ? 1 : 0.35,
            transition: 'opacity 0.2s',
          }}
        >↑</button>
      </div>
    </div>
  )

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'transparent',
    }}>
      {/* Top bar */}
      <div style={{
        height: '48px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.2)',
        backdropFilter: 'blur(12px)',
      }}>
        {/* Left: branding + topic */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.02em' }}>luminary</span>
          {lessonInfo && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>·</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                {lessonInfo.subject} — {lessonInfo.topic}
              </span>
            </>
          )}
        </div>

        {/* Right: text toggle + conversation indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onToggleTextMode}
            title={textMode ? 'Switch to voice' : 'Switch to text (audio broken?)'}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: textMode ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${textMode ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.09)'}`,
              borderRadius: '6px', padding: '4px 9px',
              color: textMode ? 'rgba(196,181,253,0.9)' : 'rgba(255,255,255,0.35)',
              fontSize: '11px', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2"/>
              <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>
            </svg>
            Text
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: conversationStatus === 'connected'
                ? (isTalking ? '#4ade80' : 'rgba(74,222,128,0.5)')
                : 'rgba(255,255,255,0.2)',
              boxShadow: conversationStatus === 'connected' && isTalking
                ? '0 0 8px rgba(74,222,128,0.7)' : 'none',
              transition: 'all 0.3s',
            }} />
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
              {conversationStatus === 'connected'
                ? isTalking ? 'Speaking' : 'Listening'
                : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{
        flex: 1, display: 'flex', gap: '10px', padding: '10px', minHeight: 0,
      }}>
        {IS_SPATIAL ? (
          // Spatial mode: teacher + topics live in their own scenes.
          // Main scene shows an optional chat column + the board.
          <>
            {textMode && (
              <div style={{ flex: '0 0 26%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                {chatPanel}
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
              <BoardPanel
                videoUrl={currentVideoUrl}
                isRendering={isRendering}
                topic={lessonInfo.topic}
              />
            </div>
          </>
        ) : (
          // Web / non-spatial mode: classic 3-panel layout with inline panels.
          <>
            {/* Left — Teacher or Chat (25%) */}
            <div style={{ flex: '0 0 25%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {textMode ? chatPanel : <TeacherPanel isTalking={isTalking} />}
            </div>

            {/* Middle — Board (50%) */}
            <div style={{ flex: '0 0 50%', minHeight: 0 }}>
              <BoardPanel
                videoUrl={currentVideoUrl}
                isRendering={isRendering}
                topic={lessonInfo.topic}
              />
            </div>

            {/* Right — Topics (25%) */}
            <div style={{ flex: '0 0 25%', minHeight: 0, overflow: 'hidden' }}>
              <TopicsPanel
                topics={completedTopics}
                currentVideoUrl={currentVideoUrl}
                onSelect={onSelectTopic}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
