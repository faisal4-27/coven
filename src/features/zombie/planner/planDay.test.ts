import { describe, it, expect } from 'vitest';
import { planDay, chooseCoffee, chooseLeg } from './planDay';
import { makeWalker, pairKey } from './walking';
import { zombieData } from '../data';
import type { ClassEvent, DistanceEntry, IndoorLink, TransitHop, ZombieData } from './types';

interface FixtureOpts {
  shops?: string[];
  links?: IndoorLink[];
  hops?: TransitHop[];
  pairs?: Record<string, Omit<DistanceEntry, 'source'>>;
}

// Small hand-made world so every number in the tests is obvious.
function fixture({ shops = [], links = [], hops = [], pairs = {} }: FixtureOpts = {}): ZombieData {
  const table: Record<string, DistanceEntry> = {};
  for (const [k, v] of Object.entries(pairs)) {
    const [a, b] = k.split('-');
    table[pairKey(a, b)] = { ...v, source: 'estimate' }; // tests write "A-S1", the table wants sorted "A|S1"
  }
  return {
    buildings: [
      { id: 'A', name: 'A', lat: 0, lng: 0 },
      { id: 'B', name: 'B', lat: 0, lng: 0.01 },
      { id: 'C', name: 'C', lat: 0, lng: 0.02 },
    ],
    coffeeShops: shops.map((id) => ({ id, name: id, lat: 0, lng: 0.005, nearestBuildingId: 'A' })),
    indoorLinks: links,
    transitHops: hops,
    distances: { generatedAt: 'test', source: 'estimate', pairs: table },
  };
}

const twoClasses = (endA = '10:00', startB = '11:00'): ClassEvent[] => [
  { id: 'c1', title: 'First', buildingId: 'A', start: '09:00', end: endA },
  { id: 'c2', title: 'Second', buildingId: 'B', start: startB, end: '12:00' },
];

describe('coffee', () => {
  it('picks the shop with the lowest detour', () => {
    const data = fixture({
      shops: ['S1', 'S2'],
      pairs: {
        'A-B': { meters: 400, minutes: 5 },
        'A-S1': { meters: 300, minutes: 4 }, 'S1-B': { meters: 300, minutes: 4 }, // extra 200
        'A-S2': { meters: 210, minutes: 3 }, 'S2-B': { meters: 200, minutes: 3 }, // extra 10
      },
    });
    expect(chooseCoffee('A', 'B', 0, 60, data, makeWalker(data))).toEqual({ gapIndex: 0, shopId: 'S2', extraMeters: 10 });
  });

  it('skips a shop that does not fit the gap', () => {
    const data = fixture({
      shops: ['S1', 'S2'],
      pairs: {
        'A-B': { meters: 400, minutes: 5 },
        'A-S1': { meters: 300, minutes: 4 }, 'S1-B': { meters: 300, minutes: 4 }, // 4 + 5 + 4 = 13 min, fits
        'A-S2': { meters: 210, minutes: 15 }, 'S2-B': { meters: 200, minutes: 15 }, // 15 + 5 + 15 = 35 min, too slow for 30
      },
    });
    expect(chooseCoffee('A', 'B', 0, 30, data, makeWalker(data))?.shopId).toBe('S1');
  });

  it('returns no stop when nothing fits', () => {
    const data = fixture({ shops: ['S1'], pairs: { 'A-B': { meters: 400, minutes: 5 }, 'A-S1': { meters: 100, minutes: 10 }, 'S1-B': { meters: 100, minutes: 10 } } });
    expect(chooseCoffee('A', 'B', 0, 20, data, makeWalker(data))).toBeNull(); // 10 + 5 + 10 = 25 > 20
  });
});

describe('legs', () => {
  const link: IndoorLink = { id: 'L1', fromId: 'A', toId: 'B', meters: 100, minutes: 4, openFrom: '08:00', openTo: '09:30' };
  const pairs = { 'A-B': { meters: 400, minutes: 5 } };

  it('ignores an indoor link outside its open hours', () => {
    const data = fixture({ links: [link], pairs });
    expect(chooseLeg('A', 'B', 10 * 60, 60, data, makeWalker(data)).mode).toBe('walk'); // leaving at 10:00, link locked at 09:30
  });

  it('uses the indoor link while it is open', () => {
    const data = fixture({ links: [link], pairs });
    expect(chooseLeg('A', 'B', 9 * 60, 60, data, makeWalker(data))).toMatchObject({ mode: 'indoor', meters: 100, viaId: 'L1' }); // leaving at 09:00, done by 09:04
  });

  it('takes transit when it means less walking and still fits', () => {
    const hop: TransitHop = { id: 'T1', fromId: 'B', toId: 'A', mode: 'subway', line: 'x', minutes: 12, walkMeters: 150 };
    const data = fixture({ hops: [hop], pairs });
    expect(chooseLeg('A', 'B', 600, 15, data, makeWalker(data)).mode).toBe('subway'); // works in the reverse direction too
    expect(chooseLeg('A', 'B', 600, 10, data, makeWalker(data)).mode).toBe('walk'); // 12 min ride doesn't fit a 10 min gap
  });
});

