import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EarthSphere } from "./EarthSphere";
import { EarthquakeLayer } from "./EarthquakeLayer";
import { FaultLines } from "./FaultLines";
import { useAppStore } from "../../store/useAppStore";
// Bird (2002) plate boundaries, via github.com/fraxen/tectonicplates
// (GeoJSON/PB2002_boundaries.json), trimmed to coordinate arrays only.
import plateBoundaries from "../../assets/plate-boundaries.json";

export function GlobeCanvas() {
  const plateBoundariesOn = useAppStore((s) => s.faultLayers.plateBoundaries);

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
