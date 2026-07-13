import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EarthSphere } from "./EarthSphere";
import { EarthquakeLayer } from "./EarthquakeLayer";
import { FaultLines } from "./FaultLines";
import { VolcanoLayer } from "./VolcanoLayer";
import { useAppStore } from "../../store/useAppStore";
// Bird (2002) plate boundaries, via github.com/fraxen/tectonicplates
// (GeoJSON/PB2002_boundaries.json), trimmed to coordinate arrays only.
import plateBoundaries from "../../assets/plate-boundaries.json";
// Smithsonian Global Volcanism Program, Holocene volcano list (VOTW
// database), via their GeoServer WFS, trimmed to essential fields only.
import volcanoes from "../../assets/volcanoes.json";
import type { VolcanoRecord } from "../../types/volcano";

export function GlobeCanvas() {
  const plateBoundariesOn = useAppStore((s) => s.faultLayers.plateBoundaries);
  const volcanoesVisible = useAppStore((s) => s.volcanoesVisible);
  const selectVolcano = useAppStore((s) => s.selectVolcano);

  return (
    <Canvas
      style={{ width: "100%", height: "100%" }}
      gl={{ antialias: true }}
      camera={{ fov: 45, near: 0.5, far: 20, position: [0, 0, 2.8] }}
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
        minDistance={1.3}
        maxDistance={6}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
      />
    </Canvas>
  );
}
