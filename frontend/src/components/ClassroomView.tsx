// ClassroomView — 2-panel layout: teacher/chat | board
// Shown after the agent calls the start_lesson tool.
// Teacher panel: 3D avatar driven by isTalking (from ElevenLabs isSpeaking)
// Board panel: Manim videos triggered by agent's render_animation tool calls
// NotesBar: wide bottom bar that slides up on session start

import { useState, useRef, useEffect, useCallback } from 'react'
import { initScene } from '@webspatial/react-sdk'
import { gsap } from 'gsap'
import type { LessonInfo, CompletedTopic, ChatMessage } from '@/App'
import TeacherPanel from './TeacherPanel'
import SpaceTeacherPanel from './SpaceTeacherPanel'
import BoardPanel from './BoardPanel'
import NotesBar from './NotesBar'

// true when running inside the WebSpatial / visionOS app shell
const IS_SPATIAL = import.meta.env.XR_ENV === 'avp'
type NoteItem = { id: string; text: string; createdAt: number }

interface Props {
  lessonInfo: LessonInfo
  isTalking: boolean
  currentVideoUrl: string | null
  isRendering: boolean
  completedTopics: CompletedTopic[]
  onSelectTopic: (url: string) => void
  conversationStatus: 'disconnected' | 'connecting' | 'connected' | 'disconnecting'
  isSpaceMode: boolean
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
  isSpaceMode,
  textMode,
  onToggleTextMode,
  messages,
  onSendMessage,
}: Props) {
  const [draft, setDraft] = useState('')
  const [isBrandHovered, setIsBrandHovered] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [notes, setNotes] = useState<NoteItem[]>([])
  const brandRef = useRef<HTMLSpanElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const teacherWinRef = useRef<WindowProxy | null>(null)
  const topicsWinRef = useRef<WindowProxy | null>(null)
  const notesLinkRef = useRef<HTMLAnchorElement>(null)
  const isTalkingRef = useRef(isTalking)
  const isSpaceModeRef = useRef(isSpaceMode)
  // stable ref so the channel listener always has the latest callback
  const onSelectTopicRef = useRef(onSelectTopic)
  useEffect(() => { onSelectTopicRef.current = onSelectTopic }, [onSelectTopic])
  useEffect(() => { isTalkingRef.current = isTalking }, [isTalking])
  useEffect(() => { isSpaceModeRef.current = isSpaceMode }, [isSpaceMode])

  // Open Teacher + Topics as separate spatial scenes on mount
  useEffect(() => {
    if (!IS_SPATIAL) return

    const channel = new BroadcastChannel('luminary-scene-sync')
    channelRef.current = channel

    channel.addEventListener('message', (e: MessageEvent) => {
      if (e.data?.type === 'select-topic') {
        onSelectTopicRef.current(e.data.videoUrl)
      }
      if (e.data?.type === 'teacher-scene-ready') {
        channel.postMessage({ type: 'teacher-state', isTalking: isTalkingRef.current })
        channel.postMessage({ type: 'teacher-mode', isSpaceMode: isSpaceModeRef.current })
      }
      if (e.data?.type === 'add-note' && e.data.note) {
        setNotes((prev) => {
          // Deduplicate in case the optimistic update in NotesScene already added it
          if (prev.some((n) => n.id === e.data.note.id)) return prev
          return [e.data.note, ...prev]
        })
      }
    })

    const base = window.location.href.split('?')[0].split('#')[0]
    let canceled = false
    const openSceneWindow = (
      sceneName: string,
      sceneQuery: string,
      setRef: (win: WindowProxy | null) => void,
    ) => {
      const open = (attempt = 0) => {
        if (canceled) return
        const win = window.open(base + sceneQuery, sceneName)
        if (win) {
          setRef(win)
          return
        }
        if (attempt < 6) {
          window.setTimeout(() => open(attempt + 1), 220 + attempt * 120)
        }
      }
      open()
    }

    initScene('luminary-teacher', (cfg) => ({
      ...cfg,
      defaultSize: { width: 400, height: 640 },
    }))
    openSceneWindow('luminary-teacher', '?scene=teacher', (win) => { teacherWinRef.current = win })

    initScene('luminary-topics', (cfg) => ({
      ...cfg,
      defaultSize: { width: 360, height: 560 },
    }))
    openSceneWindow('luminary-topics', '?scene=topics', (win) => { topicsWinRef.current = win })

    // Notes scene — opened via link element (WebSpatial link-element API)
    initScene('luminary-notes', (cfg) => ({
      ...cfg,
      defaultSize: { width: 820, height: 180 },
    }))
    window.setTimeout(() => {
      if (!canceled) notesLinkRef.current?.click()
    }, 60)

    // Ensure teacher scene starts in explicit idle state until speaking events arrive.
    channel.postMessage({ type: 'teacher-state', isTalking: false })
    channel.postMessage({ type: 'teacher-mode', isSpaceMode: isSpaceModeRef.current })

    return () => {
      canceled = true
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

  useEffect(() => {
    channelRef.current?.postMessage({ type: 'teacher-mode', isSpaceMode })
  }, [isSpaceMode])

  // Keep Topics scene in sync with completed topics + active video
  useEffect(() => {
    channelRef.current?.postMessage({ type: 'topics-state', topics: completedTopics, currentVideoUrl })
  }, [completedTopics, currentVideoUrl])

  // Keep Notes scene in sync with notes state
  useEffect(() => {
    if (!IS_SPATIAL) return
    channelRef.current?.postMessage({ type: 'notes-state', notes })
  }, [notes])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = draft.trim()
    if (!text || isRendering) return
    onSendMessage(text)
    setDraft('')
  }

  const handleAddNote = useCallback(() => {
    const text = noteDraft.trim()
    if (!text) return
    setNotes((prev) => [
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text, createdAt: Date.now() },
      ...prev,
    ])
    setNoteDraft('')
  }, [noteDraft])

  const brandIsActive = conversationStatus === 'connected' || conversationStatus === 'connecting'
  const brandGlowStrength = isTalking ? 1 : brandIsActive ? 0.72 : 0.42

  useEffect(() => {
    const brandEl = brandRef.current
    if (!brandEl) return

    const driftRange = isTalking ? 2 : brandIsActive ? 1.4 : 0.9
    let stopped = false
    let driftTween: gsap.core.Tween | null = null

    gsap.set(brandEl, { x: 0, y: 0, rotation: 0, transformOrigin: '50% 50%' })

    const drift = () => {
      if (stopped) return
      driftTween = gsap.to(brandEl, {
        x: gsap.utils.random(-driftRange, driftRange),
        y: gsap.utils.random(-driftRange * 0.65, driftRange * 0.65),
        rotation: gsap.utils.random(-0.45, 0.45),
        duration: gsap.utils.random(1.4, 2.9),
        ease: 'sine.inOut',
        onComplete: drift,
      })
    }

    const shimmerTween = gsap.to(brandEl, {
      filter: `saturate(${isBrandHovered ? 1.28 : 1.12})`,
      duration: gsap.utils.random(1.8, 2.7),
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    })

    drift()

    return () => {
      stopped = true
      driftTween?.kill()
      shimmerTween.kill()
      gsap.to(brandEl, { x: 0, y: 0, rotation: 0, duration: 0.25, ease: 'sine.out' })
    }
  }, [brandIsActive, isTalking, isBrandHovered])

  // Animation request panel — reused in both spatial and non-spatial layouts
  const chatPanel = (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      borderRadius: '12px',
      background: 'linear-gradient(160deg, rgba(124,58,237,0.09) 0%, rgba(92,32,180,0.04) 100%)',
      border: '1px solid rgba(167,72,255,0.22)',
      boxShadow: 'inset 0 0 0 1px rgba(167,72,255,0.06), 0 4px 24px rgba(124,58,237,0.1)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid rgba(167,72,255,0.15)',
        display: 'flex', alignItems: 'center', gap: '7px',
      }}>
        <span style={{
          fontSize: '10px', fontWeight: 800, letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: '#efb2ff',
          textShadow: '0 0 10px rgba(239,178,255,0.45), 0 0 22px rgba(167,72,255,0.25)',
        }}>
          Animate
        </span>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '10px',
        display: 'flex', flexDirection: 'column', gap: '6px',
      }}>
        {messages.length === 0 && !isRendering && (
          <p style={{
            fontSize: '11px', color: 'rgba(239,178,255,0.28)',
            fontStyle: 'italic', textAlign: 'center', marginTop: '16px',
          }}>
            Describe a concept to visualise
          </p>
        )}
        {isRendering && (
          <div style={{
            alignSelf: 'flex-start', padding: '6px 9px',
            borderRadius: '9px 9px 9px 2px',
            background: 'rgba(167,72,255,0.1)',
            border: '1px solid rgba(167,72,255,0.2)',
            fontSize: '11px', color: 'rgba(239,178,255,0.55)',
            fontStyle: 'italic',
          }}>
            Rendering…
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '88%', padding: '6px 9px',
            borderRadius: msg.role === 'user' ? '9px 9px 2px 9px' : '9px 9px 9px 2px',
            background: msg.role === 'user'
              ? 'rgba(124,58,237,0.38)'
              : 'rgba(167,72,255,0.1)',
            border: `1px solid ${msg.role === 'user' ? 'rgba(167,72,255,0.42)' : 'rgba(167,72,255,0.18)'}`,
            fontSize: '11px', lineHeight: 1.45,
            color: msg.role === 'user' ? 'rgba(255,255,255,0.95)' : 'rgba(239,178,255,0.85)',
            boxShadow: msg.role === 'user' ? '0 0 12px rgba(124,58,237,0.18)' : 'none',
          }}>
            {msg.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '7px', borderTop: '1px solid rgba(167,72,255,0.15)',
        display: 'flex', gap: '5px',
        background: 'rgba(92,32,180,0.06)',
      }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Describe an animation…"
          disabled={isRendering}
          className="lm-animate-input"
          style={{
            flex: 1,
            background: 'rgba(167,72,255,0.08)',
            border: '1px solid rgba(167,72,255,0.22)',
            borderRadius: '7px', padding: '7px 10px',
            color: 'white', fontSize: '11px', outline: 'none',
            opacity: isRendering ? 0.4 : 1,
            transition: 'border-color 0.2s',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || isRendering}
          style={{
            padding: '7px 12px', borderRadius: '7px', border: 'none',
            background: draft.trim() && !isRendering
              ? 'linear-gradient(135deg, rgba(167,72,255,0.85), rgba(124,58,237,0.9))'
              : 'rgba(124,58,237,0.18)',
            color: 'white', fontSize: '13px',
            cursor: draft.trim() && !isRendering ? 'pointer' : 'default',
            transition: 'background 0.2s, box-shadow 0.2s',
            boxShadow: draft.trim() && !isRendering ? '0 0 14px rgba(167,72,255,0.38)' : 'none',
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
      background: IS_SPATIAL
        ? 'transparent'
        : 'radial-gradient(ellipse 55% 70% at 8% 50%, rgba(124,58,237,0.05) 0%, transparent 100%), radial-gradient(ellipse 55% 70% at 92% 50%, rgba(92,32,180,0.04) 0%, transparent 100%), #000',
    }}>
      {/* Top bar */}
      <div style={{
        height: '56px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.2)',
        backdropFilter: 'blur(12px)',
        position: 'relative',
      }}>
        {/* Left: branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 2 }}>
          <span
            ref={brandRef}
            onMouseEnter={() => setIsBrandHovered(true)}
            onMouseLeave={() => setIsBrandHovered(false)}
            style={{
              fontWeight: 800,
              fontSize: '15px',
              letterSpacing: '-0.02em',
              color: '#efb2ff',
              transition: 'color 0.2s ease, text-shadow 0.2s ease',
              textShadow: `
                0 0 1px rgba(255,236,255,0.98),
                0 0 ${14 + (brandGlowStrength * 16)}px rgba(239,178,255,${0.28 + brandGlowStrength * 0.34}),
                0 0 ${24 + (brandGlowStrength * 26)}px rgba(167,72,255,${0.16 + brandGlowStrength * 0.28})
              `,
              animation: brandIsActive ? 'luminaryPulse 1.9s ease-in-out infinite' : 'none',
              cursor: 'default',
              userSelect: 'none',
              willChange: 'text-shadow, transform, opacity',
            }}
          >
            luminary
          </span>
        </div>

        {/* Middle: one-word center label (keep it minimal) */}
        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          maxWidth: '60%',
        }}>
          <span style={{
            fontSize: '13px',
            fontWeight: 900,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.95)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1,
          }}>
            {lessonInfo.subject}
          </span>
        </div>

        {/* Right: text toggle + status LED */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 2 }}>
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

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '11px',
              height: '11px',
              borderRadius: '50%',
              background: '#22c55e',
              boxShadow: conversationStatus === 'connected'
                ? (isTalking
                  ? '0 0 0 5px rgba(34,197,94,0.18), 0 0 14px rgba(34,197,94,0.95)'
                  : '0 0 0 3px rgba(34,197,94,0.14), 0 0 10px rgba(34,197,94,0.75)')
                : '0 0 0 2px rgba(34,197,94,0.12), 0 0 8px rgba(34,197,94,0.55)',
              opacity: conversationStatus === 'disconnecting' ? 0.7 : 1,
              transition: 'all 0.3s',
            }} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes luminaryPulse {
          0% { opacity: 0.9; filter: saturate(0.95); }
          50% { opacity: 1; filter: saturate(1.18); }
          100% { opacity: 0.9; filter: saturate(0.95); }
        }
        .lm-animate-input::placeholder { color: rgba(239,178,255,0.3); }
        .lm-animate-input:focus { border-color: rgba(167,72,255,0.48); }
      `}</style>

      {/* Body */}
      <div style={{
        flex: 1, display: 'flex', gap: '10px', padding: '10px 10px 0', minHeight: 0,
      }}>
        {IS_SPATIAL ? (
          // Spatial mode: teacher + topics live in their own scenes.
          <>
            {textMode && (
              <div style={{ flex: '0 0 25%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
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
          // Web mode: teacher/chat left | board right
          <>
            {/* Left — Teacher or Chat (25%) */}
            <div style={{ flex: '0 0 25%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {textMode ? chatPanel : (
                isSpaceMode
                  ? <SpaceTeacherPanel isTalking={isTalking} />
                  : <TeacherPanel isTalking={isTalking} />
              )}
            </div>

            {/* Board — fills remaining space */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <BoardPanel
                videoUrl={currentVideoUrl}
                isRendering={isRendering}
                topic={lessonInfo.topic}
              />
            </div>
          </>
        )}
      </div>

      {/* Notes bar — slides up from bottom on mount (web only; spatial uses its own scene) */}
      {!IS_SPATIAL && (
        <NotesBar
          draft={noteDraft}
          notes={notes}
          onDraftChange={setNoteDraft}
          onAddNote={handleAddNote}
          isAddDisabled={!noteDraft.trim()}
        />
      )}

      {/* Hidden link element used by WebSpatial to open the notes scene window */}
      {IS_SPATIAL && (
        <a
          ref={notesLinkRef}
          href="?scene=notes"
          target="luminary-notes"
          enable-xr
          style={{ display: 'none' }}
        />
      )}
    </div>
  )
}
