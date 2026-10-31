import { play, useAudioUnlocked } from '../sound'
import { speakerOff, speakerOn } from '../sprites'
import { useCoven } from '../store'
import { PixelButton } from './PixelButton'
import { PixelSprite } from './PixelSprite'

const hint =
  'pointer-events-none bg-panel px-2 py-1 font-display text-xs uppercase tracking-widest text-bone [box-shadow:0_0_0_3px_var(--color-edge),4px_4px_0_0_#000]'

/** Fixed mute button, rendered once in App.tsx so it sits on every page. */
export function SoundToggle() {
  const muted = useCoven((s) => s.muted)
  const setMuted = useCoven((s) => s.setMuted)
  const unlocked = useAudioUnlocked()
  const label = muted ? 'Unmute sound' : 'Mute sound'
  return (
    <div className="fixed right-3 top-[calc(0.75rem+env(safe-area-inset-top,0px))] z-[1100] flex flex-col items-end gap-3">
      {/* Browsers allow no sound until the first click or key press, so say so instead of seeming broken. */}
      {!unlocked && !muted && (
        <span aria-hidden className={`${hint} order-last hidden sm:block`}>
          Click anywhere for sound
        </span>
      )}
    <PixelButton
      silent
      variant="ghost"
      aria-label={label}
      title={label}
      aria-pressed={muted}
      className="px-2! py-2!"
      onClick={() => {
        setMuted(!muted)
        // Confirms the sound is back. A no-op when muting, since play() checks the new state.
        play('click', { volume: 0.3 })
      }}
    >
      <PixelSprite sprite={muted ? speakerOff : speakerOn} scale={2} />
    </PixelButton>
    {/* On phones the header is crowded (Sign out sits under the corner), so the hint goes to the bottom. */}
    {!unlocked && !muted && (
      <span
        aria-hidden
        className={`${hint} fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 whitespace-nowrap sm:hidden`}
      >
        Tap anywhere for sound
      </span>
    )}
    </div>
  )
}
