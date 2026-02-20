export const LEVELS = [
  {
    level: 1,
    rows: 3,
    cols: 3,
    snapRadius: 25,
    snapStyle: 'high-glow'
  },
  {
    level: 2,
    rows: 4,
    cols: 4,
    snapRadius: 20,
    snapStyle: 'standard-glow'
  },
  {
    level: 3,
    rows: 5,
    cols: 5,
    snapRadius: 18,
    snapStyle: 'pulse'
  }
];

export function getLevelConfig(levelNumber) {
  const match = LEVELS.find((level) => level.level === levelNumber);
  return match || LEVELS[0];
}
