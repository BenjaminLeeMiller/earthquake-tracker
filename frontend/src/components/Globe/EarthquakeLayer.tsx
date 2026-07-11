import { useEffect, useMemo, useRef, useState } from "react";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { InstancedMesh, Object3D, Vector3 } from "three";
import { useAppStore } from "../../store/useAppStore";
import { fetchAllEarthquakes, type EarthquakeOut } from "../../api/earthquakes";
import { latLonToXYZ, latLonDepthToXYZ } from "../../utils/grid";
import {
  magRadius,
  magBucketIndex,
  MAG_BUCKET_COUNT,
  MAG_BUCKET_COLORS,
  MIN_MAG,
} from "../../utils/magnitude";

const SURFACE_RADIUS = 1.002;
const dummy = new Object3D();
const cameraDir = new Vector3();

interface BucketMeshProps {
  quakes: EarthquakeOut[];
  color: string;
  onSelect: (eq: EarthquakeOut) => void;
}

interface MarkerDatum {
  dir: [number, number, number]; // outward unit direction — for far-side test
  pos: [number, number, number]; // depth-adjusted render position
  radius: number;
}

function BucketMesh({ quakes, color, onSelect }: BucketMeshProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const hideFarSide = useAppStore((s) => s.hideFarSide);

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
        };
      }),
    [quakes]
  );

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.count = markerData.length;
  }, [markerData]);

  // Resting state (all visible) whenever the data changes and far-side
  // hiding is off. When it's on, useFrame below takes over every frame.
  useEffect(() => {
    if (hideFarSide) return;
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < markerData.length; i++) {
      const { pos, radius } = markerData[i];
      dummy.position.set(pos[0], pos[1], pos[2]);
      dummy.scale.setScalar(radius);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [markerData, hideFarSide]);

  // The globe rotates (and zooms) freely via OrbitControls, so which markers
  // count as "past the horizon" changes continuously — re-cull against the
  // live camera every frame while the toggle is on.
  //
  // The visible cap is NOT the full hemisphere facing the camera (dot >= 0)
  // — that's only true for a camera infinitely far away. For a camera at
  // finite distance d from a sphere of radius r (=1, the globe's own
  // surface radius from EarthSphere.tsx), the true horizon/silhouette sits
  // at angle arccos(r/d) from the camera-facing direction, i.e. a point is
  // visible only when dot(dir, cameraDir) >= r/d. Using 0 instead of r/d
  // let markers between the true horizon and the full-hemisphere boundary
  // stay visible well after they'd visually crossed the limb.
  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (!mesh || !hideFarSide) return;
    const cameraDistance = camera.position.length();
    cameraDir.copy(camera.position).divideScalar(cameraDistance);
    const horizonThreshold = 1 / cameraDistance;
    for (let i = 0; i < markerData.length; i++) {
      const { dir, pos, radius } = markerData[i];
      const facingCamera =
        dir[0] * cameraDir.x + dir[1] * cameraDir.y + dir[2] * cameraDir.z >= horizonThreshold;
      dummy.position.set(pos[0], pos[1], pos[2]);
      dummy.scale.setScalar(facingCamera ? radius : 0);
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
    <instancedMesh ref={meshRef} args={[undefined, undefined, quakes.length]} onClick={handleClick} renderOrder={1}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshBasicMaterial color={color} transparent />
    </instancedMesh>
  );
}

export function EarthquakeLayer() {
  const selectEarthquake = useAppStore((s) => s.selectEarthquake);
  const timeRange = useAppStore((s) => s.timeRange);
  const magRange = useAppStore((s) => s.magRange);

  const [quakes, setQuakes] = useState<EarthquakeOut[]>([]);

  // Fetch all earthquakes once on mount
  useEffect(() => {
    let cancelled = false;
    fetchAllEarthquakes().then(({ items }) => {
      if (!cancelled) setQuakes(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <>
      {buckets.map((bucketQuakes, i) =>
        bucketQuakes.length > 0 ? (
          <BucketMesh key={i} quakes={bucketQuakes} color={MAG_BUCKET_COLORS[i]} onSelect={selectEarthquake} />
        ) : null
      )}
    </>
  );
}
