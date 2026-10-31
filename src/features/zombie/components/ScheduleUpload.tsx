// Upload a timetable PDF, review the selected day's classes. Every fix re-plans the week straight away.

import { useId, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { Building } from '../planner/types';
import { DAY_NAMES, parseSchedule } from '../schedule/parseSchedule';
import type { ParsedClass, Weekday } from '../schedule/parseSchedule';
import { campusBuilding, resolveAll, UOFT_BUILDINGS, UOFT_CODES } from '../schedule/resolveBuildings';
import type { NewClass } from './ClassInput';
import { inputClass, labelText } from './styles';

export type DayClass = NewClass & { day: Weekday };

interface Props {
  buildings: Building[];
  day: Weekday;
  onLoad: (classes: DayClass[], fresh: boolean) => void; // fresh is true for a newly uploaded file
}

const CAMPUS = UOFT_BUILDINGS.map(campusBuilding);

type Status = { kind: 'idle' } | { kind: 'busy'; label: string } | { kind: 'error'; message: string } | { kind: 'ready'; file: string; fromImage: boolean };

const timeOk = (c: ParsedClass) => Boolean(c.start && c.end && c.end > c.start); // "HH:MM" strings compare correctly as text

export function ScheduleUpload({ buildings, day, onLoad }: Props) {
  const uid = useId();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [parsed, setParsed] = useState<ParsedClass[]>([]);
  const [byCode, setByCode] = useState<Map<string, Building>>(new Map());
  const [picked, setPicked] = useState<Record<string, string>>({}); // class id -> building id, for rows we couldn't place

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // so picking the same file again still fires
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    let usedOcr = isImage;
    try {
      const ocr = async (image: Blob) => {
        const { readImageSchedule } = await import('../schedule/readImage'); // OCR is big, only load it when someone needs it
        return readImageSchedule(image, (label) => setStatus({ kind: 'busy', label: `Squinting at your ${isImage ? 'screenshot' : 'PDF'}. ${label}` }));
      };
      let classes: ParsedClass[];
      if (isImage) {
        setStatus({ kind: 'busy', label: 'Squinting at your screenshot...' });
        classes = await ocr(file);
      } else {
        setStatus({ kind: 'busy', label: 'Reading your timetable...' });
        const { readPdfText, renderPdfPages } = await import('../schedule/readPdf'); // pdf.js is big, only load it when someone uploads
        classes = parseSchedule(await readPdfText(file));
        if (!classes.length) {
          // No usable text layer, so it's a scan or a screenshot saved as a PDF. Read the pages as images.
          usedOcr = true;
          setStatus({ kind: 'busy', label: 'No text in that PDF, squinting at it instead...' });
          classes = [];
          for (const page of await renderPdfPages(file)) classes.push(...(await ocr(page)));
          classes = classes.map((c, i) => ({ ...c, id: `img-${i + 1}` }));
        }
      }
      if (!classes.length) {
        setStatus({
          kind: 'error',
          message: isImage
            ? "Couldn't read any classes from that image. Try a sharper, straight-on screenshot, or ACORN's print-to-PDF."
            : "Couldn't find any class times in that PDF, even reading it as an image. Try ACORN's print-to-PDF, or add classes by hand below.",
        });
        return;
      }
      const codes = classes.flatMap((c) => (c.buildingCode ? [c.buildingCode] : []));
      const resolved = resolveAll(codes, buildings);
      setByCode(resolved);
      setParsed(classes);
      setPicked({});
      setStatus({ kind: 'ready', file: file.name, fromImage: usedOcr });
      publish(classes, {}, resolved, true);
    } catch (err) {
      setStatus({ kind: 'error', message: `That ${isImage ? 'image' : 'PDF'} wouldn't open (${err instanceof Error ? err.message : String(err)}).` });
    }
  };

  const inUseFor = (codes: Map<string, Building>) => [...new Map([...codes.values(), ...buildings].map((b) => [b.id, b])).values()];
  const inUse = inUseFor(byCode);
  const campus = CAMPUS.filter((b) => !inUse.some((k) => k.id === b.id));
  const buildingIn = (c: ParsedClass, pk: Record<string, string>, codes: Map<string, Building>) =>
    pk[c.id] ? [...inUseFor(codes), ...CAMPUS].find((b) => b.id === pk[c.id]) : c.buildingCode ? codes.get(c.buildingCode) : undefined;
  const buildingFor = (c: ParsedClass) => buildingIn(c, picked, byCode);
  const today = parsed.filter((c) => c.day === day);
  const missing = today.filter((c) => !buildingFor(c));
  const badTime = today.some((c) => !timeOk(c));

  // Classes still missing a building or a valid time are left out until they're fixed.
  function publish(ps: ParsedClass[], pk: Record<string, string>, codes: Map<string, Building>, fresh = false) {
    onLoad(ps.flatMap((c): DayClass[] => {
      const building = buildingIn(c, pk, codes);
      if (!building || !timeOk(c)) return [];
      return [{ day: c.day, title: c.room ? `${c.title} (${c.room})` : c.title, building, start: c.start, end: c.end }];
    }), fresh);
  }

  const edit = (id: string, patch: Partial<ParsedClass>) => {
    const next = parsed.map((c) => (c.id === id ? { ...c, ...patch } : c));
    setParsed(next);
    publish(next, picked, byCode);
  };
  const pick = (id: string, buildingId: string) => {
    const next = { ...picked, [id]: buildingId };
    setPicked(next);
    publish(parsed, next, byCode);
  };

  return (
    <section className="flex flex-col gap-4" aria-labelledby={`${uid}-h`}>
      <h2 id={`${uid}-h`} className={labelText}>Upload your timetable</h2>
      <label className="flex cursor-pointer flex-col gap-2 bg-panel p-4 text-center text-xl [box-shadow:inset_0_0_0_4px_var(--color-edge)] hover:bg-panel-hi focus-within:[box-shadow:inset_0_0_0_4px_var(--color-zombie)]">
        <span>{status.kind === 'ready' ? status.file : 'Choose a schedule PDF or image'}</span>
        <span className="text-lg text-ash">ACORN timetable as a PDF, screenshot or photo. Read in your browser, never uploaded.</span>
        <input type="file" accept="application/pdf,.pdf,image/*" className="sr-only" onChange={onFile} disabled={status.kind === 'busy'} />
      </label>

      <p className="min-h-[1.25em] text-lg" role="status">
        {status.kind === 'busy' && <span className="text-ash">{status.label}</span>}
        {status.kind === 'error' && <span className="text-vampire">{status.message}</span>}
        {status.kind === 'ready' && (
          <span className="text-ash">
            Found {parsed.length} meetings a week. Pick a day at the top to see its plan.{status.fromImage && ' Read from an image, so double-check times and rooms against ACORN.'}
          </span>
        )}
      </p>

      {status.kind === 'ready' && (
        <>
          {today.length === 0 ? (
            <p className="text-xl text-ash">Nothing on {DAY_NAMES[day]}. A rest day, the undead approve.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {today.map((c) => {
                const b = buildingFor(c);
                return (
                  <li key={c.id} className="flex flex-col gap-1 text-xl">
                    <span>{c.title}</span>
                    <span className="flex items-center gap-2">
                      <input type="time" className={`${inputClass} w-auto! py-1!`} value={c.start} onChange={(e) => edit(c.id, { start: e.target.value })} aria-label={`${c.title} start`} />
                      <span className="text-ash">to</span>
                      <input type="time" className={`${inputClass} w-auto! py-1!`} value={c.end} onChange={(e) => edit(c.id, { end: e.target.value })} aria-label={`${c.title} end`} />
                    </span>
                    {b && !picked[c.id] ? (
                      <span className="text-lg text-ash">{c.room ?? c.buildingCode} · {b.name}</span>
                    ) : (
                      <label className="flex flex-col gap-1">
                        <span className="text-lg text-hob">
                          {c.buildingCode
                            ? `Couldn't place "${c.room}"${UOFT_CODES[c.buildingCode] ? '' : ' (unknown code)'}`
                            : c.room
                              ? `Couldn't read the building in "${c.room}"`
                              : "Couldn't read the room"}
                          , pick the building:
                        </span>
                        <select className={inputClass} value={picked[c.id] ?? ''} onChange={(e) => pick(c.id, e.target.value)}>
                          <option value="" disabled>Pick a building</option>
                          <optgroup label="Your buildings">
                            {inUse.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                          </optgroup>
                          <optgroup label="All St. George buildings">
                            {campus.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                          </optgroup>
                        </select>
                      </label>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {missing.length > 0 && <p className="text-lg text-hob">Pick a building for every class so it joins the plan.</p>}
          {badTime && <p className="text-lg text-hob">One of these classes ends before it starts, it's left out until the time is fixed.</p>}
        </>
      )}
    </section>
  );
}
