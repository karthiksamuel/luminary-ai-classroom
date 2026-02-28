import { useEffect, useRef, type ReactNode } from 'react'

interface SpatialClassroomProps {
  children: ReactNode        // classroom stage
  sidebarContent: ReactNode  // sidebar
}

declare global {
  interface Window {
    XRSystem?: unknown
  }
}

export default function SpatialClassroom({ children, sidebarContent }: SpatialClassroomProps) {
  const isSpatial = import.meta.env.XR_ENV === 'avp'
  const sessionRef = useRef<any>(null) // ai fix: avoid importing SpatialSession type directly to prevent loading SDK in non-spatial contexts

  // Lazy-init SpatialSession only in WebSpatial context
  useEffect(() => {
    if (!isSpatial) return
    let mounted = true

    import('@webspatial/core-sdk').then(({ SpatialSession }) => {
      if (!mounted) return
      try {
        sessionRef.current = new SpatialSession()
      } catch {
        // not in WebSpatial App Shell
      }
    }).catch(() => {
      // SDK not available
    })

    return () => {
      mounted = false
      sessionRef.current?.destroy?.()
    }
  }, [isSpatial])

  if (isSpatial) {
    // Spatial layout: main classroom + floating sidebar
    return (
      <div style={{ display: 'flex', gap: '16px', height: '100%', width: '100%' }}>
        {/* Main classroom panel — spatialized */}
        <div
          enable-xr
          data-spatial-panel="main"
          style={{
            flex: 3,
            borderRadius: '16px',
            overflow: 'hidden',
            '--xr-background-material': 'translucent',
          } as React.CSSProperties}
        >
          {children}
        </div>

        {/* Sidebar panel — spatialized, floating */}
        <div
          enable-xr
          data-spatial-panel="sidebar"
          style={{
            flex: 1,
            minWidth: '280px',
            maxWidth: '340px',
            borderRadius: '16px',
            background: 'rgba(13,13,26,0.85)',
            border: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden',
            '--xr-background-material': 'translucent',
          } as React.CSSProperties}
        >
          {sidebarContent}
        </div>
      </div>
    )
  }

  // Flat browser layout
  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      height: '100%',
      width: '100%',
      flexDirection: 'row',
    }}>
      {/* Classroom stage */}
      <div style={{
        flex: 3,
        borderRadius: '16px',
        overflow: 'hidden',
        minHeight: '400px',
      }}>
        {children}
      </div>

      {/* Sidebar */}
      <div style={{
        flex: 1,
        minWidth: '260px',
        maxWidth: '320px',
        borderRadius: '16px',
        background: 'rgba(13,13,26,0.9)',
        border: '1px solid rgba(255,255,255,0.1)',
        overflowY: 'auto',
      }}>
        {sidebarContent}
      </div>
    </div>
  )
}
