import { useEffect, useMemo, useRef } from "react";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { InstancedMesh, Object3D, Vector3 } from "three";
import { useAppStore } from "../../store/useAppStore";
import { latLonToXYZ } from "../../utils/grid";
import { horizonThreshold, isFacingCamera } from "../../utils/horizon";
import type { VolcanoRecord } from "../../types/volcano";

const SURFACE_RADIUS = 1.002;
const CONE_HEIGHT = 0.032;
const CONE_RADIUS = 0.013;
const dummy = new Object3D();
const cameraDir = new Vector3();
const UP = new Vector3(0, 1, 0);
const scratchDir = new Vector3();

interface VolcanoLayerProps {
  volcanoes: VolcanoRecord[];
  onSelect: (v: VolcanoRecord) => void;
}

interface MarkerDatum {
  dir: [number, number, number]; // outward unit direction — horizon test + cone orientation
  pos: [number, number, number]; // cone center, at SURFACE_RADIUS + CONE_HEIGHT / 2
}

/**
 * Static point-marker layer for volcano locations — mirrors FaultLines'
 * lifecycle (memoize once, resting state on translucentGlobe, per-frame
 * horizon culling when opaque) rather than EarthquakeLayer's fetch/replay
 * machinery, since this dataset is static and never filtered by time.
 */
export function VolcanoLayer({ volcanoes, onSelect }: VolcanoLayerProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const translucentGlobe = useAppStore((s) => s.translucentGlobe);

  const markerData = useMemo<MarkerDatum[]>(
    () =>
      volcanoes.map((v) => ({
        dir: latLonToXYZ(v.lat, v.lon, 1),
        pos: latLonToXYZ(v.lat, v.lon, SURFACE_RADIUS + CONE_HEIGHT / 2),
      })),
    [volcanoes]
  );

  // Resting state: every cone visible at its true position/orientation,
  // whenever the globe is translucent. When opaque, useFrame below takes
  // over every frame (far-side culling).
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !translucentGlobe) return;
    for (let i = 0; i < markerData.length; i++) {
      const { dir, pos } = markerData[i];
      scratchDir.set(dir[0], dir[1], dir[2]);
      dummy.quaternion.setFromUnitVectors(UP, scratchDir);
      dummy.position.set(pos[0], pos[1], pos[2]);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [markerData, translucentGlobe]);

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (!mesh || translucentGlobe) return;

    const cameraDistance = camera.position.length();
    cameraDir.copy(camera.position).divideScalar(cameraDistance);
    const threshold = horizonThreshold(cameraDistance);

    for (let i = 0; i < markerData.length; i++) {
      const { dir, pos } = markerData[i];
      const visible = isFacingCamera(dir, cameraDir, threshold);
      scratchDir.set(dir[0], dir[1], dir[2]);
      dummy.quaternion.setFromUnitVectors(UP, scratchDir);
      dummy.position.set(pos[0], pos[1], pos[2]);
      dummy.scale.setScalar(visible ? 1 : 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const id = e.instanceId;
    if (id === undefined) return;
    const v = volcanoes[id];
    if (v) onSelect(v);
  };

  return (
    // renderOrder + transparent: EarthSphere is transparent, so three.js
    // renders it in the transparent pass after all opaque objects by
    // default — without this, the translucent globe would paint over these
    // markers regardless of actual depth, dimming/tinting them.
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, volcanoes.length]}
      onClick={handleClick}
      renderOrder={1}
    >
      <coneGeometry args={[CONE_RADIUS, CONE_HEIGHT, 8]} />
      <meshBasicMaterial color="#8b0000" transparent />
    </instancedMesh>
  );
}
