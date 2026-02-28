import { useState, useCallback, useRef, useEffect } from 'react'

type SpeechRecognitionCtor = new () => {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  onresult: ((event: {
    resultIndex: number
    results: { isFinal: boolean; 0: { transcript: string } }[]
  }) => void) | null
  start(): void
  stop(): void
}

type AnyWindow = Window & {
  SpeechRecognition?: SpeechRecognitionCtor
  webkitSpeechRecognition?: SpeechRecognitionCtor
}

function getSpeechRecognition(): SpeechRecognitionCtor | undefined {
  const w = window as AnyWindow
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void
  onStart?: () => void
  onStop?: () => void
}

export function useVoiceInput({ onTranscript, onStart, onStop }: UseVoiceInputOptions) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null)
  const finalTranscriptRef = useRef('')

  useEffect(() => { setIsSupported(!!getSpeechRecognition()) }, [])

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) return
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    finalTranscriptRef.current = ''
    recognition.onstart = () => { setIsListening(true); setTranscript(''); onStart?.() }
    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) finalTranscriptRef.current += r[0].transcript
        else interim += r[0].transcript
      }
      setTranscript(finalTranscriptRef.current + interim)
    }
    recognition.onend = () => {
      setIsListening(false)
      if (finalTranscriptRef.current.trim()) onTranscript(finalTranscriptRef.current.trim())
      onStop?.()
    }
    recognition.onerror = () => { setIsListening(false); onStop?.() }
    recognitionRef.current = recognition
    recognition.start()
  }, [onTranscript, onStart, onStop])

  const stopListening = useCallback(() => { recognitionRef.current?.stop() }, [])

  return { isListening, transcript, isSupported, startListening, stopListening }
}
