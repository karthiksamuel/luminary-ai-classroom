// NotesBar — wide, short notes panel pinned to the bottom of the classroom.
// Slides up from below on mount via GSAP.

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

interface NoteItem {
  id: string
  text: string
  createdAt: number
}

interface Props {
  draft: string
  notes: NoteItem[]
  onDraftChange: (value: string) => void
  onAddNote: () => void
  isAddDisabled: boolean
}

export default function NotesBar({ draft, notes, onDraftChange, onAddNote, isAddDisabled }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)

  // Slide up from below on mount
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    gsap.fromTo(
      el,
      { y: 60, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out', delay: 0.18 },
    )
  }, [])

  return (
    <div
      ref={rootRef}
      style={{
        flexShrink: 0,
        height: '148px',
        margin: '0 10px 10px',
        background: 'linear-gradient(160deg, rgba(124,58,237,0.08) 0%, rgba(92,32,180,0.04) 100%)',
        border: '1px solid rgba(167,72,255,0.18)',
        borderRadius: '14px',
        boxShadow: '0 -4px 24px rgba(124,58,237,0.07), inset 0 0 0 1px rgba(167,72,255,0.04)',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {/* ── Left: header + input ───────────────────────────────────── */}
      <div style={{
        width: '260px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '7px',
        padding: '12px 12px 12px 14px',
        borderRight: '1px solid rgba(167,72,255,0.1)',
      }}>
        {/* Header */}
        <span style={{
          fontSize: '9px',
          fontWeight: 800,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#efb2ff',
          textShadow: '0 0 8px rgba(239,178,255,0.35)',
        }}>
          Notes
        </span>

        {/* Textarea + save */}
        <div style={{ flex: 1, display: 'flex', gap: '6px', alignItems: 'stretch' }}>
          <textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                onAddNote()
              }
            }}
            placeholder="Type a note… (⌘+Enter to save)"
            className="lm-notesbar-textarea"
            style={{
              flex: 1,
              resize: 'none',
              background: 'rgba(167,72,255,0.07)',
              border: '1px solid rgba(167,72,255,0.18)',
              borderRadius: '8px',
              padding: '8px 10px',
              color: 'white',
              fontSize: '11px',
              lineHeight: 1.45,
              outline: 'none',
              fontFamily: 'inherit',
              transition: 'border-color 0.2s',
            }}
          />
          <button
            type="button"
            onClick={onAddNote}
            disabled={isAddDisabled}
            style={{
              flexShrink: 0,
              width: '30px',
              borderRadius: '8px',
              border: 'none',
              background: isAddDisabled
                ? 'rgba(124,58,237,0.14)'
                : 'linear-gradient(135deg, rgba(167,72,255,0.82), rgba(124,58,237,0.9))',
              color: 'white',
              fontSize: '15px',
              cursor: isAddDisabled ? 'default' : 'pointer',
              opacity: isAddDisabled ? 0.35 : 1,
              boxShadow: isAddDisabled ? 'none' : '0 0 10px rgba(124,58,237,0.28)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ↑
          </button>
        </div>
      </div>

      {/* ── Right: notes horizontal scroll ─────────────────────────── */}
      <div style={{
        flex: 1,
        overflowX: 'auto',
        overflowY: 'hidden',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 14px',
      }}>
        {notes.length === 0 ? (
          <p style={{
            color: 'rgba(239,178,255,0.2)',
            fontSize: '11px',
            fontStyle: 'italic',
            whiteSpace: 'nowrap',
            margin: 0,
          }}>
            Saved notes will appear here
          </p>
        ) : (
          [...notes].reverse().map((note) => (
            <div
              key={note.id}
              style={{
                flexShrink: 0,
                width: '180px',
                height: '100%',
                padding: '8px 10px',
                borderRadius: '10px',
                background: 'rgba(167,72,255,0.08)',
                border: '1px solid rgba(167,72,255,0.15)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                overflow: 'hidden',
              }}
            >
              <p style={{
                margin: 0,
                fontSize: '11px',
                color: 'rgba(239,178,255,0.85)',
                lineHeight: 1.4,
                wordBreak: 'break-word',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
              }}>
                {note.text}
              </p>
              <p style={{
                margin: '4px 0 0',
                fontSize: '9px',
                color: 'rgba(239,178,255,0.3)',
              }}>
                {new Date(note.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
          ))
        )}
      </div>

      <style>{`
        .lm-notesbar-textarea::placeholder { color: rgba(239,178,255,0.25); }
        .lm-notesbar-textarea:focus { border-color: rgba(167,72,255,0.42) !important; }
      `}</style>
    </div>
  )
}
