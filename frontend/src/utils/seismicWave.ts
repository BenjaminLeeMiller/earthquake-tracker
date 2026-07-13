import { EARTH_RADIUS_KM } from "./grid";
import { MIN_SPEED, TARGET_DURATION_SECONDS } from "./playbackSpeed";

const P_WAVE_SPEED_KMS = 6;
const MMI_CUTOFF = 1.0;
const R_MIN_KM = 1; // floor to avoid log10(0); log10(1)=0 is a clean anchor
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// The widest time-range window for which computeDefaultPlaybackSpeed still
// clamps to its slowest setting (1 simulated-minute/real-second) — the only
// regime where a 6 km/s P-wave's ~seconds-to-minutes lifetime is slow enough
// relative to the simulated clock to render as a visible, physically real
// animation. Derived (not hardcoded) so it always matches the actual
// mechanical boundary in playbackSpeed.ts, and stays the most generous
// window possible rather than an arbitrary stricter cutoff. Evaluates to
// 30 minutes today.
export const MAX_RELIABLE_WINDOW_MS = MIN_SPEED * TARGET_DURATION_SECONDS * MS_PER_DAY;

/** Modified Mercalli Intensity at a given distance from the epicenter. */
export function mmiAtDistance(magnitude: number, distanceKm: number): number {
  const r = Math.max(R_MIN_KM, distanceKm);
  return magnitude - 2.5 * Math.log10(r) + 1.5;
}

/** Distance (km) at which the wave attenuates below MMI_CUTOFF. */
export function rCutoffKm(magnitude: number): number {
  return Math.pow(10, (magnitude - MMI_CUTOFF + 1.5) / 2.5);
}

export function waveLifetimeSeconds(magnitude: number): number {
  return rCutoffKm(magnitude) / P_WAVE_SPEED_KMS;
}

/** Current wavefront radius in km, or null if not yet born / already dead. */
export function waveRadiusKmAtAge(magnitude: number, ageSeconds: number): number | null {
  if (ageSeconds < 0) return null;
  const lifetime = waveLifetimeSeconds(magnitude);
  if (ageSeconds > lifetime) return null;
  return Math.min(rCutoffKm(magnitude), ageSeconds * P_WAVE_SPEED_KMS);
}

/** 1.0 at birth (R_MIN_KM), 0.0 exactly at the cutoff, by construction. */
export function waveOpacity(magnitude: number, distanceKm: number): number {
  const mmi0 = mmiAtDistance(magnitude, R_MIN_KM);
  const mmi = mmiAtDistance(magnitude, distanceKm);
  return Math.min(1, Math.max(0, (mmi - MMI_CUTOFF) / (mmi0 - MMI_CUTOFF)));
}

export function angularRadius(distanceKm: number): number {
  return distanceKm / EARTH_RADIUS_KM;
}

/**
 * Point at angular radius theta, azimuth phi, around the north pole
 * (0,1,0). Rotate by a quaternion (setFromUnitVectors(UP, dir)) to
 * re-center the small circle anywhere else on the sphere — the same
 * orientation trick VolcanoLayer.tsx uses for its cone markers.
 */
export function smallCircleLocalPoint(theta: number, phi: number): [number, number, number] {
  return [Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi)];
}

/**
 * Non-shared 4-vertex-per-quad index buffer (innerA,outerA,innerB,outerB
 * per segment) so each quad can be independently collapsed for horizon
 * culling without disturbing neighbors — mirrors FaultLines' per-segment
 * endpoint duplication. three.js has no triangle-strip draw mode anymore,
 * so this is an explicit indexed triangle list, same technique as
 * EarthSphere.tsx's buildGlobeGeometry.
 */
export function buildRingIndices(segments: number): Uint16Array {
  const idx = new Uint16Array(segments * 6);
  for (let i = 0; i < segments; i++) {
    const base = i * 4;
    idx.set([base, base + 1, base + 2, base + 1, base + 3, base + 2], i * 6);
  }
  return idx;
}
