export type LevelId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface LevelDefinition {
  id: LevelId;
  title: {
    en: string;
    he: string;
  };
  minXP: number;
  color: string;
}

export const LEVELS: readonly LevelDefinition[] = [
  { id: 1,  title: { en: 'Fresh Blood',  he: 'Fresh Blood' }, minXP: 0,      color: '#afafaf' },
  { id: 2,  title: { en: 'Spot Chaser',  he: 'Spot Chaser' }, minXP: 200,    color: '#6BBFBA' },
  { id: 3,  title: { en: 'Park Rat',     he: 'Park Rat' },    minXP: 500,    color: '#48B34B' },
  { id: 4,  title: { en: 'Shredder',     he: 'Shredder' },    minXP: 1000,   color: '#93c5fd' },
  { id: 5,  title: { en: 'Flow State',   he: 'Flow State' },  minXP: 2500,   color: '#DBDB3D' },
  { id: 6,  title: { en: 'Ripper',       he: 'Ripper' },      minXP: 5000,   color: '#f39d39' },
  { id: 7,  title: { en: 'Street King',  he: 'Street King' }, minXP: 10000,  color: '#d44eb3' },
  { id: 8,  title: { en: 'Pro',          he: 'Pro' },         minXP: 20000,  color: '#c5b6fd' },
  { id: 9,  title: { en: 'Legend',       he: 'Legend' },      minXP: 40000,  color: '#f3394c' },
  { id: 10, title: { en: 'ENBOSS',       he: 'ENBOSS' },      minXP: 75000,  color: '#9DFF00' },
] as const;

export function getLevelFromXP(xp: number): LevelDefinition {
  if (!Number.isFinite(xp) || xp < 0) {
    xp = 0;
  }

  let currentLevel = LEVELS[0];

  for (const level of LEVELS) {
    if (xp >= level.minXP && level.minXP >= currentLevel.minXP) {
      currentLevel = level;
    }
  }

  return currentLevel;
}

export function getNextLevel(xp: number): LevelDefinition | null {
  const currentLevel = getLevelFromXP(xp);
  const currentIndex = LEVELS.findIndex((level) => level.id === currentLevel.id);

  if (currentIndex === -1 || currentIndex === LEVELS.length - 1) {
    return null;
  }

  return LEVELS[currentIndex + 1];
}

