import rawDiningData from './data/dining.json';
import { resolveIngredientId } from './ingredients';
import type { DiningDataFile, DiningPlaceEntry } from './types';

let cachedDiningData: DiningDataFile | null = null;

function isValidDiningFile(data: unknown): data is DiningDataFile {
  if (!data || typeof data !== 'object') return false;
  const record = data as Record<string, unknown>;
  if (typeof record.updated !== 'string' || !Array.isArray(record.places)) {
    return false;
  }
  return true;
}

export function loadDiningData(): DiningDataFile {
  if (cachedDiningData) {
    return cachedDiningData;
  }

  if (isValidDiningFile(rawDiningData)) {
    cachedDiningData = rawDiningData;
    return cachedDiningData;
  }

  cachedDiningData = {
    updated: 'unavailable',
    places: [],
  };
  return cachedDiningData;
}

function normalizeTag(tag: string): string {
  const id = resolveIngredientId(tag);
  return id ?? tag.trim().toLowerCase();
}

export function findCampusPlacesForTag(tag: string): DiningPlaceEntry[] {
  const target = normalizeTag(tag);
  if (!target) return [];

  const dataset = loadDiningData();
  if (!dataset.places || dataset.places.length === 0) {
    return [];
  }

  return dataset.places.filter((place) =>
    place.items.some((item) =>
      item.tags.some((itemTag) => normalizeTag(itemTag) === target)
    )
  );
}

export function findWhereToGetMissing(
  missingIngredients: readonly string[]
): string | undefined {
  if (missingIngredients.length === 0) {
    return undefined;
  }

  const dataset = loadDiningData();
  if (!dataset.places || dataset.places.length === 0) {
    return undefined;
  }

  const normalizedMissing = missingIngredients
    .map((m) => normalizeTag(m))
    .filter(Boolean);

  if (normalizedMissing.length === 0) {
    return undefined;
  }

  let bestPlace: DiningPlaceEntry | null = null;
  let bestCount = 0;

  for (const place of dataset.places) {
    const placeTags = new Set<string>();
    for (const item of place.items) {
      for (const t of item.tags) {
        placeTags.add(normalizeTag(t));
      }
    }

    let covered = 0;
    for (const need of normalizedMissing) {
      if (placeTags.has(need)) {
        covered += 1;
      }
    }

    if (covered > bestCount) {
      bestCount = covered;
      bestPlace = place;
    }
  }

  if (!bestPlace || bestCount === 0) {
    return undefined;
  }

  return `${bestPlace.name} (${bestPlace.building}) — unverified placeholder campus listing`;
}

