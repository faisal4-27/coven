// Monster dialogue for the landing page and the picker.
// Lines stay short (under about 70 characters) so they fit a pixel speech bubble on a phone.
import type { Monster } from './types'

export interface MonsterLines {
  /** Landing page, shown in a speech bubble when the monster on the roof is hovered, focused or tapped. Cycles on repeat. */
  landing: string[]
  /** Picker, shown when the card is hovered or focused. One picked at random each time. */
  pickerHover: string[]
  /** Picker, shown right after the card is chosen, for about 900 ms before navigating. */
  pickerChosen: string[]
  /** Optional time aware lines, mixed into pickerHover when they apply. */
  daytime?: string[]
  nighttime?: string[]
}

export const dialogue: Record<Monster, MonsterLines> = {
  vampire: {
    landing: [
      'Good evening. I have not seen noon since first year.',
      'They built Robarts out of concrete. I built my schedule out of shadows.',
      'King’s College Circle at 1pm? Absolutely not.',
      'I know every shaded path from Bahen to Sid Smith. Ask me.',
      'Sunscreen is a temporary solution. Routing is forever.',
    ],
    pickerHover: [
      'Shall we walk? In the shade, naturally.',
      'Name two buildings. I will find the shadows between them.',
      'The sun is merely a scheduling conflict.',
      'I promise you will arrive unscorched.',
    ],
    pickerChosen: [
      'Excellent choice. Draw the curtains.',
      'Come. The shadows are waiting.',
      'Mind the windows on the way in.',
    ],
    daytime: [
      'The sun is up. Stay close to the buildings.',
      'Midday. My least favourite word.',
    ],
    nighttime: [
      'The sun has set. We may walk wherever we please.',
      'Darkness. Finally, a campus I can enjoy.',
    ],
  },

  banshee: {
    landing: [
      'AAAAAAH! Oh, sorry. Your midterm is in nine days.',
      'I scream early so you can study early.',
      'I read every syllabus. Every single one. Even the footnotes.',
      'Three assignments, one lab report, same week. I SAW IT COMING.',
      'Quercus said nothing. I said everything.',
    ],
    pickerHover: [
      'Hand me your syllabi. I will find the doom.',
      'Something heavy is coming. I can feel it in my wail.',
      'Full moon in two weeks. Not the sky kind.',
      'Let me warn you before it is too late.',
    ],
    pickerChosen: [
      'Brace yourself. I am about to be very loud.',
      'Opening your term. Do not panic. Yet.',
      'Here comes the forecast of doom!',
    ],
    daytime: [
      'Broad daylight and I am already worried about you.',
    ],
    nighttime: [
      'Late night? Perfect. Let us look at your deadlines.',
      'The moon is out. So are your due dates.',
    ],
  },

  hob: {
    landing: [
      'Hmph. Show me your shelf. I have made dinner from less.',
      'Two noodles and an onion? That is a feast, dear.',
      'Do not order delivery again. I am right here.',
      'Forty minutes between classes. Plenty of time to eat properly.',
      'I clean up after you too. You are welcome.',
    ],
    pickerHover: [
      'Hungry? Of course you are. Let me look.',
      'Open the cupboard. No judgement. Some judgement.',
      'I can stretch a single egg across a whole week.',
      'Rice. Always keep rice. Write that down.',
    ],
    pickerChosen: [
      'Right. Into the kitchen with you.',
      'Rolling up my sleeves.',
      'Let us see what we are working with.',
    ],
    daytime: [
      'Lunch between lectures. Do not skip it.',
    ],
    nighttime: [
      'Midnight snack? Something warm, not chips.',
      'Kettle on. You have studied enough.',
    ],
  },

  zombie: {
    landing: [
      'uhhh... been in robarts since midterms...',
      'brains... optional... sleep... mandatory...',
      'which floor is this... does it matter...',
      'too tired... to be scared...',
      'one class today... maybe zero...',
    ],
    pickerHover: [
      'lazy day...? lazy day...',
      'i make day... easier... slowly...',
      'shortest walk... fewest stairs...',
      'nap... scheduled... yes...',
    ],
    pickerChosen: [
      'okay... shuffling there now...',
      'mmm... good choice... going slow...',
      'wake me... when it loads...',
    ],
    daytime: [
      'sun... too bright... robarts better...',
    ],
    nighttime: [
      'night... still awake... why...',
      'everyone sleeping... except me...',
    ],
  },
}

/** Lines that play when the landing page first appears, one monster at a time, before anything is hovered. */
export const landingIntro: { monster: Monster; text: string }[] = [
  { monster: 'vampire', text: 'Welcome to Coven. Please stay out of the sun.' },
  { monster: 'banshee', text: 'AND OUT OF CRUNCH WEEK!' },
  { monster: 'hob', text: 'And eat something, for goodness’ sake.' },
  { monster: 'zombie', text: 'or... just... pick one...' },
]

/** Next line in order, so repeat hovers on the landing page never show the same line twice in a row. */
export function nextLine(lines: string[], counter: number): string {
  return lines[counter % lines.length]
}

/** Random line, mixing in time aware lines when they apply. */
export function hoverLine(monster: Monster, isDaytime: boolean): string {
  const d = dialogue[monster]
  const pool = [...d.pickerHover, ...((isDaytime ? d.daytime : d.nighttime) ?? [])]
  return pool[Math.floor(Math.random() * pool.length)]
}

export function chosenLine(monster: Monster): string {
  const lines = dialogue[monster].pickerChosen
  return lines[Math.floor(Math.random() * lines.length)]
}

/**
 * Stable id for a spoken line, used as its voice file name in public/voice. Editing a line changes its id,
 * so a stale recording is never played for new text; the line just falls back to typing blips.
 */
export function lineId(monster: Monster, text: string): string {
  let h = 5381
  for (const ch of text) h = ((h * 33) ^ ch.codePointAt(0)!) >>> 0
  return `${monster}-${h.toString(36)}`
}

/** Every line, most-heard first. scripts/make-voices.py voices them in this order. */
export function allLines(): { monster: Monster; text: string; id: string }[] {
  const out: { monster: Monster; text: string }[] = [...landingIntro]
  const monsters = Object.keys(dialogue) as Monster[]
  for (const key of ['pickerChosen', 'pickerHover', 'landing', 'daytime', 'nighttime'] as const)
    for (const monster of monsters) for (const text of dialogue[monster][key] ?? []) out.push({ monster, text })
  return out.map((l) => ({ ...l, id: lineId(l.monster, l.text) }))
}
