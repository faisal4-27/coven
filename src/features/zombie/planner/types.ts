// Shared contracts for Zombie mode, types only, nothing runs here.

export type LegMode = 'walk' | 'subway' | 'streetcar' | 'indoor';

export interface Building {
  id: string; // OSM-based id for real places, e.g. "osm-w12345"
  name: string;
  lat: number;
  lng: number;
  source?: 'bundled' | 'search'; // "search" means it came from live search this session
  todo?: string; // present while an entry is still a placeholder
}

export interface ClassEvent {
  id: string;
  title: string;
  buildingId: string; // must match a Building.id
  start: string; // "HH:MM", 24h so "13:00" not "1:00"
  end: string;
}

export interface CoffeeShop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  nearestBuildingId: string; // shown as "near X" in the UI
  street?: string; // tells apart chains with several shops, e.g. "Second Cup, Huron Street"
  todo?: string;
}

export interface IndoorLink {
  id: string;
  fromId: string; // links work both ways
  toId: string;
  meters: number; // metres walked inside
  minutes: number;
  openFrom: string; // "HH:MM" doors open
  openTo: string; // "HH:MM" doors lock
  todo?: string;
}

export interface TransitHop {
  id: string;
  fromId: string;
  toId: string;
  mode: 'subway' | 'streetcar';
  line: string; // route number, shown in the timeline
  minutes: number; // door to door, including the wait
  walkMeters: number; // walking to and from the stops, since that still counts
  todo?: string;
}

export interface DistanceEntry {
  meters: number;
  minutes: number;
  source: 'ors' | 'osrm' | 'estimate'; // "estimate" means straight line x 1.3, not a real route
}

export interface DistanceTable {
  generatedAt: string;
  source: 'ors' | 'osrm' | 'estimate' | 'mixed';
  pairs: Record<string, DistanceEntry>; // key is the two ids sorted and joined with "|"
}

export interface ZombieData {
  buildings: Building[];
  coffeeShops: CoffeeShop[];
  indoorLinks: IndoorLink[];
  transitHops: TransitHop[];
  distances: DistanceTable;
}

export interface Leg {
  fromId: string;
  toId: string;
  mode: LegMode;
  meters: number; // metres on foot (indoor counts, riding doesn't)
  minutes: number; // total travel time for the leg
  viaId?: string; // IndoorLink.id or TransitHop.id when the leg uses one
  fitsGap?: boolean; // false when even the fastest option is longer than the gap
}

export interface CoffeeStop {
  gapIndex: number; // 0 is the gap after the first class
  shopId: string;
  extraMeters: number; // walk(A to shop) + walk(shop to B) - walk(A to B)
  fitsGap?: boolean; // false when no gap had time, so this stop makes you late
}

export interface PlanTotals {
  plannedMeters: number;
  naiveMeters: number;
  savedMeters: number;
}

export interface Plan {
  legs: Leg[];
  coffeeStops: CoffeeStop[];
  totals: PlanTotals;
}

export type Walker = (aId: string, bId: string) => DistanceEntry;
