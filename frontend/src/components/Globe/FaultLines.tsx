import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, DynamicDrawUsage, Float32BufferAttribute, LineSegments, Vector3 } from "three";
import { latLonToXYZ } from "../../utils/grid";
import { horizonThreshold, isFacingCamera } from "../../utils/horizon";
import { useAppStore } from "../../store/useAppStore";

const RADIUS = 1.001;
const cameraDir = new Vector3();

interface FaultLinesProps {
  lines: [number, number][][]; // [lon, lat] point arrays, one per line
  color?: string;
}

interface SegmentDatum {
  dirMid: [number, number, number]; // horizon test, one per segment
  posA: [number, number, number];
  posB: [number, number, number];
}

/**
 * Generic line-overlay renderer, reused for every fault-line dataset (see
 * FaultLayerKey in useAppStore.ts) — not hardcoded to plate boundaries.
 * Builds one BufferGeometry for a single LineSegments, walking consecutive
 * point pairs within each line only, so unrelated lines never connect to
 * each other (unlike a single continuous Line/strip would).
 */
export function FaultLines({ lines, color = "#ff5533" }: FaultLinesProps) {
  const meshRef = useRef<LineSegments>(null);
  const translucentGlobe = useAppStore((s) => s.translucentGlobe);

  // Precomputed once per `lines` change, not every frame.
  const segments = useMemo<SegmentDatum[]>(() => {
    const segs: SegmentDatum[] = [];
    for (const line of lines) {
      for (let i = 0; i < line.length - 1; i++) {
        const [lonA, latA] = line[i];
        const [lonB, latB] = line[i + 1];
        const dirA = latLonToXYZ(latA, lonA, 1);
        const dirB = latLonToXYZ(latB, lonB, 1);
        segs.push({
          dirMid: [(dirA[0] + dirB[0]) / 2, (dirA[1] + dirB[1]) / 2, (dirA[2] + dirB[2]) / 2],
          posA: latLonToXYZ(latA, lonA, RADIUS),
          posB: latLonToXYZ(latB, lonB, RADIUS),
        });
      }
    }
    return segs;
  }, [lines]);

  const geometry = useMemo(() => {
    const geom = new BufferGeometry();
    const positions = new Float32BufferAttribute(new Float32Array(segments.length * 6), 3);
    positions.setUsage(DynamicDrawUsage);
    geom.setAttribute("position", positions);
    return geom;
  }, [segments]);

  // Resting state: every segment at its real endpoints, whenever the globe
  // is translucent. When opaque, useFrame below takes over every frame.
  useEffect(() => {
    if (!translucentGlobe) return;
    const position = geometry.attributes.position;
    for (let i = 0; i < segments.length; i++) {
      const { posA, posB } = segments[i];
      position.setXYZ(i * 2, posA[0], posA[1], posA[2]);
      position.setXYZ(i * 2 + 1, posB[0], posB[1], posB[2]);
    }
    position.needsUpdate = true;
  }, [segments, translucentGlobe, geometry]);

  // Same horizon-culling technique as EarthquakeLayer, adapted to raw line
  // vertices: a hidden segment's two endpoints collapse to the same point
  // (zero-length, invisible) instead of an instance scale.
  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (!mesh || translucentGlobe) return;
    const cameraDistance = camera.position.length();
    cameraDir.copy(camera.position).divideScalar(cameraDistance);
    const threshold = horizonThreshold(cameraDistance);
    const position = mesh.geometry.attributes.position;
    for (let i = 0; i < segments.length; i++) {
      const { dirMid, posA, posB } = segments[i];
      if (isFacingCamera(dirMid, cameraDir, threshold)) {
        position.setXYZ(i * 2, posA[0], posA[1], posA[2]);
        position.setXYZ(i * 2 + 1, posB[0], posB[1], posB[2]);
      } else {
        position.setXYZ(i * 2, posA[0], posA[1], posA[2]);
        position.setXYZ(i * 2 + 1, posA[0], posA[1], posA[2]);
      }
    }
    position.needsUpdate = true;
  });

  return (
    // renderOrder + transparent: matches EarthquakeLayer's markers — without
    // this, the translucent globe would dim these lines regardless of depth.
    <lineSegments ref={meshRef} geometry={geometry} renderOrder={1}>
      <lineBasicMaterial color={color} transparent />
    </lineSegments>
  );
}
