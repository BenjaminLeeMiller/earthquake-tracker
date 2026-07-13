export const MIN_SPEED = 1 / 1440; // 1 minute of simulated time per second
export const MAX_SPEED = 14;

const TARGET_DURATION_SECONDS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Default replay speed for a given time range: the closest achievable
 * speed (clamped to MIN_SPEED/MAX_SPEED) that sweeps the whole range in
 * about TARGET_DURATION_SECONDS.
 */
export function computeDefaultPlaybackSpeed(startMs: number, endMs: number): number {
  const durationDays = (endMs - startMs) / MS_PER_DAY;
  const idealSpeed = durationDays / TARGET_DURATION_SECONDS;
  return Math.min(Math.max(idealSpeed, MIN_SPEED), MAX_SPEED);
}
