import { describe, expect, it } from 'vitest';
import { buildParticipantRunPayload, validateParticipantIdentity } from './participantRuns';

describe('validateParticipantIdentity', () => {
  it('normalizes whitespace and validates required lengths', () => {
    const result = validateParticipantIdentity({
      participantName: '  Jane   Doe ',
      venueName: '  Main   Hall  '
    });

    expect(result.isValid).toBe(true);
    expect(result.values).toEqual({
      participantName: 'Jane Doe',
      venueName: 'Main Hall'
    });
    expect(result.errors).toEqual({});
  });

  it('returns field errors for short values', () => {
    const result = validateParticipantIdentity({
      participantName: 'A',
      venueName: ''
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.participantName).toContain('at least');
    expect(result.errors.venueName).toContain('at least');
  });
});

describe('buildParticipantRunPayload', () => {
  it('builds payload without completed field', () => {
    const payload = buildParticipantRunPayload({
      participantName: '  Jane Doe  ',
      venueName: '  Main Hall ',
      startedOn: '2026-02-20T10:00:00.000Z',
      completedOn: '2026-02-20T10:05:00.000Z'
    });

    expect(payload).toEqual({
      participant_name: 'Jane Doe',
      venue_name: 'Main Hall',
      started_on: '2026-02-20T10:00:00.000Z',
      completed_on: '2026-02-20T10:05:00.000Z'
    });
    expect('completed' in payload).toBe(false);
  });

  it('throws when completed_on is before started_on', () => {
    expect(() =>
      buildParticipantRunPayload({
        participantName: 'Jane Doe',
        venueName: 'Main Hall',
        startedOn: '2026-02-20T10:05:00.000Z',
        completedOn: '2026-02-20T10:00:00.000Z'
      })
    ).toThrow('completed_on');
  });
});
