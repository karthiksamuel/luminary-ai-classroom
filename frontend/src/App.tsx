import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from '@/pages/HomePage'
import ClassroomPage from '@/pages/ClassroomPage'

declare const __XR_ENV_BASE__: string | undefined

export default function App() {
  return (
    <Router basename={typeof __XR_ENV_BASE__ !== 'undefined' ? __XR_ENV_BASE__ : undefined}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/classroom" element={<ClassroomPage />} />
      </Routes>
    </Router>
  )
}
