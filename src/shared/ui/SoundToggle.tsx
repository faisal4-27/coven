import { play } from '../sound'
import { speakerOff, speakerOn } from '../sprites'
import { useCoven } from '../store'
import { PixelButton } from './PixelButton'
import { PixelSprite } from './PixelSprite'

/** Fixed mute button, rendered once in App.tsx so it sits on every page. */
export function SoundToggle() {
  const muted = useCoven((s) => s.muted)
  const setMuted = useCoven((s) => s.setMuted)
  const label = muted ? 'Unmute sound' : 'Mute sound'
  return (
    <div className="fixed right-3 top-[calc(0.75rem+env(safe-area-inset-top,0px))] z-[1100]">
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
    </div>
  )
}
