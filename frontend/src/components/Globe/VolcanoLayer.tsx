import { useMemo, useRef } from "react";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { InstancedMesh, Object3D, Vector3 } from "three";
import { useAppStore } from "../../store/useAppStore";
import { latLonToXYZ } from "../../utils/grid";
import { horizonThreshold, isFacingCamera } from "../../utils/horizon";
import type { VolcanoRecord } from "../../types/volcano";

const SURFACE_RADIUS = 1.002;
// Exported for SelectionHighlight, which needs the same cone dimensions to
// size/position the ring around a selected volcano.
export const CONE_HEIGHT = 0.032;
export const CONE_RADIUS = 0.013;
// Camera distance at which a marker renders at its "base" (CONE_HEIGHT/
// CONE_RADIUS) size — matches GlobeCanvas's initial camera position, so
// the default view is unchanged. Each instance's scale is its own
// distance from the camera relative to this reference, which keeps their
// on-screen size constant while zooming instead of shrinking/growing with
// perspective like a fixed-world-size object normally would.
const REFERENCE_DISTANCE = 2.8;

const dummy = new Object3D();
const cameraDir = new Vector3();
const UP = new Vector3(0, 1, 0);
const scratchDir = new Vector3();
const scratchPos = new Vector3();

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
 * lifecycle (memoize position/orientation once) rather than
 * EarthquakeLayer's fetch/replay machinery, since this dataset is static
 * and never filtered by time. Unlike FaultLines, scale can't be set once
 * and left alone: each instance is continuously rescaled by its own
 * distance from the camera (see REFERENCE_DISTANCE) so markers keep a
 * constant on-screen size while zooming, rather than growing/shrinking
 * like a normal fixed-world-size object — so this runs every frame
 * regardless of translucentGlobe, not just when the globe is opaque.
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

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const cameraDistance = camera.position.length();
    cameraDir.copy(camera.position).divideScalar(cameraDistance);
    const threshold = horizonThreshold(cameraDistance);

    for (let i = 0; i < markerData.length; i++) {
      const { dir, pos } = markerData[i];
      const visible = translucentGlobe || isFacingCamera(dir, cameraDir, threshold);

      scratchPos.set(pos[0], pos[1], pos[2]);
      const scale = visible ? camera.position.distanceTo(scratchPos) / REFERENCE_DISTANCE : 0;

      scratchDir.set(dir[0], dir[1], dir[2]);
      dummy.quaternion.setFromUnitVectors(UP, scratchDir);
      dummy.position.set(pos[0], pos[1], pos[2]);
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
      <meshBasicMaterial color="#8b5a2b" transparent />
    </instancedMesh>
  );
}
