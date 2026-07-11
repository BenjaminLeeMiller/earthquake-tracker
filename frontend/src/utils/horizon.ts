import type { Vector3 } from "three";

/**
 * For a camera at distance d from a unit sphere (radius 1 — the globe's own
 * surface radius), the true horizon sits at angle arccos(1/d) from the
 * camera-facing direction (standard tangent-line geometry), i.e. a point is
 * within the visible cap only when dot(dir, cameraDir) >= 1/d. A flat 0
 * threshold treats the full geometric hemisphere as visible, which is only
 * correct for a camera infinitely far away — points would stay visible well
 * after actually crossing the visual horizon.
 */
export function horizonThreshold(cameraDistance: number): number {
  return 1 / cameraDistance;
}

export function isFacingCamera(
  dir: readonly [number, number, number],
  cameraDir: Vector3,
  threshold: number
): boolean {
  return dir[0] * cameraDir.x + dir[1] * cameraDir.y + dir[2] * cameraDir.z >= threshold;
}
