import { describe, it, expect } from 'vitest';
import { calculateSM2 } from '../hooks/useReviewSession';

describe('SM-2 Spaced Repetition Algorithm', () => {
  it('should reset stats correctly on Again (rating 1)', () => {
    // Starting with a seasoned card (interval: 10 days, easeFactor: 2.5, repetitions: 5)
    const result = calculateSM2(1, 10, 2.5, 5);
    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(1);
    expect(result.easeFactor).toBe(2.3); // 2.5 - 0.2
  });

  it('should cap easeFactor at 1.3', () => {
    // easeFactor starts at 1.4, Again should decrease it by 0.2 but cap it at 1.3
    const result = calculateSM2(1, 1, 1.4, 1);
    expect(result.easeFactor).toBe(1.3);
  });

  describe('Good rating (rating 3)', () => {
    it('should set interval to 1 day for 1st repetition', () => {
      const result = calculateSM2(3, 0, 2.5, 0);
      expect(result.repetitions).toBe(1);
      expect(result.interval).toBe(1);
      expect(result.easeFactor).toBe(2.5);
    });

    it('should set interval to 6 days for 2nd repetition', () => {
      const result = calculateSM2(3, 1, 2.5, 1);
      expect(result.repetitions).toBe(2);
      expect(result.interval).toBe(6);
      expect(result.easeFactor).toBe(2.5);
    });

    it('should multiply interval by easeFactor for 3rd+ repetition', () => {
      const result = calculateSM2(3, 6, 2.5, 2);
      expect(result.repetitions).toBe(3);
      expect(result.interval).toBe(15); // Math.round(6 * 2.5) = 15
      expect(result.easeFactor).toBe(2.5);
    });
  });

  describe('Hard rating (rating 2)', () => {
    it('should set interval to 1 day for 1st repetition', () => {
      const result = calculateSM2(2, 0, 2.5, 0);
      expect(result.repetitions).toBe(1);
      expect(result.interval).toBe(1);
      expect(result.easeFactor).toBe(2.35); // 2.5 - 0.15
    });

    it('should set interval to 3 days for 2nd repetition', () => {
      const result = calculateSM2(2, 1, 2.5, 1);
      expect(result.repetitions).toBe(2);
      expect(result.interval).toBe(3);
      expect(result.easeFactor).toBe(2.35);
    });

    it('should multiply interval by 1.2 for 3rd+ repetition', () => {
      const result = calculateSM2(2, 6, 2.5, 2);
      expect(result.repetitions).toBe(3);
      expect(result.interval).toBe(7); // Math.round(6 * 1.2) = 7
      expect(result.easeFactor).toBe(2.35);
    });
  });

  describe('Easy rating (rating 4)', () => {
    it('should set interval to 3 days for 1st repetition', () => {
      const result = calculateSM2(4, 0, 2.5, 0);
      expect(result.repetitions).toBe(1);
      expect(result.interval).toBe(3);
      expect(result.easeFactor).toBe(2.65); // 2.5 + 0.15
    });

    it('should set interval to 8 days for 2nd repetition', () => {
      const result = calculateSM2(4, 1, 2.5, 1);
      expect(result.repetitions).toBe(2);
      expect(result.interval).toBe(8);
      expect(result.easeFactor).toBe(2.65);
    });

    it('should multiply interval by easeFactor * 1.3 for 3rd+ repetition', () => {
      const result = calculateSM2(4, 6, 2.5, 2);
      expect(result.repetitions).toBe(3);
      expect(result.interval).toBe(20); // Math.round(6 * 2.5 * 1.3) = Math.round(19.5) = 20
      expect(result.easeFactor).toBe(2.65);
    });
  });
});