describe('planDay', () => {
  it('savedMeters equals naive minus planned', () => {
    const data = fixture({
      shops: ['S1', 'S2'],
      links: [{ id: 'L1', fromId: 'A', toId: 'B', meters: 100, minutes: 4, openFrom: '08:00', openTo: '18:00' }],
      pairs: {
        'A-B': { meters: 400, minutes: 5 },
        'A-S1': { meters: 50, minutes: 1 }, 'S1-B': { meters: 600, minutes: 8 }, // nearest to A, but a big detour
        'A-S2': { meters: 210, minutes: 3 }, 'S2-B': { meters: 200, minutes: 3 },
      },
    });
    const { totals } = planDay(twoClasses(), data);
    expect(totals.plannedMeters).toBe(100 + 10); // indoor leg plus the S2 detour
    expect(totals.naiveMeters).toBe(50 + 600); // straight walk plus the nearest shop's detour
    expect(totals.savedMeters).toBe(totals.naiveMeters - totals.plannedMeters);
  });

  it('puts the one coffee stop in the gap where it is least out of the way', () => {
    const data = fixture({
      shops: ['S1'],
      pairs: {
        'A-B': { meters: 400, minutes: 5 }, 'B-C': { meters: 400, minutes: 5 },
        'A-S1': { meters: 240, minutes: 3 }, 'S1-B': { meters: 200, minutes: 3 }, // A to B via S1 adds 40
        'S1-C': { meters: 210, minutes: 3 }, // B to C via S1 adds 10
      },
    });
    const day: ClassEvent[] = [...twoClasses(), { id: 'c3', title: 'Third', buildingId: 'C', start: '13:00', end: '14:00' }];
    expect(planDay(day, data).coffeeStops).toEqual([{ gapIndex: 1, shopId: 'S1', extraMeters: 10, fitsGap: true }]);
  });

  it('still gets coffee when no gap has time, flagged as tight', () => {
    const data = fixture({ shops: ['S1'], pairs: { 'A-B': { meters: 400, minutes: 5 }, 'A-S1': { meters: 300, minutes: 10 }, 'S1-B': { meters: 300, minutes: 10 } } });
    expect(planDay(twoClasses('10:00', '10:00'), data).coffeeStops).toEqual([{ gapIndex: 0, shopId: 'S1', extraMeters: 200, fitsGap: false }]); // 10 + 5 + 10 > 10 min grace
  });

  it('is deterministic and does not mutate input', () => {
    const data = fixture({ pairs: { 'A-B': { meters: 400, minutes: 5 } } });
    const classes = twoClasses().reverse(); // out of order on purpose
    const copy = structuredClone(classes);
    expect(planDay(classes, data)).toEqual(planDay(classes, data));
    expect(classes).toEqual(copy);
  });

  it('rejects overlapping classes', () => {
    const data = fixture({ pairs: { 'A-B': { meters: 400, minutes: 5 } } });
    expect(() => planDay(twoClasses('11:30', '11:00'), data)).toThrow(/overlap/);
  });

  it('gives back-to-back classes the 10 minutes UofT classes start late', () => {
    const data = fixture({ pairs: { 'A-B': { meters: 640, minutes: 8 } } });
    const [leg] = planDay(twoClasses('10:00', '10:00'), data).legs; // 10:00 end, next listed at 10:00 but starts 10:10
    expect(leg.fitsGap).toBe(true);
  });

  it('flags a walk longer than the 10 minute grace', () => {
    const data = fixture({ pairs: { 'A-B': { meters: 960, minutes: 12 } } });
    expect(planDay(twoClasses('10:00', '10:00'), data).legs[0].fitsGap).toBe(false);
  });

  it('plans a day across the bundled buildings', () => {
    const [a, b, c] = zombieData.buildings;
    const day: ClassEvent[] = [
      { id: 'd1', title: 'Lecture', buildingId: a.id, start: '09:00', end: '10:00' },
      { id: 'd2', title: 'Tutorial', buildingId: b.id, start: '10:00', end: '11:00' },
      { id: 'd3', title: 'Lab', buildingId: c.id, start: '11:30', end: '13:00' },
    ];
    const plan = planDay(day, zombieData);
    expect(plan.legs).toHaveLength(2); // 3 classes, 2 gaps
    expect(plan.totals.savedMeters).toBe(plan.totals.naiveMeters - plan.totals.plannedMeters);
  });
});
