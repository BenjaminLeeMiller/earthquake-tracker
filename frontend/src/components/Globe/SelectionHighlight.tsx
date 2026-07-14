import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide, Mesh, Vector3 } from "three";
import { useAppStore } from "../../store/useAppStore";
import { latLonToXYZ, latLonDepthToXYZ } from "../../utils/grid";
import { horizonThreshold, isFacingCamera } from "../../utils/horizon";
import { magRadius } from "../../utils/magnitude";
import { CONE_HEIGHT, CONE_RADIUS } from "./VolcanoLayer";

const SURFACE_RADIUS = 1.002;
// Same constant-screen-size technique as EarthquakeLayer/VolcanoLayer: scale
// by the marker's own distance from the camera relative to this reference,
// which matches GlobeCanvas's initial camera position.
const REFERENCE_DISTANCE = 2.8;
// Ring sits just outside the selected marker's own radius, as a halo rather
// than an overlapping outline.
const RING_OUTER_FACTOR = 1.9;
const RING_INNER_FACTOR = 1.4;

const cameraDir = new Vector3();
const scratchPos = new Vector3();

/**
 * Billboarded ring that marks whichever earthquake or volcano is currently
 * selected — selection is mutually exclusive between the two (see
 * useAppStore's selectEarthquake/selectVolcano), so at most one is ever set.
 */
export function SelectionHighlight() {
  const meshRef = useRef<Mesh>(null);
  const selectedEarthquake = useAppStore((s) => s.selectedEarthquake);
  const selectedVolcano = useAppStore((s) => s.selectedVolcano);
  const translucentGlobe = useAppStore((s) => s.translucentGlobe);

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    let lat: number | null = null;
    let lon: number | null = null;
    let pos: [number, number, number] | null = null;
    let baseRadius = 0;

    if (
      selectedEarthquake &&
      selectedEarthquake.latitude != null &&
      selectedEarthquake.longitude != null
    ) {
      lat = selectedEarthquake.latitude;
      lon = selectedEarthquake.longitude;
      pos = latLonDepthToXYZ(lat, lon, selectedEarthquake.depth_km, SURFACE_RADIUS);
      baseRadius = magRadius(selectedEarthquake.magnitude) * RING_OUTER_FACTOR;
    } else if (selectedVolcano) {
      lat = selectedVolcano.lat;
      lon = selectedVolcano.lon;
      pos = latLonToXYZ(lat, lon, SURFACE_RADIUS + CONE_HEIGHT / 2);
      baseRadius = CONE_RADIUS * RING_OUTER_FACTOR;
    }

    if (lat == null || lon == null || pos == null) {
      mesh.visible = false;
      return;
    }

    const dir = latLonToXYZ(lat, lon, 1);
    let visible = true;
    if (!translucentGlobe) {
      const cameraDistance = camera.position.length();
      cameraDir.copy(camera.position).divideScalar(cameraDistance);
      visible = isFacingCamera(dir, cameraDir, horizonThreshold(cameraDistance));
    }
    mesh.visible = visible;
    if (!visible) return;

    mesh.position.set(pos[0], pos[1], pos[2]);
    scratchPos.set(pos[0], pos[1], pos[2]);

    const scale = baseRadius * (camera.position.distanceTo(scratchPos) / REFERENCE_DISTANCE);
    mesh.scale.setScalar(scale);

    // Billboard: always face the camera, like a sprite.
    mesh.quaternion.copy(camera.quaternion);
  });

  return (
    // depthTest disabled — a flat billboard at the marker's position can
    // otherwise dip into the (curved) globe surface at grazing view angles;
    // the horizon check above already hides it on the globe's far side, so
    // there's nothing else it would incorrectly paint over.
    <mesh ref={meshRef} renderOrder={2} visible={false}>
      <ringGeometry args={[RING_INNER_FACTOR / RING_OUTER_FACTOR, 1, 48]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.9}
        side={DoubleSide}
        depthTest={false}
      />
    </mesh>
  );
}
