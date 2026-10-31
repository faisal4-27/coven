// Zombie mode screen: classes in, laziest possible day out.

import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { useAudioReady } from '../../shared/sound';
import { accents } from '../../shared/tokens';
import { Card, EmptyState, Loading, PageHeader } from '../../shared/ui';
import { zombieData, hasPlaceholders } from './data';
import { planDay, sortClasses } from './planner/planDay';
import type { Building, ClassEvent, Plan, ZombieData } from './planner/types';
import { ClassInput } from './components/ClassInput';
import type { NewClass } from './components/ClassInput';
import { CampusMap } from './components/CampusMap';
import type { MapPlace, MapSegment } from './components/CampusMap';
import { DayTimeline } from './components/DayTimeline';
import { StatsCard } from './components/StatsCard';
import { MODE_COLOR, MODE_DASHED, MODE_LABEL } from './components/modes';
import { ScheduleUpload } from './components/ScheduleUpload';
import type { DayClass } from './components/ScheduleUpload';
import { DayTabs } from './components/DayTabs';
import { useBlip } from './components/useBlip';
import { DAY_NAMES, todayWeekday, WEEKDAYS } from './schedule/parseSchedule';
import type { Weekday } from './schedule/parseSchedule';

type Week = Partial<Record<Weekday, ClassEvent[]>>;
const startDay = (): Weekday => { const d = todayWeekday(); return d === 'Sat' || d === 'Sun' ? 'Mon' : d; };

type Result =
  | { status: 'empty' | 'one' }
  | { status: 'ok'; sorted: ClassEvent[]; plan: Plan }
  | { status: 'error'; message: string };

const vias = new Map<string, string>([
  ...zombieData.indoorLinks.map((l): [string, string] => [l.id, `link ${l.id}`]),
  ...zombieData.transitHops.map((h): [string, string] => [h.id, `line ${h.line}`]),
]); // short label for whatever shortcut a leg used
const viaLabel = (id?: string) => (id ? vias.get(id) ?? id : '');

