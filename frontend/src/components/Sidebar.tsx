import { useState, useCallback } from 'react'
import { Mic, MicOff, BookOpen, ChevronRight } from 'lucide-react'
import type { Lesson, LessonStatus, PreRenderProgress } from '@/types/lesson'
import { useVoiceInput } from '@/hooks/useVoiceInput'

interface SidebarProps {
  lesson: Lesson | null
  status: LessonStatus
  progress: PreRenderProgress
  currentSegmentIndex: number
  onStudentInput: (transcript: string) => void
  onStopAudio: () => void
}

export default function Sidebar({
  lesson,
  status,
  progress,
  currentSegmentIndex,
  onStudentInput,
  onStopAudio,
}: SidebarProps) {
  const [transcriptLog, setTranscriptLog] = useState<{ text: string; ts: number }[]>([])
  const [isResponding, setIsResponding] = useState(false)

  const handleTranscript = useCallback(async (text: string) => {
    setTranscriptLog((prev) => [...prev, { text, ts: Date.now() }])
    setIsResponding(true)
    await onStudentInput(text)
    setIsResponding(false)
  }, [onStudentInput])

  const { isListening, transcript, isSupported, startListening, stopListening } = useVoiceInput({
    onTranscript: handleTranscript,
    onStart: () => { onStopAudio() },
  })

  const handleMicToggle = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const isPreRendering = status === 'pre-rendering'
  const progressPct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      height: '100%',
      padding: '16px',
      color: 'white',
    }}>
      {/* Status chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          padding: '4px 12px',
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: '600',
          background: STATUS_BG[status] ?? 'rgba(255,255,255,0.1)',
          color: STATUS_COLOR[status] ?? 'white',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}>
          {STATUS_LABEL[status] ?? status}
        </div>
        {isResponding && (
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
            Responding…
          </span>
        )}
      </div>

      {/* Pre-render progress */}
      {isPreRendering && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
            <span>{progress.currentStep}</span>
            <span>{progressPct}%</span>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #7c3aed, #2563eb)',
              borderRadius: '2px',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* Lesson segments */}
      {lesson && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            <BookOpen size={12} />
            <span>Lesson Plan</span>
          </div>
          {lesson.segments.map((seg, idx) => {
            const isDone = idx < currentSegmentIndex
            const isCurrent = idx === currentSegmentIndex
            return (
              <div
                key={seg.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: isCurrent
                    ? 'rgba(124,58,237,0.25)'
                    : isDone
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(255,255,255,0.02)',
                  border: isCurrent ? '1px solid rgba(124,58,237,0.5)' : '1px solid transparent',
                  transition: 'all 0.3s ease',
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: isCurrent ? '#7c3aed' : isDone ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  flexShrink: 0,
                  marginTop: '1px',
                }}>
                  {isDone ? '✓' : idx + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0,
                    fontSize: '12px',
                    color: isCurrent ? 'white' : isDone ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.6)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {seg.spokenText.slice(0, 50)}…
                  </p>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
                    {seg.boardAction} · {seg.avatarPosition}
                  </span>
                </div>
                {isCurrent && <ChevronRight size={14} style={{ color: '#7c3aed', flexShrink: 0, marginTop: '2px' }} />}
              </div>
            )
          })}
        </div>
      )}

      {/* Voice input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Live transcript */}
        {isListening && transcript && (
          <div style={{
            padding: '8px 12px',
            background: 'rgba(124,58,237,0.15)',
            borderRadius: '8px',
            border: '1px solid rgba(124,58,237,0.3)',
            fontSize: '13px',
            color: 'rgba(255,255,255,0.8)',
            fontStyle: 'italic',
          }}>
            "{transcript}"
          </div>
        )}

        {/* Transcript log */}
        {transcriptLog.length > 0 && (
          <div style={{ maxHeight: '80px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {transcriptLog.slice(-3).map((item) => (
              <p key={item.ts} style={{
                margin: 0,
                fontSize: '11px',
                color: 'rgba(255,255,255,0.4)',
                padding: '4px 8px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '6px',
              }}>
                You: "{item.text}"
              </p>
            ))}
          </div>
        )}

        {/* Mic button */}
        <button
          onClick={handleMicToggle}
          disabled={!isSupported || (status !== 'playing' && status !== 'complete' && status !== 'paused')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '14px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.2s ease',
            background: isListening
              ? 'linear-gradient(135deg, #dc2626, #991b1b)'
              : 'linear-gradient(135deg, #7c3aed, #2563eb)',
            color: 'white',
            boxShadow: isListening
              ? '0 0 20px rgba(220,38,38,0.4)'
              : '0 4px 12px rgba(124,58,237,0.3)',
            opacity: !isSupported || (status !== 'playing' && status !== 'complete' && status !== 'paused') ? 0.4 : 1,
          }}
        >
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          {isListening ? 'Stop Listening' : 'Ask a Question'}
        </button>

        {!isSupported && (
          <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
            Voice input not supported in this browser
          </p>
        )}
      </div>
    </div>
  )
}

const STATUS_LABEL: Partial<Record<string, string>> = {
  idle: 'Ready',
  generating: 'Generating',
  'pre-rendering': 'Preparing',
  ready: 'Ready',
  playing: 'Playing',
  paused: 'Paused',
  complete: 'Complete',
  error: 'Error',
}

const STATUS_BG: Partial<Record<string, string>> = {
  playing: 'rgba(22,163,74,0.2)',
  generating: 'rgba(124,58,237,0.2)',
  'pre-rendering': 'rgba(37,99,235,0.2)',
  complete: 'rgba(234,179,8,0.2)',
  error: 'rgba(220,38,38,0.2)',
}

const STATUS_COLOR: Partial<Record<string, string>> = {
  playing: '#4ade80',
  generating: '#c084fc',
  'pre-rendering': '#60a5fa',
  complete: '#fbbf24',
  error: '#f87171',
}
