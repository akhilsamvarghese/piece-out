import { describe, expect, it } from 'vitest';
import {
  areAllPiecesSnapped,
  getSnapDistance,
  isWithinSnapRadius
} from './PuzzleEngine';
import { LEVELS, getLevelConfig } from './levels';

describe('Puzzle snap logic helpers', () => {
  it('uses strict snap threshold comparison', () => {
    const piece = {
      x: 114,
      y: 86,
      targetX: 100,
      targetY: 80
    };

    expect(getSnapDistance(piece)).toBeCloseTo(Math.hypot(14, 6));
    expect(isWithinSnapRadius(piece, 16)).toBe(true);
    expect(isWithinSnapRadius(piece, Math.hypot(14, 6))).toBe(false);
  });

  it('detects completion only when all pieces are snapped', () => {
    expect(
      areAllPiecesSnapped([
        { isSnapped: true },
        { isSnapped: true },
        { isSnapped: false }
      ])
    ).toBe(false);

    expect(
      areAllPiecesSnapped([
        { isSnapped: true },
        { isSnapped: true },
        { isSnapped: true }
      ])
    ).toBe(true);
  });
});

describe('Level configuration mapping', () => {
  it('returns 3 playable levels and maps by level number', () => {
    expect(LEVELS).toHaveLength(3);

    expect(getLevelConfig(1)).toMatchObject({ rows: 3, cols: 3, snapRadius: 25, snapStyle: 'high-glow' });
    expect(getLevelConfig(2)).toMatchObject({ rows: 4, cols: 4, snapRadius: 20, snapStyle: 'standard-glow' });
    expect(getLevelConfig(3)).toMatchObject({ rows: 5, cols: 5, snapRadius: 18, snapStyle: 'pulse' });
  });

  it('falls back to level 1 when unknown', () => {
    expect(getLevelConfig(99).level).toBe(1);
  });
});
