import { useEffect, useMemo, useRef } from "react";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { Color, InstancedMesh, Object3D, ShaderMaterial, Vector3 } from "three";
import { useAppStore } from "../../store/useAppStore";
import type { EarthquakeOut } from "../../api/earthquakes";
import { latLonToXYZ, latLonDepthToXYZ } from "../../utils/grid";
import { horizonThreshold, isFacingCamera } from "../../utils/horizon";
import {
  magRadius,
  magBucketIndex,
  MAG_BUCKET_COUNT,
  MAG_BUCKET_COLORS,
  MAG_BUCKET_FADE_DURATIONS_MS,
  MIN_MAG,
} from "../../utils/magnitude";

const SURFACE_RADIUS = 1.002;
// Camera distance at which a marker renders at its natural magRadius()
// size — matches GlobeCanvas's initial camera position, so the default
// view is unchanged. Each instance's scale is its own distance from the
// camera relative to this reference, which keeps their on-screen size
// constant while zooming instead of shrinking/growing with perspective
// like a fixed-world-size object normally would (mirrors VolcanoLayer).
const REFERENCE_DISTANCE = 2.8;
const dummy = new Object3D();
const cameraDir = new Vector3();
const scratchPos = new Vector3();

// Time-lapse replay: reaching the end of the selected time range holds the
// fully-revealed state for a few seconds (so it registers) before looping
// back to the start and continuing to play.
const LOOP_PAUSE_SECONDS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const VERTEX_SHADER = `
  attribute float occurredAt;
  varying float vAge;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  uniform float uCurrentTime;
  void main() {
    vAge = uCurrentTime - occurredAt;
    #ifdef USE_INSTANCING
      vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    #else
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    #endif
    // Instance matrices here are translation + uniform scale only, so the
    // plain normalMatrix (no per-instance normal correction) is safe.
    vNormal = normalMatrix * normal;
    vViewPos = mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uFadeDurationMs;
  uniform float uPlaybackActive;
  varying float vAge;
  varying vec3 vNormal;
  varying vec3 vViewPos;

  // Fresnel rim: darken each sphere's silhouette edge to a deeper shade of
  // its own color — keeps pale markers visible over light terrain and
  // visually separates overlapping markers in swarms, without a second
  // mesh. RIM_DARKEN is the edge's brightness relative to the fill.
  const float RIM_DARKEN = 0.35;

  void main() {
    float alpha = uPlaybackActive < 0.5
      ? 1.0
      : (vAge < 0.0 ? 0.0 : clamp(1.0 - vAge / uFadeDurationMs, 0.0, 1.0));
    float rim = 1.0 - abs(dot(normalize(vNormal), normalize(-vViewPos)));
    vec3 color = uColor * mix(1.0, RIM_DARKEN, smoothstep(0.55, 0.9, rim));
    gl_FragColor = vec4(color, alpha);
  }
`;

interface BucketMeshProps {
  quakes: EarthquakeOut[];
  color: string;
  fadeDurationMs: number;
  onSelect: (eq: EarthquakeOut) => void;
}

interface MarkerDatum {
  dir: [number, number, number]; // outward unit direction — for far-side test
  pos: [number, number, number]; // depth-adjusted render position
  radius: number;
  time: number; // epoch ms from occurred_at (Infinity if missing — never "occurs")
}

function BucketMesh({ quakes, color, fadeDurationMs, onSelect }: BucketMeshProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const translucentGlobe = useAppStore((s) => s.translucentGlobe);
  // Derived boolean selector: only re-renders this component when playback
  // actually starts/stops/pauses/resumes, not on every clock tick (Zustand
  // compares the selector's *return value*, not the raw state it reads).
  const playbackActive = useAppStore((s) => s.isPlaying || s.playbackTime !== null);
  const timeRange = useAppStore((s) => s.timeRange);

  // Precomputed once per quake-list change, not every frame.
  const markerData = useMemo<MarkerDatum[]>(
    () =>
      quakes.map((eq) => {
        const lat = eq.latitude ?? 0;
        const lon = eq.longitude ?? 0;
        return {
          dir: latLonToXYZ(lat, lon, 1),
          pos: latLonDepthToXYZ(lat, lon, eq.depth_km, SURFACE_RADIUS),
          radius: magRadius(eq.magnitude),
          time: eq.occurred_at ? new Date(eq.occurred_at).getTime() : Infinity,
        };
      }),
    [quakes]
  );

  // Per-instance "occurred at" attribute for the fade shader, relative to
  // timeRange[0] — a GPU attribute is float32, and absolute epoch ms
  // (~1.7e12) loses several minutes of precision at that magnitude; values
  // relative to the window start stay well within float32's exact range.
  const occurredAtRelative = useMemo(() => {
    const base = timeRange ? timeRange[0] : 0;
    const arr = new Float32Array(markerData.length);
    for (let i = 0; i < markerData.length; i++) {
      arr[i] = markerData[i].time - base;
    }
    return arr;
  }, [markerData, timeRange]);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color(color) },
      uCurrentTime: { value: 0 },
      uFadeDurationMs: { value: fadeDurationMs },
      uPlaybackActive: { value: 0 },
    }),
    [color, fadeDurationMs]
  );

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.count = markerData.length;
  }, [markerData]);

  // The globe rotates (and zooms) freely via OrbitControls, so both which
  // markers count as "past the horizon" and each marker's on-screen size
  // (held constant via REFERENCE_DISTANCE, see above) change continuously —
  // this runs every frame unconditionally rather than only while the globe
  // is opaque or a playback session is active. Horizon culling is still
  // skipped while translucentGlobe is on (see utils/horizon.ts for why the
  // threshold isn't a flat 0/full-hemisphere test), and the fade-window/
  // uPlaybackActive uniform logic is still a no-op while no playback
  // session is active — but scale itself can no longer be computed once and
  // left alone.
  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const { playbackTime } = useAppStore.getState();
    const base = timeRange ? timeRange[0] : 0;
    const current = playbackTime ?? base;

    const material = materialRef.current;
    if (material) {
      material.uniforms.uCurrentTime.value = current - base;
      material.uniforms.uPlaybackActive.value = playbackActive ? 1 : 0;
    }

    let threshold = 0;
    if (!translucentGlobe) {
      const cameraDistance = camera.position.length();
      cameraDir.copy(camera.position).divideScalar(cameraDistance);
      threshold = horizonThreshold(cameraDistance);
    }

    for (let i = 0; i < markerData.length; i++) {
      const { dir, pos, radius, time } = markerData[i];
      const facingCamera = translucentGlobe || isFacingCamera(dir, cameraDir, threshold);
      const age = current - time; // elapsed time since this quake occurred
      const withinFadeWindow = !playbackActive || (age >= 0 && age <= fadeDurationMs);
      dummy.position.set(pos[0], pos[1], pos[2]);
      scratchPos.set(pos[0], pos[1], pos[2]);
      const scale = facingCamera && withinFadeWindow
        ? radius * (camera.position.distanceTo(scratchPos) / REFERENCE_DISTANCE)
        : 0;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const id = e.instanceId;
    if (id === undefined) return;
    const eq = quakes[id];
    if (eq) onSelect(eq);
  };

  return (
    // renderOrder + transparent: EarthSphere is transparent, so three.js
    // renders it in the transparent pass after all opaque objects by
    // default — without this, the translucent globe would paint over these
    // markers regardless of actual depth, dimming/tinting them.
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, quakes.length]}
      onClick={handleClick}
      renderOrder={1}
    >
      <sphereGeometry args={[1, 12, 8]}>
        <instancedBufferAttribute attach="attributes-occurredAt" args={[occurredAtRelative, 1]} />
      </sphereGeometry>
      <shaderMaterial
        ref={materialRef}
        transparent
        uniforms={uniforms}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
      />
    </instancedMesh>
  );
}

