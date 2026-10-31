import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { RequireAuth } from '../shared/auth'
import { useCoven } from '../shared/store'
import { Loading } from '../shared/ui'
import { ComingSoon } from './routes/ComingSoon'
import { Landing } from './routes/Landing'
import { Picker } from './routes/Picker'

// Leaflet is heavy, keep it out of the landing bundle.
const VampirePage = lazy(() => import('../features/vampire/VampirePage').then((m) => ({ default: m.VampirePage })))
const WitchPage = lazy(() => import('../witch').then((m) => ({ default: m.WitchPage })))

function Home() {
  const { authReady, user } = useCoven()
  if (!authReady) return <Loading />
  return user ? <Picker /> : <Landing />
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/vampire" element={<RequireAuth><Suspense fallback={<Loading label="Drawing the curtains…" />}><VampirePage /></Suspense></RequireAuth>} />
      <Route path="/banshee" element={<RequireAuth><ComingSoon monster="banshee" /></RequireAuth>} />
      <Route path="/hob" element={<RequireAuth><Suspense fallback={<Loading label="Heating the cauldron…" />}><WitchPage /></Suspense></RequireAuth>} />
      <Route path="/zombie" element={<RequireAuth><ComingSoon monster="zombie" /></RequireAuth>} />
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
