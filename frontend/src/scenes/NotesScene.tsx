// NotesScene — runs in its own spatial window (wide, short).
// Listens on 'luminary-scene-sync' BroadcastChannel for 'notes-state' messages.
// When the user saves a note, broadcasts { type: 'add-note', note } back to the main scene.

import { useState, useEffect, useCallback } from 'react'
import { gsap } from 'gsap'
import { useRef } from 'react'

type NoteItem = { id: string; text: string; createdAt: number }

export default function NotesScene() {
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [draft, setDraft] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  // Sync notes state from main scene
  useEffect(() => {
    const channel = new BroadcastChannel('luminary-scene-sync')
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'notes-state') {
        setNotes(e.data.notes)
      }
    }
    channel.addEventListener('message', onMessage)
    return () => {
      channel.removeEventListener('message', onMessage)
      channel.close()
    }
  }, [])

  // Fade in on mount
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' })
    return () => { gsap.killTweensOf(el) }
  }, [])

  const handleAddNote = useCallback(() => {
    const text = draft.trim()
    if (!text) return
    const note: NoteItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      createdAt: Date.now(),
    }
    // Broadcast to main scene — it owns the authoritative notes state
    const ch = new BroadcastChannel('luminary-scene-sync')
    ch.postMessage({ type: 'add-note', note })
    ch.close()
    // Optimistic local update so the UI feels instant
    setNotes((prev) => [note, ...prev])
    setDraft('')
  }, [draft])

  const isAddDisabled = !draft.trim()

  return (
    <div
      ref={rootRef}
      style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(160deg, rgba(124,58,237,0.08) 0%, rgba(92,32,180,0.04) 100%)',
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

        <div style={{ flex: 1, display: 'flex', gap: '6px', alignItems: 'stretch' }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                handleAddNote()
              }
            }}
            placeholder="Type a note… (⌘+Enter to save)"
            className="lm-notes-textarea"
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
            onClick={handleAddNote}
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
          [...notes].map((note) => (
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
        .lm-notes-textarea::placeholder { color: rgba(239,178,255,0.25); }
        .lm-notes-textarea:focus { border-color: rgba(167,72,255,0.42) !important; }
      `}</style>
    </div>
  )
}
