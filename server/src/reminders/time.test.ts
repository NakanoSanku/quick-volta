import { describe, expect, it } from 'vitest';
import { getLocalDateAndHour } from './time';

describe('getLocalDateAndHour', () => {
  it('formats local date and hour for a timezone', () => {
    expect(getLocalDateAndHour(new Date('2026-06-25T02:30:00.000Z'), 'Asia/Bangkok')).toEqual({ localDate: '2026-06-25', localHour: 9 });
  });
});