export function EarthquakeLayer() {
  const selectEarthquake = useAppStore((s) => s.selectEarthquake);
  const timeRange = useAppStore((s) => s.timeRange);
  const magRange = useAppStore((s) => s.magRange);
  // The shared dataset — fetched once by EarthquakeDataLoader, not per-layer.
  const quakes = useAppStore((s) => s.earthquakes);

  // Narrow to the user-selected time range and magnitude range (client-side
  // — the full dataset is already fetched, so no refetch is needed while
  // dragging either slider).
  const filtered = useMemo(() => {
    const [minMag, maxMag] = magRange;
    return quakes.filter((eq) => {
      if (timeRange) {
        if (!eq.occurred_at) return false;
        const t = new Date(eq.occurred_at).getTime();
        if (t < timeRange[0] || t > timeRange[1]) return false;
      }
      const mag = eq.magnitude ?? MIN_MAG;
      return mag >= minMag && mag <= maxMag;
    });
  }, [quakes, timeRange, magRange]);

  // Group quakes into magnitude buckets — each bucket renders as its own
  // uniformly-colored InstancedMesh (see utils/magnitude.ts for why).
  const buckets = useMemo(() => {
    const groups: EarthquakeOut[][] = Array.from({ length: MAG_BUCKET_COUNT }, () => []);
    for (const eq of filtered) {
      groups[magBucketIndex(eq.magnitude)].push(eq);
    }
    return groups;
  }, [filtered]);

  // Time-lapse clock: advances playbackTime from timeRange[0] to
  // timeRange[1] while isPlaying, throttled to ~10Hz store commits. Lives
  // here (once), not per-bucket, so the clock only advances once rather
  // than once per magnitude bucket. Holds at the end for LOOP_PAUSE_SECONDS
  // before looping back to the start.
  const playbackAccumRef = useRef(0);
  const loopPauseRemainingRef = useRef(0);
  useFrame((_, delta) => {
    const { isPlaying, playbackTime, playbackSpeedDaysPerSec, setPlaybackTime } =
      useAppStore.getState();
    if (!isPlaying || !timeRange) return;

    if (loopPauseRemainingRef.current > 0) {
      loopPauseRemainingRef.current -= delta;
      if (loopPauseRemainingRef.current <= 0) {
        setPlaybackTime(timeRange[0]);
      }
      return;
    }

    playbackAccumRef.current += delta;
    if (playbackAccumRef.current < 0.1) return; // throttle store commits to ~10Hz
    const elapsed = playbackAccumRef.current;
    playbackAccumRef.current = 0;
    const current = playbackTime ?? timeRange[0];
    const next = current + elapsed * playbackSpeedDaysPerSec * MS_PER_DAY;
    if (next >= timeRange[1]) {
      setPlaybackTime(timeRange[1]);
      loopPauseRemainingRef.current = LOOP_PAUSE_SECONDS;
    } else {
      setPlaybackTime(next);
    }
  });

  return (
    <>
      {buckets.map((bucketQuakes, i) =>
        bucketQuakes.length > 0 ? (
          <BucketMesh
            key={i}
            quakes={bucketQuakes}
            color={MAG_BUCKET_COLORS[i]}
            fadeDurationMs={MAG_BUCKET_FADE_DURATIONS_MS[i]}
            onSelect={selectEarthquake}
          />
        ) : null
      )}
    </>
  );
}
