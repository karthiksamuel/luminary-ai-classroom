import { useState } from 'react'
import type { Subject } from '@/types/lesson'

const SUBJECTS: Subject[] = [
  'Physics', 'Mathematics', 'Biology', 'Chemistry',
  'History', 'Economics', 'Computer Science', 'Philosophy',
]

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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a0a2e 0%, #16213e 50%, #0f3460 100%)',
      padding: '16px',
    }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{
          fontSize: 'clamp(40px, 8vw, 72px)',
          fontWeight: '900',
          color: 'white',
          margin: '0 0 12px',
          letterSpacing: '-1px',
          textShadow: '0 0 40px rgba(124,58,237,0.5)',
        }}>
          luminary
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: 'clamp(14px, 2vw, 18px)',
          maxWidth: '480px',
          margin: '0 auto',
          lineHeight: '1.6',
        }}>
          A private AI teacher, for any subject, for any student, anywhere in the world.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(16px)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.15)',
          padding: '36px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        }}
      >
        {/* Subject picker */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            marginBottom: '12px',
          }}>
            Subject
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
          }}>
            {SUBJECTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedSubject(s)}
                style={{
                  padding: '8px 4px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  transition: 'all 0.15s ease',
                  background: selectedSubject === s
                    ? 'white'
                    : 'rgba(255,255,255,0.08)',
                  color: selectedSubject === s ? '#1a0a2e' : 'white',
                  transform: selectedSubject === s ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: selectedSubject === s ? '0 4px 12px rgba(255,255,255,0.2)' : 'none',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Topic input */}
        <div style={{ marginBottom: '28px' }}>
          <label style={{
            display: 'block',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            marginBottom: '12px',
          }}>
            Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={EXAMPLE_TOPICS[selectedSubject]}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '14px 16px',
              color: 'white',
              fontSize: '15px',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            background: isLoading
              ? 'rgba(255,255,255,0.3)'
              : 'white',
            color: '#1a0a2e',
            fontWeight: '800',
            fontSize: '16px',
            padding: '16px',
            borderRadius: '12px',
            border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}
          onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
        >
          {isLoading ? 'Preparing Lesson…' : 'Start Lesson →'}
        </button>
      </form>

      <p style={{
        marginTop: '32px',
        color: 'rgba(255,255,255,0.25)',
        fontSize: '12px',
        textAlign: 'center',
      }}>
        Powered by Gemini · ElevenLabs · Manim · WebSpatial
      </p>
    </div>
  )
}
