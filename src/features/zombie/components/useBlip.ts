// Tiny square-wave beep via Web Audio, silent unless the user turned sound on.

import { useCallback, useRef } from 'react';

export function useBlip(enabled: boolean): (freq?: number) => void {
  const ctxRef = useRef<AudioContext | null>(null);
  return useCallback(
    (freq = 440) => {
      if (!enabled || typeof window === 'undefined' || !window.AudioContext) return; // off by default, and some browsers have no audio
      const ctx = (ctxRef.current ??= new AudioContext()); // create lazily so nothing plays before a click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square'; // square wave sounds like an old console
      osc.frequency.value = freq;
      gain.gain.value = 0.05; // quiet, a projector room doesn't need a jump scare
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08); // 80 ms is a blip, not a beep
    },
    [enabled],
  );
}
