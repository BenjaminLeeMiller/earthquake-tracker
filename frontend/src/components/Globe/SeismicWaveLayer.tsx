import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Float32BufferAttribute,
  MeshBasicMaterial,
  Quaternion,
  Uint16BufferAttribute,
  Vector3,
} from "three";
import { useAppStore } from "../../store/useAppStore";
import { latLonToXYZ } from "../../utils/grid";
import { horizonThreshold, isFacingCamera } from "../../utils/horizon";
import { magColor } from "../../utils/magnitude";
import {
  MAX_RELIABLE_WINDOW_MS,
  angularRadius,
  buildRingIndices,
  mmiAtDistance,
  smallCircleLocalPoint,
  waveOpacity,
  waveRadiusKmAtAge,
} from "../../utils/seismicWave";

const SURFACE_RADIUS = 1.002;
const MAX_WAVES = 32;
const SEGMENTS = 64;
const MIN_BAND_HALF_WIDTH = 0.008; // rad, ~51km — keeps the ring visible even at birth
const BAND_WIDTH_FRACTION = 0.05; // of current theta, for large waves

const UP = new Vector3(0, 1, 0);
const cameraDir = new Vector3();
const scratchDir = new Vector3();
const scratchLocal = new Vector3();
const scratchWorld = new Vector3();

interface QuakeDatum {
  magnitude: number;
  timeMs: number;
  quaternion: Quaternion;
}

// Identical for every slot, so one index buffer is built once and shared —
// three.js supports reusing a BufferAttribute across multiple geometries.
const SHARED_INDEX_ATTR = new Uint16BufferAttribute(buildRingIndices(SEGMENTS), 1);

interface WaveSlot {
  geometry: BufferGeometry;
  material: MeshBasicMaterial;
}

function buildWaveSlots(): WaveSlot[] {
  const slots: WaveSlot[] = [];
  for (let i = 0; i < MAX_WAVES; i++) {
    const geometry = new BufferGeometry();
    const positions = new Float32BufferAttribute(new Float32Array(SEGMENTS * 4 * 3), 3);
    positions.setUsage(DynamicDrawUsage);
    geometry.setAttribute("position", positions);
    geometry.setIndex(SHARED_INDEX_ATTR);
    geometry.setDrawRange(0, 0);
    const material = new MeshBasicMaterial({ transparent: true, side: DoubleSide });
    slots.push({ geometry, material });
  }
  return slots;
}

/**
 * Renders each active earthquake's P-wave as an expanding ring on the
 * globe's surface, using real wave-speed/attenuation physics (see
 * utils/seismicWave.ts). Only meaningful — and only shown — when the
 * selected replay window is narrow enough that the app's own default
 * playback speed is clamped to its slowest setting (MAX_RELIABLE_WINDOW_MS),
 * the only regime where the simulated clock moves slowly enough relative to
 * a ~6 km/s wave for the animation to read as physically real.
 *
 * Fixed pool of MAX_WAVES pre-allocated meshes (not mount/unmount per wave)
 * to avoid GPU buffer churn during a dense swarm — each frame recomputes
 * which quakes are currently active and assigns the largest MAX_WAVES of
 * them to slots, since rings aren't interactive and have no per-slot
 * continuity requirement.
 */
