import type { ButtonHTMLAttributes, CSSProperties } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { play } from '../sound'
import { accents } from '../tokens'
import type { Monster } from '../types'

type Variant = 'solid' | 'ghost'

interface Style {
  accent?: Monster
  variant?: Variant
  size?: 'md' | 'lg'
  /** Skip the click sound, for buttons that play their own. */
  silent?: boolean
}

const click = () => play('click', { volume: 0.3 })

function pixelButtonProps({ accent = 'vampire', variant = 'solid', size = 'md' }: Style, className = '') {
  const style = {
    '--btn': accents[accent].main,
    '--btn-dark': accents[accent].dark,
  } as CSSProperties
  const base =
    'group relative inline-flex select-none items-center justify-center gap-2 font-display uppercase tracking-wider ' +
    'transition-transform duration-75 active:translate-x-1 active:translate-y-1 ' +
    'focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-bone disabled:opacity-50 disabled:pointer-events-none cursor-pointer'
  const sizes = size === 'lg' ? 'px-7 py-3 text-xl' : 'px-5 py-2 text-base'
  const look =
    variant === 'solid'
      ? 'bg-[var(--btn)] text-night [box-shadow:inset_-4px_-4px_0_0_var(--btn-dark),0_-4px_0_0_#000,0_4px_0_0_#000,-4px_0_0_0_#000,4px_0_0_0_#000,8px_8px_0_0_#000] hover:brightness-110 active:[box-shadow:inset_-4px_-4px_0_0_var(--btn-dark),0_-4px_0_0_#000,0_4px_0_0_#000,-4px_0_0_0_#000,4px_0_0_0_#000]'
      : 'bg-panel text-bone [box-shadow:inset_0_0_0_4px_var(--btn),8px_8px_0_0_#000] hover:bg-panel-hi active:[box-shadow:inset_0_0_0_4px_var(--btn)]'
  return { style, className: `${base} ${sizes} ${look} ${className}` }
}

type ButtonProps = Style & ButtonHTMLAttributes<HTMLButtonElement>

export function PixelButton({ accent, variant, size, silent, className, type = 'button', onClick, ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      {...pixelButtonProps({ accent, variant, size }, className)}
      {...rest}
      onClick={(e) => {
        if (!silent) click()
        onClick?.(e)
      }}
    />
  )
}

export function PixelLink({ accent, variant, size, silent, className, onClick, ...rest }: Style & LinkProps) {
  return (
    <Link
      {...pixelButtonProps({ accent, variant, size }, className)}
      {...rest}
      onClick={(e) => {
        if (!silent) click()
        onClick?.(e)
      }}
    />
  )
}
