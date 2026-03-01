// TopicsPanel — right panel: scrollable list of completed animations
// Click any item to replay it in the BoardPanel

import type { CompletedTopic } from '@/App'

interface Props {
  topics: CompletedTopic[]
  currentVideoUrl: string | null
  onSelect: (url: string) => void
}

export default function TopicsPanel({ topics, currentVideoUrl, onSelect }: Props) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'rgba(255,255,255,0.025)',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <p style={{
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(164,228,255,0.6)',
        }}>
          Lesson History
        </p>
      </div>

      {/* Topic list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        {topics.length === 0 && (
          <p style={{
            color: 'rgba(255,255,255,0.2)',
            fontSize: '12px',
            textAlign: 'center',
            padding: '24px 8px',
            fontStyle: 'italic',
          }}>
            Completed topics will appear here
          </p>
        )}

        {[...topics].reverse().map((topic, i) => {
          const isActive = topic.videoUrl === currentVideoUrl
          return (
            <button
              key={topic.id}
              onClick={() => onSelect(topic.videoUrl)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: '10px',
                border: `1px solid ${isActive ? 'rgba(124,58,237,0.5)' : 'transparent'}`,
                background: isActive
                  ? 'rgba(124,58,237,0.2)'
                  : 'rgba(255,255,255,0.03)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
              }}
            >
              {/* Index badge */}
              <span style={{
                flexShrink: 0,
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: isActive ? '#7c3aed' : 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                fontWeight: 700,
                color: 'white',
                marginTop: '1px',
              }}>
                {topics.length - i}
              </span>

              <p style={{
                margin: 0,
                fontSize: '12px',
                color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
                lineHeight: 1.4,
                wordBreak: 'break-word',
              }}>
                {topic.title}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
