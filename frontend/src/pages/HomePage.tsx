import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopicSelector from '@/components/TopicSelector'
import type { Subject } from '@/types/lesson'

export default function HomePage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const handleStart = (subject: Subject, topic: string) => {
    setIsLoading(true)
    const params = new URLSearchParams({ subject, topic })
    navigate(`/classroom?${params.toString()}`)
  }

  return <TopicSelector onStart={handleStart} isLoading={isLoading} />
}
