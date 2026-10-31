// The one contract the shell uses to plug Zombie mode in. Don't change this shape without asking.

export { ZombieMode } from './ZombieMode';

export const meta = { id: 'zombie', label: 'Zombie', description: 'Minimum walking, maximum caffeine' } as const;
