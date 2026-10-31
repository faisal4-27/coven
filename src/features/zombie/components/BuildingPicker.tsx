// Building field: instant matches from bundled buildings, plus live OpenStreetMap search on Enter or the Search button.

import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { PixelButton } from '../../../shared/ui';
import type { Building } from '../planner/types';
import { matchCampus } from '../schedule/resolveBuildings';
import { matchKnown, searchBuildings } from '../search/searchBuildings';
import type { Bounds } from '../search/searchBuildings';
import { inputClass, labelText } from './styles';

interface Props {
  known: Building[];
  bounds: Bounds;
  value: Building | null;
  onChange: (b: Building) => void;
}

type Status = 'idle' | 'searching' | 'done' | 'error';

export function BuildingPicker({ known, bounds, value, onChange }: Props) {
  const uid = useId();
  const [query, setQuery] = useState('');
  const [online, setOnline] = useState<Building[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null); // lets a new search cancel the old one

  const runSearch = async () => {
    if (query.trim().length < 2) { setStatus('error'); setError('Type at least two letters first.'); return; }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus('searching');
    try {
      const found = await searchBuildings(query, bounds, ctrl.signal);
      setOnline(found);
      setStatus('done');
    } catch (e) {
      if (ctrl.signal.aborted) return; // a newer search took over, ignore this one
      setStatus('error');
      setError(e instanceof TypeError ? "Can't reach the map search (offline?). The bundled buildings still work." : (e as Error).message); // fetch throws TypeError when there's no network
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); void runSearch(); } // Enter searches instead of submitting the whole class form
  };

  const local = query.trim() ? [...matchKnown(query, known), ...matchCampus(query, known)] : known; // empty box shows every bundled building as a quick pick
  const seen = new Set<string>();
  const options = [...local, ...online].filter((b) => !seen.has(b.id) && seen.add(b.id)); // bundled, then campus list, then the map search

  const statusText =
    status === 'searching' ? 'Digging through the map...'
      : status === 'error' ? error
        : status === 'done' && online.length === 0 ? "Nothing by that name on St. George. Try a shorter name, like 'Bahen'."
          : '';

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${uid}-q`} className={labelText}>Building</label>
      <div className="flex items-center gap-3">
        <input
          id={`${uid}-q`}
          className={inputClass}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setStatus('idle'); }}
          onKeyDown={onKeyDown}
          placeholder="Name or code, e.g. Bahen or BA"
          aria-describedby={`${uid}-s`}
          autoComplete="off"
        />
        <PixelButton accent="zombie" variant="ghost" onClick={() => void runSearch()} disabled={status === 'searching'}>
          Search
        </PixelButton>
      </div>
      <p id={`${uid}-s`} className="min-h-[1.25em] text-lg text-hob" role="status">{statusText}</p>
      {options.length > 0 && (
        <ul className="flex max-h-[7.5em] flex-wrap gap-2 overflow-y-auto p-1" aria-label="Matching buildings">
          {options.map((b) => {
            const picked = value?.id === b.id;
            return (
              <li key={b.id}>
                <button
                  type="button"
                  className={`cursor-pointer px-2 text-lg ${picked ? 'bg-zombie text-night' : 'bg-dusk text-bone hover:bg-panel-hi'}`}
                  style={{ boxShadow: `inset 0 0 0 2px ${picked ? 'var(--color-zombie-dark)' : 'var(--color-edge)'}` }}
                  aria-pressed={picked}
                  onClick={() => onChange(b)}
                >
                  {b.name}{b.source === 'search' ? ' (map search)' : ''}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-lg text-ash">Picked: <span className="text-bone">{value?.name ?? 'nothing yet'}</span></p>
    </div>
  );
}
