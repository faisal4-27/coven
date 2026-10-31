import { describe, expect, it } from 'vitest';
import { zombieData } from '../data';
import { matchCampus, resolveAll, UOFT_BUILDINGS } from './resolveBuildings';

describe('resolveAll', () => {
  it('places every building on the sample ACORN timetable, offline', () => {
    const codes = ['SS', 'BR', 'RW', 'NF', 'NL', 'BA', 'MS', 'OI', 'MY', 'BF', 'MB'];
    const found = resolveAll(codes, zombieData.buildings);
    expect(codes.filter((c) => !found.has(c))).toEqual([]);
  });

  it('reuses a bundled building instead of a duplicate pin', () => {
    const bahen = zombieData.buildings.find((b) => b.name.startsWith('Bahen'))!;
    expect(resolveAll(['BA'], zombieData.buildings).get('BA')?.id).toBe(bahen.id);
  });

  it('knows no codes twice', () => {
    expect(new Set(UOFT_BUILDINGS.map((b) => b.code)).size).toBe(UOFT_BUILDINGS.length);
  });
});

describe('matchCampus', () => {
  it('finds a building by its code first, then by name', () => {
    expect(matchCampus('NL', [])[0].name).toBe('C. David Naylor Building (NL)');
    expect(matchCampus('ramsay', []).map((b) => b.name)).toContain('Ramsay Wright Laboratories (RW)');
  });
});
