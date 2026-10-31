// The whole lazy-day planner: pure functions, no React, same input always gives the same Plan.

import { CLASS_START_DELAY_MIN, toMinutes } from './time';
import { makeWalker } from './walking';
import type { ClassEvent, CoffeeStop, IndoorLink, Leg, LegMode, Plan, Walker, ZombieData } from './types';

export const DRINK_BUFFER_MIN = 5; // time to actually order and drink the coffee
const MODE_ORDER: Record<LegMode, number> = { indoor: 0, walk: 1, streetcar: 2, subway: 3 }; // tie-breaker so equal options always pick the same one

export function sortClasses(classes: ClassEvent[]): ClassEvent[] {
  return [...classes].sort((a, b) => toMinutes(a.start) - toMinutes(b.start) || a.id.localeCompare(b.id)); // id breaks ties so order is stable
}

// Throws a readable error for anything that would make the plan meaningless.
function validate(sorted: ClassEvent[], data: ZombieData): void {
  const ids = new Set(data.buildings.map((b) => b.id));
  sorted.forEach((c, i) => {
    if (!ids.has(c.buildingId)) throw new Error(`"${c.title}" is in a building we don't know`);
    if (toMinutes(c.end) <= toMinutes(c.start)) throw new Error(`"${c.title}" ends before it starts`);
    const prev = sorted[i - 1];
    if (prev && toMinutes(c.start) < toMinutes(prev.end)) throw new Error(`"${prev.title}" and "${c.title}" overlap`); // can't be in two places at once
  });
}

// An indoor link counts only if it's open for the whole time you're inside it.
const linkIsOpen = (link: IndoorLink, departMin: number, travelMin: number) =>
  toMinutes(link.openFrom) <= departMin && departMin + travelMin <= toMinutes(link.openTo);

const connects = (item: { fromId: string; toId: string }, a: string, b: string) =>
  (item.fromId === a && item.toId === b) || (item.fromId === b && item.toId === a); // links and hops work both ways

// Picks the leg with the least walking that still fits the gap.
export function chooseLeg(fromId: string, toId: string, departMin: number, gapMin: number, data: ZombieData, walk: Walker): Leg {
  const direct = walk(fromId, toId);
  const options: Leg[] = [{ fromId, toId, mode: 'walk', meters: direct.meters, minutes: direct.minutes }]; // walking is always an option

  for (const link of data.indoorLinks) {
    if (connects(link, fromId, toId) && linkIsOpen(link, departMin, link.minutes)) {
      options.push({ fromId, toId, mode: 'indoor', meters: link.meters, minutes: link.minutes, viaId: link.id });
    }
  }
  for (const hop of data.transitHops) {
    if (connects(hop, fromId, toId)) {
      options.push({ fromId, toId, mode: hop.mode, meters: hop.walkMeters, minutes: hop.minutes, viaId: hop.id }); // only the walk to and from stops counts
    }
  }

  const fitting = options.filter((o) => o.minutes <= gapMin);
  if (fitting.length) {
    fitting.sort((a, b) => a.meters - b.meters || a.minutes - b.minutes || MODE_ORDER[a.mode] - MODE_ORDER[b.mode]);
    return { ...fitting[0], fitsGap: true };
  }
  options.sort((a, b) => a.minutes - b.minutes || a.meters - b.meters); // nothing fits, so take the fastest one and arrive as little late as possible
  return { ...options[0], fitsGap: false };
}

// Picks the coffee shop that adds the least walking and still leaves time to drink.
export function chooseCoffee(fromId: string, toId: string, gapIndex: number, gapMin: number, data: ZombieData, walk: Walker): CoffeeStop | null {
  const direct = walk(fromId, toId);
  let best: CoffeeStop | null = null;
  for (const shop of data.coffeeShops) {
    const toShop = walk(fromId, shop.id);
    const fromShop = walk(shop.id, toId);
    if (toShop.minutes + DRINK_BUFFER_MIN + fromShop.minutes > gapMin) continue; // won't make the next class in time
    const extraMeters = toShop.meters + fromShop.meters - direct.meters;
    if (!best || extraMeters < best.extraMeters || (extraMeters === best.extraMeters && shop.id < best.shopId)) {
      best = { gapIndex, shopId: shop.id, extraMeters }; // id tie-break keeps the result deterministic
    }
  }
  return best;
}

// The naive student's coffee: whatever shop is the shortest walk from where they are.
function nearestShopId(fromId: string, data: ZombieData, walk: Walker): string | null {
  let best: { id: string; m: number } | null = null;
  for (const shop of data.coffeeShops) {
    const m = walk(fromId, shop.id).meters;
    if (!best || m < best.m || (m === best.m && shop.id < best.id)) best = { id: shop.id, m };
  }
  return best?.id ?? null;
}

export function planDay(classes: ClassEvent[], data: ZombieData): Plan {
  const sorted = sortClasses(classes);
  validate(sorted, data);
  const walk = makeWalker(data);
  const legs: Leg[] = [];
  const coffeeStops: CoffeeStop[] = [];
  let plannedMeters = 0;
  let naiveMeters = 0;

  const gaps: { fromId: string; toId: string; gapMin: number }[] = [];
  for (let i = 0; i < sorted.length - 1; i++) { // n classes have n - 1 gaps
    const a = sorted[i];
    const b = sorted[i + 1];
    const departMin = toMinutes(a.end);
    const gapMin = toMinutes(b.start) + CLASS_START_DELAY_MIN - departMin; // back-to-back classes still leave 10 minutes to get there
    gaps.push({ fromId: a.buildingId, toId: b.buildingId, gapMin });

    const leg = chooseLeg(a.buildingId, b.buildingId, departMin, gapMin, data, walk);
    legs.push(leg);
    plannedMeters += leg.meters;
    naiveMeters += walk(a.buildingId, b.buildingId).meters; // naive always walks straight there
  }

  // Coffee is essential: exactly one stop, in whichever gap it costs the least extra walking.
  const pickCheapest = (fits: boolean) => {
    let best: CoffeeStop | null = null;
    gaps.forEach((g, i) => {
      const stop = chooseCoffee(g.fromId, g.toId, i, fits ? g.gapMin : Infinity, data, walk);
      if (stop && (!best || stop.extraMeters < best.extraMeters)) best = { ...stop, fitsGap: fits }; // strict < keeps the earlier gap on ties
    });
    return best as CoffeeStop | null;
  };
  const stop = pickCheapest(true) ?? pickCheapest(false); // no gap has time, so take the smallest detour and flag it as tight
  if (stop) {
    const g = gaps[stop.gapIndex];
    coffeeStops.push(stop);
    plannedMeters += stop.extraMeters; // the detour on top of the leg
    const naiveShop = nearestShopId(g.fromId, data, walk);
    if (naiveShop) naiveMeters += walk(g.fromId, naiveShop).meters + walk(naiveShop, g.toId).meters - walk(g.fromId, g.toId).meters; // naive gets coffee in the same gap, just from the closest shop
  }

  return { legs, coffeeStops, totals: { plannedMeters, naiveMeters, savedMeters: naiveMeters - plannedMeters } };
}
