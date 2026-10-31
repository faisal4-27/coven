// Form to add and remove classes by hand.

import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { PixelButton } from '../../../shared/ui';
import { sortClasses } from '../planner/planDay';
import { actualStart } from '../planner/time';
import type { Building, ClassEvent } from '../planner/types';
import { BuildingPicker } from './BuildingPicker';
import { inputClass, labelText } from './styles';

export interface NewClass {
  title: string;
  building: Building; // the whole building, so searched ones can be added to the data
  start: string;
  end: string;
}

interface Props {
  classes: ClassEvent[];
  buildings: Building[];
  onAdd: (c: NewClass) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function ClassInput({ classes, buildings, onAdd, onRemove, onClear }: Props) {
  const uid = useId(); // unique ids so labels still work if this renders twice
  const [title, setTitle] = useState('');
  const [building, setBuilding] = useState<Building | null>(buildings[0] ?? null);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault(); // stay on the page, this isn't a real form post
    if (!building) return setError('Pick a building first, even zombies need a room.');
    if (!start || !end) return setError('Both times are needed, even for the undead.');
    if (end <= start) return setError('That class ends before it starts. Try a later end time.'); // "HH:MM" strings compare correctly as text
    onAdd({ title: title.trim() || `Class ${classes.length + 1}`, building, start, end }); // default title so nobody has to type
    setTitle('');
    setError('');
  };

  let sorted = classes;
  try { sorted = sortClasses(classes); } catch { /* bad times get reported by the planner, keep typed order here */ }
  const nameOf = (id: string) => buildings.find((b) => b.id === id)?.name ?? id;

  return (
    <section className="flex flex-col gap-4" aria-labelledby={`${uid}-h`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${uid}-h`} className={labelText}>Your classes</h2>
        <PixelButton accent="zombie" variant="ghost" onClick={onClear} disabled={!classes.length}>Clear</PixelButton>
      </div>

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1">
          <span className={labelText}>Title</span>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Class ${classes.length + 1}`} maxLength={40} />
        </label>
        <div className="flex items-end gap-3">
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className={labelText}>Start</span>
            <input className={inputClass} type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className={labelText}>End</span>
            <input className={inputClass} type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
          </label>
        </div>
        <BuildingPicker known={buildings} value={building} onChange={setBuilding} />
        <PixelButton accent="zombie" type="submit" className="self-start">Add class</PixelButton>
      </form>
      <p className="min-h-[1.25em] text-lg text-vampire" role="alert">{error}</p>{/* always rendered so screen readers announce changes */}

      {sorted.length > 0 && (
        <ul className="flex flex-col gap-2">
          {sorted.map((c) => (
            <li key={c.id} className="flex items-center gap-3 text-xl">
              <span className="font-display text-zombie" title={`Listed as ${c.start}, UofT classes start 10 minutes after`}>{actualStart(c.start)}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{c.title}</span>
                <span className="truncate text-lg text-ash">{nameOf(c.buildingId)}</span>
              </span>
              <PixelButton accent="zombie" variant="ghost" className="px-3!" onClick={() => onRemove(c.id)} aria-label={`Remove ${c.title}`}>✕</PixelButton>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
