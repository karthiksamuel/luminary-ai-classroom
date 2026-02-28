import { useState, useCallback, useRef } from 'react'

interface UseAudioPlayerOptions {
  onEnd?: () => void
  onPlay?: () => void
}

export function useAudioPlayer({ onEnd, onPlay }: UseAudioPlayerOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const play = useCallback((url: string) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    const audio = new Audio(url)
    audioRef.current = audio
    audio.onplay = () => { setIsPlaying(true); onPlay?.() }
    audio.onended = () => { setIsPlaying(false); audioRef.current = null; onEnd?.() }
    audio.onerror = () => { setIsPlaying(false); audioRef.current = null; setTimeout(() => onEnd?.(), 2500) }
    audio.play().catch(() => { setIsPlaying(false); audioRef.current = null; setTimeout(() => onEnd?.(), 2500) })
  }, [onEnd, onPlay])

  const stop = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    setIsPlaying(false)
  }, [])

  return { isPlaying, play, stop }
}
