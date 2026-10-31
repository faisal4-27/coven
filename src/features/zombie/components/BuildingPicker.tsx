// Building dropdown: bundled buildings plus any added from an uploaded timetable.

import { useId } from 'react';
import type { Building } from '../planner/types';
import { inputClass, labelText } from './styles';

interface Props {
  known: Building[];
  value: Building | null;
  onChange: (b: Building) => void;
}

export function BuildingPicker({ known, value, onChange }: Props) {
  const uid = useId();
  const sorted = [...known].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <label htmlFor={`${uid}-b`} className="flex flex-col gap-1">
      <span className={labelText}>Building</span>
      <select
        id={`${uid}-b`}
        className={`${inputClass} cursor-pointer`}
        value={value?.id ?? ''}
        onChange={(e) => { const b = known.find((k) => k.id === e.target.value); if (b) onChange(b); }}
      >
        {!value && <option value="" disabled>Pick a building</option>}
        {sorted.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
    </label>
  );
}
