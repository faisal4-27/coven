import { lazy, Suspense, useEffect, useRef } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { RequireAuth } from '../shared/auth'
import { installAudioUnlock, play } from '../shared/sound'
import { useCoven } from '../shared/store'
import { Loading, SoundToggle } from '../shared/ui'
import { Landing } from './routes/Landing'
import { Picker } from './routes/Picker'

// Leaflet is heavy, keep it out of the landing bundle.
const VampirePage = lazy(() => import('../features/vampire/VampirePage').then((m) => ({ default: m.VampirePage })))
const BansheePage = lazy(() => import('../features/banshee/BansheePage'))
const WitchPage = lazy(() => import('../features/witch').then((m) => ({ default: m.WitchPage })))
const ZombieMode = lazy(() => import('../features/zombie').then((m) => ({ default: m.ZombieMode })))

function Home() {
  const { authReady, user } = useCoven()
  if (!authReady) return <Loading />
  return user ? <Picker /> : <Landing />
}

/** Transition sound on pathname changes, skipping the first load. */
function RouteSounds() {
  const { pathname } = useLocation()
  const first = useRef(pathname)
  useEffect(() => {
    if (pathname === first.current) return
    first.current = ''
    play('transition', { volume: 0.4 })
  }, [pathname])
  return null
}

export function App() {
  useEffect(installAudioUnlock, [])
  return (
    <>
    <SoundToggle />
    <RouteSounds />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/vampire" element={<RequireAuth><Suspense fallback={<Loading label="Drawing the curtains…" />}><VampirePage /></Suspense></RequireAuth>} />
      <Route path="/banshee" element={<RequireAuth><Suspense fallback={<Loading label="Reading the moons…" />}><BansheePage /></Suspense></RequireAuth>} />
      <Route path="/hob" element={<RequireAuth><Suspense fallback={<Loading label="Heating the cauldron…" />}><WitchPage /></Suspense></RequireAuth>} />
      <Route path="/zombie" element={<RequireAuth><Suspense fallback={<Loading label="Digging up the map…" />}><ZombieMode /></Suspense></RequireAuth>} />
      <Route path="*" element={<Home />} />
    </Routes>
    </>
  )
}