export function SeismicWaveLayer() {
  const translucentGlobe = useAppStore((s) => s.translucentGlobe);
  const timeRange = useAppStore((s) => s.timeRange);
  const magRange = useAppStore((s) => s.magRange);
  const playbackActive = useAppStore((s) => s.isPlaying || s.playbackTime !== null);
  // The shared dataset — fetched once by EarthquakeDataLoader, not per-layer.
  const quakes = useAppStore((s) => s.earthquakes);

  const filtered = useMemo(() => {
    const [minMag, maxMag] = magRange;
    return quakes.filter((eq) => {
      if (eq.magnitude === null) return false;
      if (timeRange) {
        if (!eq.occurred_at) return false;
        const t = new Date(eq.occurred_at).getTime();
        if (t < timeRange[0] || t > timeRange[1]) return false;
      }
      return eq.magnitude >= minMag && eq.magnitude <= maxMag;
    });
  }, [quakes, timeRange, magRange]);

  const quakeData = useMemo<QuakeDatum[]>(
    () =>
      filtered.map((eq) => {
        const lat = eq.latitude ?? 0;
        const lon = eq.longitude ?? 0;
        const dir = latLonToXYZ(lat, lon, 1);
        scratchDir.set(dir[0], dir[1], dir[2]);
        return {
          magnitude: eq.magnitude as number,
          timeMs: eq.occurred_at ? new Date(eq.occurred_at).getTime() : Infinity,
          quaternion: new Quaternion().setFromUnitVectors(UP, scratchDir.clone()),
        };
      }),
    [filtered]
  );

  const slots = useMemo(buildWaveSlots, []);

  const gated =
    timeRange !== null && timeRange[1] - timeRange[0] <= MAX_RELIABLE_WINDOW_MS && playbackActive;

  useFrame(({ camera }) => {
    if (!gated || !timeRange) {
      for (const slot of slots) slot.geometry.setDrawRange(0, 0);
      return;
    }

    const { playbackTime } = useAppStore.getState();
    const current = playbackTime ?? timeRange[0];

    let threshold = 0;
    if (!translucentGlobe) {
      const cameraDistance = camera.position.length();
      cameraDir.copy(camera.position).divideScalar(cameraDistance);
      threshold = horizonThreshold(cameraDistance);
    }

    const active: { quake: QuakeDatum; radiusKm: number }[] = [];
    for (const quake of quakeData) {
      const ageSeconds = (current - quake.timeMs) / 1000;
      const radiusKm = waveRadiusKmAtAge(quake.magnitude, ageSeconds);
      if (radiusKm !== null) active.push({ quake, radiusKm });
    }
    active.sort((a, b) => b.quake.magnitude - a.quake.magnitude);
    const shown = active.slice(0, MAX_WAVES);

    for (let s = 0; s < slots.length; s++) {
      if (s >= shown.length) {
        slots[s].geometry.setDrawRange(0, 0);
        continue;
      }
      const { quake, radiusKm } = shown[s];
      const slot = slots[s];

      const theta = angularRadius(radiusKm);
      const halfWidth = Math.max(MIN_BAND_HALF_WIDTH, theta * BAND_WIDTH_FRACTION);
      const innerTheta = Math.max(0, theta - halfWidth);
      const outerTheta = theta + halfWidth;

      const position = slot.geometry.attributes.position;
      for (let i = 0; i < SEGMENTS; i++) {
        const phiA = (i / SEGMENTS) * Math.PI * 2;
        const phiB = ((i + 1) / SEGMENTS) * Math.PI * 2;
        const base = i * 4;

        const corners: [number, number][] = [
          [innerTheta, phiA],
          [outerTheta, phiA],
          [innerTheta, phiB],
          [outerTheta, phiB],
        ];

        let collapse = false;
        if (!translucentGlobe) {
          const midLocal = smallCircleLocalPoint(theta, (phiA + phiB) / 2);
          scratchLocal.set(midLocal[0], midLocal[1], midLocal[2]);
          scratchWorld.copy(scratchLocal).applyQuaternion(quake.quaternion);
          if (
            !isFacingCamera([scratchWorld.x, scratchWorld.y, scratchWorld.z], cameraDir, threshold)
          ) {
            collapse = true;
          }
        }

        for (let c = 0; c < 4; c++) {
          if (collapse) {
            position.setXYZ(base + c, 0, 0, 0);
            continue;
          }
          const [cTheta, cPhi] = corners[c];
          const local = smallCircleLocalPoint(cTheta, cPhi);
          scratchLocal.set(local[0], local[1], local[2]).multiplyScalar(SURFACE_RADIUS);
          scratchWorld.copy(scratchLocal).applyQuaternion(quake.quaternion);
          position.setXYZ(base + c, scratchWorld.x, scratchWorld.y, scratchWorld.z);
        }
      }
      position.needsUpdate = true;
      slot.geometry.setDrawRange(0, SEGMENTS * 6);

      const mmi = mmiAtDistance(quake.magnitude, radiusKm);
      slot.material.color.set(magColor(mmi));
      slot.material.opacity = waveOpacity(quake.magnitude, radiusKm);
    }
  });

  return (
    <>
      {slots.map((slot, i) => (
        <mesh
          key={i}
          geometry={slot.geometry}
          material={slot.material}
          renderOrder={1}
          frustumCulled={false}
        />
      ))}
    </>
  );
}
