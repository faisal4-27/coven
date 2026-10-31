// Auth for the shell. Clerk when VITE_CLERK_PUBLISHABLE_KEY is set, otherwise a local demo mode
// so the hackathon demo never breaks on missing keys or bad Wi-Fi.
import { ClerkProvider, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useCoven } from './store'
import { colors } from './tokens'
import type { CovenUser } from './types'
import { PixelButton } from './ui/PixelButton'
import { PixelSprite } from './ui/PixelSprite'
import { Loading } from './ui/States'
import { monsterSprites } from './sprites'
import { clerkEnabled, clerkKey } from './env'

const GUEST_KEY = 'coven.guest'

const appearance = {
  cssLayerName: 'clerk',
  variables: {
    colorPrimary: '#d7263d',
    colorPrimaryForeground: colors.night,
    colorBackground: colors.panel,
    colorForeground: colors.bone,
    colorMutedForeground: colors.ash,
    colorMuted: colors.panelHi,
    colorInput: colors.dusk,
    colorInputForeground: colors.bone,
    colorBorder: colors.edge,
    colorNeutral: colors.bone,
    colorModalBackdrop: 'rgba(5, 4, 9, 0.8)',
    colorShadow: '#000',
    fontFamily: "'VT323', 'Courier New', monospace",
    fontFamilyButtons: "'Pixelify Sans', 'Courier New', monospace",
    fontSize: '18px',
    borderRadius: '0px',
  },
  elements: {
    cardBox: {
      boxShadow: `0 0 0 4px ${colors.edge}, 10px 10px 0 0 #000`,
    },
    formButtonPrimary: {
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      boxShadow: 'inset -4px -4px 0 0 #7a0f1f',
    },
    headerTitle: { fontFamily: "'Pixelify Sans', monospace", letterSpacing: '0.05em' },
  },
} as const

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!clerkKey) return <GuestSync>{children}</GuestSync>
  return (
    <ClerkProvider publishableKey={clerkKey} appearance={appearance} afterSignOutUrl="/">
      <ClerkSync />
      {children}
    </ClerkProvider>
  )
}

function ClerkSync() {
  const { isLoaded, user } = useUser()
  const setAuth = useCoven((s) => s.setAuth)
  useEffect(() => {
    if (!isLoaded) return
    setAuth(
      user
        ? {
            id: user.id,
            firstName: user.firstName ?? user.username ?? 'Creature',
            imageUrl: user.imageUrl,
            guest: false,
          }
        : null,
    )
  }, [isLoaded, user, setAuth])
  return null
}

function readGuest(): CovenUser | null {
  try {
    const raw = localStorage.getItem(GUEST_KEY)
    return raw ? (JSON.parse(raw) as CovenUser) : null
  } catch {
    return null
  }
}

function writeGuest(user: CovenUser | null) {
  try {
    if (user) localStorage.setItem(GUEST_KEY, JSON.stringify(user))
    else localStorage.removeItem(GUEST_KEY)
  } catch {
    // Storage blocked, the session still works in memory.
  }
}

function GuestSync({ children }: { children: ReactNode }) {
  const setAuth = useCoven((s) => s.setAuth)
  useEffect(() => setAuth(readGuest()), [setAuth])
  return children
}

/** Sign up and sign in calls to action for the landing page. */
export function AuthButtons() {
  const [dialog, setDialog] = useState<'up' | 'in' | null>(null)

  if (clerkEnabled) {
    return (
      <div className="flex flex-col gap-5 sm:flex-row">
        <SignUpButton mode="modal">
          <PixelButton size="lg">Sign up</PixelButton>
        </SignUpButton>
        <SignInButton mode="modal">
          <PixelButton size="lg" variant="ghost">
            Sign in
          </PixelButton>
        </SignInButton>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-5 sm:flex-row">
        <PixelButton size="lg" onClick={() => setDialog('up')}>
          Sign up
        </PixelButton>
        <PixelButton size="lg" variant="ghost" onClick={() => setDialog('in')}>
          Sign in
        </PixelButton>
      </div>
      {dialog && <GuestDialog mode={dialog} onClose={() => setDialog(null)} />}
    </>
  )
}

function GuestDialog({ mode, onClose }: { mode: 'up' | 'in'; onClose: () => void }) {
  const setAuth = useCoven((s) => s.setAuth)
  const [name, setName] = useState(() => readGuest()?.firstName ?? '')
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const user: CovenUser = { id: 'guest', firstName: name.trim() || 'Creature', guest: true }
    writeGuest(user)
    setAuth(user)
    onClose()
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(92vw,26rem)] bg-panel p-0 text-bone backdrop:bg-[rgba(5,4,9,0.8)]"
      style={{ boxShadow: `0 0 0 4px ${colors.edge}, 10px 10px 0 0 #000` }}
    >
      <form onSubmit={submit} className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-3">
          <PixelSprite sprite={monsterSprites.vampire} scale={2} />
          <div>
            <h2 className="font-display text-2xl">{mode === 'up' ? 'Join the coven' : 'Welcome back'}</h2>
            <p className="text-ash">Demo mode, nothing leaves this browser.</p>
          </div>
        </div>
        <label className="flex flex-col gap-1 text-lg">
          What should we call you?
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Vlad"
            maxLength={24}
            className="bg-dusk px-3 py-2 text-xl text-bone outline-none [box-shadow:inset_0_0_0_4px_var(--color-edge)] focus:[box-shadow:inset_0_0_0_4px_var(--color-vampire)]"
          />
        </label>
        <div className="flex justify-end gap-4 pt-2">
          <PixelButton variant="ghost" onClick={onClose}>
            Cancel
          </PixelButton>
          <PixelButton type="submit">{mode === 'up' ? 'Sign up' : 'Sign in'}</PixelButton>
        </div>
      </form>
    </dialog>
  )
}

/** Avatar menu for headers. */
export function AccountButton() {
  const user = useCoven((s) => s.user)
  const setAuth = useCoven((s) => s.setAuth)
  if (!user) return null
  if (!user.guest) return <UserButton appearance={appearance} />
  return (
    <PixelButton
      variant="ghost"
      onClick={() => {
        writeGuest(null)
        setAuth(null)
      }}
      title={`Signed in as ${user.firstName} (demo)`}
    >
      Sign out
    </PixelButton>
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { authReady, user } = useCoven()
  if (!authReady) return <Loading label="Checking the guest list…" />
  if (!user) return <Navigate to="/" replace />
  return children
}
