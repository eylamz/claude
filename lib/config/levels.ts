export type LevelId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface LevelDefinition {
  id: LevelId;
  title: {
    en: string;
    he: string;
  };
  minXP: number;
  color: string;
  /** Darker variant for borders / emphasis */
  colorDark: string;
  /** Text color in light theme */
  textColorLight: string;
  /** Text color in dark theme */
  textColorDark: string;
}

export const LEVELS: readonly LevelDefinition[] = [
  { id: 1,  title: { en: 'Fresh Blood',  he: 'Fresh Blood' }, minXP: 0,      color: '#afafaf', colorDark: '#6b7280', textColorLight: '#374151', textColorDark: '#e5e7eb' },
  { id: 2,  title: { en: 'Spot Chaser',  he: 'Spot Chaser' }, minXP: 200,    color: '#6BBFBA', colorDark: '#0d9488', textColorLight: '#0f766e', textColorDark: '#5eead4' },
  { id: 3,  title: { en: 'Park Rat',     he: 'Park Rat' },    minXP: 500,    color: '#48B34B', colorDark: '#15803d', textColorLight: '#166534', textColorDark: '#86efac' },
  { id: 4,  title: { en: 'Shredder',     he: 'Shredder' },    minXP: 1000,   color: '#93c5fd', colorDark: '#3b82f6', textColorLight: '#1e40af', textColorDark: '#93c5fd' },
  { id: 5,  title: { en: 'Flow State',   he: 'Flow State' },  minXP: 2500,   color: '#DBDB3D', colorDark: '#ca8a04', textColorLight: '#854d0e', textColorDark: '#fde047' },
  { id: 6,  title: { en: 'Ripper',       he: 'Ripper' },      minXP: 5000,   color: '#f39d39', colorDark: '#ea580c', textColorLight: '#c2410c', textColorDark: '#fdba74' },
  { id: 7,  title: { en: 'Street King',  he: 'Street King' }, minXP: 10000,  color: '#d44eb3', colorDark: '#be185d', textColorLight: '#9d174d', textColorDark: '#f9a8d4' },
  { id: 8,  title: { en: 'Pro',          he: 'Pro' },         minXP: 20000,  color: '#c5b6fd', colorDark: '#7c3aed', textColorLight: '#5b21b6', textColorDark: '#c4b5fd' },
  { id: 9,  title: { en: 'Legend',       he: 'Legend' },      minXP: 40000,  color: '#f3394c', colorDark: '#dc2626', textColorLight: '#b91c1c', textColorDark: '#fca5a5' },
  { id: 10, title: { en: 'ENBOSS',       he: 'ENBOSS' },      minXP: 75000,  color: '#9DFF00', colorDark: '#65a30d', textColorLight: '#3f6212', textColorDark: '#bef264' },
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