export function ZombieMode() {
  const [day, setDay] = useState<Weekday>(startDay);
  const [uploaded, setUploaded] = useState<Week>({}); // from the timetable, replaced whenever the upload changes
  const [manual, setManual] = useState<Week>({}); // added by hand, kept across uploads
  const [searched, setSearched] = useState<Building[]>([]); // buildings found through live search this session
  const nextId = useRef(1);
  const blip = useBlip(useAudioReady()); // follows the app-wide speaker button
  const classes = useMemo(() => [...(uploaded[day] ?? []), ...(manual[day] ?? [])], [uploaded, manual, day]);
  const counts = Object.fromEntries(WEEKDAYS.map((d) => [d, (uploaded[d]?.length ?? 0) + (manual[d]?.length ?? 0)])) as Record<Weekday, number>;
  const planned = useDeferredValue(classes); // lets React show the "planning" state if a re-plan ever gets slow
  const isPlanning = planned !== classes;

  const data: ZombieData = useMemo(() => ({ ...zombieData, buildings: [...zombieData.buildings, ...searched] }), [searched]); // searched buildings get estimated distances on the fly

  const nameOf = useMemo(() => {
    const buildingNames = new Map(data.buildings.map((b) => [b.id, b.name]));
    const shopNames = new Map(data.coffeeShops.map((s) => [s.id, `${s.name}${s.street ? `, ${s.street}` : ''} (near ${buildingNames.get(s.nearestBuildingId) ?? 'campus'})`])); // chains repeat, so say which one
    return (id: string) => buildingNames.get(id) ?? shopNames.get(id) ?? id;
  }, [data]);

  const result: Result = useMemo(() => {
    if (planned.length === 0) return { status: 'empty' };
    if (planned.length === 1) return { status: 'one' }; // one class has no gaps to plan
    try {
      return { status: 'ok', sorted: sortClasses(planned), plan: planDay(planned, data) };
    } catch (e) {
      return { status: 'error', message: e instanceof Error ? e.message : String(e) };
    }
  }, [planned, data]);

  const addClass = ({ building, ...rest }: NewClass) => {
    if (!data.buildings.some((b) => b.id === building.id)) setSearched((s) => [...s, building]); // remember new buildings so the planner knows them
    setManual((w) => ({ ...w, [day]: [...(w[day] ?? []), { ...rest, buildingId: building.id, id: `c${nextId.current++}` }] }));
    blip(660);
  };
  const without = (w: Week, id: string): Week => ({ ...w, [day]: (w[day] ?? []).filter((c) => c.id !== id) });
  const removeClass = (id: string) => { setUploaded((w) => without(w, id)); setManual((w) => without(w, id)); blip(220); };
  const loadSchedule = (list: DayClass[], fresh: boolean) => {
    const unknown = list.map((c) => c.building).filter((b, i, all) => !data.buildings.some((d) => d.id === b.id) && all.findIndex((x) => x.id === b.id) === i);
    if (unknown.length) setSearched((s) => [...s, ...unknown]);
    const week: Week = {};
    for (const { day: d, building, ...rest } of list) (week[d] ??= []).push({ ...rest, buildingId: building.id, id: `u${nextId.current++}` });
    setUploaded(week); // replaces the whole week
    if (fresh) {
      const today = todayWeekday();
      setDay(week[today]?.length ? today : WEEKDAYS.find((d) => week[d]?.length) ?? day); // land on today if it has classes
      blip(880);
    }
  };
  const clear = () => { setUploaded((w) => ({ ...w, [day]: [] })); setManual((w) => ({ ...w, [day]: [] })); blip(180); };
  const pickDay = (d: Weekday) => { setDay(d); blip(520); };

  let ordered = classes;
  try { ordered = sortClasses(classes); } catch { /* bad times show up as a planner error, keep typed order for the map */ }
  const stops = result.status === 'ok' ? result.plan.coffeeStops : [];
  const cafesBefore = (classIndex: number) => stops.filter((s) => s.gapIndex < classIndex).length; // each earlier coffee pushes later stops down by one
  const badges = new Map<string, string[]>();
  ordered.forEach((c, i) => badges.set(c.buildingId, [...(badges.get(c.buildingId) ?? []), String(i + 1 + cafesBefore(i))])); // same building twice shows "1+4"
  const shopBadges = new Map(stops.map((s) => [s.shopId, String(s.gapIndex + 2 + cafesBefore(s.gapIndex))])); // the stop right after class gapIndex
  const chosenShops = new Set(shopBadges.keys());
  const shownBuildings = badges.size ? data.buildings.filter((b) => badges.has(b.id)) : zombieData.buildings; // only today's buildings once there's a schedule, so the map stays readable
  const places: MapPlace[] = [
    ...shownBuildings.map((b) => ({ ...b, kind: 'building' as const, badge: badges.get(b.id)?.join('+'), highlight: badges.has(b.id) })),
    ...data.coffeeShops.map((s) => ({ ...s, name: nameOf(s.id), kind: 'shop' as const, badge: shopBadges.get(s.id), highlight: chosenShops.has(s.id) })),
  ];
  const segments: MapSegment[] = result.status === 'ok' ? result.plan.legs.flatMap((leg, i): MapSegment[] => {
    const stop = result.plan.coffeeStops.find((s) => s.gapIndex === i);
    if (!stop) return [{ fromId: leg.fromId, toId: leg.toId, mode: leg.mode }];
    if (leg.mode === 'walk') return [{ fromId: leg.fromId, toId: stop.shopId, mode: 'walk' }, { fromId: stop.shopId, toId: leg.toId, mode: 'walk' }]; // draw the walk you actually do, through the cafe
    return [{ fromId: leg.fromId, toId: leg.toId, mode: leg.mode }, { fromId: leg.fromId, toId: stop.shopId, mode: 'coffee' }, { fromId: stop.shopId, toId: leg.toId, mode: 'coffee' }]; // rides keep their line, coffee shows as a dashed side trip
  }) : [];

  const saved = result.status === 'ok' ? result.plan.totals.savedMeters : 0;

  return (
    <div className="flex min-h-dvh flex-col" style={{ ['--accent' as string]: accents.zombie.main, ['--accent-dark' as string]: accents.zombie.dark }}>
      <PageHeader monster="zombie" title="Zombie mode" subtitle="Minimum walking, maximum caffeine" />

      <div className="border-b-4 border-edge bg-[#1d2a1a] px-4 py-2 text-center text-xl text-zombie" role="note">
        {hasPlaceholders
          ? 'Some data is still placeholder (TODO_REPLACE_WITH_REAL).'
          : result.status === 'ok'
            ? saved > 0
              ? `Laziest route found. ${saved} m less shuffling than the naive plan.`
              : 'This is already the laziest your day can get.'
            : 'Add your classes and we will find the laziest way between them.'}
      </div>

      <DayTabs day={day} counts={counts} onChange={pickDay} />

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="order-2 flex min-w-0 flex-col gap-6 bg-dusk p-4 sm:p-6 lg:order-1 lg:max-h-[calc(100dvh-190px)] lg:overflow-y-auto">
          <div className="flex flex-col gap-6" aria-live="polite" aria-busy={isPlanning}>
            {isPlanning ? (
              <Loading label="Shambling through the numbers..." />
            ) : result.status === 'empty' ? (
              <EmptyState title={`Nothing on ${DAY_NAMES[day]}`}>
                <p>Upload your timetable or add two or more classes to see the laziest route on campus.</p>
              </EmptyState>
            ) : result.status === 'one' ? (
              <EmptyState title="One class down">
                <p>Add another class on {DAY_NAMES[day]} so there's somewhere to shuffle to.</p>
              </EmptyState>
            ) : result.status === 'error' ? (
              <Card accent="vampire">
                <p className="text-xl">Brains can't plan that: {result.message}. Fix that class and we'll try again.</p>
              </Card>
            ) : result.status === 'ok' && (
              <Card accent="zombie" className="flex flex-col gap-6">
                <StatsCard totals={result.plan.totals} />
                <div className="border-t-4 border-edge pt-4">
                  <DayTimeline classes={result.sorted} plan={result.plan} nameOf={nameOf} viaLabel={viaLabel} />
                </div>
                <Legend />
              </Card>
            )}
          </div>

          <ScheduleUpload buildings={data.buildings} day={day} onLoad={loadSchedule} />
          <ClassInput
            classes={classes}
            buildings={data.buildings}
            onAdd={addClass}
            onRemove={removeClass}
            onClear={clear}
          />
        </aside>

        <section className="relative order-1 h-[55dvh] lg:order-2 lg:h-auto" aria-label={`Campus map with ${places.length} places and ${segments.length} route segments`}>
          <CampusMap places={places} segments={segments} />
        </section>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-lg text-ash">
      <span className="flex items-center gap-2">
        <span className="inline-block h-4 w-6 bg-zombie [box-shadow:0_0_0_2px_#000]" />
        Today's classes
      </span>
      {(['walk', 'indoor', 'subway', 'streetcar', 'coffee'] as const).map((m) => (
        <span key={m} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-8"
            style={{ background: MODE_DASHED[m] ? `repeating-linear-gradient(90deg, ${MODE_COLOR[m]} 0 4px, transparent 4px 10px)` : MODE_COLOR[m] }}
          />
          {MODE_LABEL[m]}
        </span>
      ))}
    </div>
  );
}
