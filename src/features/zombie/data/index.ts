// Bundles every data file into one typed ZombieData object. Static imports, so it works fully offline.

import buildingsFile from './buildings.json';
import coffeeShopsFile from './coffeeShops.json';
import indoorLinksFile from './indoorLinks.json';
import transitHopsFile from './transitHops.json';
import distancesFile from './distances.json';
import basemapFile from './basemap.json';
import type { Building, CoffeeShop, DistanceTable, IndoorLink, TransitHop, ZombieData } from '../planner/types';

export interface Basemap {
  attribution: string;
  bbox: { south: number; west: number; north: number; east: number };
  cols: number;
  rows: number;
  grid: string[];
}

export const basemap = basemapFile as Basemap; // pixel street grid from OpenStreetMap

export const zombieData: ZombieData = {
  buildings: (buildingsFile.items as Building[]).map((b) => ({ ...b, source: 'bundled' as const })), // files wrap entries in "items" next to a "_note"
  coffeeShops: coffeeShopsFile.items as CoffeeShop[],
  indoorLinks: indoorLinksFile.items as IndoorLink[], // JSON can't express unions, so cast after import
  transitHops: transitHopsFile.items as TransitHop[],
  distances: distancesFile as DistanceTable,
};

const hasTodo = (x: { todo?: string }) => Boolean(x.todo);
export const hasPlaceholders = [...zombieData.buildings, ...zombieData.coffeeShops, ...zombieData.indoorLinks, ...zombieData.transitHops].some(hasTodo); // lets the UI warn that some data is fake
export const hasShortcuts = zombieData.indoorLinks.length + zombieData.transitHops.length > 0; // false until the team hand-maps indoor links and TTC hops
