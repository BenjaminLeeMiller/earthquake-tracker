import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EarthSphere } from "./EarthSphere";
import { EarthquakeLayer } from "./EarthquakeLayer";
import { FaultLines } from "./FaultLines";
import { VolcanoLayer } from "./VolcanoLayer";
import { useAppStore } from "../../store/useAppStore";
import { GLOBE_RADIUS } from "../../utils/grid";
// Bird (2002) plate boundaries, via github.com/fraxen/tectonicplates
// (GeoJSON/PB2002_boundaries.json), trimmed to coordinate arrays only.
import plateBoundaries from "../../assets/plate-boundaries.json";
// Smithsonian Global Volcanism Program, Holocene volcano list (VOTW
// database), via their GeoServer WFS, trimmed to essential fields only.
import volcanoes from "../../assets/volcanoes.json";
import type { VolcanoRecord } from "../../types/volcano";

// Camera distance is measured from OrbitControls' target, which defaults
// to the origin — the same point the globe is centered on (see
// EarthSphere.tsx). minDistance must stay > GLOBE_RADIUS or the camera
// could dip beneath the surface; this margin keeps that a deliberate
// relationship instead of two independent magic numbers.
const CAMERA_MIN_CLEARANCE = 0.15;

// The camera's near-clipping plane must stay comfortably below
// CAMERA_MIN_CLEARANCE (the closest the surface can ever get to the
// camera) — otherwise the near plane cuts through the globe itself at
// close zoom, clipping the nearest geometry away entirely.
const CAMERA_NEAR = 0.05;

export function GlobeCanvas() {
  const plateBoundariesOn = useAppStore((s) => s.faultLayers.plateBoundaries);
  const volcanoesVisible = useAppStore((s) => s.volcanoesVisible);
  const selectVolcano = useAppStore((s) => s.selectVolcano);

  return (
    <Canvas
      style={{ width: "100%", height: "100%" }}
      gl={{ antialias: true }}
      camera={{ fov: 45, near: CAMERA_NEAR, far: 20, position: [0, 0, 2.8] }}
    >
      {/* Solid black scene background — high contrast for marker colors */}
      <color attach="background" args={["#000408"]} />
      <EarthSphere />
      <EarthquakeLayer />
      {plateBoundariesOn && <FaultLines lines={plateBoundaries as [number, number][][]} />}
      {volcanoesVisible && (
        <VolcanoLayer volcanoes={volcanoes as VolcanoRecord[]} onSelect={selectVolcano} />
      )}
      <OrbitControls
        enablePan={false}
        minDistance={GLOBE_RADIUS + CAMERA_MIN_CLEARANCE}
        maxDistance={6}
        rotateSpeed={0.5}
        zoomSpeed={0.4}
      />
    </Canvas>
  );
}
