import { useEffect, useMemo, useRef, useState } from "react";
import { ThreeEvent } from "@react-three/fiber";
import { InstancedMesh, Object3D } from "three";
import { useAppStore } from "../../store/useAppStore";
import { fetchLayerEarthquakes, type EarthquakeOut } from "../../api/earthquakes";
import { latLonDepthToXYZ } from "../../utils/grid";
import { magRadius, magBucketIndex, MAG_BUCKET_COUNT, MAG_BUCKET_COLORS } from "../../utils/magnitude";

const SURFACE_RADIUS = 1.002;
const dummy = new Object3D();

interface BucketMeshProps {
  quakes: EarthquakeOut[];
  color: string;
  onSelect: (eq: EarthquakeOut) => void;
}

function BucketMesh({ quakes, color, onSelect }: BucketMeshProps) {
  const meshRef = useRef<InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < quakes.length; i++) {
      const eq = quakes[i];
      const [x, y, z] = latLonDepthToXYZ(eq.latitude ?? 0, eq.longitude ?? 0, eq.depth_km, SURFACE_RADIUS);
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(magRadius(eq.magnitude));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.count = quakes.length;
    mesh.instanceMatrix.needsUpdate = true;
  }, [quakes]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const id = e.instanceId;
    if (id === undefined) return;
    const eq = quakes[id];
    if (eq) onSelect(eq);
  };

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, quakes.length]} onClick={handleClick}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshBasicMaterial color={color} />
    </instancedMesh>
  );
}

export function EarthquakeLayer() {
  const depthLayer = useAppStore((s) => s.depthLayer);
  const selectEarthquake = useAppStore((s) => s.selectEarthquake);

  const [quakes, setQuakes] = useState<EarthquakeOut[]>([]);

  // Fetch quakes when depth layer changes
  useEffect(() => {
    let cancelled = false;
    setQuakes([]);
    fetchLayerEarthquakes(depthLayer).then(({ items }) => {
      if (!cancelled) setQuakes(items);
    });
    return () => {
      cancelled = true;
    };
  }, [depthLayer]);

  // Group quakes into magnitude buckets — each bucket renders as its own
  // uniformly-colored InstancedMesh (see utils/magnitude.ts for why).
  const buckets = useMemo(() => {
    const groups: EarthquakeOut[][] = Array.from({ length: MAG_BUCKET_COUNT }, () => []);
    for (const eq of quakes) {
      groups[magBucketIndex(eq.magnitude)].push(eq);
    }
    return groups;
  }, [quakes]);

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
